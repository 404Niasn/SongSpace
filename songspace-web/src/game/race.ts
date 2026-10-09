import * as T from 'three'
import { jiangnanHouse, canalBoat } from '@/worlds/jiangnan'
import { atmosphere } from '@/worlds/atmosphere'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { buildWorld, disposeObject } from '@/worlds/models'
import type { WorldId } from '@/worlds/types'
import { Skills, type SkillSlot } from './skills'
import { catalog } from './save'
import { imageryFor } from './content'
import { validPlacements } from './imagery'
import { buildImagery, buildSkillEffect } from '@/worlds/imageryModels'
import { addCharacterOutfits } from '@/worlds/outfitModels'
import type { OutfitDefinition } from './outfits'
export interface RaceStatus {
  distance: number
  score: number
  coins: number
  health: number
  speed: number
  stage: number
  paused: boolean
  boost: number
  skills?: { name: string; id: string; used: boolean; active: string; automatic: boolean }[]
  event?: string
}
export class Race {
  private renderer: T.WebGLRenderer
  private scene = new T.Scene()
  private camera = new T.PerspectiveCamera(46, 1, 0.1, 500)
  private bike = new T.Group()
  private chunks: T.Group[] = []
  private tokens: {
    mesh: T.Object3D
    z: number
    lane: number
    taken: boolean
    obstacle: boolean
    dynamic: boolean
  }[] = []
  private wheels: T.Group[] = []
  private legs: { upper: T.Mesh; lower: T.Mesh; shoe: T.Mesh; pedal: T.Mesh; side: number }[] = []
  private lane = 0
  private x = 0
  private distance = 0
  private coins = 0
  private health = 3
  private frame = 0
  private previous = performance.now()
  private paused = false
  private running = false
  private jump = 0
  private boost = 0
  private invincible = 0
  private nextRow = 15
  private at = 0
  private keys = new Set<string>()
  private resize: ResizeObserver
  private events = new AbortController()
  private completed = false
  private sky: T.Color
  private mats = new Map<string, T.MeshStandardMaterial>()
  private maxSpeed = 13
  private stoneMaterial: T.MeshStandardMaterial | undefined
  private cameraMode = 0
  private cameraLook = new T.Vector3(0, 1.5, -5)
  private waveUniform = { value: 0 }
  private skills: Skills
  private bonusCoins = 0
  private elapsed = 0
  private event = ''
  private eventUntil = 0
  private effects = new T.Group()
  private effectId = ''
  private effectUntil = 0
  private scenic: { group: T.Group; distance: number }[] = []
  private snapshots: { time: number; distance: number; coins: number; bonus: number; health: number; lane: number; x: number; jump: number; taken: string[] }[] = []
  private miniature: ReturnType<typeof buildWorld> | undefined
  private enteringAt = 0
  private entered: ((ok: boolean) => void) | undefined
  constructor(
    private host: HTMLElement,
    private world: WorldId,
    private onStatus: (s: RaceStatus) => void,
    private onEnd: (s: RaceStatus) => void,
    private vehicleColor = '#50c5b4',
    private baseSpeed = 13,
    private evening = false,
    slots: SkillSlot[] = [],
    private outfits: OutfitDefinition[] = [],
  ) {
    this.skills = new Skills(slots.slice(0, 2))
    this.sky = new T.Color(world === 'sea' ? '#f7d7b2' : world === 'forest' ? '#cce0cf' : '#d6e7e8')
    if (this.evening) this.sky.set('#283c54')
    this.scene.background = this.sky
    this.scene.add(atmosphere(world, this.evening))
    this.scene.fog = new T.Fog(this.sky, 70, 180)
    this.renderer = new T.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = T.PCFShadowMap
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.domElement.tabIndex = 0
    this.renderer.domElement.setAttribute('aria-label', '第三人称探索闯关场景')
    host.append(this.renderer.domElement)
    const sun = new T.DirectionalLight(
      this.evening ? '#aecbe6' : '#ffefd5',
      this.evening ? 1.4 : 2.4,
    )
    sun.position.set(-25, 40, 25)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, {
      left: -28,
      right: 28,
      top: 45,
      bottom: -20,
      near: 1,
      far: 100,
    })
    sun.shadow.normalBias = 0.04
    this.scene.add(
      sun,
      new T.HemisphereLight(
        this.evening ? '#8aaacb' : '#eff8ff',
        '#859976',
        this.evening ? 1.5 : 1.5,
      ),
    )
    for (let i = 0; i < 8; i++) {
      const chunk = this.makeChunk(i)
      chunk.position.z = 32 - i * 32
      this.chunks.push(chunk)
      this.scene.add(chunk)
    }
    if (this.evening) {
      const vertices: number[] = []
      for (let i = 0; i < 120; i++)
        vertices.push(
          Math.sin(i * 31) * 130,
          45 + Math.sin(i * 9) * 28,
          -110 - Math.cos(i * 7) * 75,
        )
      const stars = new T.BufferGeometry()
      stars.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
      this.scene.add(
        new T.Points(stars, new T.PointsMaterial({ color: '#e5eacc', size: 0.22, fog: false })),
      )
    }
    this.makeBike()
    this.updatePedals()
    this.scene.add(this.bike)
    this.scene.add(this.effects)
    for (const [i, p] of validPlacements(world).entries()) {
      const song = catalog.songs.find(s => s.id === p.songId)!
      const group = buildImagery(imageryFor(song.title).model)
      group.position.set((p.x < 0 ? -1 : 1) * (5.7 + Math.min(1.4, Math.abs(p.x) / 20)), 0, -20 - i * 9)
      group.rotation.y = p.rotation
      this.scenic.push({ group, distance: 20 + i * 9 })
      this.scene.add(group)
    }
    while (this.nextRow < 160) this.addRow()
    for (const token of this.tokens) token.mesh.position.z = -token.z
    this.miniature = buildWorld(world)
    this.scene.add(this.miniature.group)
    this.showRoad(false)
    this.camera.position.set(1.15, 2.6, 5.7)
    this.camera.lookAt(0, 1.4, -7)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.running || document.querySelector('dialog[open]')) return
        if ((e.target as HTMLElement)?.matches('input,textarea,select')) return
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key))
          e.preventDefault()
        if (e.repeat) return
        if (e.key === '1' || e.key === '2') { this.useSkill(Number(e.key) - 1); return }
        if (this.paused && e.key !== 'Escape') return
        this.keys.add(e.key.toLowerCase())
        if (['a', 'arrowleft'].includes(e.key.toLowerCase())) this.control('left')
        if (['d', 'arrowright'].includes(e.key.toLowerCase())) this.control('right')
        if (e.key === ' ') this.control('jump')
        if (e.key === 'Escape') this.togglePause()
      },
      { signal: this.events.signal },
    )
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()), {
      signal: this.events.signal,
    })
    window.addEventListener(
      'blur',
      () => {
        if (this.running) this.paused = true
      },
      { signal: this.events.signal },
    )
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && this.running) this.paused = true
      },
      { signal: this.events.signal },
    )
    this.resize = new ResizeObserver(() => this.size())
    this.resize.observe(host)
    this.size()
    this.animate()
  }
  private mat(color: string) {
    if (!this.mats.has(color))
      this.mats.set(color, new T.MeshStandardMaterial({ color, roughness: 0.72 }))
    return this.mats.get(color)!
  }
  private mesh(g: T.BufferGeometry, c: string, parent: T.Object3D, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(g, this.mat(c))
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  private box(
    p: T.Object3D,
    c: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    return this.mesh(new T.BoxGeometry(w, h, d), c, p, x, y, z)
  }
  private link(p: T.Object3D, a: T.Vector3, b: T.Vector3, r: number, c: string) {
    const v = b.clone().sub(a)
    const m = this.mesh(new T.CylinderGeometry(r, r, v.length(), 12), c, p)
    m.position.copy(a).add(b).multiplyScalar(0.5)
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize())
    return m
  }
  private tree(p: T.Object3D, x: number, z: number, scale: number) {
    const g = new T.Group()
    g.position.set(x, 0, z)
    g.scale.setScalar(scale)
    p.add(g)
    this.mesh(new T.CylinderGeometry(0.14, 0.25, 3, 10), '#806952', g, 0, 1.5, 0)
    if (this.world === 'forest') {
      for (let i = 0; i < 3; i++)
        this.mesh(
          new T.ConeGeometry(1.8 - i * 0.35, 2.9, 10),
          ['#397258', '#4b8461', '#65956a'][i]!,
          g,
          0,
          2.5 + i * 1.1,
          0,
        )
    } else if (this.world === 'sea') {
      for (let i = 0; i < 9; i++) {
        const angle = (i * Math.PI * 2) / 9,
          positions: number[] = [],
          indices: number[] = []
        for (let j = 0; j <= 12; j++) {
          const t = j / 12,
            r = 0.1 + t * 3.2,
            width = Math.sin(t * Math.PI) * 0.36 * (j % 2 ? 0.7 : 1),
            y = 3.25 + Math.sin(t * Math.PI) * 0.45 - t * t * 0.8
          for (const side of [-1, 1])
            positions.push(
              Math.cos(angle) * r + Math.sin(angle) * width * side,
              y,
              Math.sin(angle) * r - Math.cos(angle) * width * side,
            )
          if (j < 12) {
            const n = j * 2
            indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
          }
        }
        const geo = new T.BufferGeometry()
        geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
        geo.setIndex(indices)
        geo.computeVertexNormals()
        const mat = new T.MeshStandardMaterial({
          color: ['#45634c', '#63764d', '#7c874f'][i % 3],
          side: T.DoubleSide,
          roughness: 0.83,
        })
        const frond = new T.Mesh(geo, mat)
        frond.castShadow = true
        g.add(frond)
      }
    } else {
      const leaves = new T.InstancedMesh(new T.SphereGeometry(1, 6, 4), this.mat('#708c69'), 360),
        dummy = new T.Object3D()
      const lines: number[] = []
      for (let i = 0; i < 30; i++) {
        const angle = i * 2.4,
          radius = 1.2 + (i % 5) * 0.16
        let prev = new T.Vector3(0, 3.5, 0)
        for (let j = 0; j < 12; j++) {
          const u = j / 11,
            r = Math.sin(u * Math.PI * 0.65) * radius,
            y = 3.5 - u * u * 2.7
          dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
          dummy.scale.set(0.12, 0.25, 0.055)
          dummy.rotation.set(0.3, angle, u)
          dummy.updateMatrix()
          leaves.setMatrixAt(i * 12 + j, dummy.matrix)
          lines.push(prev.x, prev.y, prev.z, dummy.position.x, dummy.position.y, dummy.position.z)
          prev.copy(dummy.position)
        }
      }
      leaves.castShadow = true
      g.add(leaves)
      const branches = new T.BufferGeometry()
      branches.setAttribute('position', new T.Float32BufferAttribute(lines, 3))
      g.add(new T.LineSegments(branches, new T.LineBasicMaterial({ color: '#788367' })))
    }
  }
  private house(p: T.Object3D, x: number, z: number) {
    const wall = this.world === 'forest' ? '#ac8865' : '#f4efe1'
    this.box(p, wall, x, 2, z, 5, 4, 6)
    this.box(p, '#bcb6a6', x, 0.2, z, 5.5, 0.4, 6.4)
    for (const side of [-1, 1]) {
      const roof = this.box(
        p,
        this.world === 'forest' ? '#536959' : '#4c6266',
        x + side * 1.45,
        4.65,
        z,
        3.5,
        0.22,
        7,
      )
      roof.rotation.z = side * -0.4
      this.box(p, '#557879', x + side * 1.5, 2, z + 3.04, 0.85, 1.2, 0.08)
      this.box(p, '#b2926e', x + side * 1.5, 1.9, z + 3.1, 0.06, 1.3, 0.12)
    }
    this.box(p, '#8c7260', x, 0.9, z + 3.04, 1.1, 1.8, 0.1)
    for (let j = 0; j < 8; j++)
      this.box(
        p,
        '#748384',
        x - 2.7 + j * 0.77,
        4.6 + Math.min(j, 7 - j) * 0.19,
        z,
        0.05,
        0.11,
        7.15,
      )
  }
  private makeChunk(i: number) {
    const g = new T.Group()
    this.box(
      g,
      this.world === 'sea' ? '#8ba878' : '#90ad81',
      this.world === 'sea' ? 34 : 0,
      -0.25,
      -16,
      this.world === 'sea' ? 76 : 150,
      0.45,
      32.1,
    )
    const road = this.box(
      g,
      this.world === 'forest' ? '#c5b697' : this.world === 'sea' ? '#525c68' : '#a1aaa4',
      0,
      0.015,
      -16,
      8,
      0.08,
      32.1,
    )
    if (this.world === 'jiangnan') {
      if (!this.stoneMaterial) {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#536563'
        ctx.fillRect(0, 0, 512, 512)
        for (let r = 0; r < 12; r++)
          for (let c = -1; c < 5; c++) {
            const x = c * 128 + (r % 2) * 64,
              y = r * 43,
              v = 95 + ((r * 31 + c * 13) % 32)
            ctx.fillStyle = 'rgb(' + v + ',' + (v + 13) + ',' + (v + 14) + ')'
            ctx.fillRect(x + 2, y + 2, 123, 38)
            ctx.strokeStyle = '#b5c1b633'
            ctx.strokeRect(x + 4, y + 4, 118, 33)
            for (let k = 0; k < 18; k++) {
              ctx.fillStyle = k % 2 ? '#304c4a22' : '#e0e2d118'
              ctx.fillRect(x + ((k * 31 + r * 7) % 122), y + ((k * 7) % 36), 12, 1)
            }
          }
        const texture = new T.CanvasTexture(canvas)
        texture.colorSpace = T.SRGBColorSpace
        texture.wrapS = texture.wrapT = T.RepeatWrapping
        texture.repeat.set(1.5, 5)
        this.stoneMaterial = new T.MeshStandardMaterial({
          map: texture,
          bumpMap: texture,
          bumpScale: 0.025,
          roughness: 0.48,
          color: '#d0dbd6',
        })
      }
      road.material = this.stoneMaterial
      const waterMat = new T.MeshStandardMaterial({
        color: '#668f89',
        metalness: 0.28,
        roughness: 0.28,
      })
      waterMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.waveUniform
        shader.vertexShader = 'uniform float uTime; varying float vRipple;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vRipple=sin(position.x*3.+uTime*.9)*cos(position.y*1.8-uTime*.6); transformed.z+=vRipple*.035;',
        )
        shader.fragmentShader = 'varying float vRipple;\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n diffuseColor.rgb+=pow(max(0.,vRipple),6.)*.12;',
        )
      }
      const water = new T.Mesh(new T.PlaneGeometry(12, 32.1, 24, 36), waterMat)
      water.rotation.x = -Math.PI / 2
      water.position.set(-10.4, 0.025, -16)
      water.receiveShadow = true
      g.add(water)
      for (const x of [-4.5, -16.6]) {
        this.box(g, '#738781', x, 0.2, -16, 0.55, 0.5, 32.1)
        this.box(g, '#b4bab0', x, 0.49, -16, 0.7, 0.1, 32.1)
        this.box(g, '#4e7165', x, 0.03, -16, 0.58, 0.11, 32.1)
      }
      this.box(g, '#aaa99b', 5, 0.12, -16, 2, 0.18, 32.1)
      this.box(g, '#a3aca0', -18, 0.11, -16, 3, 0.18, 32.1)
      for (let j = 0; j < 4; j++) {
        const seed = i * 4 + j,
          z = -4 - j * 8
        const house = jiangnanHouse(seed)
        house.rotation.y = -Math.PI / 2
        house.position.set(9.2, 0, z)
        g.add(house)
        const opposite = jiangnanHouse(seed + 1)
        opposite.rotation.y = Math.PI / 2
        opposite.position.set(-22.3, 0, z - 2)
        opposite.scale.setScalar(0.85)
        g.add(opposite)
      }
      this.tree(g, -4.9, -4, 0.65)
      for (let j = 0; j < 5; j++)
        this.box(g, '#8d9890', -5.1 - j * 0.44, 0.32 - j * 0.09, -25, 0.5, 0.18, 2.7)
      if (i % 3 === 0)
        for (let j = 0; j < 19; j++) {
          const x = -16.3 + j * 0.62,
            y = 0.38 + Math.sin((j / 18) * Math.PI) * 1.25
          this.box(g, '#9da79c', x, y, -13, 0.68, 0.22, 2.3)
          if (j % 2 === 0)
            for (const side of [-1, 1])
              this.box(g, '#85958a', x, y + 0.43, -13 + side * 1.18, 0.12, 0.72, 0.13)
          for (const side of [-1, 1])
            this.box(g, '#b4baaa', x, y + 0.8, -13 + side * 1.18, 0.69, 0.12, 0.2)
        }
      if (i % 2 === 0) {
        const boat = canalBoat()
        boat.position.set(-8.7, 0.07, -25)
        boat.rotation.y = 0.14
        g.add(boat)
      }
    } else if (this.world === 'sea') {
      const oceanMaterial = new T.MeshStandardMaterial({
        color: '#8ec4ca',
        roughness: 0.35,
        metalness: 0.18,
      })
      oceanMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.waveUniform
        shader.vertexShader = 'uniform float uTime; varying float vWave;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vWave=sin(position.x*.25+uTime*.8)*cos(position.y*.42+uTime*.6); transformed.z+=vWave*.22;',
        )
        shader.fragmentShader = 'varying float vWave;\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n diffuseColor.rgb+=pow(max(0.,vWave),4.)*.18;',
        )
      }
      const water = new T.Mesh(new T.PlaneGeometry(116, 32.1, 48, 12), oceanMaterial)
      water.rotation.x = -Math.PI / 2
      water.position.set(-62, -0.08, -16)
      water.receiveShadow = true
      g.add(water)
      for (let j = 0; j < 12; j++) {
        const rail = this.box(g, '#ece8d8', -4.7, 0.5, -j * 2.8, 0.12, 1, 0.12)
        void rail
      }
      this.box(g, '#edeadd', -4.7, 0.85, -16, 0.12, 0.12, 32)
      this.box(g, '#edeadd', -4.7, 0.4, -16, 0.12, 0.09, 32)
      this.tree(g, 6, -5, 1.2)
      this.tree(g, 10, -19, 1.4)
      this.tree(g, 17, -10, 1.1)
      for (let j = 0; j < 4; j++) this.box(g, '#e7d0a3', 0, 0.065, -j * 8, 0.12, 0.02, 3)
      if (i % 3 === 0) {
        this.mesh(new T.CylinderGeometry(0.9, 1.4, 9, 20), '#f3e4c9', g, -20, 4.5, -12)
        this.mesh(new T.CylinderGeometry(1.1, 1.2, 0.9, 20), '#cf7064', g, -20, 5.7, -12)
        this.mesh(new T.ConeGeometry(1.8, 2, 20), '#c76559', g, -20, 10, -12)
      }
      for (let j = 0; j < 6; j++)
        this.box(g, '#b9d8d8', -18 - j * 10, 0.005, -j * 5, 7, 0.025, 0.16)
    } else {
      for (let j = 0; j < 12; j++) {
        const side = j % 2 ? 1 : -1
        this.tree(g, side * (6 + (j % 3) * 5), -j * 2.7, 0.8 + (j % 4) * 0.18)
      }
      this.box(g, '#72ada8', -24, 0.01, -16, 8, 0.06, 32.1)
      if (i % 3 === 0) this.house(g, 14, -14)
    }
    for (const side of [-1, 1]) {
      for (let j = 0; j < 4; j++) {
        this.box(g, '#ded6bd', side * 4.35, 0.12, -j * 8, 0.4, 0.25, 7.9)
      }
      const post = this.mesh(
        new T.CylinderGeometry(0.06, 0.1, 4, 10),
        '#606f67',
        g,
        side * 4.5,
        2,
        -26,
      )
      void post
      this.mesh(new T.SphereGeometry(0.22, 12, 8), '#f9e5af', g, side * 4.5, 4, -26)
    }
    void road
    return g
  }
  private makeBike() {
    const b = this.bike
    for (const z of [-0.85, 0.85]) {
      const wheel = new T.Group()
      wheel.position.set(0, 0.52, z)
      b.add(wheel)
      const tire = this.mesh(new T.TorusGeometry(0.48, 0.06, 10, 32), '#303d43', wheel)
      tire.rotation.y = Math.PI / 2
      const rim = this.mesh(new T.TorusGeometry(0.44, 0.018, 8, 32), '#d4ddd9', wheel)
      rim.rotation.y = Math.PI / 2
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        this.link(
          wheel,
          new T.Vector3(0, 0, 0),
          new T.Vector3(0, Math.sin(a) * 0.43, Math.cos(a) * 0.43),
          0.008,
          '#bfc9c7',
        )
      }
      this.wheels.push(wheel)
    }
    const a = new T.Vector3(0, 0.55, -0.85),
      c = new T.Vector3(0, 0.58, 0.85),
      d = new T.Vector3(0, 0.66, 0.08),
      e = new T.Vector3(0, 1.15, 0.4),
      f = new T.Vector3(0, 1.2, -0.6)
    for (const [u, v] of [
      [a, f],
      [f, e],
      [e, d],
      [d, f],
      [d, c],
      [e, c],
    ])
      this.link(b, u!, v!, 0.042, this.vehicleColor)
    this.link(b, e, new T.Vector3(0, 1.36, 0.4), 0.028, '#566466')
    this.mesh(new RoundedBoxGeometry(0.29, 0.08, 0.38, 3, 0.035), '#324c51', b, 0, 1.38, 0.4)
    this.link(b, f, new T.Vector3(0, 1.45, -0.72), 0.028, '#566466')
    this.link(
      b,
      new T.Vector3(-0.4, 1.46, -0.72),
      new T.Vector3(0.4, 1.46, -0.72),
      0.035,
      this.vehicleColor,
    )
    this.box(b, '#344348', -0.39, 1.46, -0.72, 0.15, 0.07, 0.1)
    this.box(b, '#344348', 0.39, 1.46, -0.72, 0.15, 0.07, 0.1)
    const chain = this.mesh(new T.TorusGeometry(0.16, 0.016, 8, 24), '#bac8bd', b, 0.07, 0.7, 0.05)
    chain.rotation.y = Math.PI / 2
    // Keep the torso above the saddle; hips sit outside its edges rather than inside it.
    const body = this.mesh(new T.CapsuleGeometry(0.26, 0.42, 8, 20), '#f6f1e6', b, 0, 1.91, 0.25)
    body.rotation.x = -0.3
    const head = this.mesh(new T.SphereGeometry(0.32, 24, 16), '#fff9ec', b, 0, 2.35, 0.06)
    head.scale.set(1, 1.06, 1)
    const helmet = this.mesh(
      new T.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
      this.vehicleColor,
      b,
      0,
      2.45,
      0.06,
    )
    void helmet
    for (const side of [-1, 1]) {
      this.mesh(new T.SphereGeometry(0.032, 12, 8), '#4a555a', b, side * 0.1, 2.35, -0.245)
      this.link(
        b,
        new T.Vector3(side * 0.24, 1.98, 0.18),
        new T.Vector3(side * 0.39, 1.52, -0.68),
        0.105,
        '#f7f0e6',
      )

      const upper = this.mesh(new T.CylinderGeometry(0.105, 0.11, 1, 12), '#eee7dc', b),
        lower = this.mesh(new T.CylinderGeometry(0.085, 0.1, 1, 12), '#eee7dc', b)
      const shoe = this.mesh(new RoundedBoxGeometry(0.19, 0.13, 0.33, 2, 0.035), '#44575c', b)
      const pedal = this.mesh(new T.BoxGeometry(0.2, 0.045, 0.15), '#a3aa9e', b)
      this.legs.push({ upper, lower, shoe, pedal, side })
    }
    addCharacterOutfits(b, this.outfits)
    this.mesh(new T.TorusGeometry(0.2, 0.055, 10, 24), '#c96753', b, 0, 2.07, 0.16).rotation.x =
      Math.PI / 2
  }
  start() {
    if (this.miniature) this.miniature.group.visible = false
    this.scene.fog = new T.Fog(this.sky, 70, 180)
    this.showRoad(true)
    this.running = true
    this.paused = false
    this.host.querySelector('canvas')?.focus()
  }
  private showRoad(visible: boolean) {
    for (const object of [...this.chunks, ...this.tokens.map(t => t.mesh), ...this.scenic.map(p => p.group), this.bike, this.effects]) object.visible = visible
  }
  enter(): Promise<boolean> {
    if (this.entered) return Promise.resolve(false)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.start(); return Promise.resolve(true) }
    this.enteringAt = performance.now()
    return new Promise(resolve => { this.entered = resolve })
  }
  control(action: string) {
    if (!this.running || this.paused) return
    if (action === 'left') this.lane = Math.max(-1, this.lane - 1)
    if (action === 'right') this.lane = Math.min(1, this.lane + 1)
    if (action === 'jump' && this.jump <= 0) this.jump = 0.85
  }
  useBoost(seconds = 8) {
    this.boost = seconds
    this.onStatus(this.status())
  }
  useSkill(index: number) {
    if (!this.running || this.paused || this.completed) return false
    const past = this.snapshots.filter(s => s.time <= this.elapsed - 3 && s.health > 0).at(-1)
    const outcome = this.skills.use(index, this.health, !!past)
    if (!outcome.accepted) return false
    this.health = outcome.health
    if (outcome.rewind && past) {
      this.distance = past.distance; this.coins = past.coins; this.bonusCoins = past.bonus
      this.health = past.health; this.lane = past.lane; this.x = past.x; this.jump = past.jump
      this.invincible = 1.6
      this.skills.protection = Math.max(this.skills.protection, this.skills.slots[index]!.level - 1)
      for (const t of this.tokens) { this.scene.remove(t.mesh); disposeObject(t.mesh) }
      this.tokens = []
      this.nextRow = Math.max(15, 15 + Math.floor((this.distance - 12 - 15) / 7) * 7)
      while (this.nextRow < this.distance + 160) this.addRow()
      for (const t of this.tokens) { t.taken = past.taken.includes(`${t.z}:${t.lane}`); t.mesh.visible = !t.taken; t.mesh.position.z = this.distance - t.z }
      for (const [i, c] of this.chunks.entries()) c.position.z = 32 - i * 32 + (this.distance % 32)
      this.snapshots = []
    }
    const slot = this.skills.slots[index]!
    this.feedback(slot.id, `${slot.name}已发动`)
    this.onStatus(this.status())
    return true
  }
  private feedback(id: SkillSlot['id'], text: string, broken = false) {
    this.event = text; this.eventUntil = this.elapsed + 2.5
    this.scene.remove(this.effects); disposeObject(this.effects)
    this.effects = buildSkillEffect(id, broken); this.effectId = id; this.effectUntil = this.elapsed + 1.6
    this.scene.add(this.effects)
  }
  togglePause() {
    if (this.running) {
      this.paused = !this.paused
      this.onStatus(this.status())
    }
  }
  finish() {
    if (this.completed || !this.running) return
    this.completed = true
    this.running = false
    this.onEnd(this.status())
  }
  private status(): RaceStatus {
    return {
      distance: Math.floor(this.distance),
      score: Math.floor(this.distance) + (this.coins + this.bonusCoins) * 50,
      coins: this.coins,
      health: this.health,
      speed: this.running && !this.paused ? Math.round(this.maxSpeed * 3.6) : 0,
      stage: Math.floor(this.distance / 500) + 1,
      paused: this.paused,
      boost: Math.ceil(Math.max(this.boost, this.skills.boost)),
      event: this.elapsed < this.eventUntil ? this.event : '',
      skills: this.skills.slots.map((s, i) => ({ name: s.name, id: s.id, used: this.skills.used.has(i), active: this.skills.remaining(i), automatic: s.id === 'revive' })),
    }
  }
  private addRow() {
    const index = Math.floor(this.nextRow / 10)
    for (let lane = -1; lane <= 1; lane++) {
      const obstacle = index > 4 && index % 4 === 0 && lane === (Math.floor(index / 4) % 3) - 1
      if (!obstacle && lane !== (Math.floor(index / 3) % 3) - 1) continue
      const dynamic = obstacle && index % 8 === 0
      const m: T.Object3D = obstacle
        ? new T.Mesh(new RoundedBoxGeometry(1.2, 0.85, 0.75, 2, 0.06), this.mat(dynamic ? '#738b9a' : '#a88261').clone())
        : this.makeCoin()
      m.position.set(lane * 2, obstacle ? 0.45 : 1.05, 0)
      m.castShadow = true
      this.scene.add(m)
      this.tokens.push({ mesh: m, z: this.nextRow, lane, taken: false, obstacle, dynamic })
    }
    this.nextRow += 7
  }

  private updatePedals() {
    for (const leg of this.legs) {
      const phase = this.distance * 1.8 + (leg.side < 0 ? Math.PI : 0),
        x = leg.side * 0.19,
        hip = new T.Vector3(leg.side * 0.21, 1.53, 0.3),
        ankle = new T.Vector3(x, 0.72 + Math.sin(phase) * 0.16, 0.05 + Math.cos(phase) * 0.16),
        v = ankle.clone().sub(hip),
        length = v.length(),
        mid = hip.clone().add(ankle).multiplyScalar(0.5),
        offset = Math.sqrt(Math.max(0.001, 0.5 * 0.5 - (length * length) / 4))
      const knee = mid.add(new T.Vector3(0, -v.z, v.y).normalize().multiplyScalar(offset))
      for (const [mesh, a, b] of [
        [leg.upper, hip, knee],
        [leg.lower, knee, ankle],
      ] as const) {
        const direction = b.clone().sub(a)
        mesh.position.copy(a).add(b).multiplyScalar(0.5)
        mesh.scale.y = direction.length()
        mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize())
      }
      leg.shoe.position.copy(ankle).add(new T.Vector3(0, -0.04, -0.08))
      leg.pedal.position.copy(ankle).add(new T.Vector3(0, -0.13, 0))
    }
  }
  setCamera(mode: number) {
    this.cameraMode = Math.max(0, Math.min(2, mode))
  }
  private makeCoin() {
    const g = new T.Group(),
      material = new T.MeshStandardMaterial({ color: '#efc665', metalness: 0.72, roughness: 0.27 }),
      geo = new T.CylinderGeometry(0.3, 0.3, 0.085, 40)
    geo.rotateX(Math.PI / 2)
    const body = new T.Mesh(geo, material)
    body.castShadow = true
    g.add(body)
    for (const side of [-1, 1]) {
      const rim = new T.Mesh(new T.TorusGeometry(0.266, 0.018, 8, 40), material)
      rim.position.z = side * 0.051
      g.add(rim)
      const note = new T.Shape()
      note.moveTo(-0.025, -0.11)
      note.lineTo(0.025, -0.11)
      note.lineTo(0.025, 0.15)
      note.lineTo(0.145, 0.1)
      note.lineTo(0.145, 0.045)
      note.lineTo(0.025, 0.085)
      note.lineTo(0.025, -0.11)
      note.absellipse(-0.045, -0.11, 0.07, 0.042, 0, Math.PI * 2, false, 0)
      const emblem = new T.Mesh(
        new T.ExtrudeGeometry(note, { depth: 0.009, bevelEnabled: false }),
        new T.MeshStandardMaterial({ color: '#aa752b', metalness: 0.6, roughness: 0.36 }),
      )
      emblem.position.z = side * 0.048
      if (side < 0) emblem.rotation.y = Math.PI
      g.add(emblem)
    }
    return g
  }
  private size() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }
  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    const now = performance.now()
    const dt = Math.min((now - this.previous) / 1000, 0.06)
    this.previous = now
    if (!this.host.clientWidth || document.hidden) return
    if (this.miniature?.group.visible) {
      this.scene.fog = null
      const progress = this.entered ? Math.min(1, (now - this.enteringAt) / 1900) : 0
      const eased = progress * progress * (3 - 2 * progress)
      const target = this.miniature.spawn.clone()
      const close = target.clone().add(new T.Vector3(1.15, 2.6, 5.7))
      this.camera.position.lerpVectors(new T.Vector3(96, 96, 108), close, eased)
      this.camera.lookAt(new T.Vector3().lerp(target.clone().add(new T.Vector3(0, 1.4, -7)), eased))
      this.camera.fov = 39 + eased * 7
      this.camera.updateProjectionMatrix()
      this.miniature.update(now / 1000)
      // Dissolve the miniature's local road into the endless track at street height.
      this.renderer.domElement.style.opacity = String(progress > 0.82 ? Math.max(0, (1 - progress) / 0.18) : 1)
      this.renderer.render(this.scene, this.camera)
      if (progress >= 1 && this.entered) {
        const done = this.entered; this.entered = undefined
        this.camera.position.set(1.15, 2.6, 5.7); this.cameraLook.set(0, 1.4, -7)
        this.renderer.domElement.style.transition = 'opacity 240ms ease'
        this.start(); this.renderer.domElement.style.opacity = '1'; done(true)
      }
      return
    }
    if (this.running && !this.paused) {
      this.elapsed += dt
      this.skills.tick(dt)
      this.maxSpeed =
        this.boost > 0 || this.skills.boost > 0
          ? this.baseSpeed + 6
          : this.keys.has('s')
            ? 7
            : this.baseSpeed + Math.min(3, Math.floor(this.distance / 500))
      this.distance += dt * this.maxSpeed
      this.boost = Math.max(0, this.boost - dt)
      this.invincible = Math.max(0, this.invincible - dt)
      this.jump = Math.max(0, this.jump - dt)
      this.x = T.MathUtils.damp(this.x, this.lane * 2, 9, dt)
      this.bike.position.set(
        this.x,
        this.jump > 0 ? Math.sin((this.jump / 0.85) * Math.PI) * 1.7 : 0,
        0,
      )
      this.bike.rotation.z = T.MathUtils.damp(
        this.bike.rotation.z,
        (this.x - this.lane * 2) * 0.13,
        8,
        dt,
      )
      for (const w of this.wheels) w.rotation.x -= (dt * this.maxSpeed) / 0.5

      this.updatePedals()
      if (!this.snapshots.length || this.elapsed - this.snapshots.at(-1)!.time >= 0.1) {
        this.snapshots.push({ time: this.elapsed, distance: this.distance, coins: this.coins, bonus: this.bonusCoins, health: this.health, lane: this.lane, x: this.x, jump: this.jump, taken: this.tokens.filter(t => t.taken).map(t => `${t.z}:${t.lane}`) })
        this.snapshots = this.snapshots.filter(s => s.time >= this.elapsed - 5)
      }

      for (const c of this.chunks) {
        c.position.z += dt * this.maxSpeed
        if (c.position.z > 32) c.position.z -= 256
      }
      while (this.nextRow < this.distance + 160) this.addRow()
      for (const t of this.tokens) {
        t.mesh.position.z = this.distance - t.z
        if (t.dynamic) {
          if (this.skills.freeze <= 0) t.mesh.position.x = t.lane * 2 + Math.sin(this.elapsed * 1.6 + t.z) * 1.2
          const material = (t.mesh as T.Mesh).material as T.MeshStandardMaterial
          material.color.set(this.skills.freeze > 0 ? '#bce5eb' : '#738b9a')
          material.emissive.set(this.skills.freeze > 0 ? '#28525b' : '#000000')
        }
        if (!t.obstacle) {
          t.mesh.rotation.y += dt * 1.6
          t.mesh.position.y = 1.05 + Math.sin(now * 0.003 + t.z) * 0.075
        }
        const magnet = !t.obstacle && this.skills.magnet > 0 && t.mesh.position.z >= -12 && t.mesh.position.z < 0.9 && Math.abs(this.x - t.mesh.position.x) < 4.5
        if (!t.taken && (magnet || (Math.abs(t.mesh.position.z) < 0.9 && Math.abs(this.x - t.mesh.position.x) < 0.8))) {
          t.taken = true
          if (!magnet) t.mesh.visible = false
          if (t.obstacle) {
            if (this.jump <= 0 && this.invincible <= 0) {
              const hadShield = this.skills.shield
              const hit = this.skills.collide(this.health)
              this.health = hit.health
              this.invincible = 1.6
              if (hit.blocked && hadShield && !this.skills.shield) this.feedback('shield', '护盾抵挡了碰撞', true)
              if (hit.revived) this.feedback('revive', '守护信物 · 星光重聚，再走一程')
              if (this.health <= 0) this.finish()
            }
          } else { this.coins++; if (this.skills.double > 0) this.bonusCoins++ }
        }
        if (t.taken && !t.obstacle && t.mesh.visible) {
          t.mesh.position.x = T.MathUtils.damp(t.mesh.position.x, this.x, 9, dt)
          t.mesh.position.y = T.MathUtils.damp(t.mesh.position.y, 1.5, 8, dt)
          t.mesh.position.z = T.MathUtils.damp(t.mesh.position.z, 0, 12, dt)
          if (Math.abs(t.mesh.position.z) < 0.5) t.mesh.visible = false
        }
        if (t.mesh.position.z > 12) {
          this.scene.remove(t.mesh)
          disposeObject(t.mesh)
        }
      }
      this.tokens = this.tokens.filter((t) => t.mesh.position.z <= 12)
      this.bike.visible = this.invincible > 0 ? Math.floor(now / 100) % 2 === 0 : true
      for (const p of this.scenic) {
        p.group.position.z = this.distance - p.distance
        p.group.visible = p.group.position.z > -160 && p.group.position.z < 20
        if (p.group.userData.model === 'fireworks') p.group.children.filter(c => c.userData.spark !== undefined).forEach(c => c.visible = Math.sin(this.elapsed * 1.5 + c.userData.spark * 0.3) > -0.2)
      }
      this.effects.position.set(this.x, this.bike.position.y, 0)
      const persistent = this.effectId === 'shield' ? this.skills.shield : this.effectId === 'magnet' ? this.skills.magnet > 0 : this.effectId === 'freeze' ? this.skills.freeze > 0 : ['courage', 'friend'].includes(this.effectId) ? this.skills.boost > 0 : false
      this.effects.visible = persistent || this.elapsed < this.effectUntil
      this.effects.rotation.y += dt * 0.5
    }

    const riderY = this.bike.position.y
    const poses = [
      {
        x: this.x * 0.85 + 1.15,
        y: 2.6 + riderY * 0.4,
        z: 5.7,
        f: 46,
        look: new T.Vector3(this.x * 0.9, 1.45, -5),
      },
      {
        x: this.x + 3.5,
        y: 2.4 + riderY * 0.35,
        z: 4.8,
        f: 48,
        look: new T.Vector3(this.x, 1.5, -1.4),
      },
      {
        x: this.x,
        y: 2.26 + riderY,
        z: -0.5,
        f: 68,
        look: new T.Vector3(this.x, 1.7 + riderY, -18),
      },
    ]
    const pose = poses[this.cameraMode]!,
      bob = this.running && !this.paused ? Math.sin(this.distance * 1.8) * 0.018 : 0
    this.camera.position.x = T.MathUtils.damp(this.camera.position.x, pose.x, 5, dt)
    this.camera.position.y = T.MathUtils.damp(this.camera.position.y, pose.y + bob, 4, dt)
    this.camera.position.z = T.MathUtils.damp(this.camera.position.z, pose.z, 4, dt)
    this.cameraLook.lerp(pose.look, 1 - Math.exp(-dt * 5))
    this.camera.lookAt(this.cameraLook)
    const fov = T.MathUtils.damp(this.camera.fov, pose.f + (this.boost > 0 ? 5 : 0), 3, dt)
    if (Math.abs(fov - this.camera.fov) > 0.01) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
    if (now - this.at > 100) {
      this.onStatus(this.status())
      this.at = now
    }
    this.waveUniform.value = now / 1000
    this.renderer.render(this.scene, this.camera)
  }
  dispose() {
    this.entered?.(false); this.entered = undefined
    cancelAnimationFrame(this.frame)
    this.resize.disconnect()
    this.events.abort()
    disposeObject(this.scene)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
