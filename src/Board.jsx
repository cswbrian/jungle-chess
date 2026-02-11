import { useState } from 'react'
import { getLegalMoves } from './Game'
import { isRiver, isTrap, isDen, PIECE_NAMES, ROWS, COLS, DEN_0, DEN_1 } from './constants'
import './Board.css'

function Cell({ r, c, cell, isSelected, isLegalMove, onClick }) {
  const river = isRiver(r, c)
  const trap0 = isTrap(r, c, '0')
  const trap1 = isTrap(r, c, '1')
  const den0 = r === DEN_0.r && c === DEN_0.c
  const den1 = r === DEN_1.r && c === DEN_1.c

  let className = 'cell'
  if (river) className += ' river'
  if (trap0 || trap1) className += ' trap'
  if (den0 || den1) className += ' den'
  if (isSelected) className += ' selected'
  if (isLegalMove) className += ' legal'

  const label = cell
    ? `${PIECE_NAMES[cell.piece] || ''} (${cell.player})`
    : den0 ? 'Den 0' : den1 ? 'Den 1' : ''

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={label}
      disabled={!onClick}
    >
      {cell && (
        <span className={`piece p${cell.player}`}>
          {PIECE_NAMES[cell.piece] ?? cell.piece}
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

  if (!G?.cells) return <div className="board-wrap">Loading…</div>

  const myColor = playerID === '0' ? 'Red' : 'Green'
  const myClass = playerID === '0' ? 'text-p0' : 'text-p1'
  const turnColor = currentPlayer === '0' ? 'Red' : 'Green'
  const turnClass = currentPlayer === '0' ? 'text-p0' : 'text-p1'

  return (
    <div className="board-wrap">
      <div className={`player-indicator ${myClass}`}>
        You are {myColor}
      </div>
      {gameover && (
        <div className="gameover">
          Winner: {gameover.winner === playerID ? 'You' : 'Opponent'}
        </div>
      )}
      <p className={`turn-info ${turnClass}`}>
        {gameover ? 'Game over' : isMyTurn ? `Your Turn (${turnColor})` : `Opponent's Turn (${turnColor})`}
      </p>
      <div
        className="board"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        }}
      >
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => (
            <Cell
              key={`${r}-${c}`}
              r={r}
              c={c}
              cell={G.cells[r][c]}
              isSelected={selected?.[0] === r && selected?.[1] === c}
              isLegalMove={legalMoves.some(([nr, nc]) => nr === r && nc === c)}
              onClick={() => handleCellClick(r, c)}
            />
          ))
        )}
      </div>
    </div>
  )
}
