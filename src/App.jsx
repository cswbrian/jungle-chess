import { useState, useEffect, useCallback } from 'react'
import { Client } from 'boardgame.io/react'
import { Local } from 'boardgame.io'
import { P2P } from '@boardgame.io/p2p'
import { JungleGame } from './Game'
import { Board } from './Board'
import { PIECE_EMOJIS } from './constants'
import { checkServerHealth } from './utils/serverCheck'

const APP_ID = 'jungle-chess-v1'
const P2P_ERROR_EVENT = 'bgio-p2p-error'
const SERVER_WAKE_MAX_WAIT_MS = 90000
const SERVER_WAKE_RETRY_MS = 3000

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

function P2PLoading() {
  return <div className="loading">正在同步棋局…</div>
}

const dispatchError = (e) => {
  console.error('[P2P Error]', e)
  window.dispatchEvent(new CustomEvent(P2P_ERROR_EVENT, { detail: e }))
}

const HostClient = Client({
  game: JungleGame,
  board: P2PBoardWrapper,
  multiplayer: P2P({
    isHost: true,
    peerOptions,
    onError: dispatchError,
  }),
  numPlayers: 2,
  loading: P2PLoading,
  debug: false,
})

const PeerClient = Client({
  game: JungleGame,
  board: P2PBoardWrapper,
  multiplayer: P2P({
    peerOptions,
    onError: dispatchError,
  }),
  numPlayers: 2,
  loading: P2PLoading,
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

const HERO_RELATIONSHIPS = [
  [8, 7],
  [7, 6],
  [6, 5],
  [5, 4],
  [4, 3],
  [3, 2],
  [2, 1],
  [1, 8], // Special rule: mouse can capture elephant.
]

function AnimatedHeroRelationship() {
  const [relationIndex, setRelationIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRelationIndex((prev) => (prev + 1) % HERO_RELATIONSHIPS.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [])

  const [attackerRank, defenderRank] = HERO_RELATIONSHIPS[relationIndex]
  const attacker = PIECE_EMOJIS[attackerRank]
  const defender = PIECE_EMOJIS[defenderRank]

  return (
    <div className="hero-relation" aria-live="polite" aria-label="棋子大小關係">
      <div key={relationIndex} className="hero-relation-pair">
        <span className="hero-relation-emoji">{attacker}</span>
        <span className="hero-relation-symbol">&gt;</span>
        <span className="hero-relation-emoji">{defender}</span>
      </div>
    </div>
  )
}

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

function BuyMeCoffeeFooter() {
  return (
    <footer className="bmc-footer">
      <a 
        href="https://buymeacoffee.com/coolsunwind" 
        target="_blank" 
        rel="noopener noreferrer"
        className="bmc-link"
      >
        <span className="bmc-icon">☕</span>
        <span className="bmc-text">Buy me a coffee</span>
      </a>
    </footer>
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

function getPlayerMatchDataEntry(matchData, playerID) {
  if (!matchData || playerID == null) return null

  if (Array.isArray(matchData)) {
    return matchData.find((entry) => String(entry?.id) === String(playerID)) || null
  }

  if (typeof matchData === 'object') {
    const entry = matchData[playerID]
    if (entry && typeof entry === 'object') return entry
  }

  return null
}

function isPlayerConnected(entry) {
  if (!entry) return false
  if (typeof entry.isConnected === 'boolean') return entry.isConnected
  if (typeof entry.connected === 'boolean') return entry.connected
  return false
}

function getOpponentConnected(matchData, playerID) {
  if (playerID == null) return false
  const opponentID = String(playerID) === '0' ? '1' : '0'
  return isPlayerConnected(getPlayerMatchDataEntry(matchData, opponentID))
}

function P2PBoardWrapper(props) {
  const { matchData, playerID, isConnected, onConnectionStateChange } = props

  useEffect(() => {
    if (!onConnectionStateChange) return
    onConnectionStateChange({
      transportConnected: Boolean(isConnected),
      opponentConnected: getOpponentConnected(matchData, playerID),
    })
  }, [isConnected, matchData, onConnectionStateChange, playerID])

  return <Board {...props} />
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
        <AnimatedHeroRelationship />
        <h1 className="lobby-title">鬥獸棋</h1>
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
        <div className="action-card action-card-p2p">
          <span className="action-icon" aria-hidden>✦</span>
          <h2>P2P 對戰</h2>
          <p className="action-desc">可開新局分享代碼，或輸入代碼加入朋友棋局</p>
          <div className="p2p-actions">
            <button
              type="button"
              className="p2p-create-btn"
              onClick={() => onCreate(generateMatchID())}
            >
              開新局
            </button>
            <div className="p2p-join-row">
              <input
                type="text"
                placeholder="輸入代碼或貼上連結"
                value={matchID}
                onChange={(e) => setMatchID(e.target.value)}
                maxLength={200}
              />
              <button
                type="button"
                className="p2p-join-btn"
                onClick={handleJoin}
                disabled={!parseCodeInput(matchID)}
              >
                加入棋局
              </button>
            </div>
          </div>
          <p className="lobby-disclaimer">同機對戰會自動儲存進度，P2P 對戰則會在重新整理後消失</p>
        </div>
      </div>
      <BuyMeCoffeeFooter />
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
      <BuyMeCoffeeFooter />
    </div>
  )
}

function GameScreen({ matchID, playerID, isHost, onBack }) {
  const ClientComponent = isHost ? HostClient : PeerClient
  const displayMatchID = matchID.replace(`${APP_ID}-`, '')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [serverStatus, setServerStatus] = useState(peerjsHost ? 'checking' : 'ready') // checking, ready
  const [serverWaitMs, setServerWaitMs] = useState(0)
  const [connectionError, setConnectionError] = useState(null)
  const [transportConnected, setTransportConnected] = useState(false)
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [stateSynced, setStateSynced] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  useEffect(() => {
    // 1. Check / wake server if using custom host (handles cold starts).
    let cancelled = false
    const startedAt = Date.now()
    setServerWaitMs(0)
    const waitTimerID = window.setInterval(() => {
      setServerWaitMs(Date.now() - startedAt)
    }, 1000)

    const warmupServer = async () => {
      if (!peerjsHost) {
        setServerStatus('ready')
        return
      }

      while (!cancelled) {
        try {
          const isHealthy = await checkServerHealth(`https://${peerjsHost}`)
          if (cancelled) return
          if (isHealthy) {
            setServerStatus('ready')
            return
          }
        } catch (e) {
          console.error(e)
        }

        const elapsed = Date.now() - startedAt
        if (elapsed >= SERVER_WAKE_MAX_WAIT_MS) {
          console.warn('Server wake-up timeout. Proceeding to direct connection attempts.')
          setServerStatus('ready')
          return
        }

        await new Promise((resolve) => window.setTimeout(resolve, SERVER_WAKE_RETRY_MS))
      }
    }

    warmupServer()

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
    return () => {
      cancelled = true
      window.clearInterval(waitTimerID)
      window.removeEventListener(P2P_ERROR_EVENT, handleError)
    }
  }, [])

  useEffect(() => {
    if (!copyFeedback) return undefined
    const timerID = window.setTimeout(() => setCopyFeedback(''), 1400)
    return () => window.clearTimeout(timerID)
  }, [copyFeedback])

  const handleConnectionStateChange = useCallback(({ transportConnected: connected, opponentConnected: joined }) => {
    setTransportConnected(Boolean(connected))
    setOpponentConnected(Boolean(joined))
    setStateSynced(true)
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
    setCopyFeedback('已複製連結')
  }

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(displayMatchID)
    setCopyFeedback('已複製代碼')
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl)
    setCopyFeedback('已複製連結')
  }

  if (serverStatus === 'checking') {
    const waitedSeconds = Math.floor(serverWaitMs / 1000)
    const remainingSeconds = Math.max(0, Math.ceil((SERVER_WAKE_MAX_WAIT_MS - serverWaitMs) / 1000))
    const progressPercent = Math.min(100, Math.round((serverWaitMs / SERVER_WAKE_MAX_WAIT_MS) * 100))

    return (
      <div className="game-screen">
         <header className={`game-header player-${playerID}`}>
          <button type="button" className="back" onClick={onBack}>
            ← 返回
          </button>
        </header>
        <div className="loading">
          <p>正在喚醒伺服器...</p>
          <div className="server-progress-bar">
            <div className="server-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="server-waiting-note">已等待 {waitedSeconds} 秒</p>
          <p className="server-waiting-note">免費伺服器閒置後會休眠，連線需時重啟，請多包涵。</p>
          <p className="server-waiting-note">約需 <strong>20 ~ 90 秒</strong>，請耐心等候。</p>
          {remainingSeconds > 0 && (
            <p className="server-waiting-note server-waiting-fallback">若仍無回應，約 {remainingSeconds} 秒後會直接嘗試連線。</p>
          )}
        </div>
        <BuyMeCoffeeFooter />
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
        <BuyMeCoffeeFooter />
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
      <div className={`p2p-status-banner ${(isHost ? opponentConnected : stateSynced) ? 'is-ready' : 'is-waiting'}`}>
        {isHost
          ? opponentConnected
            ? '對手已加入，開始對戰！'
            : '等待對手加入中：請先分享代碼或連結。'
          : stateSynced
            ? '已連上主機，開始對戰！'
            : '正在連線主機...'}
      </div>
      {isHost && !opponentConnected && (
        <section className="p2p-host-guide">
          <h3>邀請對手加入</h3>
          <p>1. 按「分享」或「複製代碼」傳給對手。</p>
          <p>2. 對手加入後，狀態會更新為「對手已加入」。</p>
          {copyFeedback && <p className="p2p-copy-feedback">{copyFeedback}</p>}
        </section>
      )}
      <ClientComponent
        matchID={matchID}
        playerID={playerID}
        onConnectionStateChange={handleConnectionStateChange}
      />
      <BuyMeCoffeeFooter />
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

  useEffect(() => {
    // Check for P2P join code first
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
