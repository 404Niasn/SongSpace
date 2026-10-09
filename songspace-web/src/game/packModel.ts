import * as T from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { disposeObject } from '@/worlds/models'

const SEAM_Y = 1.51
const SEAL_HEIGHT = .15
const POUCH_HALF_WIDTH = 1.0925 // Includes the outside edge of the side folds.

export class PackModel {
  private renderer: T.WebGLRenderer
  private scene = new T.Scene()
  private camera = new T.PerspectiveCamera(33, 1, 0.1, 30)
  private bag = new T.Group()
  private seal = new T.Group()
  private observer: ResizeObserver
  private frame = 0
  private environment:T.WebGLRenderTarget
  private disposed = false
  private openingProgress = 0
  private tearStart = 0
  private ribbons: { geometry: T.BufferGeometry; side: number }[] = []
  private lips: { geometry: T.PlaneGeometry; side: number }[] = []
  private pullTab = new T.Group()
  private tabAnchor = new T.Vector3()
  private mouth?: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>
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
    const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose()
    host.append(this.renderer.domElement)
    this.camera.position.set(0, 0, 7.2)
    this.scene.add(new T.HemisphereLight('#e9f8ff', '#1d283c', 2))
    for (const [x, c, intensity] of [
      [-3, '#effbff', 2],
      [3, '#e6dfff', 1.5],
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
    const front = new T.MeshPhysicalMaterial({
      map: texture,
      metalness: 0.78,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: .13,
      side: T.DoubleSide,
    })
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle='#ebedf0';ctx.fillRect(0,0,1024,1536)
    const accent=tone==='gold'?['#e6c670','#efa382']:tone==='blue'?['#78ccde','#939be2']:tone==='rainbow'?['#99d4d3','#d4a9dc']:['#99d2b9','#85b8db']
    ctx.fillStyle='#252936';ctx.font='600 25px sans-serif';ctx.fillText('MUSIC COLLECTIBLE / 01',82,148)
    ctx.font='900 148px sans-serif';ctx.fillText('SONG',72,380);ctx.fillText('SPACE',72,515)
    const gradient=ctx.createLinearGradient(130,610,850,1070);gradient.addColorStop(0,accent[0]!);gradient.addColorStop(.5,'#dde5f4');gradient.addColorStop(1,accent[1]!)
    ctx.fillStyle=gradient;ctx.fillRect(82,630,860,450)
    ctx.fillStyle='#303947';for(let i=0;i<17;i++){const height=65+Math.pow(Math.sin(i*.65+.2),2)*235;ctx.fillRect(135+i*44,850-height/2,20,height)}
    ctx.fillStyle='#282d3b';ctx.font='bold 59px sans-serif';ctx.fillText(title,80,1210)
    ctx.font='500 26px sans-serif';ctx.fillText('SONGSPACE ORIGINAL',82,1280)
    ctx.font='bold 76px sans-serif';ctx.fillText(String(count).padStart(2,'0'),80,1405);ctx.font='24px sans-serif';ctx.fillText('CARDS',200,1384)
    ctx.lineWidth=3;ctx.strokeStyle='#5b6372';ctx.beginPath();ctx.moveTo(910,145);ctx.lineTo(942,145);ctx.lineTo(942,178);ctx.moveTo(82,1436);ctx.lineTo(82,1460);ctx.lineTo(116,1460);ctx.stroke()
    for(let i=0;i<35;i++){ctx.fillStyle='#3c4351';ctx.fillRect(700+i*6,1340,1+(i%3),65)}
    texture.needsUpdate = true
    // Subdivided surfaces create a pillowed foil pouch, pinched into sealed edges.
    for (const side of [1, -1]) {
      const geo = new T.PlaneGeometry(2.12, 3.1, 64, 80),
        p = geo.attributes.position!
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        const originalY = p.getY(i)
        const y = originalY > 1.35 ? 1.35 + (originalY - 1.35) * .8 : originalY
        p.setY(i, y)
        const bulge =
          Math.pow(
            Math.max(0, Math.cos((x / 2.12) * Math.PI) * Math.cos((y / 3.1) * Math.PI)),
            0.65,
          ) * 0.24
        const edge = Math.pow(Math.abs(x / 1.06), 2.8)
        const sealCrease = Math.pow(Math.abs(y / 1.55), 5)
        const topFade = y > 1.25 ? Math.max(0, (1.55 - y) / .3) : 1
        const wrinkle = (Math.sin(x * 38 + y * 5) * .035 * edge
          + Math.sin(y * 27 + x * 11) * .025 * sealCrease
          + Math.sin((x + y * .7) * 20) * .018 * edge * sealCrease) * topFade
        const pinch = Math.min(1, Math.max(0, (SEAM_Y - y) / .16))
        p.setZ(i, side * (.05 + (bulge + wrinkle - .005) * pinch))
      }
      geo.computeVertexNormals()
      this.lips.push({ geometry: geo, side })
      const m = new T.Mesh(geo, side === 1 ? front : foil)
      this.bag.add(m)
    }
    for (const side of [-1, 1]) {
      const fold = new T.Mesh(new T.BoxGeometry(0.045, 3.07, 0.1), foil)
      fold.position.set(side * 1.07, -.025, 0)
      this.bag.add(fold)
    }
    this.bag.add(this.seal)
    // Heat-pressed foil: the crimp is embossed into the strip, not separate teeth.
    const sealCanvas = document.createElement('canvas')
    sealCanvas.width = 1024
    sealCanvas.height = 96
    const sealInk = sealCanvas.getContext('2d')!
    sealInk.fillStyle = '#b9c2c2'
    sealInk.fillRect(0, 0, 1024, 96)
    for (let x = 6; x < 1024; x += 18) {
      sealInk.fillStyle = '#eef3f2'
      sealInk.fillRect(x, 9, 3, 68)
      sealInk.fillStyle = '#7e9291'
      sealInk.fillRect(x + 3, 9, 3, 68)
    }
    sealInk.fillStyle = '#b6c1c0'
    sealInk.fillRect(0, 83, 1024, 1)
    const sealTexture = new T.CanvasTexture(sealCanvas)
    sealTexture.colorSpace = T.SRGBColorSpace
    const sealMaterial = new T.MeshPhysicalMaterial({ color, map: sealTexture, bumpMap: sealTexture,
      bumpScale: .012, metalness: .85, roughness: .42, clearcoat: .25, side: T.DoubleSide })
    this.seal.position.set(-POUCH_HALF_WIDTH, SEAM_Y + SEAL_HEIGHT / 2, 0)
    for (const top of [-1, 1]) {
      const parent = top === 1 ? this.seal : this.bag
      const stripGeometry = top === 1
        ? new T.PlaneGeometry(POUCH_HALF_WIDTH * 2, SEAL_HEIGHT, 56, 4)
        : new T.BoxGeometry(2.17, .18, .1)
      const strip = new T.Mesh(stripGeometry, top === 1 ? sealMaterial : foil)
      strip.position.set(top === 1 ? POUCH_HALF_WIDTH : 0, top === 1 ? 0 : -1.59, top === 1 ? .05 : 0)
      parent.add(strip)
      if (top === 1) {
        this.ribbons.push({ geometry: stripGeometry, side: 1 })
        const backGeometry = stripGeometry.clone()
        const back = new T.Mesh(backGeometry, sealMaterial)
        back.position.set(POUCH_HALF_WIDTH, 0, -.05)
        parent.add(back)
        this.ribbons.push({ geometry: backGeometry, side: -1 })
      }
      if (top !== 1) {
        for (let i = 0; i < 48; i++) {
          const rib = new T.Mesh(new T.BoxGeometry(.012, .17, .012), foil)
          rib.position.set(-1.03 + i * .044, -1.59, .058)
          parent.add(rib)
        }
      }
    }
    const tabShape = new T.Shape()
    tabShape.moveTo(-.06, -.075)
    tabShape.lineTo(.23, -.075)
    tabShape.quadraticCurveTo(.29, -.075, .29, -.025)
    tabShape.lineTo(.29, .025)
    tabShape.quadraticCurveTo(.29, .075, .23, .075)
    tabShape.lineTo(-.06, .075)
    tabShape.closePath()
    const tab = new T.Mesh(new T.ShapeGeometry(tabShape), sealMaterial)
    this.pullTab.add(tab)
    // Keep the grip inside the pouch silhouette instead of extending the seal sideways.
    this.pullTab.position.set(POUCH_HALF_WIDTH * 2 - .29, 0, .056)
    this.seal.add(this.pullTab)
    this.mouth = new T.Mesh(new T.PlaneGeometry(1.98, .12),
      new T.MeshBasicMaterial({ color: '#47534e', transparent: true, opacity: 0, side: T.DoubleSide }))
    this.mouth.position.set(0, 1.515, 0)
    this.bag.add(this.mouth)
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
    this.dirty = true
  }
  open() {
    this.opening = true
    this.tearStart = this.tearing
    this.dirty = true
  }
  openingAt(value: number) {
    this.openingProgress = value
    this.dirty = true
  }
  private resize() {
    this.dirty = true
    const w = this.host.clientWidth,
      h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    if (!this.preview) {
      // A pouch is just wider than the card it contains; fit its visible mesh, not its canvas.
      this.camera.position.z = (POUCH_HALF_WIDTH * 2 * h) / (2 * Math.tan(T.MathUtils.degToRad(33 / 2)) * (w - 24))
    }
    this.camera.updateProjectionMatrix()
  }
  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    if (document.hidden || !this.host.clientWidth) return
    const t = performance.now() / 1000
    const target = -0.22 + (this.opening || this.tearing ? 0 : this.target * 0.18)
    if (this.preview && !this.dirty && Math.abs(this.bag.rotation.y - target) < 0.001) return
    this.bag.rotation.y += (target - this.bag.rotation.y) * 0.08
    this.bag.rotation.z = -0.08 + (this.preview ? 0 : Math.sin(t * 0.65) * 0.025)
    const p = this.opening ? this.tearStart * .5 + this.openingProgress * (1 - this.tearStart * .5) : this.tearing * .5
    const released = Math.max(0, (p - .78) / .22)
    this.seal.position.set(-POUCH_HALF_WIDTH + released * .85, SEAM_Y + SEAL_HEIGHT / 2 + released * .55, released * .3)
    this.seal.rotation.set(released * .4, released * -.2, released * .28)
    if (p > 0 || this.dirty) {
      for (const { geometry } of this.ribbons) {
        const position = geometry.attributes.position!
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i)
          // Peel right to left while the left end stays attached until release.
          const u = (x + POUCH_HALF_WIDTH) / (POUCH_HALF_WIDTH * 2)
          const peeled = Math.max(0, (u - (1 - p)) / Math.max(p, .001))
          const row = Math.floor(i / 57)
          position.setY(i, SEAL_HEIGHT / 2 - row * SEAL_HEIGHT / 4 + peeled * peeled * p * .28)
          position.setZ(i, Math.sin(peeled * Math.PI * .7) * p * .22)
        }
        position.needsUpdate = true
        geometry.computeVertexNormals()
      }
      this.pullTab.position.y = p * .28
      this.pullTab.position.z = .056 + Math.sin(p * Math.PI * .7) * .22
      this.pullTab.rotation.x = p * .65
      for (const { geometry, side } of this.lips) {
        const position = geometry.attributes.position!
        for (let i = 0; i < position.count; i++) {
          const y = position.getY(i)
          if (y < 1.4) continue
          const x = position.getX(i)
          const opening = Math.max(0, 1 - Math.abs(x / 1.06)) * ((y - 1.4) / (SEAM_Y - 1.4))
          const bulge = Math.pow(Math.max(0, Math.cos(x / 2.12 * Math.PI) * Math.cos(y / 3.1 * Math.PI)), .65) * .24
          const edge = Math.pow(Math.abs(x / 1.06), 2.8)
          const crease = Math.pow(Math.abs(y / 1.55), 5)
          const wrinkle = (Math.sin(x * 38 + y * 5) * .035 * edge + Math.sin(y * 27 + x * 11) * .025 * crease
            + Math.sin((x + y * .7) * 20) * .018 * edge * crease) * Math.max(0, (1.55 - y) / .3)
          const pinch = Math.min(1, Math.max(0, (SEAM_Y - y) / .16))
          position.setZ(i, side * (.05 + (bulge + wrinkle - .005) * pinch + opening * p * .13))
        }
        position.needsUpdate = true
        geometry.computeVertexNormals()
      }
      if (this.mouth) this.mouth.material.opacity = Math.min(.8, p * 1.2)
      this.seal.visible = p < .98
    }
    this.renderer.render(this.scene, this.camera)
    // Project the actual foil tab into this canvas, including rotation and resize.
    this.tabAnchor.set(.12, 0, .006)
    this.pullTab.localToWorld(this.tabAnchor)
    this.tabAnchor.project(this.camera)
    this.host.style.setProperty('--pull-x', `${(this.tabAnchor.x + 1) * this.host.clientWidth / 2}px`)
    this.host.style.setProperty('--pull-y', `${(1 - this.tabAnchor.y) * this.host.clientHeight / 2}px`)
    const left = new T.Vector3(0, 0, .05)
    const right = new T.Vector3(POUCH_HALF_WIDTH * 2, 0, .05)
    this.seal.localToWorld(left).project(this.camera)
    this.seal.localToWorld(right).project(this.camera)
    const x1 = (left.x + 1) * this.host.clientWidth / 2
    const y1 = (1 - left.y) * this.host.clientHeight / 2
    const x2 = (right.x + 1) * this.host.clientWidth / 2
    const y2 = (1 - right.y) * this.host.clientHeight / 2
    this.host.style.setProperty('--seal-x', `${(x1 + x2) / 2}px`)
    this.host.style.setProperty('--seal-y', `${(y1 + y2) / 2}px`)
    this.host.style.setProperty('--seal-width', `${Math.hypot(x2 - x1, y2 - y1) + 16}px`)
    this.host.style.setProperty('--seal-angle', `${Math.atan2(y2 - y1, x2 - x1)}rad`)
    this.dirty = false
  }
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    disposeObject(this.scene)
    this.environment.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
