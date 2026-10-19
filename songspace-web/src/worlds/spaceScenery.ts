import * as T from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

type Point = [number, number, number]
type Finish = 'alloy' | 'dark' | 'solar' | 'light' | 'stone'

/** Per-asset material batches; every instance owns geometry/materials for normal world disposal. */
function builder(name: string) {
  const group = new T.Group(); group.name = name
  const batches = new Map<Finish, T.BufferGeometry[]>()
  const add = (geo: T.BufferGeometry, color: string, p: Point = [0, 0, 0], r: Point = [0, 0, 0], finish: Finish = 'alloy') => {
    const geometry = geo.index ? geo.toNonIndexed() : geo
    if (geometry !== geo) geo.dispose()
    geometry.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p), new T.Quaternion().setFromEuler(new T.Euler(...r)), new T.Vector3(1, 1, 1)))
    geometry.deleteAttribute('uv')
    const c = new T.Color(color), count = geometry.getAttribute('position').count, colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3)
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3))
    if (!batches.has(finish)) batches.set(finish, [])
    batches.get(finish)!.push(geometry)
  }
  const box = (size: Point, p: Point, c = '#b8c5cf', finish: Finish = 'alloy', r: Point = [0, 0, 0], bevel = .035) => add(new RoundedBoxGeometry(...size, 1, Math.min(bevel, ...size.map(v => v / 3))), c, p, r, finish)
  const cylinder = (radius: number, height: number, p: Point, c: string, finish: Finish = 'alloy', r: Point = [0, 0, 0], segments = 32) => add(new T.CylinderGeometry(radius, radius, height, segments), c, p, r, finish)
  const tube = (points: Point[], radius: number, color: string, finish: Finish = 'alloy') => add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 16, radius, 6, false), color, [0, 0, 0], [0, 0, 0], finish)
  const beam = (a: Point, b: Point, radius = .05, color = '#8194a9') => {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), geo = new T.CylinderGeometry(radius, radius, start.distanceTo(end), 8)
    geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize()))
    add(geo, color, start.add(end).multiplyScalar(.5).toArray() as Point)
  }
  const ring = (radius: number, thickness: number, p: Point, color: string, finish: Finish = 'alloy', r: Point = [Math.PI / 2, 0, 0], arc = Math.PI * 2) => add(new T.TorusGeometry(radius, thickness, 6, 64, arc), color, p, r, finish)
  const solar = (p: Point, width: number, depth: number, angle = -.25) => {
    const q = new T.Quaternion().setFromEuler(new T.Euler(0, 0, angle)), position = new T.Vector3(...p)
    const at = (x: number, y: number, z: number) => new T.Vector3(x, y, z).applyQuaternion(q).add(position).toArray() as Point
    box([width + .12, .08, depth + .12], p, '#a5b2bf', 'alloy', [0, 0, angle])
    for (let col = 0; col < 6; col++) for (let row = 0; row < 8; row++) {
      box([width / 6 - .025, .018, depth / 8 - .025], at((col + .5) / 6 * width - width / 2, .052, (row + .5) / 8 * depth - depth / 2), (col + row) % 3 ? '#244b75' : '#385d8b', 'solar', [0, 0, angle], .005)
    }
    for (const x of [-width / 2, width / 2]) box([.04, .05, depth + .2], at(x, .04, 0), '#d4d7d1', 'alloy', [0, 0, angle])
  }
  const dish = (p: Point, radius: number, tilt = .35) => {
    const vertices: number[] = [], indices: number[] = [], q = new T.Quaternion().setFromEuler(new T.Euler(tilt, 0, 0))
    for (let row = 0; row <= 12; row++) for (let col = 0; col <= 48; col++) {
      const r = row / 12 * radius, a = col / 48 * Math.PI * 2
      const v = new T.Vector3(Math.cos(a) * r, .34 * r * r / radius, Math.sin(a) * r).applyQuaternion(q).add(new T.Vector3(...p))
      vertices.push(v.x, v.y, v.z)
      if (row < 12 && col < 48) { const i = row * 49 + col; indices.push(i, i + 1, i + 49, i + 1, i + 50, i + 49) }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals()
    add(geo, '#d2d8d7')
    const at = (x: number, y: number, z: number) => new T.Vector3(x, y, z).applyQuaternion(q).add(new T.Vector3(...p)).toArray() as Point
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3
      beam(at(Math.cos(a) * radius * .85, .26 * radius, Math.sin(a) * radius * .85), at(0, radius * .68, 0), .025)
    }
    cylinder(radius * .085, .13, at(0, radius * .68, 0), '#d3aa6d')
    // The thin back shell and ribbed edge give the reflector visible thickness.
    ring(radius, .025, at(0, .34 * radius, 0), '#8e9ca9', 'alloy', [Math.PI / 2 + tilt, 0, 0])
  }
  return { group, add, box, cylinder, beam, tube, ring, solar, dish,
    finish() {
      for (const [finish, geos] of batches) {
        const raw = mergeGeometries(geos)!, geometry = mergeVertices(raw)
        raw.dispose(); geos.forEach(g => g.dispose())
        const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: finish === 'stone' ? .96 : finish === 'solar' ? .28 : .45, metalness: finish === 'alloy' ? .55 : finish === 'solar' ? .5 : .12, side: T.DoubleSide })
        if (finish === 'light') { material.emissive.set('#69c4db'); material.emissiveIntensity = .75 }
        const mesh = new T.Mesh(geometry, material); mesh.name = `${name}-${finish}`; mesh.castShadow = finish !== 'light'; mesh.receiveShadow = true; group.add(mesh)
      }
      return group
    },
  }
}

export const LUNAR_CRATERS = [
  { x: -24, z: -21, radius: 6.2, depth: 1.25 }, { x: -9, z: -9, radius: 3.3, depth: .65 },
  { x: 25, z: 19, radius: 6.3, depth: 1.1 }, { x: -31, z: 25, radius: 3.8, depth: .72 },
  { x: 30, z: -29, radius: 3.6, depth: .6 },
]
export function lunarHeight(x: number, z: number) {
  let h = .2 * Math.sin(x * .17 + z * .11) * Math.sin(z * .23) + .06 * Math.sin(x * .73 + z * .4)
  for (const c of LUNAR_CRATERS) {
    const q = Math.hypot(x - c.x, z - c.z) / c.radius
    if (q < 1.35) h += c.depth * (.3 * Math.exp(-Math.pow((q - .94) / .13, 2)) - .88 * Math.pow(Math.max(0, 1 - q * q), 2))
  }
  const road = T.MathUtils.smoothstep(Math.abs(x - 5), 4.5, 7)
  const habitat = T.MathUtils.smoothstep(Math.hypot(x - 24, z + 12), 8, 11)
  const pad = T.MathUtils.smoothstep(Math.hypot(x + 20, z - 7), 8.5, 11)
  const edge = T.MathUtils.smoothstep(Math.min(42 - Math.abs(x), 37 - Math.abs(z)), 0, 4)
  return h * road * habitat * pad * edge
}
export function lunarGround() {
  const geo = new T.PlaneGeometry(84, 74, 128, 112); geo.rotateX(-Math.PI / 2)
  const p = geo.getAttribute('position'), colors: number[] = [], color = new T.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = lunarHeight(x, z)
    p.setY(i, h)
    color.set('#687086').lerp(new T.Color('#a9a397'), .35 + .18 * Math.sin(x * .23 + z * .19)).multiplyScalar(.95 + h * .1 + Math.sin(x * 13 + z * 17) * .035)
    colors.push(color.r, color.g, color.b)
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals()
  const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })
  const mesh = new T.Mesh(geo, material); mesh.name = 'sculpted-lunar-regolith'; mesh.receiveShadow = true
  return mesh
}

export function orbitalHabitat() {
  const b = builder('orbital-research-habitat')
  b.cylinder(3.15, .28, [0, .14, 0], '#536176')
  b.cylinder(2.52, 2.15, [0, 1.55, 0], '#c8cecb')
  for (const y of [.52, 2.53]) b.ring(2.54, .09, [0, y, 0], '#8a9ba9')
  b.add(new T.SphereGeometry(2.55, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), '#3b5970', [0, 2.63, 0], [0, 0, 0], 'solar')
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4
    b.tube(Array.from({ length: 13 }, (_, j) => { const t = j / 12 * Math.PI / 2; return [Math.cos(a) * Math.cos(t) * 2.57, 2.63 + Math.sin(t) * 2.57, Math.sin(a) * Math.cos(t) * 2.57] as Point }), .037, '#b2bec6')
    b.box([.5, .48, .055], [Math.sin(a) * 2.54, 1.73, Math.cos(a) * 2.54], '#2a455a', 'solar', [0, a, 0])
    b.box([.42, .035, .04], [Math.sin(a) * 2.58, 1.49, Math.cos(a) * 2.58], '#86c5cf', 'light', [0, a, 0])
  }
  for (const side of [-1, 1]) {
    b.cylinder(.8, 2.2, [side * 3.3, 1.05, .45], '#c0c7c8', 'alloy', [0, 0, Math.PI / 2])
    for (let j = 0; j < 5; j++) b.ring(.81, .04, [side * (2.6 + j * .36), 1.05, .45], '#748798', 'alloy', [0, Math.PI / 2, 0])
    b.box([1.35, 1.5, 2], [side * 4.7, 1.15, .45], '#aebcc3')
    b.box([1.15, .13, 2.2], [side * 4.7, 1.97, .45], '#e1dbbf')
    b.box([.6, .1, 1.7], [side * 4.7, 2.09, .45], '#a98a5d')
    b.beam([side * 2.8, .4, -1.5], [side * 5.2, 2.6, -3], .09)
    b.solar([side * 5.1, 2.75, -3], 3.4, 3, side * -.16)
  }
  b.box([1.45, 1.9, .55], [0, 1.3, 2.53], '#8499a6')
  b.box([1.05, 1.55, .05], [0, 1.3, 2.84], '#344e61', 'dark')
  b.box([.22, .45, .06], [.28, 1.62, 2.89], '#77c9d7', 'light')
  for (let j = 0; j < 4; j++) b.box([1.55, .14, .4], [0, .18 + j * .12, 3.95 - j * .35], '#abb7bb')
  b.tube([[-1.9, .32, 1.3], [-2, .4, 2.9], [-3, .4, 3.3], [-3.1, .9, 3.3]], .055, '#c0a26a')
  for (let i = 0; i < 3; i++) b.box([.42, .7, .55], [-2.6 - i * .5, .62, 3], '#8d9ca6')
  b.cylinder(.14, 1.9, [2.6, 3.3, -.3], '#8295a6')
  b.dish([2.6, 4.25, -.3], 1.05, .45)
  return b.finish()
}
export function solarArray() {
  const b = builder('tracking-solar-array')
  for (const side of [-1, 1]) {
    b.box([.8, .16, 1.2], [side * 1.7, .08, 0], '#8f9ba7')
    b.cylinder(.075, 1.2, [side * 1.7, .75, 0], '#a3afba')
    b.solar([side * 1.7, 1.5, 0], 2.5, 3.3, side * -.24)
    b.beam([side * 1.7, .4, 0], [side * 2.5, 1.3, .9], .038)
  }
  b.box([.58, .62, .48], [0, .34, .5], '#adbac1')
  b.tube([[-1.7, .2, .4], [-.5, .1, .8], [0, .3, .5], [1.7, .2, .4]], .027, '#a98d62')
  return b.finish()
}
export function relayAntenna() {
  const b = builder('deep-space-relay')
  b.cylinder(1.1, .17, [0, .085, 0], '#7c899c')
  for (const x of [-.45, .45]) for (const z of [-.45, .45]) {
    b.beam([x, .15, z], [x * .6, 3.5, z * .6], .045)
    b.beam([x, .5, z], [-x * .6, 2.7, z * .6], .022)
  }
  b.cylinder(.24, .24, [0, 3.6, 0], '#9eaebc')
  b.dish([0, 3.75, 0], 1.7, .65)
  b.box([.65, 1.1, .5], [1.1, .65, .2], '#b6bfc4')
  b.box([.3, .08, .045], [1.1, .9, .48], '#72becb', 'light')
  b.tube([[1.1, .2, .2], [.7, .1, .1], [0, .2, 0]], .035, '#bc985b')
  return b.finish()
}
export function lunarRover() {
  const b = builder('six-wheel-lunar-rover')
  b.box([1.6, .5, 2.2], [0, .82, 0], '#b8c4c9')
  b.box([1.42, .15, 1.35], [0, 1.18, .14], '#d5c298')
  b.solar([0, 1.3, .25], 1.3, 1.4, -.12)
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = -.78 + i * .8
    b.beam([side * .65, .8, z + .1], [side * 1.06, .48, z], .055)
    b.cylinder(.36, .24, [side * 1.05, .42, z], '#3a4656', 'dark', [0, 0, Math.PI / 2], 20)
    b.cylinder(.2, .255, [side * 1.05, .42, z], '#a1adb6', 'alloy', [0, 0, Math.PI / 2], 20)
    for (let j = 0; j < 12; j++) { const a = j * Math.PI / 6; b.box([.26, .025, .08], [side * 1.05, .42 + Math.sin(a) * .365, z + Math.cos(a) * .365], '#61717e', 'alloy', [-a, 0, 0], .006) }
  }
  b.cylinder(.055, 1.2, [0, 1.8, -.7], '#8d9ba8')
  b.box([.52, .25, .3], [0, 2.45, -.7], '#c7cdca')
  for (const x of [-.14, .14]) b.cylinder(.065, .06, [x, 2.45, -.87], '#38596a', 'solar', [Math.PI / 2, 0, 0], 16)
  b.beam([.55, 1.1, -.85], [.8, 1.7, -1.3], .04)
  b.beam([.8, 1.7, -1.3], [.35, 1.5, -1.55], .035)
  b.box([.28, .15, .3], [.35, 1.48, -1.58], '#c2b183')
  return b.finish()
}
export function landingPad() {
  const b = builder('lunar-landing-pad')
  b.cylinder(7.8, .22, [0, .04, 0], '#455669', 'dark', [0, 0, 0], 64)
  b.cylinder(7.1, .08, [0, .19, 0], '#7e8e9c', 'alloy', [0, 0, 0], 64)
  for (const r of [5.6, 6.7]) b.ring(r, .035, [0, .245, 0], r > 6 ? '#8fc9d2' : '#c3ac76', r > 6 ? 'light' : 'alloy')
  b.box([.42, .025, 4], [-1.2, .25, 0], '#d8caa8')
  b.box([.42, .025, 4], [1.2, .25, 0], '#d8caa8')
  b.box([2.4, .025, .4], [0, .25, 0], '#d8caa8')
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8
    b.box([.18, .09, .55], [Math.cos(a) * 7.25, .31, Math.sin(a) * 7.25], '#92d2db', 'light', [0, -a, 0])
    b.box([.22, .03, .6], [Math.cos(a) * 6, .25, Math.sin(a) * 6], '#bbc3c4', 'alloy', [0, -a, 0])
  }
  return b.finish()
}
export function navigationGate() {
  const b = builder('orbital-navigation-gate')
  b.ring(4.65, .13, [0, .2, 0], '#8c9eaf', 'alloy', [0, 0, 0], Math.PI)
  b.ring(4.42, .035, [0, .2, -.02], '#7ec9da', 'light', [0, 0, 0], Math.PI)
  for (const side of [-1, 1]) {
    b.box([.65, .24, 1.3], [side * 4.65, .12, 0], '#718599')
    b.box([.22, 1.5, .42], [side * 4.55, 1, 0], '#a0b0bc')
    for (let i = 0; i < 4; i++) b.box([.055, .18, .06], [side * 4.55, .55 + i * .3, .24], '#98d6de', 'light')
  }
  return b.finish()
}
export function orbitalWalkway(width = 7, length = 72) {
  const b = builder('modular-orbital-walkway')
  b.box([width + .5, .16, length], [0, -.04, 0], '#344357', 'dark')
  const count = Math.ceil(length / 3), pitch = length / count
  for (let i = 0; i < count; i++) {
    const z = -length / 2 + (i + .5) * pitch
    b.box([width, .08, pitch - .07], [0, .08, z], i % 3 ? '#6c7c8f' : '#82909c')
    for (const side of [-1, 1]) {
      b.box([.11, .04, pitch * .6], [side * (width / 2 - .12), .15, z], '#8dd9e0', 'light')
      b.box([.2, .32, .22], [side * (width / 2 + .18), .16, z], '#9eacb6')
      for (const dz of [-.7, .7]) b.cylinder(.035, .02, [side * (width / 2 - .4), .135, z + dz], '#c0c7c7', 'alloy', [0, 0, 0], 8)
    }
    for (const x of [-.4, 0, .4]) b.box([.18, .012, .075], [x, .13, z], '#c4b78d')
  }
  return b.finish()
}
export function regolithScatter() {
  const group = new T.Group(); group.name = 'lunar-regolith-scatter'
  const geo = new T.IcosahedronGeometry(1, 1), material = new T.MeshStandardMaterial({ color: '#8c91a0', roughness: 1 })
  const pebbles = new T.InstancedMesh(geo, material, 260), pose = new T.Object3D()
  let count = 0
  for (let i = 0; i < 600 && count < 260; i++) {
    const x = Math.sin(i * 17.31) * 39, z = Math.sin(i * 5.19 + 1) * 34
    if (Math.abs(x - 5) < 5.8 || Math.hypot(x - 24, z + 12) < 9 || Math.hypot(x + 20, z - 7) < 9) continue
    pose.position.set(x, lunarHeight(x, z) + .09, z); pose.rotation.set(i * .7, i, .3)
    const size = .06 + (i % 7) * .035; pose.scale.set(size * 1.3, size * .65, size); pose.updateMatrix(); pebbles.setMatrixAt(count++, pose.matrix)
  }
  pebbles.count = count; pebbles.receiveShadow = true; group.add(pebbles)
  return group
}

export function craterMoon() {
  const geometry = new T.SphereGeometry(3.6, 64, 40), p = geometry.getAttribute('position'), colors: number[] = []
  const centers = Array.from({ length: 17 }, (_, i) => new T.Vector3(Math.sin(i * 2.399), Math.sin(i * 1.31), Math.cos(i * 2.399)).normalize())
  const color = new T.Color(), direction = new T.Vector3()
  for (let i = 0; i < p.count; i++) {
    direction.fromBufferAttribute(p, i).normalize()
    let erosion = 0
    for (const [j, center] of centers.entries()) {
      const distance = direction.distanceTo(center) / (.1 + j % 4 * .045)
      if (distance < 1.4) erosion += -.12 * Math.pow(Math.max(0, 1 - distance * distance), 2) + .045 * Math.exp(-Math.pow((distance - .97) / .16, 2))
    }
    const radius = 3.6 * (1 + erosion + Math.sin(direction.x * 19 + direction.z * 11) * .004)
    p.setXYZ(i, direction.x * radius, direction.y * radius, direction.z * radius)
    color.set('#9ba6b2').lerp(new T.Color('#bbb9a7'), .35 + direction.y * .15).multiplyScalar(.95 + erosion * 1.5)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals()
  const moon = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); moon.name = 'cratered-satellite'
  return moon
}
export function deepSpaceStars() {
  const positions: number[] = [], colors: number[] = [], color = new T.Color()
  for (let i = 0; i < 720; i++) {
    const azimuth = i * 2.399, y = .08 + ((i * .618033) % 1) * .9, radius = 130 + i % 11 * 3
    positions.push(Math.cos(azimuth) * Math.sqrt(1 - y * y) * radius, y * radius, Math.sin(azimuth) * Math.sqrt(1 - y * y) * radius)
    color.set(i % 7 === 0 ? '#efc995' : i % 3 === 0 ? '#9cbbdf' : '#d8e2f3').multiplyScalar(.6 + i % 5 * .13)
    colors.push(color.r, color.g, color.b)
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  const stars = new T.Points(geometry, new T.PointsMaterial({ vertexColors: true, size: .25, fog: false, depthWrite: false })); stars.name = 'layered-deep-space-stars'
  return stars
}
