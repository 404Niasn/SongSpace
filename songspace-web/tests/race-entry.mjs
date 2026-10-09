import assert from 'node:assert/strict'
import { ENTRY_DURATION, raceEntryMotion } from '../src/game/raceEntry.ts'

assert.equal(ENTRY_DURATION, 2200)
assert.deepEqual(raceEntryMotion(0), { flight: 0, road: false, opacity: 1 })
assert.deepEqual(raceEntryMotion(1), { flight: 1, road: true, opacity: 1 })
for (const progress of [.74, .75, .76, .77, .78]) {
  assert.ok(Math.abs(raceEntryMotion(progress).opacity) < 1e-10, 'Scene cut stays invisible')
}
let previous = raceEntryMotion(0)
for (let step = 1; step <= 1000; step++) {
  const motion = raceEntryMotion(step / 1000)
  assert.ok(motion.flight >= previous.flight && motion.flight <= 1)
  assert.ok(motion.opacity >= 0 && motion.opacity <= 1)
  assert.ok(Math.abs(motion.opacity - previous.opacity) < .012, 'No discontinuous fade')
  previous = motion
}
assert.ok(raceEntryMotion(.001).flight < .000001, 'Camera eases into flight')
assert.ok(1 - raceEntryMotion(.739).flight < .000001, 'Camera settles before scene cut')
console.log('PASS: smooth flight, continuous fades, invisible scene cut and complete reveal')
