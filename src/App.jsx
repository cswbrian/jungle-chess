import { useState } from 'react'
import { Client } from 'boardgame.io/react'
import { P2P } from '@boardgame.io/p2p'
import { JungleGame } from './Game'
import { Board } from './Board'

const APP_ID = 'jungle-chess-v1'

// Build PeerJS options from environment variable.
// Set VITE_PEERJS_HOST to your deployed PeerJS server hostname
// (e.g. "jungle-chess-peerjs.onrender.com").
const peerjsHost = import.meta.env.VITE_PEERJS_HOST
const peerOptions = peerjsHost
  ? {
      host: peerjsHost,
      port: 443,
      secure: true,
      path: '/',
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    }
  : {
      // Fallback: use default PeerJS cloud (works locally)
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    }

function Loading() {
  return <div className="loading">Connecting…</div>
}

const HostClient = Client({
  game: JungleGame,
  board: Board,
  multiplayer: P2P({
    isHost: true,
    peerOptions,
    onError: (e) => console.error('[P2P Host]', e),
  }),
  numPlayers: 2,
  loading: Loading,
  debug: { collapseOnLoad: true },
})

const PeerClient = Client({
  game: JungleGame,
  board: Board,
  multiplayer: P2P({
    peerOptions,
    onError: (e) => console.error('[P2P Peer]', e),
  }),
  numPlayers: 2,
  loading: Loading,
  debug: { collapseOnLoad: true },
})

function generateMatchID() {
  return Math.random().toString(36).slice(2, 8)
}

function Lobby({ onCreate, onJoin }) {
  const [matchID, setMatchID] = useState('')

  return (
    <div className="lobby">
      <h1>鬥獸棋 Jungle Chess</h1>
      <p className="subtitle">1 vs 1 P2P — share the code to play</p>
      <div className="lobby-actions">
        <div className="action-card">
          <h2>Create game</h2>
          <button type="button" onClick={() => onCreate(generateMatchID())}>
            Create game
          </button>
        </div>
        <div className="action-card">
          <h2>Join game</h2>
          <input
            type="text"
            placeholder="Enter 6-letter code"
            value={matchID}
            onChange={(e) => setMatchID(e.target.value.trim().toLowerCase().slice(0, 8))}
            maxLength={8}
          />
          <button
            type="button"
            onClick={() => matchID && onJoin(matchID)}
            disabled={!matchID}
          >
            Join game
          </button>
        </div>
      </div>
    </div>
  )
}

function GameScreen({ matchID, playerID, isHost, onBack }) {
  const ClientComponent = isHost ? HostClient : PeerClient
  const displayMatchID = matchID.replace(`${APP_ID}-`, '')

  return (
    <div className="game-screen">
      <header className="game-header">
        <button type="button" className="back" onClick={onBack}>
          ← Back
        </button>
        <div className="match-info">
          <span>Code: </span>
          <code>{displayMatchID}</code>
          <button
            type="button"
            className="copy"
            onClick={() => navigator.clipboard?.writeText(displayMatchID)}
          >
            Copy
          </button>
        </div>
        {isHost && (
          <span className="waiting">Share the code. Waiting for opponent…</span>
        )}
      </header>
      <ClientComponent matchID={matchID} playerID={playerID} />
    </div>
  )
}

export default function App() {
  const [game, setGame] = useState(null)

  if (game) {
    return (
      <GameScreen
        matchID={game.matchID}
        playerID={game.playerID}
        isHost={game.isHost}
        onBack={() => setGame(null)}
      />
    )
  }

  return (
    <Lobby
      onCreate={(matchID) => setGame({ matchID: `${APP_ID}-${matchID}`, playerID: '0', isHost: true })}
      onJoin={(matchID) => setGame({ matchID: `${APP_ID}-${matchID}`, playerID: '1', isHost: false })}
    />
  )
}
