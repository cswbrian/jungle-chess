# 鬥獸棋 P2P Web App (Zero Cost, Zero DB)

See full plan in `.cursor/plans/` or the overview below.

## Approach

- **Option 2 (boardgame.io + @boardgame.io/p2p)** – Host runs game master in-browser; peer connects with `matchID`. One game definition; framework syncs state. Deploy as static site (GitHub Pages / Cloudflare Pages).

## Implementation order

1. Game definition: `setup`, `moves.movePiece`, `turn`, `endIf`
2. Board UI: render from G/ctx, call `moves.movePiece(from, to)` on click
3. App: create (matchID, P2P isHost) vs join (matchID, P2P)
4. Polish: copy matchID, "Waiting for opponent…"
5. Deploy: Vite build → dist/

## Post-MVP

- Local storage: save game state for resume after refresh (see plan).
