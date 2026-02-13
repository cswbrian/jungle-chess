# 鬥獸棋 Jungle Chess

1 vs 1 鬥獸棋 (Jungle / Dou Shou Qi) web app. The online mode uses an authoritative [boardgame.io](https://boardgame.io/) server (Socket.IO transport), so refresh can reconnect to the same match when session data is still valid.

## Run locally

```bash
npm install
npm run server
npm run dev
```

- Frontend: http://localhost:5173
- boardgame.io server: http://localhost:8000

For local frontend env, set:

```bash
VITE_BGIO_SERVER_URL=http://localhost:8000
```

## Build

```bash
npm run build
```

Output is in `dist/`.

## Deploy (Render + Static Hosting)

### 1) Deploy boardgame.io server on Render

1. Connect the repo in Render.
2. Create a **Web Service**.
3. Root directory: project root.
4. Build command: `npm install`
5. Start command: `npm run server`
6. Add env vars:
   - `PORT` (Render usually sets this automatically)
   - `CORS_ORIGINS` (comma-separated, include your frontend domains)

### 2) Deploy frontend (GitHub Pages / Cloudflare Pages)

Set:

```bash
VITE_BGIO_SERVER_URL=https://<your-render-service>.onrender.com
```

## Notes on Free Tier Wake-Up

Render free services may sleep after inactivity. First connection after idle can take 20-90 seconds. The frontend shows a wake-up progress message and keeps retrying.
