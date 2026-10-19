import * as T from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { SongDecorationModel } from '../game/content.ts'
export { SONG_DECORATION_MODELS } from '../game/content.ts'

type Surface = 'bark' | 'leaf' | 'petal' | 'wood' | 'stone' | 'metal' | 'porcelain' | 'flame' | 'glass'
type Point = [number, number, number]
const vector = (p: Point) => new T.Vector3(...p)
const templates = new Map<SongDecorationModel, T.Group>()
function instance(template: T.Group) {
  const clone = template.clone(true)
  clone.traverse(o => {
    if (!(o instanceof T.Mesh)) return
    o.geometry = o.geometry.clone()
    o.material = o.material.clone()
  })
  return clone
}

/** Original, deterministic meshes. The same factory supplies the world, race and asset previews.
 * Small repeated details are merged by surface instead of becoming hundreds of draw calls. */
export function buildSongDecoration(id: SongDecorationModel) {
  const cached = templates.get(id)
  if (cached) return instance(cached)
  const group = new T.Group()
  group.name = `song-decoration-${id}`
  const batches = new Map<Surface, T.BufferGeometry[]>()
  const parts: Record<string, number> = {}
  let seed = 431
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const add = (geometry: T.BufferGeometry, color: string, position: Point = [0, 0, 0], rotation: Point = [0, 0, 0], scale: Point = [1, 1, 1], surface: Surface = 'wood', part = surface as string) => {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry
    if (geo !== geometry) geometry.dispose()
    geo.applyMatrix4(new T.Matrix4().compose(vector(position), new T.Quaternion().setFromEuler(new T.Euler(...rotation)), vector(scale)))
    for (const key of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(key)) geo.deleteAttribute(key)
    if (!geo.getAttribute('normal')) geo.computeVertexNormals()
    const normals = geo.getAttribute('normal'), normal = new T.Vector3()
    for (let i = 0; i < normals.count; i++) {
      normal.fromBufferAttribute(normals, i)
      if (normal.lengthSq() < .01) normal.set(0, 1, 0)
      else normal.normalize()
      normals.setXYZ(i, normal.x, normal.y, normal.z)
    }
    const c = new T.Color(color), p = geo.getAttribute('position'), colors = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      const tint = 1 + Math.sin(p.getX(i) * 18 + p.getY(i) * 7 + p.getZ(i) * 13) * .035
      colors.set([c.r * tint, c.g * tint, c.b * tint], i * 3)
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3))
    if (!batches.has(surface)) batches.set(surface, [])
    batches.get(surface)!.push(geo)
    parts[part] = (parts[part] || 0) + 1
  }
  const box = (size: Point, pos: Point, color: string, surface: Surface = 'wood', rotation: Point = [0, 0, 0], radius = .025) => add(new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v / 3))), color, pos, rotation, [1, 1, 1], surface)
  const ellipsoid = (size: Point, pos: Point, color: string, surface: Surface = 'stone', rotation: Point = [0, 0, 0]) => add(new T.SphereGeometry(1, 20, 12), color, pos, rotation, size, surface)
  const tube = (points: Point[], r: number, color: string, surface: Surface = 'wood', segments = 16, sides = 7, part?: string) => add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(vector)), segments, r, sides, false), color, [0, 0, 0], [0, 0, 0], [1, 1, 1], surface, part)
  const branch = (a: Point, b: Point, r: number, color = '#6a4c35', surface: Surface = 'bark') => {
    const start = vector(a), end = vector(b), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize())
    const geo = new T.CylinderGeometry(r * .38, r, start.distanceTo(end), 9, 2)
    geo.applyQuaternion(q); add(geo, color, start.add(end).multiplyScalar(.5).toArray() as Point, [0, 0, 0], [1, 1, 1], surface)
  }
  const torus = (r: number, thickness: number, pos: Point, color: string, surface: Surface = 'metal', rotation: Point = [Math.PI / 2, 0, 0]) => add(new T.TorusGeometry(r, thickness, 6, 32), color, pos, rotation, [1, 1, 1], surface)
  const patch = (rows: number, cols: number, point: (t: number, u: number) => Point, color: string, surface: Surface, part?: string) => {
    const vertices: number[] = [], indices: number[] = []
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) vertices.push(...point(i / rows, j / cols))
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j, b = a + cols + 1
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals()
    add(geo, color, [0, 0, 0], [0, 0, 0], [1, 1, 1], surface, part)
  }
  const leaf = (base: Point, length: number, width: number, yaw: number, pitch: number, color: string, kind: 'oval' | 'cactus' | 'petal' = 'oval', curl = .15) => {
    const q = new T.Quaternion().setFromEuler(new T.Euler(pitch, yaw, 0, 'YXZ'))
    const transform = (x: number, y: number, z: number) => new T.Vector3(x, y, z).applyQuaternion(q).add(vector(base)).toArray() as Point
    patch(kind === 'cactus' ? 12 : kind === 'petal' ? 8 : 5, kind === 'oval' ? 2 : 4, (t, u) => {
      const outline = Math.pow(Math.sin(Math.PI * t), kind === 'petal' ? .55 : .8)
      const edge = kind === 'cactus' ? 1 + .1 * Math.cos(t * Math.PI * 12) : 1 + .035 * Math.cos(t * Math.PI * 16)
      return transform((u - .5) * width * outline * edge, curl * t * t + Math.abs(u - .5) * width * .18 * Math.sin(t * Math.PI), -t * length)
    }, color, kind === 'petal' ? 'petal' : 'leaf', kind === 'cactus' ? 'scalloped-cactus-stem' : kind)
    if (kind !== 'petal') tube([base, transform(0, curl * .25 + .008, -length * .5), transform(0, curl + .005, -length)], .006, kind === 'cactus' ? '#75934b' : '#849553', 'leaf', 6, 3, 'midrib')
  }
  const rock = (p: Point, size: Point, color = '#9c9b87') => {
    const geo = new T.IcosahedronGeometry(1, 2), a = geo.getAttribute('position')
    for (let i = 0; i < a.count; i++) { const n = 1 + .07 * Math.sin(a.getX(i) * 13 + a.getY(i) * 11 + a.getZ(i) * 7); a.setXYZ(i, a.getX(i) * n, a.getY(i) * n, a.getZ(i) * n) }
    geo.computeVertexNormals(); add(geo, color, p, [0, p[0] * .7, 0], size, 'stone', 'weathered-rock')
  }
  const soil = (rx: number, rz: number) => {
    ellipsoid([rx, .09, rz], [0, .07, 0], '#655641')
    for (let i = 0; i < 14; i++) { const a = random() * Math.PI * 2, r = .5 + random() * .4; rock([Math.cos(a) * rx * r, .11, Math.sin(a) * rz * r], [.08, .055, .06], '#a49c7d') }
  }

  if (id === 'camellia' || id === 'epiphyllum') {
    soil(id === 'camellia' ? 1.15 : .8, .78)
    if (id === 'camellia') {
      for (let i = 0; i < 13; i++) {
        const a = i * 2.399, reach = .35 + random() * .52, tip: Point = [Math.cos(a) * reach, .75 + random() * .83, Math.sin(a) * reach * .72]
        branch([0, .12, 0], tip, .035)
        for (let j = 0; j < 12; j++) {
          const t = .26 + j / 16, pos = vector(tip).multiplyScalar(t).add(new T.Vector3(0, .12, 0)).toArray() as Point
          leaf(pos, .3 + random() * .16, .21, a + j * 2.4, -.25 + random() * .65, ['#285636', '#386844', '#44764a'][j % 3]!)
        }
        const petals = i % 3 === 0 ? '#f2d7d4' : i % 3 === 1 ? '#bd3152' : '#dd7085'
        for (let tier = 0; tier < 3; tier++) for (let j = 0; j < 8; j++) {
          leaf(tip, .27 - tier * .055, .22 - tier * .035, j * Math.PI / 4 + tier * .37, -.15 - tier * .33, petals, 'petal', .13 + tier * .03)
        }
        ellipsoid([.055, .035, .055], [tip[0], tip[1] + .025, tip[2]], '#e6b450', 'petal')
        if (i % 2 === 0) ellipsoid([.07, .09, .07], [tip[0] * .87, tip[1] * .9, tip[2] + .12], '#a93550', 'petal')
      }
      for (let i = 0; i < 7; i++) leaf([random() * 1.5 - .75, .14, random() - .5], .16, .14, random() * 6, 0, '#dc8292', 'petal', .025)
    } else {
      for (let i = 0; i < 13; i++) {
        const yaw = i * 2.399, pos: Point = [Math.sin(yaw) * .23, .2 + i % 3 * .19, Math.cos(yaw) * .23]
        leaf(pos, 1.15 + random() * .6, .27, yaw, .55 + random() * .8, '#47754b', 'cactus', -.18)
      }
      for (const [i, tip] of ([[.55, 1.18, .05], [-.42, 1.5, -.03], [.02, .75, .5]] as Point[]).entries()) {
        tube([[0, .3, 0], [tip[0] * .7, tip[1] - .18, tip[2]], tip], .025, '#74904b', 'leaf')
        for (let tier = 0; tier < 3; tier++) for (let p = 0; p < 11; p++) leaf(tip, .58 - tier * .1, .12 + tier * .015, p * Math.PI * 2 / 11 + tier * .26, -.12 - tier * .38, tier === 0 ? '#e0d8b0' : '#fff9e9', 'petal', .12)
        for (let p = 0; p < 14; p++) { const a = p * 2.399; tube([tip, [tip[0] + Math.cos(a) * .1, tip[1] + .1, tip[2] + Math.sin(a) * .1], [tip[0] + Math.cos(a) * .14, tip[1] + .18, tip[2] + Math.sin(a) * .14]], .006, '#e6cc76', 'petal', 6, 4, 'stamen') }
        parts[`night-bloom-${i}`] = 1
      }
    }
  } else if (id === 'autumn-plane' || id === 'shade-tree') {
    const autumn = id === 'autumn-plane'
    soil(.8, .65)
    tube([[0, .08, 0], [-.08, 1, .03], [.05, 2, -.06], [.15, 3.35, 0]], .21, autumn ? '#9b9276' : '#705640', 'bark', 25, 12, 'trunk')
    for (let i = 0; i < 6; i++) { const a = i * 1.047; tube([[Math.cos(a) * .7, .08, Math.sin(a) * .55], [Math.cos(a) * .3, .13, Math.sin(a) * .2], [0, .5, 0]], .075, '#7c7052', 'bark', 10) }
    const tips: Point[] = []
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399, y = 1.75 + i / 12 * 1.7, reach = 1.35 + Math.sin(i) * .3
      const end: Point = [Math.cos(a) * reach, y + .65, Math.sin(a) * reach]
      branch([.03, y, 0], end, .085, autumn ? '#8a8168' : '#6c513b')
      for (let k = 0; k < 4; k++) {
        const b = a + (k - 1.5) * .6, tip: Point = [end[0] + Math.cos(b) * .6, end[1] + .2 + random() * .5, end[2] + Math.sin(b) * .6]
        branch(end, tip, .025); tips.push(tip)
      }
    }
    for (const end of tips) for (let k = 0; k < 11; k++) {
      const a = random() * Math.PI * 2, radius = random() * .5, p: Point = [end[0] + Math.cos(a) * radius, end[1] + (random() - .5) * .7, end[2] + Math.sin(a) * radius]
      if (!autumn) leaf(p, .34 + random() * .17, .25, a, random() - .5, ['#356742', '#497e4c', '#638b50'][k % 3]!)
      else {
        const yaw = random() * 6, pitch = random() * .8 - .3, q = new T.Quaternion().setFromEuler(new T.Euler(pitch, yaw, 0))
        patch(2, 15, (t, u) => {
          const angle = u * Math.PI * 2, r = t * (.67 + .33 * Math.cos(angle * 5)) * .27
          return new T.Vector3(Math.sin(angle) * r, t * t * .035, Math.cos(angle) * r).applyQuaternion(q).add(vector(p)).toArray() as Point
        }, ['#d4a044', '#b9692c', '#b8a24a', '#d3b664'][k % 4]!, 'leaf', 'palmate-leaf')
      }
    }
    if (autumn) {
      for (let i = 0; i < 30; i++) leaf([random() * 2.4 - 1.2, .04, random() * 2 - 1], .15, .15, random() * 6, 0, '#bc7e3b', 'oval', .01)
      for (let i = 0; i < 28; i++) ellipsoid([.05 + random() * .06, .14, .012], [Math.sin(i * 2.399) * .19, .3 + i * .09, Math.cos(i * 2.399) * .19], i % 2 ? '#b7ad8c' : '#777860', 'bark', [0, i * 2.399, .1])
    }
  } else if (id === 'rocking-chair') {
    for (const x of [-.56, .56]) {
      tube([[x, .14, -.88], [x, .045, -.3], [x, .04, .3], [x, .17, .87]], .052, '#9a6c40', 'wood', 30, 9, 'curved-rocker')
      tube([[x, .1, -.45], [x, .65, -.42], [x, 1.1, -.58], [x, 1.65, -.73]], .042, '#b18a56', 'wood', 24, 8)
      tube([[x, .08, .47], [x, .65, .44], [x, 1.03, .3]], .043, '#a77b48', 'wood')
      tube([[x, .92, .53], [x, 1.03, .3], [x, 1.04, -.26], [x, 1.1, -.61]], .048, '#c0a06c', 'wood', 20, 9, 'armrest')
    }
    for (const z of [-.43, .44]) branch([-.58, .65, z], [.58, .65, z], .042, '#aa7d4c', 'wood')
    tube([[-.56, 1.61, -.72], [0, 1.72, -.75], [.56, 1.61, -.72]], .055, '#b88c54', 'wood', 24, 9)
    for (let i = 0; i < 26; i++) {
      const x = -.49 + i / 25 * .98, z = -.4 + i / 25 * .8
      tube([[x, .67, -.43], [x, .63, 0], [x, .67, .43]], .009, '#cdb580', 'wood', 10, 4, 'woven-seat')
      tube([[-.52, .67, z], [0, .63, z], [.52, .67, z]], .009, '#b99860', 'wood', 10, 4, 'woven-seat')
      tube([[x, .72, -.42], [x, 1.12, -.58], [x, 1.62, -.72]], .01, '#c8ac75', 'wood', 12, 4, 'woven-back')
      const y = .75 + i / 25 * .86, bz = -.42 - (y - .72) * .34
      tube([[-.51, y, bz], [0, y, bz + .025], [.51, y, bz]], .009, '#b18c58', 'wood', 10, 4, 'woven-back')
    }
    branch([-.53, .35, .45], [.53, .35, .45], .028, '#946838', 'wood')
  } else if (id === 'campfire') {
    ellipsoid([.7, .055, .7], [0, .055, 0], '#423b34')
    for (let i = 0; i < 11; i++) { const a = i * Math.PI * 2 / 11; rock([Math.cos(a) * .83, .14, Math.sin(a) * .83], [.22, .16, .17], i % 2 ? '#969186' : '#b3a58d') }
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, p: Point = [Math.cos(a) * .5, .2, Math.sin(a) * .5], q: Point = [-Math.cos(a) * .35, .47, -Math.sin(a) * .35]
      branch(p, q, .12, i % 2 ? '#514034' : '#6c4a30')
      const axis = vector(q).sub(vector(p)).normalize(), rot = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), axis)
      const cap = new T.CylinderGeometry(.095, .095, .012, 16); cap.applyQuaternion(rot); add(cap, '#ba9163', p, [0, 0, 0], [1, 1, 1], 'wood', 'cut-log-end')
    }
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399, x = Math.cos(a) * .29, z = Math.sin(a) * .29, height = .52 + random() * .7
      patch(10, 10, (t, u) => { const angle = u * Math.PI * 2, r = Math.sin(Math.PI * t) * .15 * (1 - t * .6); return [x + Math.cos(angle) * r + Math.sin(t * 5 + i) * .06 * t, .34 + t * height, z + Math.sin(angle) * r] }, i % 2 ? '#f1a037' : '#e75b22', 'flame', 'sculpted-flame')
    }
    for (let i = 0; i < 12; i++) ellipsoid([.025, .018, .025], [(random() - .5) * .8, .2, (random() - .5) * .8], '#d87937', 'flame')
  } else if (id === 'trail-lamp' || id === 'red-lantern') {
    const red = id === 'red-lantern'
    add(new T.CylinderGeometry(.36, .43, .12, 24), '#8d8c7e', [0, .06, 0], [0, 0, 0], [1, 1, 1], 'stone')
    add(new T.LatheGeometry([[.23, 0], [.23, .1], [.13, .16], [.1, .4], [.075, 2.65]].map(p => new T.Vector2(...p as [number, number])), 24), red ? '#735236' : '#3c5553', [0, .12, 0], [0, 0, 0], [1, 1, 1], red ? 'wood' : 'metal')
    tube([[0, 2.72, 0], [.04, 2.9, 0], [.35, 2.94, 0], [.66, 2.88, 0], [.66, 2.73, 0]], .047, red ? '#76583c' : '#445b57', red ? 'wood' : 'metal', 26, 8, 'lamp-hook')
    torus(.07, .012, [.66, 2.68, 0], '#b49b61', 'metal', [0, 0, 0])
    const y = red ? 2.14 : 2.25
    if (red) {
      const profile: [number, number][] = [[.13, 0], [.32, .1], [.43, .28], [.46, .45], [.4, .63], [.28, .76], [.12, .81]]
      add(new T.LatheGeometry(profile.map(p => new T.Vector2(...p)), 40), '#b52d37', [.66, y - .4, 0], [0, 0, 0], [1, 1, 1], 'porcelain', 'red-lantern-body')
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8
        tube(profile.map(p => [.66 + Math.cos(a) * (p[0] + .005), y - .4 + p[1], Math.sin(a) * (p[0] + .005)] as Point), .008, '#cf8f59', 'metal', 16, 4, 'lantern-rib')
      }
      for (const h of [y - .41, y + .42]) add(new T.CylinderGeometry(.15, .15, .045, 24), '#c5a35b', [.66, h, 0], [0, 0, 0], [1, 1, 1], 'metal')
      for (let i = 0; i < 13; i++) tube([[.66 + Math.sin(i * 2.399) * .06, y - .44, Math.cos(i * 2.399) * .06], [.68 + Math.sin(i * 2.399) * .07, y - .84, Math.cos(i * 2.399) * .07]], .007, '#b62735', 'petal', 4, 4, 'tassel')
    } else {
      box([.38, .52, .34], [.66, y, 0], '#f3d591', 'glass')
      for (const x of [-.2, .2]) for (const z of [-.18, .18]) box([.028, .56, .028], [.66 + x, y, z], '#41544f', 'metal', [0, 0, 0], .008)
      for (const h of [y - .28, y + .28]) box([.48, .055, .43], [.66, h, 0], '#42544e', 'metal')
      add(new T.ConeGeometry(.37, .19, 4), '#465c53', [.66, y + .4, 0], [0, Math.PI / 4, 0], [1, 1, 1], 'metal')
      ellipsoid([.035, .1, .035], [.66, y - .04, 0], '#ffe1a2', 'flame')
    }
  } else if (id === 'farewell-pavilion') {
    box([4.45, .16, 2.4], [0, .08, 0], '#a6a38f', 'stone')
    box([3.9, .12, 2], [0, .22, 0], '#b7b39c', 'stone')
    for (let i = 0; i < 14; i++) box([.24, .045, 1.76], [-1.69 + i * .26, .3, 0], i % 2 ? '#a5825c' : '#b08e67')
    for (const x of [-1.7, 1.7]) for (const z of [-.77, .77]) {
      box([.24, .14, .24], [x, .38, z], '#8d8b79', 'stone')
      add(new T.CylinderGeometry(.068, .083, 2.12, 12), '#784d34', [x, 1.49, z])
      for (const side of [-1, 1]) tube([[x + side * .47, 2.53, z], [x + side * .16, 2.34, z], [x, 2.09, z]], .038, '#a47c4b')
    }
    for (const z of [-.77, .77]) box([3.75, .13, .12], [0, 2.56, z], '#946c43')
    for (const x of [-1.7, 1.7]) {
      box([.36, .08, 1.43], [x, .87, 0], '#a37b50')
      for (const z of [-.5, .5]) box([.07, .52, .07], [x, .59, z], '#835c3e')
      for (let i = 0; i < 7; i++) box([.045, .46, .04], [x, 1.17, -.62 + i * .21], '#a37b50')
      box([.07, .055, 1.45], [x, 1.43, 0], '#a37b50')
    }
    const roofY = (z: number) => 3.15 - Math.abs(z) * .52 + Math.pow(Math.abs(z) / 1.23, 6) * .16
    for (const side of [-1, 1]) for (let col = 0; col < 30; col++) for (let row = 0; row < 5; row++) {
      patch(2, 4, (t, u) => { const x = -2.22 + (col + u) * .148, z = side * (row + t) * .246; return [x, roofY(z) + Math.sin(u * Math.PI) * .03 + .012, z] }, col % 3 ? '#52675d' : '#647467', 'stone', 'individual-roof-tile')
    }
    tube([[-2.28, 3.25, 0], [-1.9, 3.19, 0], [0, 3.19, 0], [1.9, 3.19, 0], [2.28, 3.25, 0]], .065, '#788274', 'stone', 32, 8, 'roof-ridge')
    for (const z of [-1.23, 1.23]) tube([[-2.25, roofY(z), z], [0, roofY(z), z], [2.25, roofY(z), z]], .045, '#7b8070', 'stone', 16)
    for (const x of [-2.23, 2.23]) tube([[x, roofY(-1.23), -1.23], [x, roofY(-.6), -.6], [x, roofY(0), 0], [x, roofY(.6), .6], [x, roofY(1.23), 1.23]], .055, '#69746a', 'stone', 24)
  } else if (id === 'watcher-statue') {
    rock([0, .18, 0], [.77, .2, .62], '#9c9d90')
    box([.83, .12, .65], [0, .42, 0], '#b3b3a1', 'stone')
    const stone = '#c4c5b2'
    for (const x of [-.17, .17]) {
      ellipsoid([.12, .1, .25], [x, .56, -.08], stone)
      tube([[x, .6, 0], [x * 1.1, 1.05, .03], [x * .8, 1.52, .03]], .115, stone, 'stone', 18, 12)
      for (let i = 0; i < 4; i++) tube([[x + (i - 1.5) * .04, .7, -.09], [x + (i - 1.5) * .04, 1.06, -.08], [x + (i - 1.5) * .03, 1.46, -.06]], .009, '#b0b19f', 'stone', 14, 4, 'carved-trouser-fold')
    }
    add(new T.LatheGeometry([[.24, 0], [.27, .12], [.23, .35], [.32, .62], [.25, .71], [.12, .76]].map(p => new T.Vector2(...p as [number, number])), 32), stone, [0, 1.35, 0], [0, 0, 0], [1, 1, .66], 'stone', 'sculpted-coat')
    tube([[-.28, 2, .02], [-.37, 1.7, -.04], [-.3, 1.5, -.16]], .09, stone, 'stone', 20, 12)
    ellipsoid([.07, .1, .055], [-.3, 1.45, -.16], stone)
    for (let i = 0; i < 4; i++) tube([[-.34 + i * .023, 1.46, -.17], [-.34 + i * .023, 1.36, -.18]], .011, stone, 'stone', 5, 5, 'carved-finger')
    tube([[.28, 2, 0], [.49, 2.2, -.08], [.31, 2.49, -.22]], .085, stone, 'stone', 20, 12, 'raised-arm')
    ellipsoid([.12, .04, .07], [.22, 2.5, -.24], stone)
    for (let i = 0; i < 4; i++) tube([[.2, 2.5 - i * .016, -.23], [.1, 2.5 - i * .016, -.26], [.035, 2.49 - i * .016, -.24]], .013, stone, 'stone', 8, 6, 'carved-finger')
    ellipsoid([.11, .15, .11], [0, 2.13, 0], stone)
    ellipsoid([.18, .23, .17], [0, 2.37, -.025], stone)
    ellipsoid([.045, .06, .09], [0, 2.35, -.18], stone)
    for (const side of [-1, 1]) {
      ellipsoid([.035, .055, .035], [side * .171, 2.37, -.015], '#b4b7a3')
      tube([[side * .035, 2.42, -.18], [side * .08, 2.425, -.177], [side * .12, 2.41, -.15]], .012, '#a4aa96', 'stone', 10, 5, 'carved-brow')
      ellipsoid([.022, .008, .008], [side * .071, 2.395, -.178], '#8a9482')
      tube([[side * .025, 2.08, -.11], [side * .14, 2.01, -.19], [side * .19, 2.09, -.11]], .018, '#b3b7a2', 'stone', 10, 5, 'coat-collar')
    }
    tube([[-.053, 2.275, -.162], [0, 2.27, -.18], [.053, 2.275, -.162]], .007, '#929d89', 'stone', 10, 4, 'carved-mouth')
    ellipsoid([.183, .12, .17], [0, 2.51, .005], '#959c8a', 'stone')
    for (let i = 0; i < 8; i++) tube([[(i - 3.5) * .04, 2.54, -.12], [(i - 3.5) * .039, 2.61, -.01], [(i - 3.5) * .04, 2.55, .13]], .008, '#818d7b', 'stone', 12, 4, 'carved-hair')
    for (let i = 0; i < 9; i++) tube([[(i - 4) * .05, 1.45, -.16], [(i - 4) * .045, 1.78, -.18], [(i - 4) * .05, 1.97, -.13]], .009, '#b5b8a4', 'stone', 14, 4, 'carved-coat-fold')
  } else if (id === 'seashell') {
    rock([0, .12, 0], [.87, .13, .65], '#a3a293')
    const shellPoint = (t: number, u: number, offset = 0): Point => {
      const a = (u - .5) * Math.PI * .95, r = .18 + t * 1.25, rib = Math.sin(u * Math.PI * 36) * .035 * Math.sin(t * Math.PI / 2)
      return [Math.sin(a) * r, .2 + Math.cos(a) * r * .65 + Math.sin(t * Math.PI) * .18 + rib + offset, -.45 + Math.cos(a) * r * .5 - t * .2]
    }
    patch(18, 72, (t, u) => shellPoint(t, u), '#ead1ba', 'porcelain', 'scallop-outer')
    patch(18, 72, (t, u) => { const p = shellPoint(t, u, .035); return [p[0], p[1], p[2] - .035] }, '#f5e4d3', 'porcelain', 'pearl-inner')
    for (let i = 0; i <= 18; i++) tube(Array.from({ length: 13 }, (_, j) => shellPoint(j / 12, i / 18, .012)), .009, i % 2 ? '#d6a88c' : '#f5e2ca', 'porcelain', 16, 5, 'shell-rib')
    tube(Array.from({ length: 33 }, (_, j) => shellPoint(1, j / 32, .02)), .018, '#f3d5bd', 'porcelain', 36, 6, 'scalloped-rim')
    ellipsoid([.17, .12, .08], [0, .3, -.43], '#d1a989', 'porcelain')
  } else if (id === 'seagull') {
    rock([0, .28, 0], [.72, .3, .52], '#8b958f')
    rock([.23, .62, .1], [.39, .24, .33], '#a8ada2')
    for (const x of [-.1, .1]) { tube([[x, .77, 0], [x, 1, -.01], [x, 1.15, .02]], .018, '#c39045', 'metal', 10, 6); for (let i = 0; i < 3; i++) branch([x, .79, 0], [x + (i - 1) * .06, .78, -.17], .012, '#b98742', 'metal') }
    ellipsoid([.24, .28, .48], [0, 1.26, .04], '#edece0', 'porcelain', [-.12, 0, 0])
    ellipsoid([.17, .19, .19], [0, 1.57, -.31], '#f6f2e5', 'porcelain')
    for (const side of [-1, 1]) {
      ellipsoid([.06, .19, .34], [side * .21, 1.3, .17], '#9aaba9', 'metal', [-.2, side * -.2, 0])
      for (let f = 0; f < 6; f++) ellipsoid([.024, .065, .19], [side * (.2 + f * .005), 1.24 - f * .013, .27 + f * .024], f > 3 ? '#3e4947' : '#acb7af', 'porcelain', [-.2, side * .1, 0])
      ellipsoid([.013, .019, .022], [side * .145, 1.61, -.4], '#27362e', 'porcelain')
    }
    add(new T.ConeGeometry(.052, .26, 12), '#d8a14c', [0, 1.57, -.57], [-Math.PI / 2, 0, 0], [1, 1, .6], 'porcelain', 'gull-beak')
    ellipsoid([.16, .06, .27], [0, 1.23, .48], '#d6ddd2', 'porcelain', [.1, 0, 0])
  } else if (id === 'butterfly') {
    rock([0, .13, 0], [.52, .14, .4], '#969e88')
    tube([[0, .18, 0], [.15, .6, 0], [0, 1, .03]], .018, '#847957', 'metal', 24, 8, 'sculpture-stem')
    ellipsoid([.06, .24, .065], [0, 1.13, 0], '#5a5142', 'metal', [.1, 0, 0])
    for (const side of [-1, 1]) {
      for (let wing = 0; wing < 2; wing++) {
        const at: Point = [side * .045, wing === 0 ? 1.2 : 1.02, 0]
        const outline = (t: number, u: number): Point => { const a = u * Math.PI * 2, size = wing === 0 ? .62 : .43; return [at[0] + side * t * size * (1 + Math.cos(a)) * .65, at[1] + t * Math.sin(a) * size * .68 + Math.abs(t * Math.cos(a)) * .2, -.02 - t * .16 + (wing === 0 ? -.12 : .12)] }
        patch(8, 36, outline, wing === 0 ? '#d89c53' : '#679d9c', 'metal', 'butterfly-wing')
        for (let i = 0; i < 9; i++) { const u = i / 9; tube([at, outline(.5, u), outline(.95, u)], .009, '#6d6148', 'metal', 10, 4, 'wing-vein') }
        tube(Array.from({ length: 37 }, (_, j) => outline(1, j / 36)), .014, '#514d3f', 'metal', 40, 5, 'wing-edge')
      }
      tube([[side * .025, 1.35, -.02], [side * .1, 1.51, -.03], [side * .18, 1.53, -.03]], .008, '#5d533d', 'metal', 12, 5, 'antenna')
    }
  } else if (id === 'outdoor-piano') {
    box([2.3, .13, .87], [0, .1, .05], '#5f472f')
    box([2.25, 1.72, .42], [0, .97, .25], '#775239', 'wood', [0, 0, 0], .045)
    box([2.35, .09, .49], [0, 1.86, .25], '#493b2b')
    box([1.96, .65, .035], [0, 1.42, .017], '#926e48')
    box([1.95, .53, .035], [0, .49, .017], '#926e48')
    for (const x of [-1.06, 1.06]) {
      box([.16, .89, .72], [x, .66, -.04], '#61452f')
      box([.19, .1, .8], [x, 1.09, -.12], '#97734d')
      add(new T.LatheGeometry([[.08, 0], [.1, .06], [.06, .2], [.09, .3], [.06, .55]].map(p => new T.Vector2(...p as [number, number])), 16), '#725235', [x, .14, -.38])
      torus(.05, .015, [x, .1, -.38], '#b49a62', 'metal')
    }
    box([1.99, .09, .5], [0, .99, -.25], '#4e3b2c')
    for (let i = 0; i < 36; i++) {
      const x = -.94 + i * .0535
      box([.05, .035, .38], [x, 1.055, -.27], i % 3 ? '#eee8d3' : '#e0d9c4', 'porcelain', [0, 0, 0], .005)
      if ([0, 1, 3, 4, 5].includes(i % 7) && i < 35) box([.03, .045, .23], [x + .027, 1.091, -.185], '#2b332e', 'porcelain', [0, 0, 0], .004)
    }
    box([1.05, .035, .22], [0, 1.34, -.08], '#5b4430', 'wood', [-.25, 0, 0])
    for (let i = 0; i < 9; i++) box([.025, .15, .025], [-.44 + i * .11, 1.42, -.055], '#b49b64', 'metal')
    for (const x of [-.19, 0, .19]) {
      tube([[x, .22, .02], [x, .15, -.18], [x, .14, -.3]], .023, '#bb9b58', 'metal', 12, 7, 'piano-pedal')
      ellipsoid([.045, .017, .09], [x, .14, -.3], '#c4a769', 'metal')
    }
    for (let i = 0; i < 17; i++) tube([[-.95, .3 + i * .078, -.004], [0, .303 + i * .078, -.005], [.95, .3 + i * .078, -.004]], .0035, '#7e593b', 'wood', 6, 3, 'wood-grain')
    box([.95, .1, .42], [0, .65, -.99], '#6e4c33')
    box([.91, .055, .39], [0, .72, -.99], '#426358', 'wood')
    for (const x of [-.36, .36]) for (const z of [-1.1, -.87]) box([.055, .56, .055], [x, .32, z], '#765539')
  }

  for (const [surface, geometries] of batches) {
    const unindexed = mergeGeometries(geometries, false)!
    const merged = mergeVertices(unindexed, 1e-5)
    unindexed.dispose()
    geometries.forEach(geo => geo.dispose())
    const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: surface === 'metal' ? .32 : surface === 'porcelain' ? .26 : surface === 'leaf' ? .47 : .78, metalness: surface === 'metal' ? .65 : surface === 'porcelain' ? .12 : 0, side: ['leaf', 'petal', 'stone', 'porcelain', 'metal'].includes(surface) ? T.DoubleSide : T.FrontSide })
    if (surface === 'flame') { material.emissive.set('#e97823'); material.emissiveIntensity = .65 }
    if (surface === 'glass') { material.emissive.set('#edc581'); material.emissiveIntensity = .35; material.transparent = true; material.opacity = .62; material.depthWrite = false }
    const mesh = new T.Mesh(merged, material); mesh.name = `${id}-${surface}`; mesh.castShadow = !['glass', 'flame'].includes(surface); mesh.receiveShadow = true; group.add(mesh)
  }
  group.userData.model = id
  group.userData.parts = parts
  group.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(group), center = bounds.getCenter(new T.Vector3())
  // A flat contact plane and centered footprint make rotations stable in the placement editor.
  for (const mesh of group.children as T.Mesh[]) mesh.geometry.translate(-center.x, -bounds.min.y, -center.z)
  bounds.setFromObject(group)
  group.userData.radius = Math.hypot(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)))
  templates.set(id, group)
  return instance(group)
}
