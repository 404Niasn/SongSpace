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
    this.renderer.toneMappingExposure = .88
    this.renderer.domElement.setAttribute('aria-label', 'SongSpace 抽屉式唱片收藏盒')
    host.append(this.renderer.domElement)
    const pmrem = new T.PMREMGenerator(this.renderer), room = new RoomEnvironment()
    this.environment = pmrem.fromScene(room, .04); this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .55
    room.dispose(); pmrem.dispose()
    this.scene.add(new T.HemisphereLight('#ffffff', '#34463e', .65), this.box)
    const key = new T.DirectionalLight('#f5f9ff', 2.1); key.position.set(-3, 5, 7); this.scene.add(key)
    const green = tone === 'sky' ? '#779eaf' : tone === 'blue' ? '#253b4d' : tone === 'gold' ? '#b5a06f' : '#193e33'
    const printColor = tone === 'gold' ? '#352e20' : tone === 'sky' ? '#203b49' : '#e1e7db'
    const shell = new T.MeshPhysicalMaterial({ color: green, metalness: .65, roughness: .28, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 })
    const felt = new T.MeshStandardMaterial({ color: '#13251d', roughness: 1 })
    const edge = new T.MeshStandardMaterial({ color: '#a8b5ac', roughness: .3, metalness: .72 })
    const part = (g: T.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material) => {
      const mesh = new T.Mesh(new RoundedBoxGeometry(w, h, d, 2, .025), mat)
      mesh.position.set(x, y, z); g.add(mesh); return mesh
    }
    const depth = .48 + count * .04
    part(this.box, 3.12, 3.12, .075, 0, 0, -depth / 2, shell)
    part(this.box, 3.12, 3.12, .075, 0, 0, depth / 2, shell)
    for (const x of [-1.52, 1.52]) part(this.box, .08, 3.12, depth, x, 0, 0, shell)
    part(this.box, 3.12, .08, depth, 0, 1.52, 0, shell)
    // A printed front label, with actual concentric embossing on top of it.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = green; ctx.fillRect(0, 0, 1024, 1024)
    for (let i = 0; i < 15000; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff15' : '#2946380b'
      ctx.fillRect((i * 157) % 1024, (i * 331 + Math.floor(i / 1024) * 43) % 1024, 1, 2)
    }
    ctx.fillStyle = printColor; ctx.textAlign = 'left'; ctx.font = '600 44px sans-serif'
    ctx.fillText('SONGSPACE', 80, 120)
    ctx.font = '22px sans-serif'; ctx.fillText('RECORD COLLECTION / VOL. 01', 80, 160)
    ctx.font = '500 50px sans-serif'; ctx.fillText(title.replace('包', '盒'), 80, 852)
    ctx.font = '24px sans-serif'; ctx.fillText(`${String(count).padStart(2, '0')} TRACK${count > 1 ? 'S' : ''}     ·     音乐收藏系列`, 80, 908)
    ctx.fillRect(80, 756, 864, 2)
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; this.textures.push(texture)
    // Fine brushed foil varies the highlight without obscuring the printed lettering.
    const foilCanvas = document.createElement('canvas'); foilCanvas.width = foilCanvas.height = 256
    const foilCtx = foilCanvas.getContext('2d')!
    for (let y = 0; y < 256; y++) {
      const shade = 126 + (y * 37 % 23)
      foilCtx.fillStyle = `rgb(${shade},${shade},${shade})`; foilCtx.fillRect(0, y, 256, 1)
    }
    const foilTexture = new T.CanvasTexture(foilCanvas); this.textures.push(foilTexture)
    const cover = new T.Mesh(new T.PlaneGeometry(3, 3), new T.MeshPhysicalMaterial({ map: texture, metalness: .55, roughness: .55, roughnessMap: foilTexture, clearcoat: .8, clearcoatRoughness: .18, envMapIntensity: .95 }))
    cover.position.z = depth / 2 + .039; this.box.add(cover)
    const vinyl = new T.Mesh(new T.CircleGeometry(.86, 128), new T.MeshPhysicalMaterial({ color: '#101817', roughness: .24, metalness: .38, clearcoat: .7, clearcoatRoughness: .16 }))
    vinyl.position.set(0, .05, depth / 2 + .045); this.box.add(vinyl)
    const grooveMat = new T.MeshStandardMaterial({ color: '#4a5953', metalness: .65, roughness: .32 })
    for (let i = 0; i < 17; i++) {
      const ring = new T.Mesh(new T.TorusGeometry(.32 + i * .029, .0035, 5, 128), grooveMat)
      ring.position.copy(vinyl.position); ring.position.z += .006; this.box.add(ring)
    }
    const label = new T.Mesh(new T.CircleGeometry(.25, 40), edge)
    label.position.copy(vinyl.position); label.position.z += .008; this.box.add(label)
    const hole = new T.Mesh(new T.CircleGeometry(.025, 16), felt)
    hole.position.copy(label.position); hole.position.z += .005; this.box.add(hole)
    // Foil-stamped frame, recessed spine and laminated board edges catch the side light.
    const foil = new T.MeshStandardMaterial({ color: tone === 'gold' ? '#c1ab77' : '#a6bab0', metalness: .9, roughness: .18 })
    for (const x of [-1.43, 1.43]) part(this.box, .009, 2.83, .008, x, 0, depth / 2 + .043, foil)
    for (const y of [-1.41, 1.41]) part(this.box, 2.86, .009, .008, 0, y, depth / 2 + .043, foil)
    for (const z of [-depth / 2 - .01, depth / 2 + .01]) {
      part(this.box, .015, 3.02, .012, -1.566, 0, z, edge)
    }
    part(this.box, .013, 3.02, depth * .68, -1.568, 0, 0, new T.MeshStandardMaterial({ color: '#0c241d', roughness: .76 }))
    const spineCanvas = document.createElement('canvas'); spineCanvas.width = 128; spineCanvas.height = 1024
    const ink = spineCanvas.getContext('2d')!; ink.fillStyle = '#122f27'; ink.fillRect(0, 0, 128, 1024)
    ink.translate(64, 80); ink.rotate(Math.PI / 2); ink.fillStyle = '#c3d0c2'; ink.font = '28px sans-serif'; ink.fillText('SONGSPACE   /   RECORD COLLECTION', 0, 0)
    const spineTexture = new T.CanvasTexture(spineCanvas); spineTexture.colorSpace = T.SRGBColorSpace; this.textures.push(spineTexture)
    const spine = new T.Mesh(new T.PlaneGeometry(depth * .68, 2.9), new T.MeshStandardMaterial({ map: spineTexture, roughness: .65 }))
    spine.rotation.y = -Math.PI / 2; spine.position.set(-1.578, 0, 0); this.box.add(spine)
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
    this.resize()
  }
  tilt(value: number) { this.target = value; this.invalidate() }
  tear(value: number) { this.dragProgress = value; this.invalidate() }
  open() { this.opening = true; this.start = this.dragProgress * .65; this.invalidate() }
  openingAt(value: number) { this.progress = value; this.invalidate() }
  private invalidate() {
    this.dirty = true
    if (!this.frame) this.frame = requestAnimationFrame(this.animate)
  }
  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h); this.camera.aspect = w / h
    const fit = this.preview ? 4.35 : 6.4
    const centreY = this.preview ? -.25 : -.65
    this.camera.position.set(0, centreY, Math.max(fit, fit / this.camera.aspect) / (2 * Math.tan(T.MathUtils.degToRad(16.5))))
    this.camera.lookAt(0, centreY, 0); this.camera.updateProjectionMatrix(); this.invalidate()
  }
  private animate = () => {
    this.frame = 0
    if (document.hidden || !this.host.clientWidth || !this.dirty) return
    const target = -.43 + (this.opening ? 0 : this.target * .12)
    this.box.rotation.set(-.18, target, -.055)
    const p = this.opening ? this.start + this.progress * (1 - this.start) : this.dragProgress * .65
    const slide = T.MathUtils.smoothstep(p, 0, 1)
    this.drawer.position.y = -slide * 1.5
    this.box.updateMatrixWorld(true)
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
