import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const cache = new Map()
globalThis.localStorage = { getItem: key => cache.get(key) || null, setItem: (key, value) => cache.set(key, value) }
globalThis.window = new EventTarget()
const { catalog, game, freshGame, replaceGame, cardFor } = await import('../src/game/save.ts')
const { imagery, placeImagery, setWorldWeather, weatherForWorld, worldValue, validPlacements } = await import('../src/game/imagery.ts')
catalog.songs = JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8')).songs
const sunset = catalog.songs.find(s => s.title === '黄昏')
const rain = catalog.songs.find(s => s.title === '雨爱')
assert.ok(sunset && rain)
replaceGame(freshGame())
assert.equal(setWorldWeather('sea', rain.id), false)
game.owned[rain.id] = 1
game.owned[sunset.id] = 1
assert.equal(cardFor(rain).kind, 'decoration')
assert.equal(setWorldWeather('sea', rain.id), true)
assert.equal(weatherForWorld('sea'), 'rain')
assert.equal(weatherForWorld('forest'), 'clear')
assert.equal(worldValue('sea'), 35)
assert.equal(setWorldWeather('sea', rain.id), true)
assert.equal(worldValue('sea'), 35, 'Repeated activation must not stack weather value')
assert.equal(game.owned[rain.id], 1, 'Weather must not consume cards')
assert.equal(placeImagery('sea', { songId: rain.id, x: 1, z: 1, rotation: 0 }), false)
imagery.sea.push({ songId: rain.id, x: 1, z: 1, rotation: 0 })
assert.equal(validPlacements('sea').length, 0, 'Old rain pavilions must not render as weather decorations')
assert.equal(setWorldWeather('sea', sunset.id), true)
assert.equal(weatherForWorld('sea'), 'sunset')
const stored = JSON.parse(cache.get('songspace.game.v1'))
replaceGame(freshGame())
replaceGame(stored)
assert.equal(weatherForWorld('sea'), 'sunset', 'Restored account state must retain weather')
assert.equal(setWorldWeather('sea', ''), true)
assert.equal(worldValue('sea'), 0)
delete game.owned[sunset.id]
game.worldWeather.sea = sunset.id
assert.equal(weatherForWorld('sea'), 'clear', 'Unowned weather must not activate')
console.log('PASS: weather unlocks, per-map selection, nonconsumption, value, legacy filtering, and restored state')
