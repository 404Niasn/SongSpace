import assert from 'node:assert/strict'

const memory = new Map()
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) }
globalThis.window = new EventTarget()
const { game, persist } = await import('../src/game/save.ts')
const { imagery } = await import('../src/game/imagery.ts')
globalThis.document = new EventTarget()
const { connectSave, startGame, restoreGame, hasSession, identity, flushSave, cloud, logoutGame, needsWelcome, dismissWelcome } = await import('../src/game/cloud.ts')
const profiles = new Map()
let calls = 0, offline = false
let registrationError
globalThis.fetch = async (url, options) => {
  calls++
  if (offline) throw new Error('offline')
  const body = options.body ? JSON.parse(options.body) : undefined
  const token = options.headers.Authorization?.slice(7)
  const reply = (status, value) => ({ ok: status < 400, status, json: async () => structuredClone(value) })
  if (url.endsWith('/accounts')) {
    if (registrationError) return reply(422, { detail: registrationError })
    assert.equal(body.game_id, undefined, 'Registration does not choose an ID')
    assert.equal(body.nickname, body.state.game.name)
    const assignedId = 'SS-TEST-TEST-' + String(profiles.size + 1).padStart(4, '0')
    profiles.set(assignedId, { token: assignedId, game_id: assignedId, revision: 0, state: body.state })
    return reply(201, profiles.get(assignedId))
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
registrationError = [{ loc: ['body', 'game_id'], type: 'missing' }]
await assert.rejects(startGame('我想宁'), /api-outdated/, 'Old servers are not reported as nickname errors')
registrationError = [{ loc: ['body', 'nickname'], type: 'string_too_short' }]
await assert.rejects(startGame('a'), /invalid-name/)
registrationError = [{ loc: ['body', 'state', 'game', 'notes'], type: 'greater_than_equal' }]
await assert.rejects(startGame('我想宁'), /invalid-registration/)
registrationError = undefined
await startGame('新玩家')
assert.equal(hasSession(), true)
assert.equal(game.name, '新玩家')
assert.equal(needsWelcome(), true, 'New accounts receive the save-ID and gift introduction')
assert.equal(JSON.parse(memory.get('songspace.session.v1')).welcomePending, true, 'Introduction survives a refresh')
dismissWelcome()
assert.equal(needsWelcome(), false)
assert.equal(JSON.parse(memory.get('songspace.session.v1')).welcomePending, false)
const firstId = identity.gameId
assert.match(firstId, /^SS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
assert.notEqual(firstId, game.name)
game.notes = 200
persist()
await flushSave()
assert.equal(profiles.get(firstId).state.game.notes, 200)
assert.equal(cloud.status, 'synced')
await assert.rejects(restoreGame('wrong-id'), /session/)
assert.equal(identity.gameId, firstId)
assert.equal(game.notes, 200, 'Bad IDs do not change the active save')
game.runs = 99
imagery.sea = [{ songId: 'old-song', x: 1, z: 1, rotation: 0 }]
profiles.set('legacy-ID', { token: 'legacy-ID', revision: 4, state: { game: { name: '老玩家', notes: 50, owned: {}, packs: {} }, imagery: {} } })
await restoreGame('legacy-ID')
assert.equal(needsWelcome(), false, 'Returning accounts do not receive another registration gift introduction')
assert.equal(identity.gameId, 'legacy-ID')
assert.equal(game.name, '老玩家')
assert.equal(game.notes, 50)
assert.equal(game.runs, 0, 'Fields absent from an older save do not leak from another player')
assert.deepEqual(imagery.sea, [])
game.notes = 75
persist()
offline = true
await assert.rejects(restoreGame(firstId), /尚未同步/)
assert.equal(identity.gameId, 'legacy-ID')
assert.equal(game.notes, 75, 'Offline switching preserves unsynced progress')
offline = false
await flushSave()
assert.equal(profiles.get('legacy-ID').state.game.notes, 75)
await startGame('新玩家')
assert.notEqual(identity.gameId, firstId, 'Repeated nicknames receive separate IDs')
await startGame('另一个玩家')
assert.notEqual(identity.gameId, firstId)
assert.equal(game.name, '另一个玩家')
assert.equal(game.notes, 500, 'Registering another account starts a fresh save')
assert.deepEqual(game.packs, { single: 3, triple: 1, five: 0, vehicle: 1, theme: 0 })
assert.deepEqual(game.owned, {})
await restoreGame(firstId)
assert.equal(game.notes, 200, 'Assigned IDs restore the original account')
game.notes = 250
persist()
offline = true
await assert.rejects(logoutGame(), /尚未同步/)
assert.equal(hasSession(), true, 'Failed synchronization keeps the player signed in')
assert.equal(game.notes, 250)
offline = false
await logoutGame()
assert.equal(profiles.get(firstId).state.game.notes, 250, 'Logout uploads pending progress first')
assert.equal(hasSession(), false)
assert.equal(identity.gameId, '')
for (const key of ['songspace.session.v1', 'songspace.game.v1', 'songspace.imagery.v2']) assert.equal(memory.has(key), false)
assert.equal(game.notes, 500)
assert.deepEqual(imagery.sea, [])
const beforeReconnect = calls
assert.equal(await connectSave(), false)
assert.equal(calls, beforeReconnect, 'Logout prevents automatic authentication')
await restoreGame(firstId)
assert.equal(game.notes, 250, 'Signing in after logout restores the saved progress')
console.log('PASS: logout flushes progress, clears local identity, protects offline saves and permits re-login')
console.log('PASS: explicit entry, new player, sync, invalid ID, legacy restore, account isolation and offline preservation')
