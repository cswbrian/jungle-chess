import { createRequire } from 'node:module'
import { JungleGame } from '../src/Game.js'

const require = createRequire(import.meta.url)
const { Server, Origins } = require('boardgame.io/server')

const APP_ID = 'jungle-chess-v1'
const PORT = Number(process.env.PORT || 8000)
function generateMatchID() {
  return `${APP_ID}-${Math.random().toString(36).slice(2, 10)}`
}

function getAllowedOrigins() {
  const fromEnv = process.env.CORS_ORIGINS
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  }
  return [Origins.LOCALHOST, 'http://localhost:5173', 'http://127.0.0.1:5173']
}

const server = Server({
  games: [JungleGame],
  origins: getAllowedOrigins(),
  uuid: generateMatchID,
})

server.run(PORT, () => {
  console.log(`boardgame.io server listening on ${PORT}`)
})
