import { useState } from 'react'
import { getLegalMoves } from './Game'
import { isRiver, isTrap, isDen, PIECE_NAMES, PIECE_EMOJIS, ROWS, COLS, DEN_0, DEN_1 } from './constants'
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

export function Board({ G, ctx, moves, playerID }) {
  const [selected, setSelected] = useState(null)
  const currentPlayer = ctx.currentPlayer
  const isMyTurn = currentPlayer === playerID
  const gameover = ctx.gameover

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

  // Format last move message
  const lastMoveMsg = G.lastMove ? (() => {
    const { piece, player, captured, isRiverJump, enteredTrap } = G.lastMove
    const emoji = PIECE_EMOJIS[piece]
    const pieceName = PIECE_NAMES[piece]
    const playerColor = player === '0' ? '紅' : '綠'
    
    let action = ''
    let suffix = ''
    
    if (captured) {
      const capturedEmoji = PIECE_EMOJIS[captured.piece]
      const capturedName = PIECE_NAMES[captured.piece]
      const opponentColor = captured.player === '0' ? '紅' : '綠'
      action = `用${emoji}${pieceName}吃掉${opponentColor}方${capturedEmoji}${capturedName}`
    } else {
      action = `移動${emoji}${pieceName}`
    }
    
    // Add special move indicators
    const extras = []
    if (isRiverJump) extras.push('跳河')
    if (enteredTrap) extras.push('進入陷阱')
    
    if (extras.length > 0) {
      suffix = `（${extras.join('、')}）`
    }
    
    return `${playerColor}方剛${action}${suffix}`
  })() : null

  return (
    <div className="board-wrap">
      {gameover && (
        <div className="gameover">
          獲勝：{gameover.winner === playerID ? '你' : '對手'}
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
      {lastMoveMsg && G.lastMove && (
        <div className={`last-move last-move-p${G.lastMove.player}`}>
          {lastMoveMsg}
        </div>
      )}
    </div>
  )
}
