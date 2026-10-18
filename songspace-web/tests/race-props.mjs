import assert from 'node:assert/strict'
import * as T from 'three'
import { buildRaceCoin, buildRaceObstacle, freezeRaceObstacle, raceRow } from '../src/game/raceProps.ts'

const coin = buildRaceCoin()
assert.equal(coin.children.length, 3, 'Detailed coins remain three render batches')
for (const object of coin.children) {
  assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite))
  assert.ok([...object.geometry.attributes.normal.array].every(Number.isFinite))
}
const coinBounds = new T.Box3().setFromObject(coin)
assert.ok(coinBounds.min.z < -.07 && coinBounds.max.z > .07, 'Both sides have raised relief')
for (const world of ['forest', 'sea', 'jiangnan', 'fuji', 'space']) {
  const styles = new Set()
  for (const variant of [0, 3, 6]) {
  for (const moving of [false, true]) {
    const model = buildRaceObstacle(world, moving, variant)
    styles.add(model.userData.obstacleKind)
    const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3())
    assert.ok(size.x < 1.5 && size.y < 1.15 && size.z < 1.8, `${world} stays within its lane and jump height`)
    assert.ok(bounds.min.y >= -.01, 'Props stand on the road')
    assert.equal(model.userData.wheels.length, moving ? 4 : 0)
    assert.ok(model.children.length <= 15, 'Detailed obstacles must stay batched')
    model.traverse(object => {
      if (!object.isMesh) return
      assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite))
      assert.ok([...object.geometry.attributes.normal.array].every(Number.isFinite))
    })
    const colors = model.children.map(object => object.material.color.getHex())
    const emissive = model.children.map(object => object.material.emissive.getHex())
    freezeRaceObstacle(model, true)
    assert.ok(model.children.every(object => object.material.color.getHex() === 0xbce5eb))
    freezeRaceObstacle(model, false)
    assert.deepEqual(model.children.map(object => object.material.color.getHex()), colors)
    assert.deepEqual(model.children.map(object => object.material.emissive.getHex()), emissive, 'Freeze must restore sci-fi lights')
    model.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose() } })
  }
  }
  assert.equal(styles.size, 3, 'Each map must have three distinctive obstacles')
}
const routeStyles = new Set()
for (let row = 0; row < 120; row++) if (raceRow(row).obstacle) routeStyles.add(buildRaceObstacle('fuji', false, row).userData.obstacleKind)
assert.equal(routeStyles.size, 3, 'Real obstacle rows must reach all variants')
let obstacles = 0, moving = 0
for (let row = 0; row < 1000; row++) {
  const pattern = raceRow(row)
  assert.ok([-1, 0, 1].includes(pattern.coinLane))
  assert.ok([-1, 0, 1].includes(pattern.obstacleLane))
  assert.deepEqual(raceRow(row), pattern, 'Rewind reconstructs the same route')
  if (row < 7) assert.equal(pattern.obstacle, false)
  if (pattern.obstacle) {
    obstacles++
    assert.notEqual(pattern.coinLane, pattern.obstacleLane, 'Coins guide a clear passage')
    assert.ok(Math.abs(pattern.coinLane * 2 - pattern.obstacleLane * 2) - .55 > .8, 'Moving carts cannot sweep the guided lane')
  }
  if (pattern.moving) moving++
}
assert.ok(obstacles > 200 && moving > 30)
console.log('PASS: coin batching, finite geometry, obstacle bounds, freeze restoration, safe routes and rewind determinism')
