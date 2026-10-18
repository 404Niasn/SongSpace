import * as T from 'three'
import { coloredGeometry, mergedMesh } from './scenery.ts'

function builder(name: string) {
  const group = new T.Group()
  group.name = name
  const parts: T.BufferGeometry[] = []
  const add = (
    geometry: T.BufferGeometry,
    color: string,
    x = 0,
    y = 0,
    z = 0,
    rotation = new T.Euler(),
  ) => {
    geometry.applyMatrix4(new T.Matrix4().makeRotationFromEuler(rotation))
    geometry.translate(x, y, z)
    geometry.deleteAttribute('uv')
    parts.push(coloredGeometry(geometry, color))
  }
  const box = (
    color: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    rotation?: T.Euler,
  ) => add(new T.BoxGeometry(w, h, d), color, x, y, z, rotation)
  const beam = (from: T.Vector3, to: T.Vector3, radius: number, color: string) => {
    const direction = to.clone().sub(from),
      center = to.clone().add(from).multiplyScalar(0.5)
    const geometry = new T.CylinderGeometry(radius, radius, direction.length(), 8)
    geometry.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()),
    )
    add(geometry, color, center.x, center.y, center.z)
  }
  return {
    group,
    add,
    box,
    beam,
    finish() {
      group.add(mergedMesh(parts))
      return group
    },
  }
}

export function forestLookout() {
  const b = builder('forest-lookout')
  for (const x of [-1.8, 1.8])
    for (const z of [-1.8, 1.8]) {
      b.beam(new T.Vector3(x * 1.3, 0, z * 1.3), new T.Vector3(x, 5.4, z), 0.14, '#7d6651')
      b.add(new T.CylinderGeometry(0.25, 0.35, 0.3, 8), '#a4aaa0', x * 1.3, 0.15, z * 1.3)
    }
  for (const z of [-1.8, 1.8])
    for (const side of [-1, 1])
      b.beam(new T.Vector3(-1.8 * side, 1, z), new T.Vector3(1.8 * side, 3.8, z), 0.09, '#a48a68')
  for (let i = 0; i < 12; i++)
    b.box(i % 2 ? '#b8a17d' : '#c5ad87', -2 + i * 0.36, 4, 0, 0.33, 0.15, 4.4)
  for (const side of [-1, 1]) {
    b.box('#9a7e5a', side * 2, 5, 0, 0.12, 0.12, 4.5)
    b.box('#9a7e5a', 0, 5, side * 2, 4.1, 0.12, 0.12)
    for (let i = 0; i < 6; i++) b.box('#ac9571', -1.8 + i * 0.72, 4.55, side * 2, 0.07, 1.1, 0.07)
    b.box('#536659', side * 1.3, 6.1, 0, 3, 0.18, 5.3, new T.Euler(0, 0, -side * 0.37))
  }
  for (let i = 0; i < 14; i++) b.box('#aa906a', 0, 0.15 + i * 0.28, 5.6 - i * 0.27, 1.2, 0.13, 0.33)
  for (const x of [-0.65, 0.65])
    b.beam(new T.Vector3(x, 1, 5.8), new T.Vector3(x, 4.8, 2.1), 0.06, '#7d6651')
  return b.finish()
}

export function lakesidePavilion() {
  const b = builder('lakeside-pavilion')
  b.box('#a4aba3', 0, 0.15, 0, 6.5, 0.3, 5.6)
  for (let i = 0; i < 14; i++)
    b.box(i % 2 ? '#ad8c6c' : '#c1a080', -2.7 + i * 0.42, 0.37, 0, 0.4, 0.12, 4.9)
  for (const x of [-2.35, 2.35])
    for (const z of [-1.9, 1.9]) {
      b.box('#856452', x, 2, z, 0.2, 3.5, 0.2)
      b.beam(new T.Vector3(x, 2.7, z), new T.Vector3(x * 0.55, 3.7, z), 0.07, '#b38d6f')
    }
  for (const side of [-1, 1]) {
    // Curved eaves lift at the ends; individual tile seams catch the light.
    for (let i = 0; i < 8; i++) {
      const x = side * (i + 0.5) * 0.42,
        y = 4.8 - i * 0.17 + Math.max(0, i - 5) * 0.12
      const angle = side * (i > 5 ? 0.06 : -0.4)
      b.box(i % 2 ? '#657577' : '#536669', x, y, 0, 0.46, 0.1, 6.3, new T.Euler(0, 0, angle))
      for (let j = 0; j < 17; j++)
        b.box('#7e8e8b', x, y + 0.07, -3 + j * 0.37, 0.46, 0.035, 0.025, new T.Euler(0, 0, angle))
    }
    b.box('#8d6d53', 0, 1.05, side * 1.4, 4.4, 0.18, 0.5)
    for (const x of [-1.6, 1.6]) b.box('#785d49', x, 0.72, side * 1.4, 0.13, 0.7, 0.35)
  }
  b.box('#83918b', 0, 4.9, 0, 0.18, 0.16, 6.5)
  return b.finish()
}

export function shoreShelter() {
  const b = builder('shore-shelter')
  for (let i = 0; i < 16; i++)
    b.box(i % 2 ? '#c7ab82' : '#d8bf97', -3 + i * 0.4, 0.22, 0, 0.37, 0.12, 5.4)
  for (const x of [-2.5, 2.5])
    for (const z of [-2, 2]) b.add(new T.CylinderGeometry(0.08, 0.1, 3, 8), '#d9d5bf', x, 1.6, z)
  for (let i = 0; i < 18; i++) {
    const x = -3.3 + i * 0.39
    b.box(i % 2 ? '#c5d6cd' : '#f0ece0', x, 3.3 + Math.cos(x / 3.5) * 0.35, 0, 0.37, 0.08, 5.5)
  }
  for (const x of [-1.5, 1.5]) {
    b.box('#af8970', x, 0.6, 0.5, 0.65, 0.12, 1.8)
    b.box('#e9dfc9', x, 0.85, 1.4, 0.65, 0.55, 0.1, new T.Euler(-0.25, 0, 0))
    for (const z of [-0.15, 1.15]) b.box('#a69073', x, 0.35, z, 0.5, 0.5, 0.1)
  }
  return b.finish()
}

export function observatory() {
  const b = builder('orbital-observatory')
  b.add(new T.CylinderGeometry(3.2, 3.6, 0.5, 32), '#4f607c', 0, 0.25)
  b.add(new T.CylinderGeometry(2.8, 3, 2.7, 32), '#a9b8c9', 0, 1.8)
  b.add(new T.SphereGeometry(2.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), '#d5dee2', 0, 3.2)
  const shutter = new T.CatmullRomCurve3(
    Array.from({ length: 17 }, (_, i) => {
      const a = (i / 16) * Math.PI
      return new T.Vector3(0, 3.2 + Math.sin(a) * 2.92, Math.cos(a) * 2.92)
    }),
  )
  b.add(new T.TubeGeometry(shutter, 24, 0.07, 6, false), '#8198af')
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    b.box(
      '#3e6e94',
      Math.sin(a) * 2.96,
      2.1,
      Math.cos(a) * 2.96,
      0.48,
      0.5,
      0.055,
      new T.Euler(0, a, 0),
    )
  }
  b.box('#405575', 0, 1.15, 3.02, 1, 1.65, 0.08)
  b.box('#829bb2', 0, 0.38, 3.5, 1.4, 0.18, 0.8)
  b.box('#8c9bac', 4.5, 1.2, 0, 0.14, 2.4, 0.14)
  const dish = new T.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.3)
  b.add(dish, '#c4d5dc', 4.5, 2.6, 0, new T.Euler(0.65, 0, 0))
  b.beam(new T.Vector3(4.5, 2.8, 0.55), new T.Vector3(4.5, 4, 0.7), 0.035, '#8b9fad')
  b.add(new T.SphereGeometry(0.1, 8, 6), '#7496af', 4.5, 4, 0.7)
  for (const side of [-1, 1]) {
    b.box('#7b91a8', side * 5, 1, -2.8, 0.12, 2, 0.12)
    b.box('#214c75', side * 5, 2, -2.8, 3.2, 0.12, 2, new T.Euler(0, 0, side * 0.18))
    const angle = side * 0.18
    for (let j = 0; j < 7; j++) {
      const dx = -1.4 + j * 0.45
      b.box(
        '#7eabc1',
        side * 5 + dx * Math.cos(angle),
        2.09 + dx * Math.sin(angle),
        -2.8,
        0.025,
        0.025,
        1.9,
        new T.Euler(0, 0, angle),
      )
    }
    for (let j = 0; j < 4; j++)
      b.box('#7eabc1', side * 5, 2.09, -3.55 + j * 0.5, 3.1, 0.025, 0.025, new T.Euler(0, 0, angle))
  }
  return b.finish()
}

export function stoneLantern() {
  const b = builder('stone-lantern')
  b.add(new T.CylinderGeometry(0.48, 0.62, 0.22, 8), '#a4aaa3', 0, 0.11)
  b.add(new T.CylinderGeometry(0.16, 0.22, 1, 8), '#b0b5aa', 0, 0.7)
  b.box('#c1c6b8', 0, 1.28, 0, 0.65, 0.16, 0.65)
  for (const x of [-0.23, 0.23])
    for (const z of [-0.23, 0.23]) b.box('#9fa898', x, 1.58, z, 0.09, 0.5, 0.09)
  b.add(new T.ConeGeometry(0.64, 0.4, 4), '#a7b1a2', 0, 1.97, 0, new T.Euler(0, Math.PI / 4, 0))
  const g = b.finish()
  const light = new T.Mesh(
    new T.SphereGeometry(0.16, 8, 6),
    new T.MeshStandardMaterial({ color: '#ffe8b1', emissive: '#e4b571', emissiveIntensity: 0.7 }),
  )
  light.position.y = 1.58
  g.add(light)
  return g
}
