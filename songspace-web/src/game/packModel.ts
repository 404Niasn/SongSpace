import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { disposeObject } from '@/worlds/models'

/** A slipcase open at the bottom, with a sliding felt tray and paper record sleeves. */
export class PackModel {
  private renderer: T.WebGLRenderer
  private scene = new T.Scene()
  private camera = new T.PerspectiveCamera(33, 1, .1, 40)
  private box = new T.Group()
  private drawer = new T.Group()
  private sleeve = new T.Group()
  private grip = new T.Group()
  private observer: ResizeObserver
  private environment: T.WebGLRenderTarget
  private frame = 0
  private target = 0
  private progress = 0
  private dragProgress = 0
  private opening = false
  private start = 0
  private dirty = true
  private textures: T.Texture[] = []

  constructor(private host: HTMLElement, title: string, count: number, tone: string, private preview = false) {
    this.renderer = new T.WebGLRenderer({ alpha: true, antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.domElement.setAttribute('aria-label', 'SongSpace 抽屉式唱片收藏盒')
    host.append(this.renderer.domElement)
    const pmrem = new T.PMREMGenerator(this.renderer), room = new RoomEnvironment()
    this.environment = pmrem.fromScene(room, .04); this.scene.environment = this.environment.texture
    room.dispose(); pmrem.dispose()
    this.scene.add(new T.HemisphereLight('#ffffff', '#82978a', 2.4), this.box)
    const key = new T.DirectionalLight('#fff9ed', 3); key.position.set(-3, 5, 7); this.scene.add(key)
    const green = tone === 'blue' ? '#355666' : tone === 'gold' ? '#55624b' : '#365d50'
    const shell = new T.MeshStandardMaterial({ color: '#edf0e9', roughness: .88 })
    const felt = new T.MeshStandardMaterial({ color: green, roughness: 1 })
    const edge = new T.MeshStandardMaterial({ color: '#bcc8bd', roughness: .66 })
    const part = (g: T.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material) => {
      const mesh = new T.Mesh(new RoundedBoxGeometry(w, h, d, 2, .025), mat)
      mesh.position.set(x, y, z); g.add(mesh); return mesh
    }
    const depth = .36 + count * .035
    part(this.box, 3.12, 3.12, .075, 0, 0, -depth / 2, shell)
    part(this.box, 3.12, 3.12, .075, 0, 0, depth / 2, shell)
    for (const x of [-1.52, 1.52]) part(this.box, .08, 3.12, depth, x, 0, 0, shell)
    part(this.box, 3.12, .08, depth, 0, 1.52, 0, shell)
    // A printed front label, with actual concentric embossing on top of it.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#edf0e9'; ctx.fillRect(0, 0, 1024, 1024)
    for (let i = 0; i < 15000; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff15' : '#2946380b'
      ctx.fillRect((i * 157) % 1024, (i * 331 + Math.floor(i / 1024) * 43) % 1024, 1, 2)
    }
    ctx.fillStyle = green; ctx.textAlign = 'left'; ctx.font = '500 34px sans-serif'
    ctx.fillText('SONGSPACE', 80, 120)
    ctx.font = '20px sans-serif'; ctx.fillText('RECORD COLLECTION / VOL. 01', 80, 160)
    ctx.font = '500 50px sans-serif'; ctx.fillText(title.replace('包', '盒'), 80, 852)
    ctx.font = '24px sans-serif'; ctx.fillText(`${String(count).padStart(2, '0')} TRACK${count > 1 ? 'S' : ''}     ·     音乐收藏系列`, 80, 908)
    ctx.fillRect(80, 756, 864, 2)
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; this.textures.push(texture)
    const cover = new T.Mesh(new T.PlaneGeometry(3, 3), new T.MeshStandardMaterial({ map: texture, roughness: .82 }))
    cover.position.z = depth / 2 + .039; this.box.add(cover)
    const vinyl = new T.Mesh(new T.CircleGeometry(.78, 80), new T.MeshPhysicalMaterial({ color: green, roughness: .38, metalness: .15, clearcoat: .35 }))
    vinyl.position.set(0, .05, depth / 2 + .045); this.box.add(vinyl)
    const grooveMat = new T.MeshStandardMaterial({ color: '#81998a', metalness: .4, roughness: .5 })
    for (let i = 0; i < 23; i++) {
      const ring = new T.Mesh(new T.TorusGeometry(.29 + i * .02, .0028, 4, 80), grooveMat)
      ring.position.copy(vinyl.position); ring.position.z += .006; this.box.add(ring)
    }
    const label = new T.Mesh(new T.CircleGeometry(.25, 40), edge)
    label.position.copy(vinyl.position); label.position.z += .008; this.box.add(label)
    const hole = new T.Mesh(new T.CircleGeometry(.025, 16), felt)
    hole.position.copy(label.position); hole.position.z += .005; this.box.add(hole)
    this.box.add(this.drawer)
    part(this.drawer, 2.91, 2.94, .06, 0, -.03, -depth / 2 + .07, felt)
    for (const x of [-1.43, 1.43]) part(this.drawer, .055, 2.94, depth - .1, x, -.03, 0, felt)
    part(this.drawer, 2.91, .09, depth - .055, 0, -1.49, 0, felt)
    this.drawer.add(this.sleeve)
    for (let i = count - 1; i >= 0; i--) {
      part(this.sleeve, 1.85, 2.55, .025, i * .025, -.08 + i * .018, .02 - i * .035, new T.MeshStandardMaterial({ color: i % 2 ? '#e4e8dc' : '#f5f5e9', roughness: .92 }))
    }
    const record = new T.Mesh(new T.CircleGeometry(.59, 64), new T.MeshStandardMaterial({ color: '#263f35', roughness: .38 }))
    record.position.set(0, -.12, .041); this.sleeve.add(record)
    const centre = new T.Mesh(new T.CircleGeometry(.18, 32), edge); centre.position.set(0, -.12, .045); this.sleeve.add(centre)
    this.drawer.add(this.grip); this.grip.position.set(0, -1.7, .03)
    part(this.grip, .32, .42, .035, 0, 0, 0, felt)
    for (const x of [-.125, .125]) part(this.grip, .008, .35, .005, x, 0, .021, edge)
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host)
    this.resize(); this.animate()
  }
  tilt(value: number) { this.target = value; this.dirty = true }
  tear(value: number) { this.dragProgress = value; this.dirty = true }
  open() { this.opening = true; this.start = this.dragProgress * .65; this.dirty = true }
  openingAt(value: number) { this.progress = value; this.dirty = true }
  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h); this.camera.aspect = w / h
    const fit = this.preview ? 4.35 : 5.7
    this.camera.position.set(0, -.25, Math.max(fit, fit / this.camera.aspect) / (2 * Math.tan(T.MathUtils.degToRad(16.5))))
    this.camera.lookAt(0, -.25, 0); this.camera.updateProjectionMatrix(); this.dirty = true
  }
  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    if (document.hidden || !this.host.clientWidth || !this.dirty) return
    const target = -.28 + (this.opening ? 0 : this.target * .12)
    this.box.rotation.set(-.12, target, -.055)
    const p = this.opening ? this.start + this.progress * (1 - this.start) : this.dragProgress * .65
    this.drawer.position.y = -p * 1.9
    this.renderer.render(this.scene, this.camera)
    const grip = this.grip.getWorldPosition(new T.Vector3()).project(this.camera)
    this.host.style.setProperty('--pull-x', `${(grip.x + 1) * this.host.clientWidth / 2}px`)
    this.host.style.setProperty('--pull-y', `${(1 - grip.y) * this.host.clientHeight / 2}px`)
    this.dirty = false
  }
  dispose() {
    cancelAnimationFrame(this.frame); this.observer.disconnect()
    disposeObject(this.scene); this.textures.forEach(t => t.dispose())
    this.environment.dispose(); this.renderer.dispose(); this.renderer.domElement.remove()
  }
}
