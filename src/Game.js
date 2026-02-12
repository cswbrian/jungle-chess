import {
  ROWS,
  COLS,
  RANK,
  isRiver,
  isTrap,
  isDen,
  getRiverJump,
  INITIAL_0,
  INITIAL_1,
  DEN_0,
  DEN_1,
} from './constants'

// Piece order for initial setup
const PIECE_ORDER = [RANK.LION, RANK.TIGER, RANK.LEOPARD, RANK.ELEPHANT, RANK.RAT, RANK.CAT, RANK.DOG, RANK.WOLF]

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function setupGrid() {
  const grid = createEmptyGrid()
  ;['0', '1'].forEach((player, i) => {
    const positions = i === 0 ? INITIAL_0 : INITIAL_1
    PIECE_ORDER.forEach((piece, j) => {
      const [r, c] = positions[j]
      grid[r][c] = { player, piece }
    })
  })
  return grid
}

function getPieceAt(G, r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
  return G.cells[r][c]
}

function effectiveRank(G, r, c, player) {
  const cell = getPieceAt(G, r, c)
  if (!cell || cell.player !== player) return cell?.piece ?? -1
  // If my piece is in opponent's trap, rank becomes 0 (any enemy can capture, even mouse eats elephant)
  if (isTrap(r, c, player)) return 0
  return cell.piece
}

function canCapture(attackerRank, defenderRank, attackerInWater, defenderInWater, isRatCapturingElephant) {
  // Rat vs Elephant
  if (isRatCapturingElephant) return !attackerInWater // Rat can eat Elephant (only from land)
  if (attackerRank === RANK.ELEPHANT && defenderRank === RANK.RAT) return false // Elephant cannot eat Rat

  if (defenderInWater && !attackerInWater) return false
  if (attackerRank === 0) return false
  if (defenderRank === 0) return true
  return attackerRank >= defenderRank
}

export function getLegalMoves(G, r, c) {
  const cell = G.cells[r][c]
  if (!cell) return []
  const player = cell.player
  const piece = cell.piece
  const moves = []

  const addMove = (nr, nc) => {
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return
    if (isDen(nr, nc, player)) return
    const target = getPieceAt(G, nr, nc)
    if (target?.player === player) return
    if (isRiver(nr, nc) && piece !== RANK.RAT) return
    const myEffective = effectiveRank(G, r, c, player)
    const targetEffective = target?.player ? effectiveRank(G, nr, nc, target.player) : -1
    const ratVsElephant = piece === RANK.RAT && target?.piece === RANK.ELEPHANT
    if (target && !canCapture(myEffective, targetEffective, isRiver(r, c), isRiver(nr, nc), ratVsElephant)) return
    moves.push([nr, nc])
  }

  // Orthogonal one step
  addMove(r - 1, c)
  addMove(r + 1, c)
  addMove(r, c - 1)
  addMove(r, c + 1)

  // Lion/Tiger jump over river
  if (piece === RANK.LION || piece === RANK.TIGER) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const jump = getRiverJump(r, c, dr, dc)
      if (jump) {
        const { r: nr, c: nc } = jump
        if (isDen(nr, nc, player)) continue
        const target = getPieceAt(G, nr, nc)
        if (target?.player === player) continue
        const blockLeft = riverHasRat(G, r, c, nr, nc)
        if (blockLeft) continue
        const myEffective = effectiveRank(G, r, c, player)
        const targetEffective = target?.player ? effectiveRank(G, nr, nc, target.player) : -1
        const ratVsElephant = piece === RANK.RAT && target?.piece === RANK.ELEPHANT
        if (target && !canCapture(myEffective, targetEffective, false, false, ratVsElephant)) continue
        moves.push([nr, nc])
      }
    }
  }

  return moves
}

function riverHasRat(G, r0, c0, r1, c1) {
  const dr = r1 > r0 ? 1 : r1 < r0 ? -1 : 0
  const dc = c1 > c0 ? 1 : c1 < c0 ? -1 : 0
  let r = r0 + dr
  let c = c0 + dc
  while (r !== r1 || c !== c1) {
    if (getPieceAt(G, r, c)?.piece === RANK.RAT) return true
    r += dr
    c += dc
  }
  return false
}

export const JungleGame = {
  name: 'jungle',
  setup: () => ({
    cells: setupGrid(),
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
  moves: {
    movePiece: ({ G, ctx, playerID }, fromRow, fromCol, toRow, toCol) => {
      if (ctx.currentPlayer !== playerID) return
      const fromR = Number(fromRow)
      const fromC = Number(fromCol)
      const toR = Number(toRow)
      const toC = Number(toCol)
      const cell = getPieceAt(G, fromR, fromC)
      if (!cell || cell.player !== playerID) return
      const legal = getLegalMoves(G, fromR, fromC)
      const key = `${toR},${toC}`
      if (!legal.some(([r, c]) => `${r},${c}` === key)) return

      G.cells[fromR][fromC] = null
      G.cells[toR][toC] = { player: playerID, piece: cell.piece }
    },
  },
  endIf: ({ G, ctx }) => {
    const den0 = G.cells[DEN_0.r][DEN_0.c]
    const den1 = G.cells[DEN_1.r][DEN_1.c]
    if (den0?.player === '1') return { winner: '1' }
    if (den1?.player === '0') return { winner: '0' }
    const count = (player) => {
      let n = 0
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (G.cells[r][c]?.player === player) n++
      return n
    }
    if (count('1') === 0) return { winner: '0' }
    if (count('0') === 0) return { winner: '1' }
    return undefined
  },
}
