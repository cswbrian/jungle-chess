# 鬥獸棋 Jungle Chess

1 vs 1 P2P 鬥獸棋 (Jungle / Dou Shou Qi) web app. Uses [boardgame.io](https://boardgame.io/) with [@boardgame.io/p2p](https://github.com/boardgameio/p2p) (PeerJS) for peer-to-peer gameplay. Deploy as a static site to GitHub Pages or Cloudflare Pages.

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

Output is in `dist/`. For production builds, set `VITE_PEERJS_HOST` to your PeerJS server hostname (see Deploy below).

## Deploy

The app needs a **PeerJS signaling server** for production. The default PeerJS cloud (`0.peerjs.com`) is unreliable on deployed sites; hosting your own fixes this.

### 1. Deploy the PeerJS server (Render, free)

1. Go to [render.com](https://render.com) and connect your GitHub repo.
2. New → **Web Service**.
3. Set **Root Directory** to `peerjs-server`.
4. Build Command: `npm install`, Start Command: `node index.js`.
5. Create → Free plan. Copy the hostname (e.g. `jungle-chess-peerjs.onrender.com`).

### 2. Deploy the static app

**GitHub Pages** (uses the included workflow):

1. Settings → Secrets and variables → Actions → **Variables**.
2. Add `VITE_PEERJS_HOST` = your Render hostname.
3. Push to `main`; the workflow builds and deploys.

**Cloudflare Pages**:

1. Connect the repo, build command `npm run build`, output `dist`.
2. Add env var `VITE_PEERJS_HOST` = your Render hostname.

HTTPS is required for WebRTC; both GitHub Pages and Cloudflare Pages provide it.

## Plan

See [PLAN.md](PLAN.md) for approach and post-MVP (e.g. local storage).
