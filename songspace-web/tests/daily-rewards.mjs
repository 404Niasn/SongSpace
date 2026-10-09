import assert from 'node:assert/strict'

const memory = new Map()
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) }
const RealDate = Date
let now = '2026-12-28T16:01:00Z'
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [now])) }
  static now() { return new RealDate(now).getTime() }
}
const { game, freshGame, replaceGame, claimDaily, dailySignDay, today, buyPack } = await import('../src/game/save.ts')
assert.equal(game.notes, 500)
assert.deepEqual(game.packs, { single: 3, triple: 1, five: 0, vehicle: 1, theme: 0 })
assert.equal(buyPack('vehicle'), true)
assert.equal(game.notes, 200)
assert.equal(game.packs.vehicle, 2)
assert.equal(buyPack('vehicle'), false)
replaceGame(freshGame())

// Shanghai midnight, year boundary, both milestones and a second weekly cycle.
for (let i = 0; i < 14; i++) {
  now = new RealDate(new RealDate('2026-12-28T16:01:00Z').getTime() + i * 86400000).toISOString()
  assert.equal(dailySignDay(), (i % 7) + 1)
  assert.equal(claimDaily(), true)
  assert.equal(game.packs.single, 4 + i)
  assert.equal(game.packs.triple, 1 + Math.floor((i + 3) / 7))
  assert.equal(game.packs.five, Math.floor((i + 1) / 7))
  const inventory = { ...game.packs }
  assert.equal(claimDaily(), false)
  assert.deepEqual(game.packs, inventory)
  assert.equal(game.notes, 500)
}
assert.equal(game.dailyClaims, 14)
const reloaded = await import('../src/game/save.ts?daily-reload')
assert.equal(reloaded.claimDaily(), false)
assert.deepEqual(reloaded.game.packs, game.packs)

// Skipping a calendar day resets the streak without touching accumulated rewards.
now = new RealDate(new RealDate(now).getTime() + 2 * 86400000).toISOString()
assert.equal(dailySignDay(), 1)
assert.equal(claimDaily(), true)
assert.equal(game.dailyStreak, 1)
assert.equal(game.packs.triple, 3)
assert.equal(game.packs.five, 2)

// Legacy saves gain the new counter, but never gain another registration gift.
replaceGame({ name: '老玩家', notes: 17, packs: { triple: 2 }, daily: today() })
assert.equal(game.dailyStreak, 1)
assert.equal(claimDaily(), false)
assert.deepEqual(game.packs, { single: 0, triple: 2, five: 0, vehicle: 0, theme: 0 })
memory.set('songspace.game.v1', JSON.stringify({ notes: 17, packs: { triple: 2 }, daily: today() }))
const legacy = await import('../src/game/save.ts?daily-legacy')
assert.equal(legacy.game.notes, 17)
assert.equal(legacy.game.packs.single, 0)
assert.equal(legacy.game.dailyStreak, 1)
globalThis.Date = RealDate
console.log('PASS: welcome gifts, vehicle price, Shanghai dates, daily idempotency, 5/7-day bonuses, repeat cycles, missed days, reload and legacy saves')
