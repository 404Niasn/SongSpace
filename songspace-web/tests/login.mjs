import assert from 'node:assert/strict'

const memory = new Map()
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) }
globalThis.window = new EventTarget()
const { game, persist } = await import('../src/game/save.ts')
const { imagery } = await import('../src/game/imagery.ts')
globalThis.document = new EventTarget()
const { connectSave, startGame, restoreGame, hasSession, identity, flushSave, cloud, logoutGame } = await import('../src/game/cloud.ts')
const profiles = new Map()
let calls = 0, offline = false
globalThis.fetch = async (url, options) => {
  calls++
  if (offline) throw new Error('offline')
  const body = options.body ? JSON.parse(options.body) : undefined
  const token = options.headers.Authorization?.slice(7)
  const reply = (status, value) => ({ ok: status < 400, status, json: async () => structuredClone(value) })
  if (url.endsWith('/accounts')) {
    if (profiles.has(body.game_id)) return reply(409, {})
    profiles.set(body.game_id, { token: 'ID-' + Buffer.from(body.game_id).toString('base64url'), game_id: body.game_id, revision: 0, state: body.state })
    return reply(201, profiles.get(body.game_id))
  }
  if (url.endsWith('/restore')) return profiles.has(body.game_id) ? reply(200, profiles.get(body.game_id)) : reply(401, {})
  const profile = [...profiles.values()].find(profile => profile.token === token)
  if (!profile) return reply(401, {})
  if (options.method === 'PATCH') {
    if (body.revision !== profile.revision) return reply(409, {})
    profile.state = body.state
    profile.revision++
    return reply(200, { revision: profile.revision })
  }
  return reply(200, profile)
}
assert.equal(await connectSave(), false)
assert.equal(calls, 0, 'Opening the login page does not create a player')
await startGame('新玩家')
assert.equal(hasSession(), true)
assert.equal(game.name, '新玩家')
game.notes = 200
persist()
await flushSave()
assert.equal(profiles.get('新玩家').state.game.notes, 200)
assert.equal(cloud.status, 'synced')
await assert.rejects(restoreGame('wrong-id'), /session/)
assert.equal(identity.gameId, '新玩家')
assert.equal(game.notes, 200, 'Bad IDs do not change the active save')
game.runs = 99
imagery.sea = [{ songId: 'old-song', x: 1, z: 1, rotation: 0 }]
profiles.set('legacy-ID', { token: 'legacy-ID', revision: 4, state: { game: { name: '老玩家', notes: 50, owned: {}, packs: {} }, imagery: {} } })
await restoreGame('legacy-ID')
assert.equal(identity.gameId, 'legacy-ID')
assert.equal(game.name, '老玩家')
assert.equal(game.notes, 50)
assert.equal(game.runs, 0, 'Fields absent from an older save do not leak from another player')
assert.deepEqual(imagery.sea, [])
game.notes = 75
persist()
offline = true
await assert.rejects(restoreGame('新玩家'), /尚未同步/)
assert.equal(identity.gameId, 'legacy-ID')
assert.equal(game.notes, 75, 'Offline switching preserves unsynced progress')
offline = false
await flushSave()
assert.equal(profiles.get('legacy-ID').state.game.notes, 75)
await assert.rejects(startGame('新玩家'), /duplicate/)
assert.equal(identity.gameId, 'legacy-ID')
assert.equal(game.notes, 75)
await startGame('另一个玩家')
assert.equal(identity.gameId, '另一个玩家')
assert.equal(game.notes, 120, 'Registering another account starts a fresh save')
assert.deepEqual(game.owned, {})
await restoreGame('新玩家')
assert.equal(game.notes, 200, 'Named IDs restore the original account')
game.notes = 250
persist()
offline = true
await assert.rejects(logoutGame(), /尚未同步/)
assert.equal(hasSession(), true, 'Failed synchronization keeps the player signed in')
assert.equal(game.notes, 250)
offline = false
await logoutGame()
assert.equal(profiles.get('新玩家').state.game.notes, 250, 'Logout uploads pending progress first')
assert.equal(hasSession(), false)
assert.equal(identity.gameId, '')
for (const key of ['songspace.session.v1', 'songspace.game.v1', 'songspace.imagery.v2']) assert.equal(memory.has(key), false)
assert.equal(game.notes, 120)
assert.deepEqual(imagery.sea, [])
const beforeReconnect = calls
assert.equal(await connectSave(), false)
assert.equal(calls, beforeReconnect, 'Logout prevents automatic authentication')
await restoreGame('新玩家')
assert.equal(game.notes, 250, 'Signing in after logout restores the saved progress')
console.log('PASS: logout flushes progress, clears local identity, protects offline saves and permits re-login')
console.log('PASS: explicit entry, new player, sync, invalid ID, legacy restore, account isolation and offline preservation')
