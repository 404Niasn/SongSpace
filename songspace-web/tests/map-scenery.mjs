import assert from 'node:assert/strict'
import * as T from 'three'
import { CherryPetals, pineTree, birchTree, palmTree, coastalLighthouse, groundPlants, landform, rockFormation } from '../src/worlds/scenery.ts'
import { forestLookout, lakesidePavilion, shoreShelter, observatory, stoneLantern } from '../src/worlds/mapLandmarks.ts'
import { fujiMountain } from '../src/worlds/songWorlds.ts'

const petals = new CherryPetals(150, 17, 65, true)
const before = petals.mesh.instanceMatrix.array.slice()
petals.update(1, 13)
assert.notDeepEqual(petals.mesh.instanceMatrix.array, before, 'Riding must move petals through the view')
const frozen = petals.mesh.instanceMatrix.array.slice()
petals.update(1, 13)
assert.deepEqual(petals.mesh.instanceMatrix.array, frozen, 'An unchanged game clock must freeze petals when paused')
for (const [time, distance] of [[0, 0], [100, 1300], [10000, 150000]]) {
  petals.update(time, distance)
  const matrix = new T.Matrix4(), position = new T.Vector3()
  let visible = 0
  for (let i = 0; i < petals.mesh.count; i++) {
    petals.mesh.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix)
    assert.ok([...matrix.elements].every(Number.isFinite))
    assert.ok(position.y >= .39 && position.y <= 7.41)
    assert.ok(position.z >= -61.01 && position.z <= 4.01)
    if (Math.abs(position.x) < 5 && position.z < 0 && position.z > -25 && position.y < 4) visible++
  }
  assert.ok(visible > 5, 'Petals must remain visible near the riding corridor after a long ride')
}
for (const asset of [pineTree(3), birchTree(3), palmTree(3), coastalLighthouse(), forestLookout(), lakesidePavilion(), shoreShelter(), observatory(), stoneLantern(), landform(73), rockFormation(3)]) {
  let drawCalls = 0
  asset.traverse(o => {
    if (!o.isMesh) return
    drawCalls++
    assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite))
    assert.ok([...o.geometry.attributes.normal.array].every(Number.isFinite))
    o.geometry.dispose(); o.material.dispose()
  })
  assert.ok(drawCalls <= 2, 'Detailed trees and buildings should use merged geometry')
}
const mountain = fujiMountain(), crater = mountain.getObjectByName('fuji-crater-interior')
assert.ok(crater, 'The summit must have a modeled crater interior')
crater.geometry.computeBoundingBox()
assert.ok(crater.geometry.boundingBox.max.x - crater.geometry.boundingBox.min.x > 7, 'Crater opening must be visibly wider than the old disk')
assert.ok(crater.geometry.boundingBox.max.y - crater.geometry.boundingBox.min.y > 3, 'Crater must have a real depression')
mountain.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose() } })
const plants = groundPlants(200, 40, 30, x => Math.abs(x) > 5)
const matrix = new T.Matrix4()
for (let i = 0; i < plants.count; i++) {
  plants.getMatrixAt(i, matrix)
  assert.ok(Math.abs(matrix.elements[12]) > 5, 'Ground plants must leave the riding road clear')
}
plants.geometry.dispose(); plants.material.dispose(); petals.mesh.geometry.dispose(); petals.mesh.material.dispose()
console.log('PASS: petal travel, pause, long-ride bounds, near-camera density, merged scenery and clear road')
