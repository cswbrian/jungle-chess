import { useState, useEffect, useCallback } from 'react'
import { Client } from 'boardgame.io/react'
import { Local } from 'boardgame.io'
import { SocketIO } from 'boardgame.io/multiplayer'
import { JungleGame } from './Game'
import { Board } from './Board'
import { PIECE_EMOJIS } from './constants'
import { checkServerHealth } from './utils/serverCheck'
import { trackEvent } from './utils/analytics'

const APP_ID = 'jungle-chess-v1'
const ONLINE_SESSION_KEY = 'jungle-chess-online-session'
const BGIO_SERVER_URL = (import.meta.env.VITE_BGIO_SERVER_URL || '').replace(/\/$/, '')
const SERVER_WAKE_MAX_WAIT_MS = 90000
const SERVER_WAKE_RETRY_MS = 3000

function Loading({ text = "連線中…" }) {
  return <div className="loading">{text}</div>
}

function OnlineLoading() {
  return <div className="loading">正在同步棋局…</div>
}

const OnlineClient = Client({
  game: JungleGame,
  board: OnlineBoardWrapper,
  multiplayer: SocketIO({
    server: BGIO_SERVER_URL || undefined,
  }),
  numPlayers: 2,
  loading: OnlineLoading,
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
  return <Board {...props} playerID={ctx?.currentPlayer ?? '0'} gameMode="local" />
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
  const normalize = (value) => {
    const cleaned = String(value || '').trim().toLowerCase()
    if (!cleaned) return ''
    if (cleaned.startsWith(`${APP_ID}-`)) {
      return cleaned.slice(APP_ID.length + 1).slice(0, 8)
    }
    return cleaned.slice(0, 8)
  }

  const trimmed = input.trim()
  const codeMatch = trimmed.toLowerCase().match(/[?&]code=([a-z0-9-]+)/)
  if (codeMatch) return normalize(codeMatch[1])
  try {
    const url = new URL(trimmed)
    const code = url.searchParams.get('code') || ''
    return normalize(code)
  } catch {
    return normalize(trimmed)
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

function OnlineBoardWrapper(props) {
  const { matchData, playerID, isConnected, onConnectionStateChange } = props

  useEffect(() => {
    if (!onConnectionStateChange) return
    onConnectionStateChange({
      transportConnected: Boolean(isConnected),
      opponentConnected: getOpponentConnected(matchData, playerID),
    })
  }, [isConnected, matchData, onConnectionStateChange, playerID])

  return <Board {...props} gameMode="online" />
}

function getApiBaseUrl() {
  return BGIO_SERVER_URL || window.location.origin
}

async function postLobby(path, body) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `HTTP ${response.status}`)
  }
  return response.json()
}

async function createOnlineSession() {
  const createResult = await postLobby(`/games/${JungleGame.name}/create`, {
    numPlayers: 2,
    unlisted: true,
  })
  const matchID = String(createResult.matchID || '')
  if (!matchID) throw new Error('無法建立棋局')
  const joinResult = await postLobby(`/games/${JungleGame.name}/${encodeURIComponent(matchID)}/join`, {
    playerID: '0',
    playerName: 'Host',
  })
  return {
    matchID,
    playerID: String(joinResult.playerID),
    credentials: joinResult.playerCredentials,
    isHost: true,
  }
}

async function joinOnlineSession(code) {
  const matchID = `${APP_ID}-${code}`
  const joinResult = await postLobby(`/games/${JungleGame.name}/${encodeURIComponent(matchID)}/join`, {
    playerID: '1',
    playerName: 'Guest',
  })
  return {
    matchID,
    playerID: String(joinResult.playerID),
    credentials: joinResult.playerCredentials,
    isHost: false,
  }
}

async function leaveOnlineSession({ matchID, playerID, credentials }) {
  if (!matchID || playerID == null || !credentials) return
  const controller = new AbortController()
  const timeoutID = window.setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`${getApiBaseUrl()}/games/${JungleGame.name}/${encodeURIComponent(matchID)}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerID, credentials }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `HTTP ${response.status}`)
    }
  } finally {
    window.clearTimeout(timeoutID)
  }
}

function saveOnlineSession(session) {
  if (!session) return
  localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify({
    matchID: session.matchID,
    playerID: session.playerID,
    credentials: session.credentials,
    isHost: Boolean(session.isHost),
  }))
}

function loadOnlineSession() {
  try {
    const raw = localStorage.getItem(ONLINE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.matchID || parsed?.playerID == null || !parsed?.credentials) return null
    return {
      matchID: String(parsed.matchID),
      playerID: String(parsed.playerID),
      credentials: String(parsed.credentials),
      isHost: Boolean(parsed.isHost),
    }
  } catch {
    return null
  }
}

function clearOnlineSession() {
  localStorage.removeItem(ONLINE_SESSION_KEY)
}

function Lobby({ onCreate, onJoin, onLocal, hasLocalGame, onlineBusy, onlineAction, onlineError }) {
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
          <p className="action-desc">兩人共用同一台裝置輪流下棋</p>
          <button type="button" onClick={onLocal}>
            {hasLocalGame ? '繼續遊戲' : '開始'}
          </button>
        </div>
        <div className="action-card action-card-p2p">
          <span className="action-icon" aria-hidden>✦</span>
          <h2>線上對戰</h2>
          <p className="action-desc">開新局分享代碼，或輸入代碼加入朋友棋局</p>
          <div className="p2p-actions">
            <button
              type="button"
              className="p2p-create-btn"
              onClick={onCreate}
              disabled={onlineBusy}
            >
              {onlineAction === 'creating'
                ? '喚醒伺服器中…'
                : onlineAction === 'joining'
                  ? '加入中…'
                  : '開新局'}
            </button>
            <div className="p2p-join-row">
              <input
                type="text"
                placeholder="輸入代碼或貼上連結"
                value={matchID}
                onChange={(e) => setMatchID(e.target.value)}
                maxLength={200}
                disabled={onlineBusy}
              />
              <button
                type="button"
                className="p2p-join-btn"
                onClick={handleJoin}
                disabled={onlineBusy || !parseCodeInput(matchID)}
              >
                加入棋局
              </button>
            </div>
          </div>
          {onlineAction === 'creating' && (
            <p className="lobby-wakeup-tip">正在喚醒伺服器，約需20~90秒。</p>
          )}
          {onlineError && <p className="lobby-disclaimer">{onlineError}</p>}
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

function GameScreen({ matchID, playerID, credentials, isHost, onBack }) {
  const displayMatchID = matchID.replace(`${APP_ID}-`, '')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [serverStatus, setServerStatus] = useState(BGIO_SERVER_URL ? 'checking' : 'ready') // checking, ready
  const [serverWaitMs, setServerWaitMs] = useState(0)
  const [transportConnected, setTransportConnected] = useState(false)
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [stateSynced, setStateSynced] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  useEffect(() => {
    // Check / wake Render server if using a custom server URL.
    let cancelled = false
    const startedAt = Date.now()
    setServerWaitMs(0)
    const waitTimerID = window.setInterval(() => {
      setServerWaitMs(Date.now() - startedAt)
    }, 1000)

    const warmupServer = async () => {
      if (!BGIO_SERVER_URL) {
        setServerStatus('ready')
        return
      }

      while (!cancelled) {
        try {
          const isHealthy = await checkServerHealth(BGIO_SERVER_URL)
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
    return () => {
      cancelled = true
      window.clearInterval(waitTimerID)
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
        trackEvent('native_share_used', { mode: 'online', is_host: Boolean(isHost) })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    navigator.clipboard?.writeText(shareUrl)
    setCopyFeedback('已複製連結')
    trackEvent('share_link_clicked', { mode: 'online', is_host: Boolean(isHost), method: 'clipboard_fallback' })
  }

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(displayMatchID)
    setCopyFeedback('已複製代碼')
    trackEvent('share_code_clicked', { mode: 'online', is_host: Boolean(isHost) })
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl)
    setCopyFeedback('已複製連結')
    trackEvent('share_link_clicked', { mode: 'online', is_host: Boolean(isHost), method: 'copy_button' })
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
      <div className={`p2p-status-banner ${(isHost ? opponentConnected : (transportConnected || stateSynced)) ? 'is-ready' : 'is-waiting'}`}>
        {isHost
          ? opponentConnected
            ? '對手已加入，開始對戰！'
            : '等待對手加入中：請先分享代碼或連結。'
          : (transportConnected || stateSynced)
            ? '已連上主機，開始對戰！'
            : '正在連線伺服器...'}
      </div>
      {isHost && !opponentConnected && (
        <section className="p2p-host-guide">
          <h3>邀請對手加入</h3>
          <p>1. 按「分享」或「複製代碼」傳給對手。</p>
          <p>2. 對手加入後，狀態會更新為「對手已加入」。</p>
          {copyFeedback && <p className="p2p-copy-feedback">{copyFeedback}</p>}
        </section>
      )}
      <OnlineClient
        matchID={matchID}
        playerID={playerID}
        credentials={credentials}
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
  const [onlineBusy, setOnlineBusy] = useState(false)
  const [onlineAction, setOnlineAction] = useState('idle')
  const [onlineError, setOnlineError] = useState('')

  const confirmBackToLobby = useCallback(() => {
    return window.confirm('確定要返回嗎？目前連線將會中斷。')
  }, [])

  const startLocalGame = () => {
    let id = localStorage.getItem('jungle-chess-local-match')
    const resumed = Boolean(id)
    if (!id) {
      id = `local-${generateMatchID()}`
      localStorage.setItem('jungle-chess-local-match', id)
    }
    trackEvent('lobby_local_start', { resumed })
    setGame({ isLocal: true, localMatchID: id })
  }

  const restartLocalGame = () => {
    if (!window.confirm('確定要重新開始嗎？目前的進度將會遺失。')) return
    
    const id = `local-${generateMatchID()}`
    localStorage.setItem('jungle-chess-local-match', id)
    trackEvent('local_restart_confirmed')
    setGame({ isLocal: true, localMatchID: id })
  }

  const startOnlineGame = useCallback(async () => {
    setOnlineBusy(true)
    setOnlineAction('creating')
    setOnlineError('')
    trackEvent('online_create_attempt')
    try {
      const session = await createOnlineSession()
      saveOnlineSession(session)
      trackEvent('online_create_success')
      setGame(session)
    } catch (error) {
      console.error(error)
      trackEvent('online_create_failed')
      setOnlineError('建立棋局失敗，伺服器可能仍在喚醒，請稍後重試。')
    } finally {
      setOnlineBusy(false)
      setOnlineAction('idle')
    }
  }, [])

  const joinOnlineGame = useCallback(async (code) => {
    setOnlineBusy(true)
    setOnlineAction('joining')
    setOnlineError('')
    try {
      const normalized = String(code || '').trim().toLowerCase().slice(0, 8)
      if (!normalized) return
      trackEvent('online_join_attempt')
      const session = await joinOnlineSession(normalized)
      saveOnlineSession(session)
      trackEvent('online_join_success')
      setGame(session)
    } catch (error) {
      console.error(error)
      trackEvent('online_join_failed')
      setOnlineError('加入失敗：請確認代碼正確，或稍後重試。')
    } finally {
      setOnlineBusy(false)
      setOnlineAction('idle')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      // URL join has higher priority than stored session.
      const code = getJoinCodeFromUrl().trim().toLowerCase().slice(0, 8)
      if (code) {
        trackEvent('online_restore_from_url')
        await joinOnlineGame(code)
        if (!cancelled) {
          window.history.replaceState({}, '', window.location.pathname)
        }
        return
      }
      const session = loadOnlineSession()
      if (!cancelled && session) {
        trackEvent('online_restore_from_storage', { is_host: Boolean(session.isHost) })
        setGame(session)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [joinOnlineGame])

  if (game?.isLocal) {
    return (
      <LocalGameScreen
        matchID={game.localMatchID}
        onBack={() => {
          if (!confirmBackToLobby()) return
          trackEvent('local_back_to_lobby')
          setGame(null)
        }}
        onRestart={restartLocalGame}
      />
    )
  }

  if (game) {
    return (
      <GameScreen
        matchID={game.matchID}
        playerID={game.playerID}
        credentials={game.credentials}
        isHost={game.isHost}
        onBack={async () => {
          if (!confirmBackToLobby()) return
          trackEvent('online_back_to_lobby')
          try {
            await leaveOnlineSession(game)
          } catch (error) {
            console.warn('Leave match failed:', error)
          }
          clearOnlineSession()
          setGame(null)
        }}
      />
    )
  }

  const hasLocalGame = (() => {
    const localMatchID = localStorage.getItem('jungle-chess-local-match')
    if (!localMatchID) return false
    try {
      const raw = localStorage.getItem('jungle-chess_state')
      if (!raw) return false
      const entries = JSON.parse(raw)
      const entry = Array.isArray(entries) && entries.find(([id]) => id === localMatchID)
      if (!entry) return false
      const state = entry[1]
      if (!state) return false
      const stateID = state._stateID
      const gameover = state.ctx?.gameover
      const hasProgress = (typeof stateID === 'number' && stateID > 0) || (gameover != null && gameover !== undefined)
      return hasProgress
    } catch {
      return false
    }
  })()

  return (
    <Lobby
      onCreate={startOnlineGame}
      onJoin={joinOnlineGame}
      onLocal={startLocalGame}
      hasLocalGame={hasLocalGame}
      onlineBusy={onlineBusy}
      onlineAction={onlineAction}
      onlineError={onlineError}
    />
  )
}
