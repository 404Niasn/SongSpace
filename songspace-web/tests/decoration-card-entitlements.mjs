import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const memory = new Map()
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) }
const { game, catalog, openPack, cardFor } = await import('../src/game/save.ts')
const { imageryFor, SONG_DECORATION_MODELS } = await import('../src/game/content.ts')
const { placeImagery, availableImagery, undoImagery, validPlacements } = await import('../src/game/imagery.ts')
const songs = JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8')).songs
catalog.songs = songs
const targets = songs.filter(song => SONG_DECORATION_MODELS.includes(imageryFor(song.title).model))
assert.equal(targets.length, 14)
let index = 0
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
  getRandomValues(values) { values[0] = Math.floor((index + .5) / songs.length * 4294967296); return values },
} })
try {
  for (const song of targets) {
    index = songs.findIndex(s => s.id === song.id)
    const point = { songId: song.id, x: 12, z: 12, rotation: .4 }
    assert.equal(availableImagery(song.id), 0)
    assert.equal(placeImagery('forest', point), false, 'An unowned card must not grant a prop')
    for (let copy = 1; copy <= 3; copy++) {
      game.packs.single = 1; game.pity = 0
      const [card] = openPack('single') // Full production catalog, deterministic random index only.
      assert.equal(card.id, song.id)
      assert.equal(card.kind, 'decoration')
      assert.equal(card.rarity, 'normal')
      assert.equal(card.art, imageryFor(song.title).model)
      assert.equal(card.count, copy)
      assert.equal(card.isNew, copy === 1)
      assert.equal(cardFor(song).count, copy)
      assert.equal(availableImagery(song.id), copy)
      assert.equal(game.packs.single, 0)
    }
    assert.equal(placeImagery('forest', point), true)
    assert.equal(placeImagery('forest', { ...point, z: 18 }), true)
    assert.equal(placeImagery('sea', point), true)
    assert.equal(placeImagery('jiangnan', point), false, 'Three copies may only grant three props total')
    assert.equal(availableImagery(song.id), 0)
    assert.equal(undoImagery('sea'), true)
    assert.equal(availableImagery(song.id), 1)
    assert.equal(game.owned[song.id], 3, 'Placement / undo must not consume the collected song')
    console.log(`PASS draw → warehouse → place → undo: ${song.title} / ${imageryFor(song.title).name}`)
  }
} finally { Object.defineProperty(globalThis, 'crypto', originalCrypto) }
assert.equal(validPlacements('forest').length, 28)
const snapshot = { game: memory.get('songspace.game.v1'), imagery: memory.get('songspace.imagery.v2') }
// A fresh Node process exercises module initialization from persisted storage, not a manual state copy.
const restored = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
  import fs from 'node:fs'; import assert from 'node:assert/strict';
  const snapshot = JSON.parse(fs.readFileSync(0, 'utf8'));
  globalThis.localStorage = { getItem: key => key === 'songspace.game.v1' ? snapshot.game : key === 'songspace.imagery.v2' ? snapshot.imagery : null, setItem(){} };
  const { game, catalog } = await import('./src/game/save.ts');
  const { validPlacements, availableImagery } = await import('./src/game/imagery.ts');
  catalog.songs = JSON.parse(fs.readFileSync('./public/catalog/qqmusic-hot-100.json', 'utf8')).songs;
  assert.equal(validPlacements('forest').length, 28);
  for (const [id, copies] of Object.entries(game.owned)) { assert.equal(copies, 3); assert.equal(availableImagery(id), 1) }
  console.log('PASS fresh reload: all 14 ownerships, 28 placed instances and remaining inventory restored');
`], { cwd: fileURLToPath(new URL('../', import.meta.url)), input: JSON.stringify(snapshot), encoding: 'utf8' })
console.log(restored.trim())
