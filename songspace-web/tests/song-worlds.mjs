import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildSongWorld } from '../src/worlds/songWorlds.ts'
const memory = new Map()
globalThis.localStorage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, v) }
const { catalog, game, cardFor, isWorldUnlocked, openPack } = await import('../src/game/save.ts')
catalog.songs = JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8')).songs
const pool = [...catalog.songs]
for (const [id, title] of [['fuji', '富士山下'], ['space', '光年之外']]) {
  const song = pool.find(s => s.title === title)
  assert.ok(song)
  assert.equal(isWorldUnlocked(id), false)
  assert.equal(cardFor(song).kind, 'map')
  assert.equal(cardFor(song).rarity, 'rainbow')
  catalog.songs = [song]; game.packs.single = 1
  assert.equal(openPack('single')[0].id, song.id)
  assert.equal(isWorldUnlocked(id), true)
  assert.equal(game.owned[song.id], 1, 'Unlock does not consume the card')
  catalog.songs = pool
  const model = buildSongWorld(id)
  assert.ok(model.isWalkable(model.spawn.x, model.spawn.z))
  for (let z = -34; z < 35; z++) assert.ok(model.isWalkable(5, z), `${id} main path remains traversable at ${z}`)
  assert.equal(model.isWalkable(45, 0), false)
  if (id === 'fuji') {
    assert.equal(model.isWalkable(-20, 7), false, 'Lake is blocked')
    assert.equal(model.isWalkable(-20, -23), false, 'Mountain is blocked')
  }
  model.update(100)
  model.group.traverse(o => {
    if (!o.isMesh && !o.isPoints) return
    assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite))
    o.geometry.dispose()
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose()
  })
}
assert.equal(isWorldUnlocked('forest'), true)
assert.equal(isWorldUnlocked('sea'), true)
const { imagery, placeImagery, validPlacements } = await import('../src/game/imagery.ts')
assert.deepEqual(imagery.fuji, [])
assert.deepEqual(imagery.space, [])
const decoration = pool.find(s => s.title === '樱花草')
game.owned[decoration.id] = 1
assert.equal(placeImagery('space', { songId: decoration.id, x: 10, z: 10, rotation: 0 }), true)
assert.equal(validPlacements('space').length, 1)
assert.equal(placeImagery('fuji', { songId: decoration.id, x: 10, z: 10, rotation: 0 }), false)
console.log('PASS: rainbow draws, ownership gates, old-save defaults, shared decoration inventory and both world geometries')

const { buildSkillEffect } = await import('../src/worlds/imageryModels.ts')
const colors = new Set()
for (const id of ['shield', 'magnet', 'revive', 'courage', 'tea', 'freeze', 'double', 'rewind', 'friend']) {
  const effect = buildSkillEffect(id)
  assert.ok(effect.children.length > 0)
  colors.add(effect.children[0].material.color.getHex())
  effect.traverse(o => {
    if (!o.isMesh) return
    assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite))
    assert.equal(o.material.depthWrite, false, 'Transparent effects must not occlude the rider')
    o.geometry.dispose(); o.material.dispose()
  })
}
assert.equal(colors.size, 9, 'Every item has a distinct effect color')
assert.ok(buildSkillEffect('shield', true).children.length > 10)
console.log('PASS: all nine item effect geometries, distinct colors and transparent depth settings')
