import * as T from 'three'
import { disposeObject } from '@/worlds/models'

export class PackModel {
  private renderer: T.WebGLRenderer
  private scene = new T.Scene()
  private camera = new T.PerspectiveCamera(33, 1, 0.1, 30)
  private bag = new T.Group()
  private seal = new T.Group()
  private observer: ResizeObserver
  private frame = 0
  private disposed = false
  private start = performance.now()
  private dirty = true
  private target = 0
  private tearing = 0
  private opening = false
  constructor(
    private host: HTMLElement,
    title: string,
    count: number,
    tone: string,
    private preview = false,
  ) {
    this.renderer = new T.WebGLRenderer({ alpha: true, antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    host.append(this.renderer.domElement)
    this.camera.position.set(0, 0, 7.2)
    this.scene.add(new T.HemisphereLight('#e9f8ff', '#1d283c', 2))
    for (const [x, c, intensity] of [
      [-3, '#fff0d2', 4],
      [3, '#a1d9ed', 2],
    ] as const) {
      const l = new T.DirectionalLight(c, intensity)
      l.position.set(x, 3, 5)
      this.scene.add(l)
    }
    this.scene.add(this.bag)
    this.bag.rotation.set(0.05, -0.23, -0.08)
    const color =
      tone === 'gold'
        ? '#dfbc77'
        : tone === 'rainbow'
          ? '#a1c7ca'
          : tone === 'blue'
            ? '#99bdd8'
            : '#a7c5a7'
    const foil = new T.MeshStandardMaterial({
      color,
      metalness: 0.8,
      roughness: 0.34,
      side: T.DoubleSide,
    })
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1536
    const texture = new T.CanvasTexture(canvas)
    texture.colorSpace = T.SRGBColorSpace
    const front = new T.MeshStandardMaterial({
      map: texture,
      metalness: 0.18,
      roughness: 0.53,
      side: T.DoubleSide,
    })
    const ctx = canvas.getContext('2d')!
    const bg =
      tone === 'gold'
        ? '#47372c'
        : tone === 'rainbow'
          ? '#313f55'
          : tone === 'blue'
            ? '#263f52'
            : '#294941'
    const ink =
      tone === 'gold'
        ? '#ead3a0'
        : tone === 'rainbow'
          ? '#c6cbe6'
          : tone === 'blue'
            ? '#b5d3e4'
            : '#c9dfbd'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 1024, 1536)
    ctx.strokeStyle = ink
    ctx.fillStyle = ink
    ctx.lineWidth = 3
    ctx.strokeRect(48, 62, 928, 1412)
    ctx.font = '500 29px sans-serif'
    ctx.fillText('S O N G S P A C E', 92, 166)
    ctx.font = 'bold 88px serif'
    ctx.fillText(title, 86, 298)
    ctx.font = '24px sans-serif'
    ctx.fillText('MUSIC COLLECTION  /  VOL. 01', 92, 354)
    ctx.save()
    ctx.translate(512, 824)
    ctx.lineWidth = 7
    if (title.includes('载具')) {
      for (const x of [-208, 208]) {
        ctx.beginPath()
        ctx.arc(x, 98, 132, 0, Math.PI * 2)
        ctx.stroke()
        ctx.lineWidth = 2
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6
          ctx.moveTo(x, 98)
          ctx.lineTo(x + Math.cos(a) * 124, 98 + Math.sin(a) * 124)
          ctx.stroke()
        }
        ctx.lineWidth = 7
      }
      ctx.beginPath()
      ctx.moveTo(-208, 98)
      ctx.lineTo(-60, -105)
      ctx.lineTo(45, 98)
      ctx.lineTo(-208, 98)
      ctx.lineTo(140, -95)
      ctx.lineTo(208, 98)
      ctx.moveTo(140, -95)
      ctx.lineTo(120, -158)
      ctx.lineTo(58, -158)
      ctx.moveTo(-60, -105)
      ctx.lineTo(-95, -155)
      ctx.stroke()
      ctx.fillRect(-128, -168, 88, 14)
    } else if (title.includes('主题')) {
      ctx.beginPath()
      ctx.arc(0, 0, 240, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(0, 0, 110, 240, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(0, 0, 240, 84, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-235, 0)
      ctx.lineTo(235, 0)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, 242, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.arc(0, 0, 72, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = bg
      ctx.lineWidth = 2
      for (let r = 100; r < 225; r += 18) {
        ctx.beginPath()
        ctx.arc(0, 0, r, 0.35, Math.PI * 1.83)
        ctx.stroke()
      }
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.arc(0, 0, 10, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    ctx.strokeStyle = ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(92, 1212)
    ctx.lineTo(932, 1212)
    ctx.stroke()
    ctx.fillStyle = ink
    ctx.font = 'bold 72px sans-serif'
    ctx.fillText(String(count).padStart(2, '0'), 90, 1324)
    ctx.font = '24px sans-serif'
    ctx.fillText('CARDS INSIDE', 236, 1310)
    ctx.font = '21px sans-serif'
    ctx.fillText('一首好歌，一段新的旅程。', 92, 1408)
    texture.needsUpdate = true
    // Subdivided surfaces create a pillowed foil pouch, pinched into sealed edges.
    for (const side of [1, -1]) {
      const geo = new T.PlaneGeometry(2.12, 3.1, 36, 48),
        p = geo.attributes.position!
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i)
        const bulge =
          Math.pow(
            Math.max(0, Math.cos((x / 2.12) * Math.PI) * Math.cos((y / 3.1) * Math.PI)),
            0.65,
          ) * 0.24
        const wrinkle = Math.sin(x * 29 + y * 9) * 0.018 * Math.pow(Math.abs(x / 1.06), 5)
        p.setZ(i, side * (0.045 + bulge + wrinkle))
      }
      geo.computeVertexNormals()
      const m = new T.Mesh(geo, side === 1 ? front : foil)
      this.bag.add(m)
    }
    for (const side of [-1, 1]) {
      const fold = new T.Mesh(new T.BoxGeometry(0.045, 3.12, 0.1), foil)
      fold.position.x = side * 1.07
      this.bag.add(fold)
    }
    this.bag.add(this.seal)
    for (const top of [-1, 1]) {
      const parent = top === 1 ? this.seal : this.bag
      const strip = new T.Mesh(new T.BoxGeometry(2.17, 0.18, 0.1), foil)
      strip.position.y = top * 1.59
      parent.add(strip)
      for (let i = 0; i < 48; i++) {
        const rib = new T.Mesh(new T.BoxGeometry(0.012, 0.17, 0.012), foil)
        rib.position.set(-1.03 + i * 0.044, top * 1.59, 0.058)
        parent.add(rib)
      }
    }
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(host)
    this.resize()
    this.animate()
  }
  tilt(value: number) {
    this.target = value
  }
  tear(value: number) {
    this.tearing = value
  }
  open() {
    this.opening = true
    this.start = performance.now()
  }
  private resize() {
    this.dirty = true
    const w = this.host.clientWidth,
      h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }
  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    if (document.hidden || !this.host.clientWidth) return
    const t = performance.now() / 1000
    const target = -0.38 + this.target * 0.35
    if (this.preview && !this.dirty && Math.abs(this.bag.rotation.y - target) < 0.001) return
    this.bag.rotation.y += (target - this.bag.rotation.y) * 0.08
    this.bag.rotation.z = -0.08 + (this.preview ? 0 : Math.sin(t * 0.65) * 0.025)
    this.seal.position.x = this.tearing * 0.65
    this.seal.rotation.z = -this.tearing * 0.15
    if (this.opening) {
      const p = Math.min(1, (performance.now() - this.start) / 850)
      this.seal.position.set(p * 2, p * 1.3, 0)
      this.seal.rotation.z = -p * 0.8
      this.bag.position.y = -p * p * 3
      this.bag.rotation.x = p * 0.6
    }
    this.renderer.render(this.scene, this.camera)
    this.dirty = false
  }
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    disposeObject(this.scene)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
