# 鬥獸棋 Jungle Chess

1 vs 1 P2P 鬥獸棋 (Jungle / Dou Shou Qi) web app. No server, no database — uses [boardgame.io](https://boardgame.io/) with [@boardgame.io/p2p](https://github.com/boardgameio/p2p) (PeerJS) for signaling. Deploy as a static site to GitHub Pages or Cloudflare Pages.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. One tab: **Create game** and share the 6-letter code. Another tab (or device): **Join game** and enter the code.

## Build

```bash
npm run build
```

Output is in `dist/`.

## Deploy

- **GitHub Pages**: Push the repo, enable Pages (Settings → Pages → Source: Deploy from branch, folder `dist` or `/ (root)`). Set the build branch to the one that contains the built `dist/` (e.g. run `npm run build` and commit `dist/`, or use a GitHub Action to build).
- **Cloudflare Pages**: Connect the repo, set build command `npm run build`, build output directory `dist`.

Use **HTTPS** (required for WebRTC); both GitHub Pages and Cloudflare Pages provide it.

## Plan

See [PLAN.md](PLAN.md) for approach and post-MVP (e.g. local storage).
