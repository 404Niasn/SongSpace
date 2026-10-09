import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Group } from 'three'
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
  assert.equal(equipOutfit('travel-backpack'), true)
  assert.equal(game.owned[song.id], 1)
  assert.equal(equippedOutfits.value[0].slot, 'back')
  const duplicate = openPack('single')[0]
  assert.equal(duplicate.isNew, false)
  assert.equal(game.owned[song.id], 2)
  assert.equal(wardrobe.value.filter((outfit) => outfit.owned).length, 1)
  assert.equal(equipOutfit('travel-backpack'), true)
  assert.equal(equippedOutfits.value.length, 1)
  assert.deepEqual(game.equippedItems, skills)
  assert.equal(game.notes, notes)
} finally {
  crypto.getRandomValues = random
}

const restored = await import('../src/game/save.ts?outfit-reload')
restored.catalog.songs = catalog.songs
assert.equal(restored.equippedOutfits.value[0].id, 'travel-backpack')
assert.equal(restored.game.owned[song.id], 2)
assert.equal(unequipOutfit('back'), true)
assert.equal(unequipOutfit('back'), false)
assert.equal(equippedOutfits.value.length, 0)
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
assert.deepEqual(attached.children[0].position.toArray(), [0, 1.92, 0.61])
assert.ok(buildOutfit('travel-backpack').children.length > 0)
console.log(
  'PASS: outfit card draws, song/artist mapping, unlocks, duplicate cards, slot replacement, skill separation, reload, legacy saves and 3D attachments',
)
