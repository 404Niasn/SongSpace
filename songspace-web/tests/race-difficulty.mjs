import assert from 'node:assert/strict'
import { raceDifficulty } from '../src/game/raceDifficulty.ts'
import { raceRow } from '../src/game/raceProps.ts'

assert.equal(raceDifficulty(499).stage, 1)
assert.equal(raceDifficulty(500).stage, 2)
for (let stage = 1; stage <= 6; stage++) {
  const difficulty = raceDifficulty((stage - 1) * 500)
  assert.equal(difficulty.speedBonus, stage - 1)
  assert.equal(difficulty.obstacleSteps.length, Math.min(6, stage + 2))
  assert.ok(difficulty.movingSpeed <= 2.35)
}
assert.deepEqual(raceDifficulty(100000).obstacleSteps, raceDifficulty(2500).obstacleSteps)
assert.equal(raceDifficulty(100000).speedBonus, 5)
const counts = []
for (let stage = 1; stage <= 4; stage++) {
  let total = 0, obstacles = 0
  for (let row = 7; row < 300; row++) {
    const distance = 15 + row * 7
    if (raceDifficulty(distance).stage !== stage) continue
    const pattern = raceRow(row)
    total++
    obstacles += Number(pattern.obstacle)
    assert.deepEqual(pattern, raceRow(row), 'Rewind preserves difficulty and layout')
    if (pattern.obstacle) assert.notEqual(pattern.coinLane, pattern.obstacleLane, 'A clear coin lane remains')
  }
  counts.push(obstacles / total)
}
for (let i = 1; i < counts.length; i++) assert.ok(counts[i] > counts[i - 1], 'Obstacle density increases each early stage')
console.log('PASS: stage boundaries, increasing obstacle density, clear routes, deterministic rewind and bounded difficulty')
