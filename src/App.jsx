import { useState, useEffect } from 'react'
import { Client } from 'boardgame.io/react'
import { Local } from 'boardgame.io'
import { P2P } from '@boardgame.io/p2p'
import { JungleGame } from './Game'
import { Board } from './Board'
import { PIECE_EMOJIS } from './constants'
import { checkServerHealth } from './utils/serverCheck'

const APP_ID = 'jungle-chess-v1'
const P2P_ERROR_EVENT = 'bgio-p2p-error'

// Build PeerJS options from environment variable.
// Set VITE_PEERJS_HOST to your deployed PeerJS server hostname
// (e.g. "jungle-chess-peerjs.onrender.com").
const peerjsHost = import.meta.env.VITE_PEERJS_HOST

// Enhanced ICE servers list for better connectivity
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
]

const peerOptions = peerjsHost
  ? {
      host: peerjsHost,
      port: 443,
      secure: true,
      path: '/',
      config: { iceServers },
    }
  : {
      // Fallback: use default PeerJS cloud (works locally)
      config: { iceServers },
    }

function Loading({ text = "連線中…" }) {
  return <div className="loading">{text}</div>
}

const dispatchError = (e) => {
  console.error('[P2P Error]', e)
  window.dispatchEvent(new CustomEvent(P2P_ERROR_EVENT, { detail: e }))
}

const HostClient = Client({
  game: JungleGame,
  board: Board,
  multiplayer: P2P({
    isHost: true,
    peerOptions,
    onError: dispatchError,
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
    onError: dispatchError,
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
  multiplayer: Local({ persist: true, storageKey: 'jungle-chess' }),
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
      <p className="lobby-disclaimer">同機對戰會自動儲存進度，P2P 對戰則會在重新整理後消失</p>
    </div>
  )
}

function getShareUrl(code) {
  return window.location.origin + (import.meta.env.BASE_URL || '/') + '?code=' + encodeURIComponent(code)
}

function LocalGameScreen({ matchID, onBack, onRestart }) {
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
        <button type="button" className="restart-btn" onClick={onRestart} title="重新開始">
          ↻
        </button>
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
  const [serverStatus, setServerStatus] = useState(peerjsHost ? 'checking' : 'ready') // checking, ready, error
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    // 1. Check server health if using custom host
    const checkServer = async () => {
      if (!peerjsHost) return
      
      try {
        const isHealthy = await checkServerHealth(`https://${peerjsHost}`)
        if (isHealthy) {
          setServerStatus('ready')
        } else {
          console.warn('Server check failed, but attempting connection anyway...')
          setServerStatus('ready') // Proceed but maybe log
        }
      } catch (e) {
        console.error(e)
        setServerStatus('ready') // Fallback to try anyway
      }
    }

    if (peerjsHost) {
      checkServer()
    }

    // 2. Listen for P2P errors
    const handleError = (event) => {
      const error = event.detail
      console.error('Caught P2P Error:', error)
      
      // Filter common noise errors if needed, or show all
      let msg = '連線發生錯誤'
      if (error.type === 'peer-unavailable') msg = '找不到對手或對手已離線'
      if (error.type === 'network') msg = '網路連線不穩定'
      if (error.type === 'server-error') msg = '伺服器連線失敗'
      
      setConnectionError(msg)
    }

    window.addEventListener(P2P_ERROR_EVENT, handleError)
    return () => window.removeEventListener(P2P_ERROR_EVENT, handleError)
  }, [])

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

  if (serverStatus === 'checking') {
    return (
      <div className="game-screen">
         <header className={`game-header player-${playerID}`}>
          <button type="button" className="back" onClick={onBack}>
            ← 返回
          </button>
        </header>
        <Loading text="正在喚醒伺服器..." />
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="game-screen">
        <header className={`game-header player-${playerID}`}>
          <button type="button" className="back" onClick={onBack}>
            ← 返回
          </button>
        </header>
        <div className="lobby" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
          <div className="action-card">
             <span className="action-icon">⚠</span>
             <h2>連線錯誤</h2>
             <p>{connectionError}</p>
             <button onClick={() => window.location.reload()}>重試</button>
          </div>
        </div>
      </div>
    )
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

  const startLocalGame = () => {
    let id = localStorage.getItem('jungle-chess-local-match')
    if (!id) {
      id = `local-${generateMatchID()}`
      localStorage.setItem('jungle-chess-local-match', id)
    }
    setGame({ isLocal: true, localMatchID: id })
  }

  const restartLocalGame = () => {
    if (!window.confirm('確定要重新開始嗎？目前的進度將會遺失。')) return
    
    const id = `local-${generateMatchID()}`
    localStorage.setItem('jungle-chess-local-match', id)
    setGame({ isLocal: true, localMatchID: id })
  }

  // Check if there's a saved local game state
  const hasSavedLocalGame = (matchID) => {
    try {
      const stateData = localStorage.getItem('jungle-chess_state')
      if (!stateData) return false
      const stateMap = JSON.parse(stateData)
      // Check if there's a state entry for this matchID
      const entry = stateMap.find(([id]) => id === matchID)
      if (!entry) return false
      // Check if the game is not finished
      const state = entry[1]
      return state && !state.ctx?.gameover
    } catch {
      return false
    }
  }

  useEffect(() => {
    // Check for P2P join code first
    const code = getJoinCodeFromUrl().trim().toLowerCase().slice(0, 8)
    if (code) {
      setGame({ matchID: `${APP_ID}-${code}`, playerID: '1', isHost: false })
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    // Check for saved local game and auto-restore if it exists
    const savedMatchID = localStorage.getItem('jungle-chess-local-match')
    if (savedMatchID && hasSavedLocalGame(savedMatchID)) {
      setGame({ isLocal: true, localMatchID: savedMatchID })
    }
  }, [])

  if (game?.isLocal) {
    return (
      <LocalGameScreen
        matchID={game.localMatchID}
        onBack={() => setGame(null)}
        onRestart={restartLocalGame}
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
      onLocal={startLocalGame}
    />
  )
}
