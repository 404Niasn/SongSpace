import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {Box3, Vector3} from 'three'
import {buildRider, poseRider} from '../src/game/rider.ts'
import {addCharacterOutfits} from '../src/worlds/outfitModels.ts'
import {OUTFITS} from '../src/game/outfits.ts'
const cache=new Map()
globalThis.localStorage={getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)}
const {game,catalog,kindFor,equipOutfit,unequipOutfit,equippedOutfits,replaceGame,freshGame}=await import('../src/game/save.ts')
catalog.songs=JSON.parse(await readFile(new URL('../public/catalog/qqmusic-hot-100.json',import.meta.url),'utf8')).songs
const song=catalog.songs.find(s=>s.title==='红色高跟鞋')
assert.equal(kindFor(song),'outfit')
assert.equal(equipOutfit('red-high-heels'),false)
game.owned[song.id]=1
assert.equal(equipOutfit('red-high-heels'),true)
assert.equal(equipOutfit('travel-backpack'),false)
assert.equal(equippedOutfits.value[0].slot,'feet')
const saved=JSON.parse(cache.get('songspace.game.v1'));replaceGame(freshGame());replaceGame(saved)
assert.equal(equippedOutfits.value[0].id,'red-high-heels')
assert.equal(unequipOutfit('feet'),true);assert.equal(game.owned[song.id],1)
const outfit=OUTFITS.find(o=>o.id==='red-high-heels')
for(const pose of ['standing','riding']) {
  const rider=buildRider(pose,true)
  const attachments=addCharacterOutfits(rider.group,[outfit],pose)
  const shoes=rider.legs.map(leg=>leg.foot.children[0])
  assert.ok(shoes.every(shoe=>shoe?.name.startsWith('heel-')))
  rider.group.updateMatrixWorld(true)
  if(pose==='standing') {
    const bounds=shoes.map(shoe=>new Box3().setFromObject(shoe))
    assert.ok(bounds.every(box=>box.min.y>=0 && box.min.y<.03),'Both heels rest on the floor')
    assert.ok(bounds[0].max.x<bounds[1].min.x,'Shoes stay on separate feet')
  } else {
    const before=shoes[0].getWorldPosition(new Vector3())
    poseRider(rider.legs,Math.PI/2);rider.group.updateMatrixWorld(true)
    assert.ok(before.distanceTo(shoes[0].getWorldPosition(new Vector3()))>.1,'Shoes follow the pedal cycle')
    for(const leg of rider.legs) assert.ok(Math.abs(new Box3().setFromObject(leg.foot.children[0]).min.y-leg.pedal.position.y)<.04,'Heel stays above its pedal')
  }
  rider.group.remove(attachments)
  assert.ok(rider.legs.every(leg=>leg.foot.children.length===0),'Removing shoes leaves no bone attachments')
  assert.equal(attachments.children[0].children.length,2,'Detached shoes are returned for disposal')
}
const {WeatherLayer}=await import('../src/worlds/weather.ts')
const layer=new WeatherLayer(12,12)
layer.set('snow');const snow=layer.group.children.find(child=>child.isPoints)
const before=snow.geometry.attributes.position.array.slice()
layer.update(.5)
assert.ok(snow.visible && !layer.group.children[0].visible)
assert.notDeepEqual(snow.geometry.attributes.position.array,before,'Snowflakes fall and drift')
layer.set('overcast');assert.equal(layer.group.visible,false,'Overcast has no precipitation')
layer.set('rain');assert.equal(layer.group.children[0].visible,true);assert.equal(snow.visible,false)
console.log('PASS: heels unlock/equip/restore, grounded shoes, bone attachment, pedal contact, removal and snow animation')
