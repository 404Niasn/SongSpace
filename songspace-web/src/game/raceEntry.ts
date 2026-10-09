export const ENTRY_DURATION = 2200

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return Math.max(0, Math.min(1, t * t * t * (t * (t * 6 - 15) + 10)))
}

export function raceEntryMotion(progress: number) {
  return {
    flight: smooth(progress / .74),
    road: progress >= .76,
    opacity: progress < .76 ? 1 - smooth((progress - .56) / .18) : smooth((progress - .78) / .22),
  }
}
