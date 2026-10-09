import assert from 'node:assert/strict'
import * as T from 'three'
import { buildVehicle, VEHICLES } from '../src/game/vehicles.ts'
for (const id of Object.keys(VEHICLES)) {
  const { group, wheels, radius } = buildVehicle(id)
  assert.equal(wheels.length, id === 'ae86' ? 4 : 2)
  const size = new T.Box3().setFromObject(group).getSize(new T.Vector3())
  assert.ok(size.x < 1.8 && size.z < 3.6, `${id} fits a two metre lane and camera`)
  assert.ok(new T.Box3().setFromObject(group).min.y >= 0, `${id} stays above the road`)
  assert.equal(radius, VEHICLES[id].radius)
  let triangles = 0
  group.traverse(object => {
    if (!object.isMesh) return
    assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite), `${id}/${object.name} has finite geometry`)
    assert.ok([...object.geometry.attributes.normal.array].every(Number.isFinite), `${id}/${object.name} has finite lighting normals`)
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3
  })
  assert.ok(triangles < 60000, `${id} remains suitable for live exploration`)
  if (id === 'bicycle-rack') assert.ok(group.getObjectByName('rear-rack'))
  if (id === 'motorcycle') assert.ok(group.getObjectByName('rust-chip') && group.getObjectByName('engine'))
  if (id === 'ae86') assert.ok(group.getObjectByName('raised-pop-up-housing') && group.getObjectByName('steering-wheel'))
  if (id === 'ae86') {
    const roof = new T.Box3().setFromObject(group.getObjectByName('roof'))
    assert.ok(roof.max.y < 1.32 && roof.getSize(new T.Vector3()).x < 1.2, 'Roof remains low and tapered away from the body sides')
  }
  const before = new T.Box3().setFromObject(group)
  wheels.forEach(w => w.rotation.x = Math.PI)
  const after = new T.Box3().setFromObject(group)
  assert.ok(Math.abs(before.min.y - after.min.y) < .01, `${id} wheel rotation does not change ground contact`)
}
console.log('PASS: three distinct models, road and lane bounds, wheel axles and detailed vehicle parts')
