import { createRequire } from 'node:module'
import { JungleGame } from '../src/Game.js'

const require = createRequire(import.meta.url)
const { Server, Origins } = require('boardgame.io/server')
const { koaBody } = require('koa-body')

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

server.router.post('/games/:name/:id/restart', koaBody(), async (ctx) => {
  const gameName = String(ctx.params.name || '')
  const matchID = String(ctx.params.id || '')
  const playerID = String(ctx.request.body?.playerID ?? '')
  const credentials = ctx.request.body?.credentials

  if (gameName !== JungleGame.name) {
    ctx.throw(404, `Game ${gameName} not found`)
  }
  if (!matchID) {
    ctx.throw(400, 'matchID is required')
  }
  if (!playerID) {
    ctx.throw(403, 'playerID is required')
  }

  const { metadata, initialState } = await server.db.fetch(matchID, {
    metadata: true,
    initialState: true,
  })

  if (!metadata) {
    ctx.throw(404, `Match ${matchID} not found`)
  }
  if (!metadata.players?.[playerID]) {
    ctx.throw(404, `Player ${playerID} not found`)
  }
  if (!initialState) {
    ctx.throw(409, 'Initial state not found')
  }

  const isAuthorized = await server.auth.authenticateCredentials({
    playerID,
    credentials,
    metadata,
  })
  if (!isAuthorized) {
    ctx.throw(403, `Invalid credentials ${credentials}`)
  }

  const nextMetadata = {
    ...metadata,
    updatedAt: Date.now(),
  }
  delete nextMetadata.gameover
  delete nextMetadata.nextMatchID

  await server.db.setState(matchID, initialState)
  await server.db.setMetadata(matchID, nextMetadata)

  ctx.body = { restarted: true }
})

server.run(PORT, () => {
  console.log(`boardgame.io server listening on ${PORT}`)
})
