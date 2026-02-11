import { useState, useEffect } from 'react'
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

function generateMatchID() {
  return Math.random().toString(36).slice(2, 8)
}

const RULES_CONTENT = [
  { title: '基本移動與吃子', text: '每回合可前後左右移動一格。較大動物可吃較小動物，同類相遇可互吃。' },
  { title: '動物階級', text: '🐘象 > 🦁獅 > 🐯虎 > 🐆豹 > 🐺狼 > 🐕狗 > 🐱貓 > 🐀鼠。' },
  { title: '特殊吃法（鼠吃象）', text: '老鼠可以吃掉大象，大象不能吃老鼠（或象不能吃河中的鼠）。' },
  { title: '過河規則', text: '獅、虎：可以縱向或橫向跳過河流，並可吃掉對岸較小動物。但若河中有鼠（不論敵我），獅虎不能跳河。鼠：唯一可以下水（進入河中）的動物。在水中時，陸地上的動物無法吃鼠，鼠也不能吃陸地上的大象。' },
  { title: '陷阱', text: '每個獸穴旁有三個陷阱。敵方動物走入我方陷阱，我方任一動物皆可將其吃掉（此時陷阱中動物視為無戰鬥力）。' },
  { title: '獸穴', text: '進入敵方獸穴即獲勝。任何棋子不可進入自己的獸穴。' },
]

function RulesModal({ open, onClose }) {
  if (!open) return null
  return (
    <div className="rules-overlay" onClick={onClose} role="dialog" aria-label="遊戲規則">
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
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

function Lobby({ onCreate, onJoin }) {
  const [matchID, setMatchID] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)

  const handleJoin = () => {
    const code = parseCodeInput(matchID)
    if (code) onJoin(code)
  }

  return (
    <div className="lobby">
      <div className="lobby-hero">
        <span className="lobby-badge">象獅虎豹狼狗貓鼠</span>
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
        <div className="action-card action-card-create">
          <span className="action-icon" aria-hidden>✦</span>
          <h2>建立對局</h2>
          <p className="action-desc">創建房間，分享代碼給好友</p>
          <button type="button" onClick={() => onCreate(generateMatchID())}>
            建立遊戲
          </button>
        </div>
        <div className="action-card action-card-join">
          <span className="action-icon" aria-hidden>◆</span>
          <h2>加入對局</h2>
          <p className="action-desc">輸入代碼或貼上分享連結</p>
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
            加入遊戲
          </button>
        </div>
      </div>
      <p className="lobby-footer">1 vs 1 · P2P 對戰 · 無需註冊</p>
    </div>
  )
}

function getShareUrl(code) {
  return window.location.origin + (import.meta.env.BASE_URL || '/') + '?code=' + encodeURIComponent(code)
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
          text: `加入我的鬥獸棋對局，代碼：${displayMatchID}`,
          url: shareUrl,
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
        <RulesButton onClick={() => setRulesOpen(true)} />
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
        {isHost && <span className="waiting">等候對手</span>}
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
