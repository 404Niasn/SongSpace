import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const memory = new Map()
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) }
const { catalog, game, kindFor, cardFor, openPack } = await import('../src/game/save.ts')
const { LYRIC_EXCERPTS } = await import('../src/game/lyricExcerpts.ts')
catalog.songs = JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8')).songs
assert.equal(new Set(catalog.songs.map(song => song.id)).size, catalog.songs.length)
const bicycle = catalog.songs.find(song => song.title === '单车' && song.artists.some(artist => artist.name === '陈奕迅'))
assert.ok(bicycle)
assert.equal(bicycle.card_kind, 'vehicle')
assert.equal(kindFor({ ...bicycle, rank: 195 }), 'vehicle', 'Classification survives updates to chart rankings')
assert.match(cardFor(bicycle).effect, /后货架旧式单车/)
for (const [title, artist, model, lyric] of [
  ['单车', '陈奕迅', 'bicycle-rack', '骑着单车的我俩'],
  ['一路向北', '周杰伦', 'ae86', '后视镜里的世界'],
  ['鲜花', '回春丹乐队', 'motorcycle', '开着我的烂摩托'],
]) {
  const song = catalog.songs.find(s => s.title === title && s.artists.some(a => a.name === artist))
  assert.ok(song, `${title} is built in`)
  assert.equal(kindFor(song), 'vehicle')
  assert.equal(song.vehicle_model, model)
  assert.equal(song.vehicle_lyric, lyric)
  assert.equal(cardFor(song).prose, LYRIC_EXCERPTS[song.id])
  assert.ok(song.lyric_source && song.cover_path)
  const expectedSpeed = { 'bicycle-rack': 14, ae86: 16, motorcycle: 15 }[model]
  assert.match(cardFor({ ...song, rank: 195 }).effect, new RegExp(`${expectedSpeed} m/s`), 'Model speed stays independent of chart rank')
  const pool = catalog.songs
  catalog.songs = [song]
  game.packs.vehicle = 1
  const [vehicleDraw] = openPack('vehicle')
  assert.equal(vehicleDraw.song.vehicle_model, model, `${title} draws its own model`)
  assert.equal(game.owned[song.id], 1)
  delete game.owned[song.id]
  catalog.songs = pool
}
const original = catalog.songs
catalog.songs = [bicycle]
game.packs.vehicle = 1
const [drawn] = openPack('vehicle')
assert.equal(drawn.id, bicycle.id)
assert.equal(drawn.kind, 'vehicle')
assert.equal(game.owned[bicycle.id], 1)
catalog.songs = original
assert.ok(game.owned[bicycle.id] === 1)
console.log('PASS: verified bicycle metadata, stable classification, vehicle pool draw and inventory persistence')
