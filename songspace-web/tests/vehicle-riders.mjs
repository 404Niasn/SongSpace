import assert from 'node:assert/strict'
import { Box3, Vector3 } from 'three'
import { buildMountedVehicle } from '../src/game/vehicleRider.ts'

for (const kind of ['ae86', 'motorcycle']) {
  const model = buildMountedVehicle(kind)
  model.group.updateMatrixWorld(true)
  const skin = model.rider.getObjectByName('rider-skin')
  skin.skeleton.update()
  const position = skin.geometry.getAttribute('position'), bounds = new Box3()
  for (let i = 0; i < position.count; i++) {
    const p = new Vector3().fromBufferAttribute(position, i)
    skin.applyBoneTransform(i, p); p.applyMatrix4(skin.matrixWorld)
    assert.ok(p.toArray().every(Number.isFinite))
    bounds.expandByPoint(p)
  }
  assert.ok(bounds.min.y > .3, 'Seated feet stay above the road and car floor')
  assert.ok(model.legs.every(leg => !leg.pedal.visible && !leg.crank.visible))
  const feet = model.legs.map(leg => leg.foot.getWorldPosition(new Vector3()))
  assert.ok(Math.abs(feet[0].y - feet[1].y) < 1e-7)
  if (kind === 'ae86') {
    const roof = new Box3().setFromObject(model.group.getObjectByName('roof'))
    assert.ok(bounds.max.y < roof.min.y, `Driver head ${bounds.max.y} stays below roof ${roof.min.y}`)
    assert.ok(bounds.max.x < .63 && bounds.min.x > -.63, 'Driver stays within cabin width')
  } else {
    assert.ok(Math.abs(feet[0].y - .83) < .01 && Math.abs(feet[0].z - .28) < .01, 'Feet sit on the motorcycle rests')
  }
}
console.log('PASS: mounted geometry, driver roof clearance, cabin width, symmetric fixed feet and hidden pedals')
