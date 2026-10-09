import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const memory = new Map()
globalThis.localStorage = {getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}
const { game, catalog, buyPack, openPack, settle, claimDaily, cardFor, kindFor } = await import('../src/game/save.ts')
catalog.songs=JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json',import.meta.url),'utf8')).songs
const initial=game.notes
assert.equal(settle(1349,399,19,'大海'),33)
assert.equal(game.notes,initial+33)
assert.equal(game.runs,1)
assert.equal(game.history[0].notes,33)
assert.equal(buyPack('single'),true)
assert.equal(game.notes,initial+33-60)
assert.equal(game.packs.single,1)
const balance=game.notes
assert.equal(buyPack('five'),false)
assert.equal(game.notes,balance)
const five=openPack('five')
assert.equal(five.length,5)
assert.ok(five.some(c=>c.rarity==='gold'||c.rarity==='rainbow'))
assert.equal(game.packs.five,0)
assert.deepEqual(openPack('five'),[])
assert.equal(Object.values(game.owned).reduce((a,b)=>a+b,0),5)
game.pity=19
const single=openPack('single')
assert.equal(single[0].rarity,'gold')
assert.equal(game.pity,0)
assert.equal(Object.values(game.owned).reduce((a,b)=>a+b,0),6)
assert.equal(claimDaily(),true)
assert.equal(game.notes,balance+50)
assert.equal(claimDaily(),false)
assert.equal(game.notes,balance+50)
game.packs.vehicle=1
assert.equal(openPack('vehicle')[0].kind,'vehicle')
game.packs.theme=1
assert.equal(openPack('theme')[0].kind,'map')
for(const song of catalog.songs){const c=cardFor(song);assert.equal(c.kind,kindFor(song));if(c.kind==='item')assert.equal(c.rarity,'gold');if(c.kind==='map')assert.equal(c.rarity,'rainbow')}
const stored=JSON.parse(memory.get('songspace.game.v1'))
assert.equal(stored.notes,game.notes)
assert.deepEqual(stored.owned,game.owned)
console.log('PASS: score rewards, balances, inventory, five-pack guarantee, pity, daily idempotency, card pools and persistence')
const beforeZero=game.notes
assert.equal(settle(0,0,0,'大海'),0)
assert.equal(game.notes,beforeZero)
game.pity=19
game.packs.vehicle=1
assert.equal(openPack('vehicle')[0].kind,'vehicle')
assert.equal(game.pity,19)
game.packs.theme=1
assert.equal(openPack('theme')[0].kind,'map')
assert.equal(game.pity,19)
const upgradeSong=catalog.songs.find(s=>kindFor(s)==='item')
game.owned[upgradeSong.id]=4
assert.match(cardFor(upgradeSong).effect,/LV\.2/)
console.log('PASS: zero-score anti-farming, specialized pools at pity threshold, duplicate upgrades')

const beforeRestricted=game.notes;game.notes=10000;const rewardStock=game.packs.five,themeStock=game.packs.theme;assert.equal(buyPack('five'),false);assert.equal(buyPack('theme'),false);assert.equal(game.notes,10000);assert.equal(game.packs.five,rewardStock);assert.equal(game.packs.theme,themeStock);game.notes=beforeRestricted;console.log('PASS: reward five-pack and map-pack purchases rejected even with sufficient funds');
const mapIndex = catalog.songs.findIndex(song => kindFor(song) === 'map')
assert.ok(mapIndex >= 0)
const randomValues = crypto.getRandomValues.bind(crypto)
try {
  crypto.getRandomValues = array => { array[0] = Math.floor((mapIndex + .5) / catalog.songs.length * 4294967296); return array }
  game.pity = 0
  game.packs.single = 1
  assert.equal(openPack('single')[0].kind, 'map')
} finally { crypto.getRandomValues = randomValues }
console.log('PASS: ordinary song packs include map cards')
