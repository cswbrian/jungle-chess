import { useState, useEffect } from 'react'
import { Client } from 'boardgame.io/react'
import { Local } from 'boardgame.io'
import { P2P } from '@boardgame.io/p2p'
import { JungleGame } from './Game'
import { Board } from './Board'
import { PIECE_EMOJIS } from './constants'

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
  return <div className="loading">連線中…</div>
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
  debug: false,
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
  debug: false,
})

/** Board wrapper for local play: always show from current player's perspective and report turn changes. */
function LocalBoardWrapper(props) {
  const { ctx, onTurnChange } = props
  useEffect(() => {
    if (ctx?.currentPlayer && onTurnChange) {
      onTurnChange(ctx.currentPlayer)
    }
  }, [ctx?.currentPlayer, onTurnChange])
  return <Board {...props} playerID={ctx?.currentPlayer ?? '0'} />
}

const LocalClient = Client({
  game: JungleGame,
  board: LocalBoardWrapper,
  multiplayer: Local(),
  numPlayers: 2,
  loading: Loading,
  debug: false,
})

function generateMatchID() {
  return Math.random().toString(36).slice(2, 8)
}

const RULES_CONTENT = [
  { title: '移動與吃子', text: '前後左右一格。大吃小，同級互吃。' },
  { title: '階級', text: '🐘象 > 🦁獅 > 🐯虎 > 🐆豹 > 🐺狼 > 🐕狗 > 🐱貓 > 🐀鼠' },
  { title: '鼠吃象', text: '🐀鼠可吃🐘象，🐘象不能吃🐀鼠。' },
  { title: '河', text: '🦁獅🐯虎可跳河。河有🐀鼠則不能跳。🐀鼠可下水，水中無敵。' },
  { title: '陷阱', text: '敵入我方陷阱，任我方可吃。' },
  { title: '獸穴', text: '佔領敵方獸穴即勝。' },
]

function RulesModal({ open, onClose }) {
  if (!open) return null
  return (
    <div className="rules-overlay" role="dialog" aria-label="遊戲規則">
      <div className="rules-modal">
        <div className="rules-header">
          <h2>遊戲規則</h2>
          <button type="button" className="rules-close" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>
        <div className="rules-body">
          {RULES_CONTENT.map(({ title, text }, i) => (
            <section key={i}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function RulesButton({ onClick }) {
  return (
    <button type="button" className="rules-btn" onClick={onClick} title="遊戲規則">
      規則
    </button>
  )
}

function parseCodeInput(input) {
  const trimmed = input.trim().toLowerCase()
  const codeMatch = trimmed.match(/[?&]code=([a-z0-9]+)/)
  if (codeMatch) return codeMatch[1].slice(0, 8)
  try {
    const url = new URL(trimmed)
    const code = url.searchParams.get('code') || ''
    return code.slice(0, 8)
  } catch {
    return trimmed.slice(0, 8)
  }
}

function Lobby({ onCreate, onJoin, onLocal }) {
  const [matchID, setMatchID] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)

  const handleJoin = () => {
    const code = parseCodeInput(matchID)
    if (code) onJoin(code)
  }

  return (
    <div className="lobby">
      <div className="lobby-hero">
        <span className="lobby-badge">{[8,7,6,5,4,3,2,1].map(r => PIECE_EMOJIS[r]).join('')}</span>
        <h1 className="lobby-title">鬥獸棋</h1>
        <p className="lobby-subtitle">Jungle Chess</p>
        <button
          type="button"
          className="lobby-rules-link"
          onClick={() => setRulesOpen(true)}
        >
          遊戲規則
        </button>
      </div>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <div className="lobby-actions">
        <div className="action-card action-card-local">
          <span className="action-icon" aria-hidden>◉</span>
          <h2>同機對戰</h2>
          <p className="action-desc">兩人共用一台裝置輪流下棋</p>
          <button type="button" onClick={onLocal}>
            開始
          </button>
        </div>
        <span className="lobby-or">或</span>
        <div className="action-card action-card-create">
          <span className="action-icon" aria-hidden>✦</span>
          <h2>開新局</h2>
          <p className="action-desc">開房後將代碼分享畀朋友</p>
          <button type="button" onClick={() => onCreate(generateMatchID())}>
            開局
          </button>
        </div>
        <span className="lobby-or">或</span>
        <div className="action-card action-card-join">
          <span className="action-icon" aria-hidden>◆</span>
          <h2>加入棋局</h2>
          <p className="action-desc">輸入代碼或貼上連結</p>
          <input
            type="text"
            placeholder="輸入代碼或貼上連結"
            value={matchID}
            onChange={(e) => setMatchID(e.target.value)}
            maxLength={200}
          />
          <button
            type="button"
            onClick={handleJoin}
            disabled={!parseCodeInput(matchID)}
          >
            加入棋局
          </button>
        </div>
      </div>
      <p className="lobby-footer">1 vs 1 · 同機 或 P2P 對戰 · 無需註冊</p>
      <p className="lobby-disclaimer">重新整理或關閉視窗後，棋局會消失</p>
    </div>
  )
}

function getShareUrl(code) {
  return window.location.origin + (import.meta.env.BASE_URL || '/') + '?code=' + encodeURIComponent(code)
}

function LocalGameScreen({ matchID, onBack }) {
  const [viewingPlayer, setViewingPlayer] = useState('0')
  const [rulesOpen, setRulesOpen] = useState(false)

  return (
    <div className="game-screen">
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <header className="game-header game-header-local">
        <button type="button" className="back" onClick={onBack}>
          ← 返回
        </button>
        <span className="local-badge">同機對戰</span>
        <RulesButton onClick={() => setRulesOpen(true)} />
      </header>
      <LocalClient
        matchID={matchID}
        playerID={viewingPlayer}
        onTurnChange={setViewingPlayer}
      />
    </div>
  )
}

function GameScreen({ matchID, playerID, isHost, onBack }) {
  const ClientComponent = isHost ? HostClient : PeerClient
  const displayMatchID = matchID.replace(`${APP_ID}-`, '')
  const [rulesOpen, setRulesOpen] = useState(false)

  const shareUrl = getShareUrl(displayMatchID)

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '鬥獸棋',
          text: `加入我的鬥獸棋棋局，代碼：${displayMatchID}\n\n${shareUrl}`,
        })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    navigator.clipboard?.writeText(shareUrl)
  }

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(displayMatchID)
  }

  return (
    <div className="game-screen">
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <header className={`game-header player-${playerID}`}>
        <button type="button" className="back" onClick={onBack}>
          ← 返回
        </button>
        <div className="match-info">
          <code>{displayMatchID}</code>
          <button type="button" className="copy" onClick={handleCopyCode}>
            複製
          </button>
          {isHost && (
            <button type="button" className="share-link" onClick={handleShare}>
              分享
            </button>
          )}
        </div>
        <RulesButton onClick={() => setRulesOpen(true)} />
      </header>
      <ClientComponent matchID={matchID} playerID={playerID} />
    </div>
  )
}

function getJoinCodeFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('code') || params.get('join') || ''
}

export default function App() {
  const [game, setGame] = useState(null)

  useEffect(() => {
    const code = getJoinCodeFromUrl().trim().toLowerCase().slice(0, 8)
    if (code) {
      setGame({ matchID: `${APP_ID}-${code}`, playerID: '1', isHost: false })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (game?.isLocal) {
    return (
      <LocalGameScreen
        matchID={game.localMatchID}
        onBack={() => setGame(null)}
      />
    )
  }

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
      onLocal={() => setGame({ isLocal: true, localMatchID: `local-${generateMatchID()}` })}
    />
  )
}
