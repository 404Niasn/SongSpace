import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as T from 'three'
const memory = new Map()
globalThis.localStorage = { getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v) }
const ctx = new Proxy({}, { get:(_,key)=> key==='measureText' ? ()=>({width:80}) : ()=>{} , set:()=>true })
globalThis.document = { createElement:()=>({width:0,height:0,getContext:()=>ctx}) }
const { buildWorld, disposeObject } = await import('../src/worlds/models.ts')
for (const id of ['forest','sea','jiangnan','fuji','space']) {
  const world = buildWorld(id)
  const details = world.group.getObjectByName(`miniature-details-${id}`)
  assert.ok(details && details.userData.colliders.length > 0, `${id} must have new scenic clusters`)
  console.log(id, 'new clusters:', details.userData.colliders.length)
  assert.ok(world.isWalkable(world.spawn.x,world.spawn.z), `${id} spawn must stay clear`)
  world.group.traverse(o=>{
    if (!(o instanceof T.Mesh)) return
    assert.ok([...o.geometry.getAttribute('position').array].every(Number.isFinite))
  })
  disposeObject(world.group)
}
const { catalog,game,kindFor,cardFor,equipOutfit,equippedOutfits } = await import('../src/game/save.ts')
catalog.songs=JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json',import.meta.url),'utf8')).songs
const song=catalog.songs.find(s=>s.title==='青花')
assert.equal(kindFor(song),'decoration','Qinghua remains a silver decoration card')
assert.equal(equipOutfit('qinghua-token'),false)
game.owned[song.id]=1
assert.equal(equipOutfit('qinghua-token'),true)
assert.ok(equippedOutfits.value.some(o=>o.id==='qinghua-token'))
assert.equal(cardFor(song).outfit.id,'qinghua-token')
const { placeImagery,validPlacements }=await import('../src/game/imagery.ts')
assert.equal(placeImagery('jiangnan',{songId:song.id,x:23,z:0,rotation:0}),false)
assert.equal(validPlacements('jiangnan').length,0)
assert.equal(game.owned[song.id],1,'Wearing must not consume a card')
const { buildImagery,buildSkillEffect,updateSkillEffect }=await import('../src/worlds/imageryModels.ts')
const token=buildImagery('qinghua')
assert.ok(token.getObjectByName('qinghua-tassel'))
for (const id of ['shield','magnet','revive','courage','tea','freeze','double','rewind','friend']) {
  const effect=buildSkillEffect(id)
  updateSkillEffect(effect,id,1)
  const sparks=effect.getObjectByName('skill-particles')
  const before=sparks.instanceMatrix.array.slice()
  updateSkillEffect(effect,id,1)
  assert.deepEqual(sparks.instanceMatrix.array,before,'Paused game time must freeze particles')
  updateSkillEffect(effect,id,2)
  assert.notDeepEqual(sparks.instanceMatrix.array,before)
  assert.ok([...sparks.instanceMatrix.array].every(Number.isFinite))
  disposeObject(effect)
}
console.log('PASS: five miniatures, Qinghua silver/wardrobe/placement ownership, and deterministic effects')
