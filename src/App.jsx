import { useState } from 'react'
import { Client } from 'boardgame.io/react'
import { P2P } from '@boardgame.io/p2p'
import { JungleGame } from './Game'
import { Board } from './Board'

function Loading() {
  return <div className="loading">Connecting…</div>
}

const HostClient = Client({
  game: JungleGame,
  board: Board,
  multiplayer: P2P({ isHost: true }),
  numPlayers: 2,
  loading: Loading,
})

const PeerClient = Client({
  game: JungleGame,
  board: Board,
  multiplayer: P2P(),
  numPlayers: 2,
  loading: Loading,
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
  return (
    <div className="game-screen">
      <header className="game-header">
        <button type="button" className="back" onClick={onBack}>
          ← Back
        </button>
        <div className="match-info">
          <span>Code: </span>
          <code>{matchID}</code>
          <button
            type="button"
            className="copy"
            onClick={() => navigator.clipboard?.writeText(matchID)}
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
      onCreate={(matchID) => setGame({ matchID, playerID: '0', isHost: true })}
      onJoin={(matchID) => setGame({ matchID, playerID: '1', isHost: false })}
    />
  )
}
