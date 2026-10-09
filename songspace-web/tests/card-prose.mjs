import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
globalThis.localStorage = { getItem: () => null, setItem: () => {} }
const { catalog, cardFor } = await import('../src/game/save.ts')
const data = JSON.parse(await readFile(new URL('../public/catalog/song-lyric-excerpts.json', import.meta.url), 'utf8'))
catalog.songs = JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json', import.meta.url), 'utf8')).songs
for (const song of catalog.songs) {
  const card = cardFor(song)
  assert.ok(card.prose, `${song.title}: missing copy`)
  {
    const row = data.songs[song.id]
    assert.equal(row.title, song.title)
    assert.equal(card.prose, row.excerpt)
    assert.ok(row.source_url.startsWith('https://'))
    assert.equal(row.provenance, 'user_provided', `${song.title}: missing user-provided lyrics`)
  }
}
console.log(`PASS: ${catalog.songs.length} cards use the supplied lyric excerpts, including gold and vehicle cards`)
