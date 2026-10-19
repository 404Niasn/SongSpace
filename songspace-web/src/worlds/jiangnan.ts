import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { upgradeLandscape } from './landscapeAssets.ts'
import { weatheredSurface } from './surfaceDetail.ts'

// Shared street architecture, used in the riding scene and the miniature.
export function jiangnanHouse(seed = 0) {
  const g = new T.Group()
  const mats = new Map<string, T.MeshStandardMaterial>()
  function mesh(geo: T.BufferGeometry, color: string, x = 0, y = 0, z = 0) {
    if (!mats.has(color)) mats.set(color, weatheredSurface(color, color === '#57483d' || color === '#78654e' ? 'wood' : ['#e6dfcf', '#e8e4d9', '#d8d8cb'].includes(color) ? 'plaster' : 'stone'))
    const m = new T.Mesh(geo, mats.get(color))
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    g.add(m)
    return m
  }
  function box(c: string, x: number, y: number, z: number, w: number, h: number, d: number) {
    return mesh(new T.BoxGeometry(w, h, d), c, x, y, z)
  }
  const w = 5.4 + (seed % 3) * 0.7,
    h = 4.3 + (seed % 2) * 1.2,
    d = 5.5
  const plaster = ['#e6dfcf', '#e8e4d9', '#d8d8cb'][seed % 3]!,
    wood = '#57483d',
    stone = '#7d8982'
  box(stone, 0, 0.17, 0, w + 0.3, 0.34, d + 0.3)
  box(plaster, 0, h / 2 + 0.3, 0, w, h, d)
  box('#909990', 0, 0.62, d / 2 + 0.025, w, 0.7, 0.06)
  // A closed gable and individually curved eaves, rather than two roof slabs.
  const shape = new T.Shape()
  shape.moveTo(-w / 2, 0)
  shape.lineTo(0, 1.55)
  shape.lineTo(w / 2, 0)
  shape.closePath()
  const gable = mesh(
    new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }),
    plaster,
    0,
    h + 0.3,
    -d / 2,
  )
  void gable
  const roofStart = g.children.length
  for (const side of [-1, 1]) {
    const points: T.Vector3[] = []
    for (let j = 0; j <= 8; j++) {
      const t = j / 8
      points.push(
        new T.Vector3(side * t * (w / 2 + 0.5), h + 1.9 - t * 1.65 + Math.pow(t, 6) * 0.28, 0),
      )
    }
    const positions: number[] = [],
      indices: number[] = []
    for (const p of points) positions.push(p.x, p.y, -d / 2 - 0.55, p.x, p.y, d / 2 + 0.55)
    for (let j = 0; j < 8; j++) {
      const a = j * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    const roof = new T.BufferGeometry()
    roof.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    roof.setIndex(indices)
    roof.computeVertexNormals()
    const roofMat = new T.MeshStandardMaterial({
      color: '#374b4c',
      side: T.DoubleSide,
      roughness: 0.87,
    })
    const r = new T.Mesh(roof, roofMat)
    r.castShadow = true
    r.receiveShadow = true
    g.add(r)
    // Tiles follow the roof's curve; merged into one mesh to keep draw calls low.
    const tilePositions: number[] = []
    for (let z = -d / 2 - 0.55; z <= d / 2 + 0.55; z += 0.32)
      for (let j = 0; j < 8; j++) {
        const p = points[j]!,
          q = points[j + 1]!
        tilePositions.push(p.x, p.y + 0.025, z, q.x, q.y + 0.025, z)
      }
    const tileGeo = new T.BufferGeometry()
    tileGeo.setAttribute('position', new T.Float32BufferAttribute(tilePositions, 3))
    g.add(new T.LineSegments(tileGeo, new T.LineBasicMaterial({ color: '#6d7c77' })))
    box('#566762', side * (w / 2 + 0.46), h + 0.53, 0, 0.12, 0.18, d + 1.1)
  }
  box('#626f67', 0, h + 1.88, 0, 0.18, 0.19, d + 1.2)
  const roofRoot = new T.Group()
  roofRoot.name = 'curved-tiled-roof'
  for (const child of g.children.slice(roofStart)) roofRoot.add(child)
  g.add(roofRoot)
  upgradeLandscape(roofRoot, 'jiangnan-roof', { scaleX: (w + 1) / 6.4, y: h + .3 })
  function window(x: number, y: number) {
    box(wood, x, y, d / 2 + 0.065, 1.35, 1.55, 0.12)
    box(seed % 2 ? '#d1bb81' : '#91aaa2', x, y, d / 2 + 0.14, 1.17, 1.36, 0.035)
    for (let i = -2; i <= 2; i++) box(wood, x + i * 0.23, y, d / 2 + 0.18, 0.045, 1.4, 0.04)
    for (let i = -1; i <= 1; i++) box(wood, x, y + i * 0.42, d / 2 + 0.18, 1.22, 0.045, 0.04)
    box(wood, x, y - 0.8, d / 2 + 0.23, 1.55, 0.13, 0.26)
  }
  window(-w * 0.29, 2.3)
  window(w * 0.29, 2.3)
  if (h > 5) {
    window(-w * 0.29, 4.2)
    window(w * 0.29, 4.2)
    box(wood, 0, 3.3, d / 2 + 0.11, w, 0.16, 0.12)
  }
  box(wood, 0, 1.45, d / 2 + 0.08, 1.15, 2.3, 0.14)
  for (let j = -2; j <= 2; j++) box('#78654e', j * 0.2, 1.45, d / 2 + 0.17, 0.045, 2.1, 0.035)
  box(stone, 0, 0.25, d / 2 + 0.6, 1.55, 0.3, 0.85)
  // Street-side awning, shop plaque, and ribbed hanging lantern.
  if (seed % 2 === 0) {
    const awning = box('#6e847b', -w * 0.29, 3.3, d / 2 + 0.48, 2.1, 0.12, 1)
    awning.rotation.x = 0.15
  }
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = wood
  ctx.fillRect(0, 0, 256, 96)
  ctx.strokeStyle = '#b99a68'
  ctx.lineWidth = 5
  ctx.strokeRect(6, 6, 244, 84)
  ctx.font = '42px serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#e4d4ad'
  ctx.fillText(['听雨茶舍', '临水书屋', '青石巷', '渡口客栈'][seed % 4]!, 128, 64)
  const tex = new T.CanvasTexture(canvas)
  tex.colorSpace = T.SRGBColorSpace
  const sign = new T.Mesh(
    new T.PlaneGeometry(1.7, 0.64),
    new T.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  )
  sign.position.set(0, 3.04, d / 2 + 0.19)
  g.add(sign)
  const lx = w / 2 - 0.35,
    lz = d / 2 + 0.48
  box(wood, lx, 3.75, lz, 0.08, 0.8, 0.08)
  const lantern = mesh(new T.SphereGeometry(0.3, 16, 12), '#bd6548', lx, 3.25, lz)
  lantern.scale.set(1, 1.25, 1)
  for (const y of [2.88, 3.62])
    mesh(new T.CylinderGeometry(0.17, 0.17, 0.08, 12), '#b89a59', lx, y, lz)
  mesh(new T.CylinderGeometry(0.015, 0.015, 0.35, 6), '#c7a16a', lx, 2.66, lz)
  for (let j = 0; j < 3; j++) {
    const pot = mesh(
      new T.CylinderGeometry(0.23, 0.17, 0.4, 10),
      '#9b7a62',
      -w / 2 + j * 0.55,
      0.35,
      d / 2 + 0.45,
    )
    void pot
    mesh(new T.SphereGeometry(0.29, 10, 8), '#76886b', -w / 2 + j * 0.55, 0.66, d / 2 + 0.45)
  }
  const batches = new Map<T.Material, T.Mesh[]>()
  for (const child of [...g.children])
    if (child instanceof T.Mesh && !Array.isArray(child.material)) {
      const list = batches.get(child.material) || []
      list.push(child)
      batches.set(child.material, list)
    }
  for (const [material, meshes] of batches)
    if (meshes.length > 1) {
      const geometries = meshes.map((m) => {
        m.updateMatrix()
        return (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(
          m.matrix,
        )
      })
      const geometry = mergeGeometries(geometries)
      if (geometry) {
        const batch = new T.Mesh(geometry, material)
        batch.castShadow = true
        batch.receiveShadow = true
        g.add(batch)
        meshes.forEach((m) => {
          g.remove(m)
          m.geometry.dispose()
        })
      }
      geometries.forEach((geo) => geo.dispose())
    }
  return g
}

export function canalBoat() {
  const g = new T.Group()
  const shape = new T.Shape()
  shape.moveTo(0, -2.4)
  shape.quadraticCurveTo(-0.85, -1.7, -0.8, 0)
  shape.quadraticCurveTo(-0.75, 1.7, 0, 2.2)
  shape.quadraticCurveTo(0.75, 1.7, 0.8, 0)
  shape.quadraticCurveTo(0.85, -1.7, 0, -2.4)
  const hull = new T.Mesh(
    new T.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.09,
      bevelThickness: 0.08,
    }),
    new T.MeshStandardMaterial({ color: '#665342', roughness: 0.9 }),
  )
  hull.rotation.x = -Math.PI / 2
  hull.position.y = 0.12
  hull.castShadow = true
  g.add(hull)
  const canopy = new T.Mesh(
    new T.CylinderGeometry(0.68, 0.68, 2.2, 24, 1, true, 0, Math.PI),
    new T.MeshStandardMaterial({ color: '#8b8169', side: T.DoubleSide, roughness: 0.92 }),
  )
  canopy.rotation.x = Math.PI / 2
  canopy.rotation.z = Math.PI / 2
  canopy.position.y = 0.55
  g.add(canopy)
  for (let j = -4; j <= 4; j++) {
    const rib = new T.Mesh(
      new T.TorusGeometry(0.69, 0.018, 6, 20, Math.PI),
      new T.MeshStandardMaterial({ color: '#504f42' }),
    )
    rib.position.set(0, 0.55, j * 0.26)
    g.add(rib)
  }
  return g
}
