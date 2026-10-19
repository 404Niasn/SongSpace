import assert from 'node:assert/strict'
import { buildSongWorld } from '../src/worlds/songWorlds.ts'
import { lunarHeight, LUNAR_CRATERS, orbitalHabitat, lunarRover, relayAntenna } from '../src/worlds/spaceScenery.ts'

function resources(root) {
  const geometries = new Set(), materials = new Set()
  root.traverse(object => {
    if (!object.geometry) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
  })
  return { geometries, materials }
}
function dispose(root) {
  const { geometries, materials } = resources(root)
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
}

const world = buildSongWorld('space')
assert.equal(world.heightAt(world.spawn.x, world.spawn.z), world.spawn.y)
for (let z = -34; z <= 34; z++) {
  assert.ok(world.isWalkable(5, z), `Navigation remains open at ${z}`)
  assert.ok(Math.abs(lunarHeight(5, z)) < 1e-6, 'Walkway terrain must remain flat')
  assert.equal(world.heightAt(5, z), .12, 'Walking must follow the raised walkway')
}
assert.equal(world.heightAt(-20, 7), .25, 'Landing pad must not swallow feet / placed props')
assert.equal(world.heightAt(-12.5, 7), .15)
assert.equal(world.isWalkable(24, -12), false, 'Habitat remains solid')
for (const crater of LUNAR_CRATERS) {
  assert.ok(lunarHeight(crater.x, crater.z) < -.25, 'Craters must be actual depressions')
}
let batches = 0, triangles = 0
world.group.traverse(object => {
  if (!object.geometry) return
  batches++
  const geometry = object.geometry
  for (const attribute of Object.values(geometry.attributes)) {
    assert.ok([...attribute.array].every(Number.isFinite), `${object.name}: finite mesh attributes`)
  }
  triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1)
})
assert.ok(batches < 65, `Map batch budget: ${batches}`)
assert.ok(triangles < 250000, `Map triangle budget: ${triangles}`)
const stars = world.group.getObjectByName('layered-deep-space-stars')
assert.ok(stars.geometry.attributes.position.count >= 500)
assert.equal(stars.material.fog, false)
assert.equal(stars.material.depthWrite, false)
assert.equal(world.water.depthWrite, false)
assert.equal(world.water.transparent, true)
const moon = world.group.getObjectByName('cratered-satellite')
const positions = moon.geometry.attributes.position
const radii = Array.from({ length: positions.count }, (_, i) => Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)))
assert.ok(Math.max(...radii) - Math.min(...radii) > .3, 'Satellite craters must alter the silhouette')
for (const factory of [orbitalHabitat, lunarRover, relayAntenna]) {
  const first = factory(), second = factory()
  const a = resources(first), b = resources(second)
  assert.ok(a.materials.size <= 5, 'Detailed props must batch their surfaces')
  assert.ok([...a.geometries].every(geometry => !b.geometries.has(geometry)))
  assert.ok([...a.materials].every(material => !b.materials.has(material)))
  let disposed = false
  for (const geometry of b.geometries) geometry.addEventListener('dispose', () => { disposed = true })
  dispose(first)
  assert.equal(disposed, false, 'Disposing one road chunk cannot invalidate the next')
  dispose(second)
}
world.update(125)
assert.equal(world.water.uniforms.time.value, 125)
dispose(world.group)
console.log(`PASS: lunar terrain, raised-platform placement, clear route, resource isolation and geometry budget (${batches} batches / ${Math.round(triangles)} triangles)`)
