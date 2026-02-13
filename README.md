# 鬥獸棋 Jungle Chess

1v1 Jungle Chess (Dou Shou Qi) built with React + boardgame.io.
Online mode uses a boardgame.io server (Socket.IO), so refresh can reconnect.

## Run locally

```bash
npm install
npm run server
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

Set local env:

```bash
VITE_BGIO_SERVER_URL=http://localhost:8000
```

## Deploy backend on Render

1. New **Web Service** from this repo.
2. Build command: `npm install`
3. Start command: `npm run server`
4. Env var: `CORS_ORIGINS=https://your-frontend-domain.com`
5. Deploy, then verify: `https://<service>.onrender.com/games`

## Connect frontend

Set frontend env:

`VITE_BGIO_SERVER_URL=https://<service>.onrender.com`

## Note

Render free tier may sleep. First reconnect can take ~20-90s.
