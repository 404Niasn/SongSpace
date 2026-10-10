import * as T from 'three'
import type { WeatherId } from '../game/content'

/** A shared rain layer for the miniature and the endless track. */
export class WeatherLayer {
  readonly group = new T.Group()
  private positions = new Float32Array(280 * 6)
  private geometry = new T.BufferGeometry()
  private rain: T.LineSegments
  private snowPositions = new Float32Array(600 * 3)
  private snowGeometry = new T.BufferGeometry()
  private snow: T.Points
  private elapsed = 0
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
    for (let i = 0; i < 600; i++) {
      this.snowPositions.set([(((i * 73) % 601) / 601 - .5) * width, ((i * 29) % 600) / 600 * 36, (((i * 107) % 601) / 601 - .5) * depth + centerZ], i * 3)
    }
    this.snowGeometry.setAttribute('position', new T.BufferAttribute(this.snowPositions, 3).setUsage(T.DynamicDrawUsage))
    const snowMaterial = new T.PointsMaterial({ color: '#ffffff', size: .45, transparent: true, opacity: .9, depthWrite: false })
    snowMaterial.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat r = length(gl_PointCoord - vec2(.5)); if (r > .5) discard; diffuseColor.a *= 1. - smoothstep(.25, .5, r);')
    }
    this.snow = new T.Points(this.snowGeometry, snowMaterial)
    this.snow.frustumCulled = false
    this.group.add(this.snow)
    this.group.visible = false
  }
  set(weather: WeatherId) {
    this.rain.visible = weather === 'rain'
    this.snow.visible = weather === 'snow'
    this.group.visible = this.rain.visible || this.snow.visible
  }
  update(dt: number) {
    if (!this.group.visible) return
    if (this.snow.visible) {
      this.elapsed += dt
      for (let i = 0; i < 600; i++) {
        const at = i * 3
        this.snowPositions[at] = this.snowPositions[at]! + Math.sin(this.elapsed * .8 + i) * dt * .6
        if (this.snowPositions[at]! > this.width / 2) this.snowPositions[at] = -this.width / 2
        if (this.snowPositions[at]! < -this.width / 2) this.snowPositions[at] = this.width / 2
        this.snowPositions[at + 1] = this.snowPositions[at + 1]! - dt * (1.5 + (i % 7) * .18)
        if (this.snowPositions[at + 1]! < 0) this.snowPositions[at + 1] = this.snowPositions[at + 1]! + 36
      }
      this.snowGeometry.attributes.position!.needsUpdate = true
      return
    }
    for (let i = 0; i < this.positions.length; i += 6) {
      let y = this.positions[i + 1]! - dt * 20
      if (y < 0) y += 36
      this.positions[i + 1] = y
      this.positions[i + 4] = y - 1.1
    }
    this.geometry.attributes.position!.needsUpdate = true
  }
}
