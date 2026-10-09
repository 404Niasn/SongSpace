import * as T from 'three'
import type { WeatherId } from '../game/content'

/** A shared rain layer for the miniature and the endless track. */
export class WeatherLayer {
  readonly group = new T.Group()
  private positions = new Float32Array(280 * 6)
  private geometry = new T.BufferGeometry()
  private rain: T.LineSegments
  constructor(private width = 100, private depth = 100, private centerZ = 0) {
    for (let i = 0; i < 280; i++) {
      const at = i * 6
      const x = (((i * 73) % 281) / 281 - 0.5) * width
      const y = ((i * 29) % 280) / 280 * 36
      const z = (((i * 107) % 281) / 281 - 0.5) * depth + centerZ
      this.positions.set([x, y, z, x - 0.15, y - 1.1, z], at)
    }
    this.geometry.setAttribute('position', new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage))
    this.rain = new T.LineSegments(this.geometry, new T.LineBasicMaterial({ color: '#b5d2e1', transparent: true, opacity: 0.48, depthWrite: false }))
    this.rain.frustumCulled = false
    this.group.add(this.rain)
    this.group.visible = false
  }
  set(weather: WeatherId) { this.group.visible = weather === 'rain' }
  update(dt: number) {
    if (!this.group.visible) return
    for (let i = 0; i < this.positions.length; i += 6) {
      let y = this.positions[i + 1]! - dt * 20
      if (y < 0) y += 36
      this.positions[i + 1] = y
      this.positions[i + 4] = y - 1.1
    }
    this.geometry.attributes.position!.needsUpdate = true
  }
}
