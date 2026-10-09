import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildDecoration, buildWorld, disposeObject } from './models'
import type { Decoration, DecorationKind, ViewMode, WorldId, WorldModel } from './types'
import { catalog, game, kindFor, persist } from '../game/save'
import { imageryFor, type WeatherId } from '../game/content'
import { WeatherLayer } from './weather'
import { availableImagery, placeImagery, undoImagery, validPlacements } from '../game/imagery'
import { buildImagery } from './imageryModels'

export interface WorldStatus {
  speed: number
  distance: number
  decorations: number
  locked: boolean
}

export class WorldEngine {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(38, 1, 0.08, 420)
  private controls: OrbitControls
  private model!: WorldModel
  private sunlight = new THREE.DirectionalLight('#fff2ce', 3.1)
  private ambient = new THREE.HemisphereLight('#f6f5e7', '#889c78', 2.1)
  private placed = new THREE.Group()
  private decorations: Decoration[] = []
  private ghost: THREE.Group | null = null
  private placement: string | null = null
  private validPlacement = false
  private placementRotation = 0
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private bike = new THREE.Group()
  private wheels: THREE.Mesh[] = []
  private rider = new THREE.Group()
  private position = new THREE.Vector3()
  private yaw = 0
  private pitch = 0
  private speed = 0
  private distance = 0
  private keys = new Set<string>()
  private mode: ViewMode = 'overview'
  private firstPerson = true
  private transport: 'bike' | 'walk' = 'bike'
  private world: WorldId
  private evening = false
  private weather: WeatherId = 'clear'
  private weatherLayer = new WeatherLayer()
  private frame = 0
  private previousTime = performance.now()
  private statusAt = 0
  private resizeObserver: ResizeObserver
  private events = new AbortController()
  private alive = true

  constructor(
    private host: HTMLElement,
    world: WorldId,
    private onStatus: (status: WorldStatus) => void,
    private onMessage: (message: string) => void,
    private onError: (message: string) => void,
    private onCancelPlacement: () => void = () => {},
  ) {
    this.world = world
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.domElement.setAttribute('aria-label', '歌曲世界 3D 场景')
    this.renderer.domElement.tabIndex = 0
    host.append(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.065
    this.controls.minDistance = 54
    this.controls.maxDistance = 170
    this.controls.minPolarAngle = 0.15
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.enablePan = false
    this.sunlight.position.set(-40, 75, 35)
    this.sunlight.castShadow = true
    this.sunlight.shadow.mapSize.set(2048, 2048)
    Object.assign(this.sunlight.shadow.camera, {
      left: -62,
      right: 62,
      top: 62,
      bottom: -62,
      near: 1,
      far: 180,
    })
    this.sunlight.shadow.normalBias = 0.12
    this.scene.add(this.sunlight, this.sunlight.target, this.ambient, this.weatherLayer.group)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.ShadowMaterial({ opacity: 0.1 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -4.1
    floor.receiveShadow = true
    this.scene.add(floor)
    this.makeBicycle()
    this.scene.add(this.bike)
    this.setWorld(world)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()
    const options = { signal: this.events.signal }
    window.addEventListener('keydown', this.keyDown, options)
    window.addEventListener('keyup', this.keyUp, options)
    window.addEventListener('blur', this.clearKeys, options)
    document.addEventListener('visibilitychange', this.clearKeys, options)
    document.addEventListener('pointerlockchange', this.lockChanged, options)
    document.addEventListener('mousemove', this.mouseLook, options)
    this.renderer.domElement.addEventListener('pointermove', this.movePointer, options)
    this.renderer.domElement.addEventListener('click', this.clickScene, options)
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault(), options)
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault()
        this.onError('3D 场景暂时中断，请刷新页面重新进入。')
      },
      options,
    )
    this.frame = requestAnimationFrame(this.animate)
  }

  private resize() {
    const width = this.host.clientWidth
    const height = this.host.clientHeight
    if (!width || !height) return
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  setWorld(id: WorldId) {
    this.setMode('overview')
    this.clearPlacement()
    if (this.model) {
      this.scene.remove(this.model.group)
      disposeObject(this.model.group)
    }
    this.scene.remove(this.placed)
    disposeObject(this.placed)
    this.placed = new THREE.Group()
    this.world = id
    this.model = buildWorld(id)
    this.scene.add(this.model.group, this.placed)
    this.position.copy(this.model.spawn)
    this.yaw = 0
    this.pitch = 0
    this.speed = 0
    this.distance = 0
    this.decorations = [...this.loadDecorations(id), ...validPlacements(id).map(p => ({ ...p, kind: 'bench' as DecorationKind }))]
    for (const decoration of this.decorations) this.addDecorationMesh(decoration)
    this.applyLighting()
    this.resetOverview()
    this.sendStatus()
  }

  setMode(mode: ViewMode) {
    this.mode = mode
    this.controls.enabled = mode === 'overview'
    this.keys.clear()
    this.speed = 0
    this.clearPlacement()
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock()
    this.bike.visible = mode === 'roam' && this.transport === 'bike'
    if (mode === 'overview') this.resetOverview()
    else {
      this.camera.fov = 66
      this.camera.updateProjectionMatrix()
      this.updateRoamCamera(1)
      this.renderer.domElement.focus({ preventScroll: true })
    }
    if (this.model) this.applyLighting()
  }

  resetOverview() {
    this.camera.fov = 38
    this.camera.updateProjectionMatrix()
    this.controls.target.set(0, 0, 0)
    this.camera.position.set(76, 72, 90)
    this.camera.lookAt(this.controls.target)
    this.controls.update()
  }

  resetPlayer() {
    this.position.copy(this.model.spawn)
    this.yaw = 0
    this.pitch = 0
    this.speed = 0
    this.updateRoamCamera(1)
    this.sendStatus()
  }

  setFirstPerson(value: boolean) {
    this.firstPerson = value
    this.pitch = 0
    this.updateRoamCamera(1)
  }
  setTransport(value: 'bike' | 'walk') {
    this.transport = value
    this.speed = 0
    this.bike.visible = this.mode === 'roam' && value === 'bike'
  }
  setEvening(value: boolean) {
    this.evening = value
    this.applyLighting()
  }
  setWeather(value: WeatherId) {
    this.weather = value
    this.weatherLayer.set(value)
    this.applyLighting()
  }
  input(key: string, pressed: boolean) {
    if (pressed) this.keys.add(key)
    else this.keys.delete(key)
  }

  private applyLighting() {
    const backgrounds = { forest: '#e8eee1', sea: '#e7eff0', jiangnan: '#e9eee7' }
    const sunset = this.weather === 'sunset' || this.evening
    const rain = this.weather === 'rain'
    const sky = rain ? '#9daeb8' : sunset ? '#e9b497' : backgrounds[this.world]
    this.scene.background = new THREE.Color(sky)
    this.scene.fog = new THREE.Fog(
      sky,
      this.mode === 'overview' ? 150 : 55,
      this.mode === 'overview' ? 310 : 170,
    )
    this.sunlight.position.set(sunset ? -55 : -40, sunset ? 20 : 75, 35)
    this.sunlight.color.set(rain ? '#c8dce9' : sunset ? '#ffb978' : '#fff2ce')
    this.sunlight.intensity = rain ? 0.7 : sunset ? 2.6 : 3.1
    this.ambient.intensity = rain ? 1.5 : sunset ? 1.6 : 2.1
  }

  private keyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement)?.closest('input, textarea, select')) return
    const key = event.key.toLowerCase()
    if ((event.target as HTMLElement)?.closest('button') && [' ', 'enter'].includes(key)) return
    if (
      this.mode === 'roam' &&
      ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
    )
      event.preventDefault()
    this.keys.add(key)
    if (key === 'r' && this.ghost && !event.repeat) {
      this.placementRotation += Math.PI / 4
      this.ghost.rotation.y = this.placementRotation
    }
    if (key === 'escape') {
      this.clearPlacement()
      this.onCancelPlacement()
    }
  }
  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase())
  }
  private clearKeys = () => {
    this.keys.clear()
    this.speed = 0
  }
  private lockChanged = () => {
    this.keys.clear()
    this.speed = 0
    this.sendStatus()
  }
  private mouseLook = (event: MouseEvent) => {
    if (this.mode !== 'roam' || document.pointerLockElement !== this.renderer.domElement) return
    this.yaw -= event.movementX * 0.0022
    this.pitch = THREE.MathUtils.clamp(this.pitch - event.movementY * 0.0018, -0.65, 0.6)
  }

  private animate = (now: number) => {
    if (!this.alive) return
    if (!this.host.clientWidth || document.hidden) {
      this.previousTime = now
      this.frame = requestAnimationFrame(this.animate)
      return
    }
    const dt = Math.min((now - this.previousTime) / 1000, 0.05)
    this.weatherLayer.update(dt)
    this.previousTime = now
    this.model.update(now / 1000)
    if (this.mode === 'overview') this.controls.update()
    else {
      const forward = this.keys.has('w') || this.keys.has('arrowup')
      const brake = this.keys.has('s') || this.keys.has('arrowdown') || this.keys.has(' ')
      const left = this.keys.has('a') || this.keys.has('arrowleft')
      const right = this.keys.has('d') || this.keys.has('arrowright')
      const maxSpeed = this.transport === 'walk' ? 3.2 : this.keys.has('shift') ? 11 : 7.8
      this.speed = THREE.MathUtils.damp(
        this.speed,
        forward ? maxSpeed : 0,
        brake ? 8 : forward ? 1.5 : 2,
        dt,
      )
      this.yaw += (Number(left) - Number(right)) * dt * (this.transport === 'walk' ? 1.8 : 1.3)
      const x = this.position.x + Math.sin(this.yaw) * this.speed * dt
      const z = this.position.z + Math.cos(this.yaw) * this.speed * dt
      const blocked =
        this.model.colliders.some(
          (collider) => Math.hypot(x - collider.x, z - collider.z) < collider.radius + 0.4,
        ) ||
        this.decorations.some(
          (item) =>
            item.kind !== 'flowers' &&
            Math.hypot(x - item.x, z - item.z) < (item.kind === 'bench' ? 1.2 : 0.45),
        )
      if (this.model.isWalkable(x, z) && !blocked) {
        this.distance += Math.hypot(x - this.position.x, z - this.position.z)
        this.position.set(x, this.model.heightAt(x, z), z)
      } else this.speed = 0
      this.updateRoamCamera(dt)
      for (const wheel of this.wheels) wheel.rotateZ((this.speed * dt) / 0.38)
    }
    if (now - this.statusAt > 160) {
      this.statusAt = now
      this.sendStatus()
    }
    this.renderer.render(this.scene, this.camera)
    this.frame = requestAnimationFrame(this.animate)
  }

  private updateRoamCamera(dt: number) {
    const y = this.model.heightAt(this.position.x, this.position.z)
    const direction = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))
    this.bike.position.set(this.position.x, y, this.position.z)
    this.bike.rotation.y = this.yaw
    this.rider.visible = !this.firstPerson
    const eyeHeight = this.transport === 'bike' ? 1.55 : 1.8
    const desired = this.firstPerson
      ? new THREE.Vector3(this.position.x, y + eyeHeight, this.position.z)
      : this.position
          .clone()
          .addScaledVector(direction, -5.5)
          .setY(y + 3.2)
    this.camera.position.lerp(desired, dt >= 1 ? 1 : 1 - Math.exp(-dt * 12))
    const target = this.position.clone().addScaledVector(direction, this.firstPerson ? 10 : 3)
    target.y = y + (this.firstPerson ? eyeHeight + Math.sin(this.pitch) * 10 : 1.0)
    this.camera.lookAt(target)
  }

  setPlacement(songId: string | null) {
    this.clearPlacement()
    if (!songId || this.mode !== 'overview') return
    const song = catalog.songs.find(s => s.id === songId)
    if (!song || kindFor(song) !== 'decoration' || imageryFor(song.title).weather || availableImagery(songId) < 1) {
      this.onMessage('这件意象没有可用库存，撤回一件后可以重新摆放。')
      this.onCancelPlacement()
      return
    }
    if (this.decorations.length >= 50) {
      this.onMessage('这个世界已摆放 50 件装饰，请先撤回一些。')
      this.onCancelPlacement()
      return
    }
    this.placement = songId
    this.ghost = buildImagery(imageryFor(song.title).model)
    this.ghost.visible = false
    this.ghost.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material.transparent = true
        object.material.opacity = 0.6
      }
    })
    this.scene.add(this.ghost)
    this.renderer.domElement.style.cursor = 'crosshair'
  }

  clearPlacement() {
    if (this.ghost) {
      this.scene.remove(this.ghost)
      disposeObject(this.ghost)
      this.ghost = null
    }
    this.placement = null
    this.validPlacement = false
    this.placementRotation = 0
    if (this.renderer) this.renderer.domElement.style.cursor = 'grab'
  }

  private movePointer = (event: MouseEvent) => {
    if (!this.ghost) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const intersection = this.raycaster.intersectObject(this.model.ground)[0]
    this.validPlacement =
      !!intersection &&
      this.model.isWalkable(intersection.point.x, intersection.point.z) &&
      !this.model.colliders.some(
        (c) => Math.hypot(c.x - intersection.point.x, c.z - intersection.point.z) < c.radius + 1,
      ) &&
      !this.decorations.some(
        (item) => Math.hypot(item.x - intersection.point.x, item.z - intersection.point.z) < 4,
      )
    this.ghost.visible = this.validPlacement
    if (intersection)
      this.ghost.position.set(
        intersection.point.x,
        this.model.heightAt(intersection.point.x, intersection.point.z),
        intersection.point.z,
      )
  }

  private clickScene = (event: MouseEvent) => {
    if (this.mode === 'roam') {
      this.renderer.domElement.focus()
      if (document.pointerLockElement !== this.renderer.domElement) {
        try {
          const result = this.renderer.domElement.requestPointerLock()
          result?.catch(() => this.onMessage('鼠标视角未启用，仍可用 A / D 转向。'))
        } catch {
          this.onMessage('仍可用 A / D 转向。')
        }
      }
      return
    }
    if (this.placement) this.movePointer(event)
    if (!this.ghost || !this.placement || !this.validPlacement) return
    const decoration: Decoration = {
      kind: 'bench',
      songId: this.placement,
      x: this.ghost.position.x,
      z: this.ghost.position.z,
      rotation: this.placementRotation,
    }
    if (!placeImagery(this.world, { songId: this.placement, x: decoration.x, z: decoration.z, rotation: decoration.rotation })) {
      this.onMessage('库存不足或保存失败，没有扣除装饰数量。')
      this.clearPlacement(); this.onCancelPlacement(); return
    }
    this.decorations.push(decoration)
    this.addDecorationMesh(decoration)
    this.saveDecorations()
    this.sendStatus()
    this.validPlacement = false
    this.ghost.visible = false
    this.onMessage('已摆放，将同步到账号歌境。')
    if (availableImagery(this.placement) < 1) { this.clearPlacement(); this.onCancelPlacement() }
  }

  undoDecoration() {
    if (!this.decorations.length) return
    if (this.decorations.at(-1)?.songId && !undoImagery(this.world)) {
      this.onMessage('撤回未能保存，请重试。'); return
    }
    this.decorations.pop()
    const object = this.placed.children.at(-1)
    if (object) {
      this.placed.remove(object)
      disposeObject(object)
    }
    this.saveDecorations()
    this.sendStatus()
    this.onMessage('已撤回最后一件装饰。')
  }

  private addDecorationMesh(decoration: Decoration) {
    const song = catalog.songs.find(s => s.id === decoration.songId)
    const object = song ? buildImagery(imageryFor(song.title).model) : buildDecoration(decoration.kind)
    object.position.set(decoration.x, this.model.heightAt(decoration.x, decoration.z), decoration.z)
    object.rotation.y = decoration.rotation
    this.placed.add(object)
  }
  private loadDecorations(id: WorldId): Decoration[] {
    try {
      const data: unknown = game.worldScenery[id] || []
      if (!Array.isArray(data)) return []
      return data
        .filter(
          (item): item is Decoration =>
            !!item &&
            ['bench', 'lamp', 'flowers'].includes(item.kind) &&
            [item.x, item.z, item.rotation].every(
              (value) => typeof value === 'number' && Number.isFinite(value),
            ) &&
            this.model.isWalkable(item.x, item.z),
        )
        .slice(0, 50)
    } catch {
      return []
    }
  }
  private saveDecorations() {
    game.worldScenery[this.world] = this.decorations.filter(p => !p.songId).map(p => ({ ...p }))
    persist()
  }
  private sendStatus() {
    this.onStatus({
      speed: this.speed * 3.6,
      distance: this.distance,
      decorations: this.decorations.length,
      locked: document.pointerLockElement === this.renderer.domElement,
    })
  }

  private makeBicycle() {
    const material = new THREE.MeshStandardMaterial({ color: '#597f70', roughness: 0.65 })
    const rubber = new THREE.MeshStandardMaterial({ color: '#424c48', roughness: 0.9 })
    const tube = (a: THREE.Vector3, b: THREE.Vector3, radius = 0.035) => {
      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 7),
        material,
      )
      cylinder.position.copy(a).add(b).multiplyScalar(0.5)
      cylinder.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        b.clone().sub(a).normalize(),
      )
      this.bike.add(cylinder)
    }
    for (const z of [-0.72, 0.72]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 24), rubber)
      wheel.rotation.y = Math.PI / 2
      wheel.position.set(0, 0.42, z)
      this.bike.add(wheel)
      this.wheels.push(wheel)
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        tube(
          new THREE.Vector3(0, 0.42, z),
          new THREE.Vector3(0, 0.42 + Math.sin(angle) * 0.35, z + Math.cos(angle) * 0.35),
          0.008,
        )
      }
    }
    const nodes = [
      new THREE.Vector3(0, 0.42, -0.72),
      new THREE.Vector3(0, 0.85, -0.25),
      new THREE.Vector3(0, 0.36, 0),
      new THREE.Vector3(0, 0.94, 0.55),
      new THREE.Vector3(0, 0.42, 0.72),
    ]
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [2, 0],
      [1, 3],
      [3, 2],
      [3, 4],
    ])
      tube(nodes[a!]!, nodes[b!]!)
    tube(new THREE.Vector3(0, 0.94, 0.55), new THREE.Vector3(0, 1.2, 0.6))
    tube(new THREE.Vector3(-0.36, 1.2, 0.6), new THREE.Vector3(0.36, 1.2, 0.6))
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.45), rubber)
    seat.position.set(0, 1, -0.3)
    this.bike.add(seat)
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.35, 3, 7),
      new THREE.MeshStandardMaterial({ color: '#d6a881' }),
    )
    torso.position.set(0, 1.28, -0.25)
    torso.rotation.x = 0.18
    this.rider.add(torso)
    const head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.23, 1),
      new THREE.MeshStandardMaterial({ color: '#eee3c9' }),
    )
    head.position.set(0, 1.82, -0.1)
    this.rider.add(head)
    const limb = (a: THREE.Vector3, b: THREE.Vector3, color: string, radius: number) => {
      const part = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
      )
      part.position.copy(a).add(b).multiplyScalar(0.5)
      part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
      this.rider.add(part)
    }
    for (const side of [-1, 1]) {
      const knee = new THREE.Vector3(side * 0.19, 0.65, 0.08)
      limb(new THREE.Vector3(side * 0.15, 1.02, -0.28), knee, '#718379', 0.08)
      limb(knee, new THREE.Vector3(side * 0.19, 0.35, 0), '#718379', 0.07)
      const elbow = new THREE.Vector3(side * 0.23, 1.2, 0.2)
      limb(new THREE.Vector3(side * 0.18, 1.47, -0.15), elbow, '#d6a881', 0.055)
      limb(elbow, new THREE.Vector3(side * 0.32, 1.2, 0.6), '#e5ccab', 0.045)
    }
    this.bike.add(this.rider)
    this.bike.visible = false
  }

  dispose() {
    this.alive = false
    cancelAnimationFrame(this.frame)
    this.events.abort()
    this.resizeObserver.disconnect()
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock()
    this.controls.dispose()
    disposeObject(this.scene)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
