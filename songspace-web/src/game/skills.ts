import type { SkillId } from './content.ts'
export interface SkillSlot { id: SkillId; level: number; name: string }
export class Skills {
  used = new Set<number>()
  shield = false
  private shieldSafety = 0
  magnet = 0
  freeze = 0
  boost = 0
  protection = 0
  countdown = 0
  double = 0
  private doubleDuration = 8
  slots: SkillSlot[]
  constructor(slots: SkillSlot[] = []) { this.slots = slots }
  use(index: number, health: number, hasPast: boolean): { accepted: boolean; health: number; rewind: boolean } {
    const slot = this.slots[index]
    const no = { accepted: false, health, rewind: false }
    if (!slot || this.used.has(index) || slot.id === 'revive') return no
    if (slot.id === 'tea' && health >= 3) return no
    if (slot.id === 'rewind' && !hasPast) return no
    const upgrade = Math.max(0, slot.level - 1)
    if (slot.id === 'shield') { this.shield = true; this.shieldSafety = upgrade }
    if (slot.id === 'magnet') this.magnet = 8 + upgrade * 2
    if (slot.id === 'freeze') this.freeze = 5 + upgrade
    if (slot.id === 'courage') { this.boost = 6 + upgrade; this.protection = this.boost }
    if (slot.id === 'friend') this.boost = 8 + upgrade * 2
    if (slot.id === 'tea') { health = Math.min(3, health + 1); this.protection = Math.max(this.protection, upgrade) }
    if (slot.id === 'double') { this.countdown = 3; this.doubleDuration = 8 + upgrade * 2 }
    this.used.add(index)
    return { accepted: true, health, rewind: slot.id === 'rewind' }
  }
  tick(dt: number) {
    for (const key of ['magnet', 'freeze', 'boost', 'protection', 'double'] as const) this[key] = Math.max(0, this[key] - dt)
    if (this.countdown > 0) {
      const remaining = this.countdown - dt
      this.countdown = Math.max(0, remaining)
      if (remaining <= 0) this.double = Math.max(0, this.doubleDuration + remaining)
    }
  }
  collide(health: number): { health: number; blocked: boolean; revived: boolean } {
    if (this.protection > 0) return { health, blocked: true, revived: false }
    if (this.shield) { this.shield = false; this.protection = Math.max(this.protection, this.shieldSafety); return { health, blocked: true, revived: false } }
    health--
    const index = this.slots.findIndex((s, i) => s.id === 'revive' && !this.used.has(i))
    if (health <= 0 && index >= 0) {
      this.used.add(index)
      this.protection = 3 + Math.max(0, this.slots[index]!.level - 1)
      return { health: 1, blocked: false, revived: true }
    }
    return { health, blocked: false, revived: false }
  }
  remaining(index: number) {
    const id = this.slots[index]?.id
    if (id === 'shield' && this.shield) return '守护中'
    if (id === 'double') return this.countdown > 0 ? `倒数 ${Math.ceil(this.countdown)}s` : this.double > 0 ? `双倍 ${Math.ceil(this.double)}s` : ''
    const time = id === 'magnet' ? this.magnet : id === 'freeze' ? this.freeze : ['friend', 'courage'].includes(id || '') ? this.boost : 0
    return time > 0 ? `${Math.ceil(time)}s` : ''
  }
}
