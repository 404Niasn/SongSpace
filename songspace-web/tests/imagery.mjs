import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Skills } from '../src/game/skills.ts'
import { ITEMS, skillLevel, decorationMultiplier } from '../src/game/content.ts'
const memory = new Map()
globalThis.localStorage = { getItem: k => memory.get(k) || null, setItem: (k,v) => memory.set(k,v) }
const { game, catalog, kindFor, cardFor, settle } = await import('../src/game/save.ts')
const { imagery, availableImagery, placeImagery, undoImagery, worldValue, worldMultiplier, validPlacements } = await import('../src/game/imagery.ts')
catalog.songs = JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json',import.meta.url),'utf8')).songs
const deco = catalog.songs.find(s => s.title === '夏夜最后的烟火')
assert.equal(kindFor(deco), 'decoration')
game.owned[deco.id] = 2
const p = { songId: deco.id, x: 12, z: 12, rotation: 0 }
assert.equal(placeImagery('sea',p),true)
assert.equal(placeImagery('forest',p),true)
assert.equal(availableImagery(deco.id),0)
assert.equal(placeImagery('jiangnan',p),false)
assert.equal(worldValue('sea'),50)
assert.equal(worldMultiplier('sea'),1.05)
assert.equal(undoImagery('forest'),true)
assert.equal(availableImagery(deco.id),1)
assert.equal(worldValue('forest'),0)
assert.equal(placeImagery('sea',{...p,x:NaN}),false)
const originalSave = localStorage.setItem
localStorage.setItem = () => { throw Error('quota') }
assert.equal(placeImagery('sea',{...p,z:25}),false)
assert.equal(availableImagery(deco.id),1)
assert.equal(undoImagery('sea'),false)
assert.equal(worldValue('sea'),50)
localStorage.setItem = originalSave
assert.equal(JSON.parse(memory.get('songspace.imagery.v2')).sea.length,1)
imagery.forest.push(p,p,p)
assert.equal(validPlacements('forest').length,2)
assert.equal(validPlacements('sea').length,0) // Corrupt saves cannot multiply a two-copy inventory.
imagery.forest=[]
assert.equal(decorationMultiplier(5000),1.5)
assert.equal(decorationMultiplier(-2),1)
const n=game.notes
assert.equal(settle(Math.floor(1000 * 1.3),1000,0,'江南'),32)
assert.equal(game.notes,n+32)
for(const [title,definition] of Object.entries(ITEMS)) {
  const song=catalog.songs.find(s=>s.title===title)
  assert.ok(song, title); assert.equal(kindFor(song),'item')
  assert.equal(cardFor(song).rarity,'gold'); assert.equal(cardFor(song).art,definition.id)
  const quote = cardFor(song).commentQuote
  assert.ok(quote?.author && quote?.commentId && quote?.url.startsWith('https://y.qq.com/'))
  assert.equal(cardFor(song).prose, quote.excerpt)
  assert.equal(placeImagery('sea',{...p,songId:song.id}),false)
}
assert.equal(new Set(Object.values(ITEMS).map(s=>s.prose)).size,9)
assert.equal(skillLevel(1),1);assert.equal(skillLevel(4),2);assert.equal(skillLevel(100),5)
const slots=(...ids)=>ids.map(id=>({id,level:1,name:id}))
const shield=new Skills(slots('shield','revive'))
assert.equal(shield.use(0,3,false).accepted,true)
assert.deepEqual(shield.collide(1),{health:1,blocked:true,revived:false})
assert.equal(shield.use(0,3,false).accepted,false)
assert.deepEqual(shield.collide(1),{health:1,blocked:false,revived:true})
shield.tick(3);assert.equal(shield.collide(1).health,0)
const tea=new Skills(slots('tea'))
assert.equal(tea.use(0,3,false).accepted,false);assert.equal(tea.used.size,0)
assert.equal(tea.use(0,2,false).health,3)
const rewind=new Skills(slots('rewind'))
assert.equal(rewind.use(0,2,false).accepted,false)
assert.equal(rewind.use(0,2,true).rewind,true)
const twice=new Skills(slots('double','freeze'))
twice.use(0,3,false);twice.tick(2);assert.equal(twice.double,0)
twice.tick(1.5);assert.equal(twice.double,7.5)
twice.use(1,3,false);twice.tick(5);assert.equal(twice.freeze,0)
const boost=new Skills(slots('courage'))
boost.use(0,1,false);assert.equal(boost.boost,6);assert.equal(boost.collide(1).health,1)
boost.tick(6);assert.equal(boost.collide(1).health,0)
console.log('PASS: inventory conservation, cross-world placement, rollback, corruption limits, reward cap, all nine unique gold cards, skill charges, healing, shield, revive, countdown, freeze, courage and rewind eligibility')
