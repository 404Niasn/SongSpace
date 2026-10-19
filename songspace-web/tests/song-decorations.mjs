import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as T from 'three'
import { buildImagery } from '../src/worlds/imageryModels.ts'
import { imageryFor, SONG_DECORATION_MODELS } from '../src/game/content.ts'

const memory = new Map()
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) }
const { catalog, game, cardFor, kindFor } = await import('../src/game/save.ts')
const { imagery, validPlacements, placeImagery, undoImagery, availableImagery, worldValue } = await import('../src/game/imagery.ts')
catalog.songs = JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8')).songs
const pairs = [
  ['茶花开了，该回家了', 'camellia'], ['雨过后的风景', 'epiphyllum'], ['冷夜', 'autumn-plane'],
  ['如果可以', 'shade-tree'], ['素颜', 'rocking-chair'], ['阿楚姑娘', 'campfire'], ['如愿', 'trail-lamp'],
  ['天龙八部之宿敌', 'red-lantern'], ['下完这场雨', 'farewell-pavilion'], ['美人鱼', 'watcher-statue'],
  ['会呼吸的痛', 'seashell'], ['情歌', 'seagull'], ['同花顺', 'butterfly'], ['有何不可', 'outdoor-piano'],
]
assert.equal(new Set(pairs.map(p => p[1])).size, 14)
assert.deepEqual(new Set(SONG_DECORATION_MODELS), new Set(pairs.map(p => p[1])))
const manifest = JSON.parse(await readFile(new URL('../public/models/decorations/manifest.json', import.meta.url), 'utf8'))
for (const [title, model] of pairs) {
  const song = catalog.songs.find(s => s.title === title)
  assert.ok(song, title)
  assert.equal(kindFor(song), 'decoration')
  assert.equal(imageryFor(title).value, 20, 'Visual replacement must preserve decoration economy')
  assert.equal(cardFor(song).art, model)
  assert.equal(imageryFor(title).model, model)
  const mesh = buildImagery(model), other = buildImagery(model)
  const bounds = new T.Box3().setFromObject(mesh)
  assert.ok(Math.abs(bounds.min.y) < 1e-5, model + ' must contact the ground')
  assert.ok(Math.abs(bounds.min.x + bounds.max.x) < 1e-4 && Math.abs(bounds.min.z + bounds.max.z) < 1e-4)
  assert.ok(mesh.userData.radius > 0 && mesh.userData.radius < 4)
  let triangles = 0
  assert.ok(mesh.children.length <= 5, model + ' draw-call budget')
  for (const [i, child] of mesh.children.entries()) {
    assert.ok(child.isMesh)
    const positions = child.geometry.getAttribute('position')
    assert.ok([...positions.array].every(Number.isFinite), model)
    assert.ok([...child.geometry.getAttribute('normal').array].every(Number.isFinite))
    triangles += (child.geometry.index?.count ?? positions.count) / 3
    assert.notEqual(child.geometry, other.children[i].geometry, 'Instance disposal must be isolated')
    assert.notEqual(child.material, other.children[i].material, 'Ghost opacity must not affect placed models')
    child.material.opacity = .6
    assert.equal(other.children[i].material.opacity, model === 'trail-lamp' && child.name.endsWith('glass') ? .62 : 1)
  }
  assert.ok(triangles < 60000, model + ' geometry budget')
  assert.equal(manifest.find(m => m.id === model).triangles, triangles, 'Export and runtime must match')
  const png = await readFile(new URL(`../public/art/decorations/${model}.png`, import.meta.url))
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  const glb = await readFile(new URL(`../public/models/decorations/${model}.glb`, import.meta.url))
  assert.equal(glb.subarray(0, 4).toString(), 'glTF')
  game.owned[song.id] = 1
  const p = { songId: song.id, x: 12, z: 10 + pairs.findIndex(pair => pair[0] === title) * 6, rotation: .7 }
  assert.equal(placeImagery('forest', p), true)
  assert.equal(availableImagery(song.id), 0)
  assert.equal(placeImagery('sea', p), false, 'Cross-world inventory is still conserved')
  assert.deepEqual(validPlacements('forest').find(placed => placed.songId === song.id), p)
  for (const root of [mesh, other]) root.traverse(o => { o.geometry?.dispose(); o.material?.dispose() })
  console.log(`PASS ${title}: ${model}, ${triangles} triangles`)
}
assert.equal(worldValue('forest'), 280)
assert.equal(undoImagery('forest'), true)
assert.equal(worldValue('forest'), 260)
assert.equal(imagery.forest.length, 13)
assert.equal(imageryFor('青花').wearable, true)
assert.equal(imageryFor('雨爱').weather, 'rain')
for (const title of ['心墙', '单车', '江南', '红色高跟鞋']) assert.notEqual(kindFor(catalog.songs.find(s => s.title === title)), 'decoration')
const cactus = buildImagery('epiphyllum')
cactus.children.find(o => o.name.endsWith('leaf')).geometry.computeBoundingBox()
assert.ok(cactus.children.find(o => o.name.endsWith('leaf')).geometry.boundingBox.min.y > .05, 'Cactus stems must not hang below the soil')
console.log('PASS: 14 unique models, grounded footprints, resource isolation, matching previews/exports, inventory and existing card roles')
