import * as T from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface RiderLeg {
  thigh: T.Bone
  shin: T.Bone
  foot: T.Bone
  rest: ReturnType<typeof riderJoints>
  pedal: T.Mesh
  crank: T.Mesh
  side: number
}

const up = new T.Vector3(0, 1, 0)
function connect(mesh: T.Mesh, from: T.Vector3, to: T.Vector3) {
  const direction = to.clone().sub(from)
  mesh.position.copy(from).add(to).multiplyScalar(.5)
  mesh.scale.y = direction.length()
  mesh.quaternion.setFromUnitVectors(up, direction.normalize())
}

type Segment = { a: T.Vector3; direction: T.Vector3; lengthSq: number; start: number; end: number }
type Shape = { a: T.Vector3; b: T.Vector3; radius: number; end: number; scale?: T.Vector3; inverseRotation?: T.Quaternion; segments?: Segment[]; bounds?: T.Box3 }
function surface(shapes: Shape[], material: T.Material) {
  // Build the soft union once. Animation uses the GPU skeleton, never remeshes per frame.
  const resolution = 80, extent = 1.6, center = new T.Vector3(0, 1.4, 0)
  const iso = new MarchingCubes(resolution, material, false, false, 30000)
  iso.isolation = 0
  const p = new T.Vector3(), delta = new T.Vector3(), offset = new T.Vector3()
  function signedDistance(point: T.Vector3) {
    let distance = 100
    for (const shape of shapes) {
      if (shape.bounds && shape.bounds.distanceToPoint(point) > Math.max(distance, .045)) continue
      let d: number
      if (shape.segments) {
        d = Infinity
        for (const segment of shape.segments) {
          offset.subVectors(point, segment.a)
          const t = T.MathUtils.clamp(offset.dot(segment.direction) / segment.lengthSq, 0, 1)
          offset.addScaledVector(segment.direction, -t)
          d = Math.min(d, offset.length() - T.MathUtils.lerp(segment.start, segment.end, t))
        }
      } else {
        delta.subVectors(shape.b, shape.a)
        offset.subVectors(point, shape.a)
        const t = delta.lengthSq() ? T.MathUtils.clamp(offset.dot(delta) / delta.lengthSq(), 0, 1) : 0
        offset.addScaledVector(delta, -t)
        if (shape.inverseRotation) offset.applyQuaternion(shape.inverseRotation)
        if (shape.scale) offset.divide(shape.scale)
        const scale = shape.scale ? Math.min(shape.scale.x, shape.scale.y, shape.scale.z) : 1
        d = (offset.length() - T.MathUtils.lerp(shape.radius, shape.end, t)) * scale
      }
      const blend = Math.max(.045 - Math.abs(distance - d), 0) / .045
      distance = Math.min(distance, d) - blend * blend * .045 * .25
    }
    return distance
  }
  for (let z = 0; z < resolution; z++) for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    p.set((x / resolution * 2 - 1) * extent, (y / resolution * 2 - 1) * extent + center.y, (z / resolution * 2 - 1) * extent)
    iso.field[z * resolution * resolution + y * resolution + x] = -signedDistance(p)
  }
  iso.update()
  const geometry = new T.BufferGeometry(), count = iso.geometry.drawRange.count
  for (const name of ['position', 'normal']) {
    const attribute = iso.geometry.getAttribute(name)
    geometry.setAttribute(name, new T.Float32BufferAttribute(attribute.array.slice(0, count * 3), 3))
  }
  geometry.scale(extent, extent, extent)
  geometry.translate(...center.toArray())
  iso.geometry.dispose()
  // Weld the surface and smooth its shape without progressively shrinking the character.
  geometry.deleteAttribute('normal')
  const smooth = mergeVertices(geometry, 1e-5)
  geometry.dispose()
  const positions = smooth.getAttribute('position') as T.BufferAttribute
  const neighbors = Array.from({ length: positions.count }, () => new Set<number>())
  const triangles = smooth.getIndex()!
  for (let i = 0; i < triangles.count; i += 3) {
    const a = triangles.getX(i), b = triangles.getX(i + 1), c = triangles.getX(i + 2)
    neighbors[a]!.add(b).add(c); neighbors[b]!.add(a).add(c); neighbors[c]!.add(a).add(b)
  }
  const next = new Float32Array(positions.array.length)
  for (let pass = 0; pass < 8; pass++) {
    const factor = pass % 2 === 0 ? .5 : -.53
    for (let i = 0; i < positions.count; i++) {
      const adjacent = neighbors[i]!
      for (let axis = 0; axis < 3; axis++) {
        let average = 0
        for (const j of adjacent) average += positions.array[j * 3 + axis]!
        const value = positions.array[i * 3 + axis]!
        next[i * 3 + axis] = value + factor * (average / adjacent.size - value)
      }
    }
    positions.array.set(next)
  }
  // Use the smooth shape field for lighting, rather than irregular voxel triangle normals.
  const normals = new Float32Array(positions.count * 3), sample = new T.Vector3(), normal = new T.Vector3(), epsilon = .003
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i)
    for (let axis = 0; axis < 3; axis++) {
      sample.copy(p).setComponent(axis, p.getComponent(axis) + epsilon)
      const positive = signedDistance(sample)
      sample.copy(p).setComponent(axis, p.getComponent(axis) - epsilon)
      normal.setComponent(axis, positive - signedDistance(sample))
    }
    normal.normalize().toArray(normals, i * 3)
  }
  smooth.setAttribute('normal', new T.BufferAttribute(normals, 3))
  return smooth
}

export type CharacterPose = 'riding' | 'standing' | 'driving'
export function buildRider(pose: CharacterPose = 'riding') {
  const standing = pose === 'standing'
  const group = new T.Group()
  group.name = 'rider'
  const white = new T.MeshPhysicalMaterial({ color: '#fafafa', roughness: .5, metalness: 0, ior: 1.43, specularIntensity: .4, clearcoat: .08, clearcoatRoughness: .55 })
  const metal = new T.MeshStandardMaterial({ color: '#a3aa9e', roughness: .65 })
  const root = new T.Bone(), bones = [root], shapes: Shape[] = [], legs: RiderLeg[] = []
  function capsule(a: T.Vector3, b: T.Vector3, radius: number, end = radius) { shapes.push({ a, b, radius, end }) }
  function tube(points: T.Vector3[], start: number, end: number) {
    // One continuously tapering curved limb, with no separate elbow or knee volumes.
    const path = new T.CatmullRomCurve3(points, false, 'centripetal').getPoints(16)
    const segments = path.slice(0, -1).map((a, i) => {
      const direction = path[i + 1]!.clone().sub(a)
      return { a, direction, lengthSq: direction.lengthSq(), start: T.MathUtils.lerp(start, end, i / 16), end: T.MathUtils.lerp(start, end, (i + 1) / 16) }
    })
    const bounds = new T.Box3().setFromPoints(path).expandByScalar(Math.max(start, end))
    shapes.push({ a: points[0]!, b: points[points.length - 1]!, radius: start, end, segments, bounds })
  }
  function oval(center: T.Vector3, radius: number, scale: T.Vector3, tilt = 0) {
    const inverseRotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -tilt)
    shapes.push({ a: center, b: center, radius, end: radius, scale, inverseRotation })
  }
  if (standing) {
    capsule(new T.Vector3(0, .88, 0), new T.Vector3(0, 1.20, 0), .27)
    capsule(new T.Vector3(0, 1.36, 0), new T.Vector3(0, 1.51, 0), .12)
    oval(new T.Vector3(0, 1.70, 0), .32, new T.Vector3(1, 1, 1))
  } else {
    capsule(new T.Vector3(0, 1.58, .33), new T.Vector3(0, 1.96, -.10), .27)
    capsule(new T.Vector3(0, 2.06, -.12), new T.Vector3(0, 2.20, -.20), .105)
    oval(new T.Vector3(0, pose === 'driving' ? 2.28 : 2.32, -.225), .32, new T.Vector3(1, 1, 1))
  }
  for (const side of [-1, 1]) {
    const shoulder = standing ? new T.Vector3(side * .235, 1.24, 0) : new T.Vector3(side * .235, 1.98, -.11)
    const elbow = standing ? new T.Vector3(side * .40, 1.10, 0) : pose === 'driving' ? new T.Vector3(side * .26, 1.88, -.5) : new T.Vector3(side * .31, 1.77, -.40)
    const wrist = standing ? new T.Vector3(side * .47, .87, -.015) : pose === 'driving' ? new T.Vector3(side * .25, 2.06, -1.09) : new T.Vector3(side * .385, 1.475, -.715)
    tube([shoulder, elbow, wrist], .105, .09)
    const rest = standing ? { hip: new T.Vector3(side * .17, .77, 0), knee: new T.Vector3(side * .17, .445, 0), ankle: new T.Vector3(side * .17, .12, 0), pedal: new T.Vector3() } : riderJoints(side, side < 0 ? Math.PI : 0)
    if (standing) capsule(rest.hip, rest.ankle, .115, .10)
    else tube([rest.hip, rest.knee, rest.ankle], .13, .10)
    oval(rest.ankle.clone().add(new T.Vector3(0, -.01, -.025)), 1, new T.Vector3(.125, .10, .14))
    const thigh = new T.Bone(), shin = new T.Bone(), foot = new T.Bone()
    thigh.position.copy(rest.hip); shin.position.subVectors(rest.knee, rest.hip); foot.position.subVectors(rest.ankle, rest.knee)
    root.add(thigh); thigh.add(shin); shin.add(foot); bones.push(thigh, shin, foot)
    const pedal = new T.Mesh(new T.BoxGeometry(.18, .04, .13), metal), crank = new T.Mesh(new T.CylinderGeometry(.018, .018, 1, 8), metal)
    if (!standing) group.add(pedal, crank)
    else { pedal.geometry.dispose(); crank.geometry.dispose() }
    legs.push({ thigh, shin, foot, rest, pedal, crank, side })
  }
  const geometry = surface(shapes, white), positions = geometry.getAttribute('position'), indices: number[] = [], weights: number[] = []
  const p = new T.Vector3(), direction = new T.Vector3(), offset = new T.Vector3()
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i)
    const li = p.x < 0 ? 0 : 1, leg = legs[li]!, j = leg.rest, base = 1 + li * 3
    direction.subVectors(j.knee, j.hip); offset.subVectors(p, j.hip)
    const upper = offset.dot(direction) / direction.lengthSq()
    direction.subVectors(j.ankle, j.knee); offset.subVectors(p, j.knee)
    const lower = offset.dot(direction) / direction.lengthSq()
    const thighDistance = p.distanceTo(j.hip.clone().lerp(j.knee, T.MathUtils.clamp(upper, 0, 1)))
    const shinDistance = p.distanceTo(j.knee.clone().lerp(j.ankle, T.MathUtils.clamp(lower, 0, 1)))
    const proximity = 1 - T.MathUtils.smoothstep(Math.min(thighDistance, shinDistance), .18, .26)
    const footRegion = T.MathUtils.smoothstep(lower, .45, .65) * (1 - T.MathUtils.smoothstep(p.distanceTo(j.ankle), .30, .38))
    const pelvisBlend = (1 - T.MathUtils.smoothstep(p.y, j.hip.y + .07, j.hip.y + .20)) * proximity * T.MathUtils.smoothstep(upper, -.05, .32)
    const legWeight = T.MathUtils.lerp(pelvisBlend, 1, footRegion)
    const shinWeight = T.MathUtils.smoothstep(lower, -.24, .24)
    const footWeight = footRegion * (1 - T.MathUtils.smoothstep(p.y, j.ankle.y + .025, j.ankle.y + .14))
    indices.push(0, base, base + 1, base + 2)
    weights.push(1 - legWeight, legWeight * (1 - shinWeight), legWeight * shinWeight * (1 - footWeight), legWeight * shinWeight * footWeight)
  }
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(indices, 4))
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4))
  const skin = new T.SkinnedMesh(geometry, white)
  skin.name = 'rider-skin'; skin.castShadow = true; skin.frustumCulled = false
  skin.add(root); group.add(skin); group.updateMatrixWorld(true)
  const skeleton = new T.Skeleton(bones)
  skin.bind(skeleton)
  geometry.addEventListener('dispose', () => skeleton.dispose())
  if (!standing) poseRider(legs, 0)
  else metal.dispose()
  return { group, legs, skin }
}

export function riderJoints(side: number, phase: number) {
  // Bury the thigh roots inside the rounded pelvis so pedalling never exposes a gap.
  const hip = new T.Vector3(side * .15, 1.55, .33)
  const pedal = new T.Vector3(side * .23, .70 + Math.sin(phase) * .17, .05 + Math.cos(phase) * .17)
  const ankle = pedal.clone().add(new T.Vector3(0, .13, .06))
  const direction = ankle.clone().sub(hip)
  // Equal fixed-length limbs form a triangle; the knee bends towards the handlebars.
  const knee = hip.clone().add(ankle).multiplyScalar(.5)
    .add(new T.Vector3(0, -direction.z, direction.y).normalize()
      .multiplyScalar(Math.sqrt(.49 ** 2 - direction.lengthSq() / 4)))
  return { hip, knee, ankle, pedal }
}

export function poseRider(legs: RiderLeg[], phase: number, seated = false) {
  for (const leg of legs) {
    const joints = riderJoints(leg.side, seated ? 0 : phase + (leg.side < 0 ? Math.PI : 0)), rest = leg.rest
    const thighRotation = new T.Quaternion().setFromUnitVectors(rest.knee.clone().sub(rest.hip).normalize(), joints.knee.clone().sub(joints.hip).normalize())
    const shinRotation = new T.Quaternion().setFromUnitVectors(rest.ankle.clone().sub(rest.knee).normalize(), joints.ankle.clone().sub(joints.knee).normalize())
    leg.thigh.quaternion.copy(thighRotation)
    leg.shin.quaternion.copy(thighRotation).invert().multiply(shinRotation)
    leg.foot.quaternion.copy(shinRotation).invert()
    leg.pedal.position.copy(joints.pedal)
    connect(leg.crank, new T.Vector3(leg.side * .23, .70, .05), joints.pedal)
  }
}
