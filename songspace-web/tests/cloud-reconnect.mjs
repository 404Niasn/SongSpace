import assert from 'node:assert/strict'

const memory = new Map([['songspace.session.v1', JSON.stringify({ token: 'test-session', revision: 3, dirty: false })]])
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) }
globalThis.window = new EventTarget()
const timers = new Map()
let nextTimer = 0
globalThis.setTimeout = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id }
globalThis.clearTimeout = id => timers.delete(id)
const { game, persist, freshGame } = await import('../src/game/save.ts')
globalThis.document = new EventTarget()
const { cloud, connectSave, flushSave, logoutGame } = await import('../src/game/cloud.ts')
let offline = true
const remote = { revision: 3, state: { game: { ...freshGame(), notes: 120 }, imagery: {} } }
globalThis.fetch = async (_url, options) => {
  if (offline) throw new Error('offline')
  if (options.method === 'PATCH') {
    const body = JSON.parse(options.body)
    assert.equal(body.revision, remote.revision)
    remote.state = body.state
    remote.revision++
  }
  return { ok: true, status: 200, json: async () => structuredClone(remote) }
}
const reconnects = () => [...timers.entries()].filter(([, timer]) => timer.delay === 5000)
async function reconnect() {
  const [id, timer] = reconnects()[0]
  timers.delete(id)
  timer.callback()
  await new Promise(setImmediate)
}

assert.equal(await connectSave(), false)
assert.equal(cloud.status, 'offline')
assert.equal(reconnects().length, 1)
offline = false
await reconnect()
assert.equal(cloud.status, 'synced', 'Backend recovery reconnects without a browser online event')
assert.equal(game.notes, 120)
assert.equal(reconnects().length, 0)

game.notes = 155
persist()
offline = true
await flushSave()
assert.equal(cloud.status, 'offline')
assert.equal(game.notes, 155)
offline = false
await reconnect()
assert.equal(cloud.status, 'synced')
assert.equal(remote.state.game.notes, 155, 'Reconnect uploads pending progress without replacing it')

offline = true
await connectSave()
assert.equal(reconnects().length, 1)
offline = false
await logoutGame()
assert.equal(reconnects().length, 0, 'Logout cancels pending reconnects')
assert.equal(await connectSave(), false)

console.log('PASS: automatic backend recovery, pending progress preservation and logout cancellation')
