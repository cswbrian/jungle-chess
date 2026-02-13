import { useState, useEffect, useRef } from 'react'
import { getLegalMoves } from './Game'
import { isRiver, isTrap, isDen, PIECE_NAMES, PIECE_EMOJIS, ROWS, COLS, DEN_0, DEN_1 } from './constants'
import { trackEvent } from './utils/analytics'
import './Board.css'

function Cell({ r, c, cell, isSelected, isLegalMove, legalMovePlayer, isLastMoveFrom, isLastMoveTo, onClick }) {
  const river = isRiver(r, c)
  const trap0 = isTrap(r, c, '0')
  const trap1 = isTrap(r, c, '1')
  const den0 = r === DEN_0.r && c === DEN_0.c
  const den1 = r === DEN_1.r && c === DEN_1.c

  let className = 'cell'
  if (river) className += ' river'
  if (trap0 || trap1) className += ' trap'
  if (den0 || den1) className += ' den'
  if (isLastMoveFrom) className += ' last-move-from'
  if (isLastMoveTo) className += ' last-move-to'
  if (isSelected) className += ' selected'
  if (isLegalMove) {
    className += ' legal'
    if (legalMovePlayer !== undefined) className += ` legal-p${legalMovePlayer}`
  }

  const label = cell
    ? `${PIECE_NAMES[cell.piece] || ''} (${cell.player})`
    : den0 ? '紅方獸穴' : den1 ? '綠方獸穴' : ''

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={label}
      disabled={!onClick}
    >
      {(den0 || den1) && <span className="cell-label cell-label-den">獸穴</span>}
      {(trap0 || trap1) && !den0 && !den1 && <span className="cell-label cell-label-trap">陷阱</span>}
      {cell && (
        <span className={`piece p${cell.player}`}>
          <span className="piece-emoji">{PIECE_EMOJIS[cell.piece] ?? ''}</span>
          <span className="piece-char">{PIECE_NAMES[cell.piece] ?? cell.piece}</span>
        </span>
      )}
    </button>
  )
}

export function Board({ G, ctx, moves, playerID, gameMode = 'unknown', onStartNewGame, onGameoverChange }) {
  const [selected, setSelected] = useState(null)
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false)
  const [eventNotification, setEventNotification] = useState(null)
  const lastTrackedMoveRef = useRef('')
  const gameEndTrackedRef = useRef(false)
  const currentPlayer = ctx.currentPlayer
  const isMyTurn = currentPlayer === playerID
  const gameover = ctx.gameover
  const isOnlineMode = gameMode === 'online'

  const legalMoves = selected && G?.cells
    ? getLegalMoves(G, selected[0], selected[1])
    : []

  const handleCellClick = (r, c) => {
    if (gameover) return
    const cell = G.cells[r][c]
    const isLegal = legalMoves.some(([nr, nc]) => nr === r && nc === c)

    if (isLegal && selected) {
      moves.movePiece(selected[0], selected[1], r, c)
      setSelected(null)
      return
    }
    if (cell?.player === playerID && isMyTurn) {
      setSelected([r, c])
    } else {
      setSelected(null)
    }
  }

  if (!G?.cells) return <div className="board-wrap">載入中…</div>

  const turnClass = currentPlayer === '0' ? 'text-p0' : 'text-p1'

  // Red (0) sees their pieces at top—flip so own pieces are at bottom
  const toActualRow = (displayRow) => (playerID === '0' ? ROWS - 1 - displayRow : displayRow)

  // Format last move message with badge components
  const lastMoveContent = G.lastMove ? (() => {
    const { piece, player, captured, isRiverJump, enteredTrap } = G.lastMove
    const emoji = PIECE_EMOJIS[piece]
    const pieceName = PIECE_NAMES[piece]
    
    if (captured) {
      const capturedEmoji = PIECE_EMOJIS[captured.piece]
      const capturedName = PIECE_NAMES[captured.piece]
      
      // Integrate special actions into the sentence
      let action = '剛吃掉'
      if (isRiverJump) {
        action = '剛跳河吃掉'
      } else if (enteredTrap) {
        action = '剛進入陷阱吃掉'
      }
      
      return {
        attacker: { emoji, name: pieceName, player },
        middle: action,
        target: { emoji: capturedEmoji, name: capturedName, player: captured.player },
      }
    } else {
      // Prioritize special actions for non-capture moves
      let action = '剛移動'
      if (enteredTrap) {
        action = '剛進入陷阱'
      } else if (isRiverJump) {
        action = '剛跳河'
      }
      
      return {
        piece: { emoji, name: pieceName, player },
        middle: action,
      }
    }
  })() : null

  // Show overlay when game ends
  useEffect(() => {
    if (gameover) {
      setShowWinnerOverlay(true)
    }
  }, [gameover])

  useEffect(() => {
    if (!onGameoverChange) return
    onGameoverChange(Boolean(gameover))
  }, [gameover, onGameoverChange])

  // Show event notification for captures and traps
  useEffect(() => {
    if (!G.lastMove || gameover) return
    
    const { captured, enteredTrap, piece, player } = G.lastMove
    
    if (captured) {
      const capturedEmoji = PIECE_EMOJIS[captured.piece]
      const capturedName = PIECE_NAMES[captured.piece]
      const attackerEmoji = PIECE_EMOJIS[piece]
      const attackerName = PIECE_NAMES[piece]
      
      const attackerBadge = `<span class="piece-badge piece-badge-p${player}">${attackerEmoji}${attackerName}</span>`
      const capturedBadge = `<span class="piece-badge piece-badge-p${captured.player}">${capturedEmoji}${capturedName}</span>`
      
      setEventNotification({
        type: 'capture',
        message: `${attackerBadge} 吃掉 ${capturedBadge}`,
        emoji: '💥',
        player: player,
      })
      
      const timer = setTimeout(() => setEventNotification(null), 2000)
      return () => clearTimeout(timer)
    } else if (enteredTrap) {
      const pieceEmoji = PIECE_EMOJIS[piece]
      const pieceName = PIECE_NAMES[piece]
      
      const pieceBadge = `<span class="piece-badge piece-badge-p${player}">${pieceEmoji}${pieceName}</span>`
      
      setEventNotification({
        type: 'trap',
        message: `${pieceBadge} 進入陷阱`,
        emoji: '⚠️',
        player: player,
      })
      
      const timer = setTimeout(() => setEventNotification(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [G.lastMove, gameover])

  useEffect(() => {
    if (!G?.lastMove) return
    const moveKey = [
      ctx?.turn,
      G.lastMove.player,
      G.lastMove.piece,
      G.lastMove.from?.r,
      G.lastMove.from?.c,
      G.lastMove.to?.r,
      G.lastMove.to?.c,
    ].join(':')
    if (lastTrackedMoveRef.current === moveKey) return
    lastTrackedMoveRef.current = moveKey

    trackEvent('game_move', {
      mode: gameMode,
      turn: Number(ctx?.turn || 0),
      player: String(G.lastMove.player),
      piece: Number(G.lastMove.piece),
      captured: Boolean(G.lastMove.captured),
      is_river_jump: Boolean(G.lastMove.isRiverJump),
      entered_trap: Boolean(G.lastMove.enteredTrap),
    })
  }, [G?.lastMove, ctx?.turn, gameMode])

  useEffect(() => {
    if (!gameover) {
      gameEndTrackedRef.current = false
      return
    }
    if (gameEndTrackedRef.current) return
    gameEndTrackedRef.current = true

    const endReason = G?.lastMove?.captured
      ? 'all_pieces_eliminated_or_capture_sequence'
      : 'den_occupied'
    trackEvent('game_end', {
      mode: gameMode,
      winner: String(gameover.winner),
      turn: Number(ctx?.turn || 0),
      end_reason: endReason,
    })
  }, [G?.lastMove, ctx?.turn, gameMode, gameover])

  const winnerID = gameover?.winner != null ? String(gameover.winner) : null
  const winnerColor = winnerID === '0' ? '紅' : '綠'
  const winnerClass = winnerID === '0' ? 'winner-p0' : 'winner-p1'
  
  // Get the winning piece from lastMove
  const winningPieceEmoji = G.lastMove ? PIECE_EMOJIS[G.lastMove.piece] : '🏆'
  const winningPieceName = G.lastMove ? PIECE_NAMES[G.lastMove.piece] : ''

  const canStartNewGame = gameover && typeof onStartNewGame === 'function'
  const handleStartNewGame = () => {
    if (!canStartNewGame) return
    onStartNewGame()
  }

  return (
    <div className="board-wrap">
      {gameover && showWinnerOverlay && (
        <div className={`gameover-overlay ${winnerClass}`}>
          <div className="gameover-card">
            <button 
              type="button" 
              className="close-overlay-btn" 
              onClick={() => setShowWinnerOverlay(false)}
              aria-label="關閉"
            >
              ✕
            </button>
            <div className="winner-trophy">{winningPieceEmoji}</div>
            <div className="winner-title">{winnerColor}方獲勝！</div>
            <div className="winner-subtitle">
              <span className={`piece-badge piece-badge-p${winnerID}`}>
                {winningPieceEmoji}{winningPieceName}
              </span>
              攻陷對方獸穴
            </div>
          </div>
        </div>
      )}
      {eventNotification && (
        <div className={`event-notification event-${eventNotification.type} event-p${eventNotification.player}`}>
          <div className="event-emoji">{eventNotification.emoji}</div>
          <div className="event-message" dangerouslySetInnerHTML={{ __html: eventNotification.message }} />
        </div>
      )}
      <div
        key={currentPlayer}
        className={`board-status board-status-${gameover ? 'over' : isMyTurn ? 'yours' : 'theirs'} ${turnClass}`}
      >
        {gameover ? (
          '遊戲結束'
        ) : isMyTurn ? (
          <><span className="status-dot" aria-hidden />你的回合</>
        ) : (
          <>對手回合</>
        )}
      </div>
      <div
        className="board"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        }}
      >
        {Array.from({ length: ROWS }, (_, displayRow) => {
          const actualRow = toActualRow(displayRow)
          return Array.from({ length: COLS }, (_, c) => (
            <Cell
              key={`${actualRow}-${c}`}
              r={actualRow}
              c={c}
              cell={G.cells[actualRow][c]}
              isSelected={selected?.[0] === actualRow && selected?.[1] === c}
              isLegalMove={legalMoves.some(([nr, nc]) => nr === actualRow && nc === c)}
              legalMovePlayer={selected ? currentPlayer : undefined}
              isLastMoveFrom={G.lastMove && G.lastMove.from.r === actualRow && G.lastMove.from.c === c}
              isLastMoveTo={G.lastMove && G.lastMove.to.r === actualRow && G.lastMove.to.c === c}
              onClick={() => handleCellClick(actualRow, c)}
            />
          ))
        })}
      </div>
      {lastMoveContent && G.lastMove && (
        <div className={`last-move last-move-p${G.lastMove.player}`}>
          {lastMoveContent.attacker ? (
            <>
              <span className={`piece-badge piece-badge-p${lastMoveContent.attacker.player}`}>
                {lastMoveContent.attacker.emoji}{lastMoveContent.attacker.name}
              </span>
              {lastMoveContent.middle}
              <span className={`piece-badge piece-badge-p${lastMoveContent.target.player}`}>
                {lastMoveContent.target.emoji}{lastMoveContent.target.name}
              </span>
            </>
          ) : (
            <>
              <span className={`piece-badge piece-badge-p${lastMoveContent.piece.player}`}>
                {lastMoveContent.piece.emoji}{lastMoveContent.piece.name}
              </span>
              {lastMoveContent.middle}
            </>
          )}
        </div>
      )}
      {canStartNewGame && (
        <button
          type="button"
          className="new-game-btn board-layer-new-game-btn"
          onClick={handleStartNewGame}
          title="重新開始新局"
        >
          {isOnlineMode ? '重新開始' : '開始新局'}
        </button>
      )}
    </div>
  )
}
