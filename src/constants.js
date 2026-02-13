// Board: 9 rows x 7 cols. Row 0 = player 0 back, row 8 = player 1 back.
export const ROWS = 9
export const COLS = 7

// Piece ranks (1 = Rat weakest, 8 = Elephant strongest)
export const RANK = {
  RAT: 1,
  CAT: 2,
  WOLF: 3,
  DOG: 4,
  LEOPARD: 5,
  TIGER: 6,
  LION: 7,
  ELEPHANT: 8,
}

// Traditional Chinese (繁體中文): 鼠 貓 狼 狗 豹 虎 獅 象
export const PIECE_NAMES = {
  1: '鼠',   // Rat, shǔ
  2: '貓',   // Cat, māo
  3: '狼',   // Wolf, láng
  4: '狗',   // Dog, gǒu
  5: '豹',   // Leopard, bào
  6: '虎',   // Tiger, hǔ
  7: '獅',   // Lion, shī
  8: '象',   // Elephant, xiàng
}

// Emoji for each piece
export const PIECE_EMOJIS = {
  1: '🐀',   // Rat
  2: '🐱',   // Cat
  3: '🐺',   // Wolf
  4: '🐕',   // Dog
  5: '🐆',   // Leopard
  6: '🐯',   // Tiger
  7: '🦁',   // Lion
  8: '🐘',   // Elephant
}

// Den at center of each back row
export const DEN_0 = { r: 0, c: 3 }
export const DEN_1 = { r: 8, c: 3 }

// Opponent traps (weakening): three around each den
export const TRAPS_0 = [{ r: 0, c: 2 }, { r: 0, c: 4 }, { r: 1, c: 3 }]
export const TRAPS_1 = [{ r: 8, c: 2 }, { r: 8, c: 4 }, { r: 7, c: 3 }]

// River: two 2×3 regions (2 cols × 3 rows each), ranks 4–6 (rows 3–5).
// Files b,c = left river; files e,f = right river (cols 1,2 and 4,5). File d (col 3) = middle land.
const RIVER_LEFT = [
  [3, 1], [3, 2], [4, 1], [4, 2], [5, 1], [5, 2]
]
const RIVER_RIGHT = [
  [3, 4], [3, 5], [4, 4], [4, 5], [5, 4], [5, 5]
]
export const RIVER_CELLS = new Set(RIVER_LEFT.concat(RIVER_RIGHT).map(([r, c]) => `${r},${c}`))

export function isRiver(r, c) {
  return RIVER_CELLS.has(`${r},${c}`)
}

export function isTrap(r, c, forPlayer) {
  const traps = forPlayer === '1' ? TRAPS_0 : TRAPS_1
  return traps.some(t => t.r === r && t.c === c)
}

export function isDen(r, c, forPlayer) {
  const den = forPlayer === '0' ? DEN_0 : DEN_1
  return den.r === r && den.c === c
}

// Lion/Tiger can jump over river (vertical or horizontal). Returns landing cell or null.
export function getRiverJump(r, c, dr, dc) {
  if (!isRiver(r + dr, c + dc)) return null
  let nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && isRiver(nr, nc)) {
    nr += dr
    nc += dc
  }
  if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !isRiver(nr, nc)) {
    return { r: nr, c: nc }
  }
  return null
}

// Initial piece positions [row, col] for each player.
// Order: Lion, Tiger, Leopard, Elephant, Rat, Cat, Wolf, Dog
export const INITIAL_0 = [
  [0, 6], [0, 0], [2, 4], [2, 0], [2, 6], [1, 1], [2, 2], [1, 5]
]
export const INITIAL_1 = [
  [8, 0], [8, 6], [6, 2], [6, 6], [6, 0], [7, 5], [6, 4], [7, 1]
]
