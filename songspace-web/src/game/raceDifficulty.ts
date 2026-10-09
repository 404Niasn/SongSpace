export function raceDifficulty(distance: number) {
  const stage = Math.floor(Math.max(0, distance) / 500) + 1
  const level = Math.min(stage - 1, 5)
  return {
    stage,
    speedBonus: level,
    obstacleSteps: [3, 6, 9, ...[1, 5, 10].slice(0, Math.min(level, 3))],
    movingFrequency: Math.max(1, 4 - level),
    movingSpeed: 1.6 + level * .15,
  }
}
