import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
}
const {
  game,
  catalog,
  achievements,
  claimableAchievements,
  claimAchievement,
  claimDaily,
  settle,
  openPack,
  persist,
  today,
} = await import('../src/game/save.ts')
catalog.songs = JSON.parse(
  await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8'),
).songs
const find = (id) => achievements.value.find((a) => a.id === id)

assert.equal(claimableAchievements.value, 0)
const initialPacks = { ...game.packs }
assert.equal(claimAchievement('first-ride'), false)
assert.equal(claimAchievement('unknown'), false)
assert.deepEqual(game.packs, initialPacks)

settle(2999, 9999.9, 0, '大海')
assert.equal(game.totalDistance, 9999)
assert.equal(find('first-ride').unlocked, true)
assert.equal(find('high-score').unlocked, false)
assert.equal(find('long-road').unlocked, false)
const notes = game.notes
assert.equal(claimAchievement('first-ride'), true)
assert.equal(game.packs.single, 4)
assert.equal(game.notes, notes)
assert.equal(claimAchievement('first-ride'), false)
assert.equal(game.packs.single, 4)
settle(3000, 1, 0, '江南')
assert.equal(find('long-road').unlocked, true)
assert.equal(find('high-score').unlocked, true)
assert.equal(claimAchievement('long-road'), true)
assert.equal(game.packs.five, 1)

assert.equal(claimDaily(), true)
assert.equal(game.dailyClaims, 1)
assert.equal(find('first-sign').unlocked, true)
assert.equal(claimDaily(), false)
assert.equal(game.dailyClaims, 1)
assert.equal(find('first-collection').unlocked, false)
const cards = openPack('five')
assert.equal(cards.length, 5)
assert.equal(game.openedPacks, 1)
assert.equal(find('first-collection').unlocked, true)
game.packs.single = 0
assert.deepEqual(openPack('single'), [])
assert.equal(game.openedPacks, 1)

game.owned = { [catalog.songs[0].id]: 30 }
persist()
assert.equal(find('ten-songs').progress, 1)
game.owned = Object.fromEntries(catalog.songs.slice(0, 30).map((s) => [s.id, 1]))
game.openedPacks = 10
game.dailyClaims = 7
game.challengeWins = 5
game.runs = 10
persist()
assert.equal(achievements.value.filter((a) => a.unlocked).length, 12)
// Once earned, a medal remains unlocked even if inventory changes.
game.owned = {}
persist()
assert.equal(find('thirty-songs').unlocked, true)
for (const a of achievements.value) {
  if (!a.claimed) {
    const stock = game.packs[a.reward] || 0
    assert.equal(claimAchievement(a.id), true)
    assert.equal(game.packs[a.reward], stock + 1)
    assert.equal(claimAchievement(a.id), false)
    assert.equal(game.packs[a.reward], stock + 1)
  }
}
assert.equal(claimableAchievements.value, 0)
const reloaded = await import('../src/game/save.ts?reload')
assert.equal(reloaded.claimableAchievements.value, 0)
assert.equal(reloaded.claimAchievement('first-ride'), false)
assert.deepEqual(reloaded.game.claimedAchievements, game.claimedAchievements)
assert.deepEqual(reloaded.game.packs, game.packs)

memory.set(
  'songspace.game.v1',
  JSON.stringify({
    runs: 10,
    best: 3000,
    owned: { song: 1 },
    daily: today(),
    challengeWon: true,
    history: [{ distance: 1234 }],
    packs: { triple: 2 },
  }),
)
const migrated = await import('../src/game/save.ts?legacy')
assert.equal(migrated.game.totalDistance, 1234)
assert.equal(migrated.game.dailyClaims, 1)
assert.equal(migrated.game.challengeWins, 1)
assert.equal(migrated.game.openedPacks, 0)
assert.equal(migrated.game.packs.triple, 2)
assert.equal(migrated.achievements.value.find((a) => a.id === 'ten-rides').unlocked, true)
assert.equal(migrated.achievements.value.find((a) => a.id === 'first-guess').unlocked, true)
assert.equal(migrated.claimAchievement('ten-rides'), true)
assert.equal(migrated.game.packs.triple, 3)
console.log(
  'PASS: achievement thresholds, collection uniqueness, unlock permanence, reward inventory, duplicate prevention, reload and legacy migration',
)
