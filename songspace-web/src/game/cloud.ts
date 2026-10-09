import { reactive } from 'vue'
import { freshGame, game, persist, replaceGame } from './save.ts'
import { imagery } from './imagery.ts'

type Snapshot = { game: typeof game; imagery: typeof imagery }
type Session = { token: string; revision: number; dirty: boolean; gameId?: string }
const key = 'songspace.session.v1'
export const cloud = reactive<{ status: 'loading' | 'synced' | 'pending' | 'offline' | 'conflict'; error: string }>({ status: 'loading', error: '' })
let session: Session | null = null
try { session = JSON.parse(localStorage.getItem(key) || 'null') } catch { /* preserve the local game */ }
if (!session || typeof session.token !== 'string' || !Number.isInteger(session.revision)) session = null
export const identity = reactive({ gameId: session?.gameId || session?.token || '', valid: !!session })
export function hasSession() { return !!session && identity.valid }
let applying = false, running = false, queued = false, initialized = false
let timer: ReturnType<typeof setTimeout> | undefined
let reconnectTimer: ReturnType<typeof setTimeout> | undefined

function snapshot(): Snapshot { return JSON.parse(JSON.stringify({ game, imagery })) }
function cacheSession() { if (session) localStorage.setItem(key, JSON.stringify(session)) }
async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch('/api/v1/game/' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
    keepalive: method === 'PATCH',
  })
  if (response.status === 422) {
    const payload = await response.json().catch(() => null)
    const details: { loc?: string[]; type?: string }[] = Array.isArray(payload?.detail) ? payload.detail : []
    if (path === 'accounts') {
      if (details.some(item => item.loc?.join('.') === 'body.game_id' && item.type === 'missing')) throw new Error('api-outdated')
      if (details.some(item => item.loc?.join('.') === 'body.nickname' && ['string_too_short', 'string_too_long'].includes(item.type || ''))) throw new Error('invalid-name')
      throw new Error('invalid-registration')
    }
    throw new Error('invalid-id')
  }
  if (!response.ok) throw new Error(response.status === 409 ? path === 'accounts' ? 'duplicate' : 'conflict' : response.status === 401 ? 'session' : 'offline')
  return response.json()
}
function failed(error: unknown) {
  const reason = error instanceof Error ? error.message : 'offline'
  cloud.status = reason === 'conflict' ? 'conflict' : 'offline'
  cloud.error = reason === 'conflict' ? '存档有新版本，本机进度已保留。' : reason === 'session' ? '登录凭据失效，本机进度已保留。' : '连接暂时中断，正在自动重连。'
  if (reason === 'session') identity.valid = false
  clearTimeout(reconnectTimer)
  if (session && identity.valid && cloud.status === 'offline') {
    reconnectTimer = setTimeout(() => { void retrySave() }, 5000)
  }
}
function applySnapshot(state: Snapshot) {
  applying = true
  try {
    replaceGame(state.game)
    for (const world of ['forest', 'sea', 'jiangnan'] as const) imagery[world] = state.imagery?.[world] || []
    persist()
    localStorage.setItem('songspace.imagery.v2', JSON.stringify(imagery))
  } finally { applying = false }
}

// Switching identities must not discard a save still waiting to upload.
async function finishCurrentSave() {
  if (running) throw new Error('存档正在同步，请稍后再试。')
  if (!session?.dirty) return
  queued = true
  await flushSave()
  if (session.dirty) throw new Error('当前进度尚未同步，请先重新连接后再试。')
}
export async function logoutGame() {
  await finishCurrentSave()
  clearTimeout(timer)
  clearTimeout(reconnectTimer)
  localStorage.removeItem(key)
  localStorage.removeItem('songspace.game.v1')
  localStorage.removeItem('songspace.imagery.v2')
  queued = false
  session = null
  identity.gameId = ''
  identity.valid = false
  replaceGame(freshGame())
  for (const world of ['forest', 'sea', 'jiangnan'] as const) imagery[world] = []
  cloud.status = 'offline'
  cloud.error = ''
}
export async function startGame(name: string) {
  await finishCurrentSave()
  const state = { game: freshGame(), imagery: { forest: [], sea: [], jiangnan: [] } }
  state.game.name = name.trim()
  const result = await request('accounts', 'POST', { nickname: name.trim(), state })
  clearTimeout(timer)
  queued = false
  session = { token: result.token, revision: result.revision, dirty: false, gameId: result.game_id || result.token }
  identity.gameId = session.gameId!
  identity.valid = true
  cacheSession()
  applySnapshot(result.state)
  await connectSave()
}
export async function restoreGame(gameId: string) {
  await finishCurrentSave()
  const result = await request('sessions/restore', 'POST', { game_id: gameId.trim() })
  clearTimeout(timer)
  queued = false
  session = { token: result.token, revision: result.revision, dirty: false, gameId: result.game_id || result.token }
  identity.gameId = session.gameId!
  identity.valid = true
  cacheSession()
  applySnapshot(result.state)
  cloud.status = 'synced'
  cloud.error = ''
  await connectSave()
}
function schedule() {
  if (applying || !initialized) return
  queued = true
  if (session) { session.dirty = true; cacheSession() }
  if (cloud.status === 'conflict') return
  if (!session) { cloud.status = 'offline'; return }
  cloud.status = 'pending'
  clearTimeout(timer)
  timer = setTimeout(() => { void flushSave() }, 250)
}
export async function flushSave() {
  if (running || !session || !queued || cloud.status === 'conflict') return
  running = true
  try {
    while (queued) {
      queued = false
      const result = await request('save', 'PATCH', { revision: session.revision, state: snapshot() })
      session.revision = result.revision
      session.dirty = queued
      cacheSession()
    }
    cloud.status = 'synced'
    cloud.error = ''
    clearTimeout(reconnectTimer)
  } catch (error) { queued = true; failed(error) }
  finally { running = false }
}
export async function connectSave() {
  if (!session) return false
  cloud.status = 'loading'
  try {
    const result = await request('save')
    if (session.dirty) {
      if (session.revision !== result.revision) throw new Error('conflict')
      queued = true
    } else {
      applySnapshot(result.state)
      session.revision = result.revision
      cacheSession()
    }
    identity.valid = true
    cloud.status = 'synced'
    cloud.error = ''
    clearTimeout(reconnectTimer)
    await flushSave()
  } catch (error) { applying = false; failed(error) }
  if (!initialized) {
    initialized = true
    window.addEventListener('songspace:save', schedule)
    window.addEventListener('online', () => { void retrySave() })
    document.addEventListener('visibilitychange', () => { if (document.hidden) void flushSave() })
  }
  return cloud.status === 'synced'
}
export async function retrySave() {
  if (running || cloud.status === 'loading' || cloud.status === 'conflict') return
  if (session && queued) await flushSave()
  else await connectSave()
}
