import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { buildRider, poseRider, riderJoints } from '../src/game/rider.ts'

const standing = buildRider('standing')
assert.equal(standing.group.children.filter(o => o.isMesh).length, 1, 'Standing preview only renders the character')
for (const { rest } of standing.legs) {
  assert.equal(rest.hip.x, rest.knee.x)
  assert.equal(rest.knee.x, rest.ankle.x)
  assert.equal(rest.hip.z, rest.knee.z)
  assert.equal(rest.knee.z, rest.ankle.z, 'Standing legs have a straight centerline')
}
for (const name of ['position', 'normal', 'skinWeight']) assert.ok([...standing.skin.geometry.getAttribute(name).array].every(Number.isFinite))
const rider = buildRider()
poseRider(rider.legs, 13, true)
rider.group.updateMatrixWorld(true)
const seatedFeet = rider.legs.map(leg => leg.foot.getWorldPosition(new Vector3()))
assert.ok(Math.abs(seatedFeet[0].y - seatedFeet[1].y) < 1e-8 && Math.abs(seatedFeet[0].z - seatedFeet[1].z) < 1e-8, 'Motorcycle and car feet share a fixed, symmetric seated pose')
poseRider(rider.legs, 0)
assert.equal(rider.group.children.filter(o => o.isMesh && o.material.color.getHex() === 0xfafafa).length, 1, 'One continuous white skin')
assert.ok(rider.skin.material.isMeshPhysicalMaterial, 'Soft plastic uses physical surface lighting')
assert.equal(rider.skin.material.metalness, 0)
const geometry = rider.skin.geometry
for (const name of ['position', 'normal', 'skinWeight']) assert.ok([...geometry.getAttribute(name).array].every(Number.isFinite))
const weights = geometry.getAttribute('skinWeight')
const skinIndices = geometry.getAttribute('skinIndex')
for (let i = 0; i < weights.count; i++) assert.ok(Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i) - 1) < 1e-6)
// All indexed triangles must belong to one connected surface.
for (const geometry of [standing.skin.geometry, rider.skin.geometry]) {
  const positions = geometry.getAttribute('position'), parents = new Map()
  function find(key) { if (!parents.has(key)) parents.set(key, key); if (parents.get(key) !== key) parents.set(key, find(parents.get(key))); return parents.get(key) }
  const triangles = geometry.getIndex()
  for (let i = 0; i < triangles.count; i += 3) {
    const keys = [0, 1, 2].map(j => triangles.getX(i+j)).map(j => [positions.getX(j), positions.getY(j), positions.getZ(j)].map(v => v.toFixed(5)).join(','))
    for (const key of keys) parents.set(find(key), find(keys[0]))
  }
  assert.equal(new Set([...parents.keys()].map(find)).size, 1, 'Torso, arms, head and legs form one connected skin')
}
const positions = geometry.getAttribute('position')
for (let frame = 0; frame < 360; frame++) {
  const phase = frame * Math.PI / 180
  poseRider(rider.legs, phase)
  for (const leg of rider.legs) {
    const j = riderJoints(leg.side, phase + (leg.side < 0 ? Math.PI : 0))
    assert.ok(Math.abs(j.hip.distanceTo(j.knee) - .49) < 1e-8, 'Thigh length stays fixed')
    assert.ok(Math.abs(j.knee.distanceTo(j.ankle) - .49) < 1e-8, 'Shin length stays fixed')
    assert.ok(j.knee.z < (j.hip.z + j.ankle.z) / 2, 'Knees bend towards the handlebars')
    rider.group.updateMatrixWorld(true)
    assert.ok(leg.shin.getWorldPosition(j.hip.clone()).distanceTo(j.knee) < 1e-8, 'Skeleton knee tracks the solved joint')
    assert.ok(leg.foot.getWorldPosition(j.hip.clone()).distanceTo(j.ankle) < 1e-8, 'Skeleton foot tracks the pedal')
    assert.ok(Math.abs(j.pedal.distanceTo(j.pedal.clone().setY(.70).setZ(.05)) - .17) < 1e-8)
  }
  rider.group.updateMatrixWorld(true)
  rider.skin.skeleton.update()
  for (let vertex = 0; vertex < positions.count; vertex += 79) {
    const point = rider.skin.applyBoneTransform(vertex, new Vector3().fromBufferAttribute(positions, vertex))
    assert.ok(point.toArray().every(Number.isFinite), 'Animated skin stays finite')
  }
  for (const [index, leg] of rider.legs.entries()) {
    let bottom = Infinity
    for (let vertex = 0; vertex < positions.count; vertex++) if (skinIndices.getW(vertex) === 3 + index * 3 && weights.getW(vertex) > .999) {
      const point = rider.skin.applyBoneTransform(vertex, new Vector3().fromBufferAttribute(positions, vertex))
      bottom = Math.min(bottom, point.y)
    }
    assert.ok(Math.abs(bottom - (leg.pedal.position.y + .02)) < .015, 'Actual skinned soles stay on pedals')
  }
  rider.group.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
  assert.ok(Math.abs(rider.legs[0].pedal.position.y + rider.legs[1].pedal.position.y - 1.4) < 1e-8, 'Pedals stay opposite')
}
console.log('PASS: connected skin, normalized weights, fixed limbs, skeletal joints, skinned sole contact and finite animation')
