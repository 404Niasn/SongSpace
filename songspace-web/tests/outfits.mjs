import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Group, Vector3 } from 'three'
import { OUTFITS, outfitForSong } from '../src/game/outfits.ts'
import { buildOutfit, addCharacterOutfits } from '../src/worlds/outfitModels.ts'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
}
const {
  game,
  catalog,
  kindFor,
  cardFor,
  openPack,
  wardrobe,
  equippedOutfits,
  outfitScoreBonus,
  equipOutfit,
  unequipOutfit,
  persist,
} = await import('../src/game/save.ts')
catalog.songs = JSON.parse(
  await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8'),
).songs
const song = catalog.songs.find((song) => song.title === '你的背包')
assert.ok(song)
assert.equal(kindFor(song), 'outfit')
assert.equal(cardFor(song).outfit.id, 'travel-backpack')
assert.equal(outfitForSong({ ...song, artists: [{ name: '其他歌手' }] }), undefined)
assert.equal(wardrobe.value[0].owned, false)
assert.equal(wardrobe.value[0].lyric, '背了六年半，我每一天陪它上班')
assert.equal(outfitScoreBonus.value, 0)
assert.equal(equipOutfit('travel-backpack'), false)
assert.equal(equipOutfit('unknown'), false)
assert.equal(equippedOutfits.value.length, 0)

const skills = [...game.equippedItems]
const notes = game.notes
const random = crypto.getRandomValues
const index = catalog.songs.indexOf(song)
try {
  crypto.getRandomValues = (array) => {
    array[0] = Math.floor(((index + 0.5) / catalog.songs.length) * 4294967296)
    return array
  }
  game.packs.single = 2
  const first = openPack('single')[0]
  assert.equal(first.id, song.id)
  assert.equal(first.isNew, true)
  assert.equal(wardrobe.value[0].owned, true)
  assert.equal(equippedOutfits.value.length, 0) // Unlocking does not replace an outfit automatically.
  assert.equal(outfitScoreBonus.value, 0, 'Unlocked outfits only add points when worn')
  assert.equal(equipOutfit('travel-backpack'), true)
  assert.equal(outfitScoreBonus.value, .1)
  assert.equal(game.owned[song.id], 1)
  assert.equal(equippedOutfits.value[0].slot, 'back')
  const duplicate = openPack('single')[0]
  assert.equal(duplicate.isNew, false)
  assert.equal(game.owned[song.id], 2)
  assert.equal(wardrobe.value.filter((outfit) => outfit.owned).length, 1)
  assert.equal(equipOutfit('travel-backpack'), true)
  assert.equal(equippedOutfits.value.length, 1)
  assert.equal(outfitScoreBonus.value, .1, 'Duplicate cards do not stack outfit bonuses')
  assert.deepEqual(game.equippedItems, skills)
  assert.equal(game.notes, notes)
} finally {
  crypto.getRandomValues = random
}

const restored = await import('../src/game/save.ts?outfit-reload')
restored.catalog.songs = catalog.songs
assert.equal(restored.equippedOutfits.value[0].id, 'travel-backpack')
assert.equal(restored.outfitScoreBonus.value, .1)
assert.equal(restored.game.owned[song.id], 2)
assert.equal(unequipOutfit('back'), true)
assert.equal(unequipOutfit('back'), false)
assert.equal(equippedOutfits.value.length, 0)
assert.equal(outfitScoreBonus.value, 0, 'Removing an outfit removes its score bonus')
assert.equal(wardrobe.value[0].owned, true)
assert.equal(game.owned[song.id], 2)

// A second definition proves per-slot replacement and independent head/back slots.
const extraSong = { ...song, id: 'test-head-song', title: '测试帽子' }
const alternateSong = { ...song, id: 'test-back-song', title: '测试背包' }
OUTFITS.push(
  { ...OUTFITS[0], id: 'test-head', songTitle: extraSong.title, slot: 'head' },
  { ...OUTFITS[0], id: 'test-back', songTitle: alternateSong.title },
)
catalog.songs.push(extraSong, alternateSong)
game.owned[extraSong.id] = 1
game.owned[alternateSong.id] = 1
assert.equal(equipOutfit('travel-backpack'), true)
assert.equal(equipOutfit('test-head'), true)
assert.equal(equipOutfit('test-back'), true)
assert.equal(equippedOutfits.value.length, 2)
assert.equal(outfitScoreBonus.value, .2, 'Different equipped slots add their bonuses once')
assert.equal(game.equippedOutfits.back, 'test-back')
assert.equal(game.equippedOutfits.head, 'test-head')
assert.equal(unequipOutfit('back'), true)
assert.equal(game.equippedOutfits.head, 'test-head')
assert.equal(unequipOutfit('head'), true)
OUTFITS.splice(1)
game.equippedOutfits = { back: 'unknown' }
persist()
assert.equal(equippedOutfits.value.length, 0)
game.equippedOutfits = { back: 'travel-backpack' }
game.owned[song.id] = 0
assert.equal(equippedOutfits.value.length, 0)
assert.equal(outfitScoreBonus.value, 0, 'An invalid or unowned outfit cannot add a bonus')
assert.equal(wardrobe.value[0].equipped, false)

memory.set('songspace.game.v1', JSON.stringify({ owned: { [song.id]: 1 } }))
const legacy = await import('../src/game/save.ts?outfit-legacy')
legacy.catalog.songs = catalog.songs
assert.deepEqual(legacy.game.equippedOutfits, {})
assert.equal(legacy.wardrobe.value[0].owned, true)
assert.equal(legacy.equipOutfit('travel-backpack'), true)

const character = new Group()
const empty = addCharacterOutfits(character, [])
assert.equal(empty.children.length, 0)
const attached = addCharacterOutfits(character, [OUTFITS[0]])
assert.equal(attached.children.length, 1)
assert.equal(attached.children[0].name, 'travel-backpack')
assert.deepEqual(attached.children[0].position.toArray(), [0, 1.86, 0.63])
assert.ok(buildOutfit('travel-backpack').children.length > 0)
const standing = addCharacterOutfits(new Group(), [OUTFITS[0]], 'standing')
assert.deepEqual(standing.children[0].position.toArray(), [0, 1.04, .44])
assert.equal(standing.children[0].rotation.x, 0)
assert.equal(standing.children[0].children.length, attached.children[0].children.length, 'Wardrobe and game use the same outfit model')
for (const [attachment, head] of [[attached, new Vector3(0, 2.32, -.225)], [standing, new Vector3(0, 1.70, 0)]]) {
  attachment.updateMatrixWorld(true)
  const point = new Vector3()
  attachment.traverse(mesh => {
    if (!mesh.isMesh) return
    const vertices = mesh.geometry.getAttribute('position')
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld)
      assert.ok(point.distanceTo(head) > .32 + .025, 'Backpack and straps must clear the head')
    }
  })
}
console.log(
  'PASS: outfit card draws, song/artist mapping, unlocks, duplicate cards, slot replacement, skill separation, reload, legacy saves and 3D attachments',
)
