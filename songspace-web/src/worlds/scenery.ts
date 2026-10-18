import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Local merged geometry keeps detailed silhouettes inexpensive and world disposal simple.
export function coloredGeometry(geometry: T.BufferGeometry, color: string) {
  const c = new T.Color(color),
    colors = []
  for (let i = 0; i < geometry.getAttribute('position').count; i++) colors.push(c.r, c.g, c.b)
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  return geometry
}
export function mergedMesh(parts: T.BufferGeometry[], roughness = 0.9) {
  const geometry = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness }))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
export function terrainMaterial(color: string, lunar = false) {
  const material = new T.MeshStandardMaterial({ color, roughness: 0.94 })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec2 vTerrain;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n vTerrain=position.xz;',
    )
    shader.fragmentShader = 'varying vec2 vTerrain;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float grain=fract(sin(dot(floor(vTerrain*75.),vec2(127.1,311.7)))*43758.5453);
      float mottling=sin(vTerrain.x*.7+sin(vTerrain.y*.31))*sin(vTerrain.y*.53);
      diffuseColor.rgb *= ${lunar ? '.91+mottling*.1+grain*.13' : '.95+mottling*.035+grain*.07'};`,
    )
  }
  material.customProgramCacheKey = () => (lunar ? 'lunar-terrain' : 'natural-terrain')
  return material
}
export function pineTree(seed = 0) {
  const g = new T.Group()
  g.name = 'layered-pine'
  const trunk = new T.Mesh(
    new T.CylinderGeometry(0.13, 0.32, 4.5, 9),
    new T.MeshStandardMaterial({ color: '#675b46', roughness: 1 }),
  )
  trunk.position.y = 2.25
  trunk.castShadow = true
  g.add(trunk)
  const layers: T.BufferGeometry[] = []
  for (let i = 0; i < 6; i++) {
    const geometry = new T.ConeGeometry(2.05 - i * 0.27, 2.4 - i * 0.12, 12, 2)
    const p = geometry.getAttribute('position')
    for (let j = 0; j < p.count; j++) {
      const angle = Math.atan2(p.getZ(j), p.getX(j))
      const wobble = 1 + 0.14 * Math.sin(angle * 5 + seed + i)
      p.setXYZ(
        j,
        p.getX(j) * wobble,
        p.getY(j) + 0.1 * Math.sin(angle * 3 + seed),
        p.getZ(j) * wobble,
      )
    }
    geometry.computeVertexNormals()
    geometry.rotateY(seed + i * 0.42)
    geometry.translate(Math.sin(seed + i) * 0.1, 2.1 + i * 0.75, 0)
    layers.push(
      coloredGeometry(
        geometry,
        ['#315b49', '#3b6c50', '#47765a', '#538667', '#638f6c', '#79a07b'][i]!,
      ),
    )
  }
  g.add(mergedMesh(layers))
  return g
}
export function palmTree(seed = 0) {
  const g = new T.Group()
  g.name = 'feather-palm'
  const curve = new T.QuadraticBezierCurve3(
    new T.Vector3(),
    new T.Vector3(0.1, 3, 0),
    new T.Vector3(0.65, 5.5, 0.1),
  )
  const trunk = new T.Mesh(
    new T.TubeGeometry(curve, 12, 0.18, 8, false),
    new T.MeshStandardMaterial({ color: '#998169', roughness: 1 }),
  )
  trunk.castShadow = true
  g.add(trunk)
  const parts: T.BufferGeometry[] = []
  for (let i = 0; i < 9; i++) {
    const angle = (i * Math.PI * 2) / 9 + seed
    const positions: number[] = [],
      indices: number[] = []
    for (let j = 0; j <= 16; j++) {
      const t = j / 16,
        r = 0.1 + t * 3.2
      const width = Math.sin(t * Math.PI) * 0.48 * (j % 2 ? 0.62 : 1)
      const y = 5.5 + Math.sin(t * Math.PI) * 0.65 - t * t * 1.5
      for (const s of [-1, 1])
        positions.push(
          0.65 + Math.cos(angle) * r - Math.sin(angle) * width * s,
          y,
          0.1 + Math.sin(angle) * r + Math.cos(angle) * width * s,
        )
      if (j < 16) {
        const k = j * 2
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
      }
    }
    const geo = new T.BufferGeometry()
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    parts.push(coloredGeometry(geo, ['#527d58', '#719261', '#8aa570'][i % 3]!))
  }
  const fronds = mergedMesh(parts)
  fronds.material.side = T.DoubleSide
  g.add(fronds)
  return g
}

export function landform(seed = 0) {
  const geometry = new T.PlaneGeometry(13, 11, 20, 18)
  geometry.rotateX(-Math.PI / 2)
  const p = geometry.getAttribute('position'),
    colors: number[] = [],
    color = new T.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      radius = Math.hypot(x / 6.5, z / 5.5)
    const height =
      Math.pow(Math.max(0, 1 - radius * radius), 1.4) *
      (4.5 + Math.sin(seed) * 1.4) *
      (1 + Math.sin(x * 0.7 + seed) * Math.cos(z * 0.4) * 0.12)
    p.setY(i, 0.05 + height)
    color.set('#829b71').lerp(new T.Color('#b0b98a'), Math.min(1, height / 6))
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const hill = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  )
  hill.receiveShadow = true
  hill.castShadow = true
  hill.name = 'rolling-hill'
  return hill
}

export function rockFormation(seed = 0, lunar = false) {
  const geometry = new T.IcosahedronGeometry(1, 2),
    p = geometry.getAttribute('position'),
    colors: number[] = [],
    color = new T.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i)
    const erosion = 1 + Math.sin(x * 9 + seed) * Math.sin(z * 7 + y * 4) * 0.09
    p.setXYZ(i, x * erosion * 1.25, y * erosion * 0.8, z * erosion)
    color
      .set(lunar ? '#7b89a3' : '#a6afa6')
      .multiplyScalar(0.95 + Math.sin(y * 14 + seed) * 0.08 + y * 0.1)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const rock = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
  )
  rock.castShadow = true
  rock.receiveShadow = true
  rock.name = 'eroded-rock'
  return rock
}

export function birchTree(seed = 0) {
  const group = new T.Group()
  group.name = 'silver-birch'
  const wood: T.BufferGeometry[] = [],
    leaves: T.BufferGeometry[] = []
  const add = (parts: T.BufferGeometry[], geo: T.BufferGeometry, color: string) => {
    geo.deleteAttribute('uv')
    parts.push(coloredGeometry(geo, color))
  }
  add(wood, new T.CylinderGeometry(0.1, 0.26, 5.6, 10).translate(0, 2.8, 0), '#d8d7c5')
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4 + seed
    const mark = new T.BoxGeometry(0.11 + (i % 3) * 0.04, 0.035, 0.01)
    mark.rotateY(a)
    mark.translate(
      Math.sin(a) * (0.24 - i * 0.006),
      0.3 + i * 0.27,
      Math.cos(a) * (0.24 - i * 0.006),
    )
    add(wood, mark, '#657466')
  }
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4 + seed,
      end = new T.Vector3(Math.sin(a) * 1.5, 3.5 + (i % 4) * 0.55, Math.cos(a) * 1.4)
    const curve = new T.QuadraticBezierCurve3(
      new T.Vector3(0, 2.5, 0),
      new T.Vector3(end.x * 0.5, end.y, end.z * 0.5),
      end,
    )
    add(wood, new T.TubeGeometry(curve, 4, 0.045, 5, false), '#b5bda7')
    for (let j = 0; j < 10; j++) {
      const theta = j * 2.4,
        y = 1 - j / 5,
        radius = Math.sqrt(Math.max(0, 1 - y * y))
      const leaf = new T.IcosahedronGeometry(0.5 + (j % 3) * 0.12, 1)
      leaf.scale(1, 0.62, 0.85)
      leaf.translate(
        end.x + Math.cos(theta) * radius * 0.9,
        end.y + y * 0.65,
        end.z + Math.sin(theta) * radius * 0.85,
      )
      add(leaves, leaf, ['#75945b', '#9eaf71', '#b4bd83', '#87a264'][(i + j) % 4]!)
    }
  }
  group.add(mergedMesh(wood), mergedMesh(leaves))
  return group
}

export function groundPlants(
  count: number,
  width: number,
  depth: number,
  accept: (x: number, z: number) => boolean,
  seed = 0,
  coastal = false,
) {
  const blades: T.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const shape = new T.Shape()
    shape.moveTo(-0.06, 0)
    shape.quadraticCurveTo(-0.08, 0.3, 0.18, 0.65)
    shape.quadraticCurveTo(0.06, 0.2, 0.06, 0)
    const geo = new T.ShapeGeometry(shape, 3)
    geo.rotateY(i * 2.4)
    blades.push(geo)
  }
  const geometry = mergeGeometries(blades)!
  blades.forEach((b) => b.dispose())
  const plants = new T.InstancedMesh(
    geometry,
    new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: T.DoubleSide }),
    count,
  )
  plants.name = 'ground-plants'
  plants.receiveShadow = true
  const dummy = new T.Object3D(),
    color = new T.Color()
  let used = 0
  for (let i = 0; i < count * 4 && used < count; i++) {
    const x = (Math.sin(i * 127.1 + seed) * width) / 2,
      z = (Math.sin(i * 311.7 + seed) * depth) / 2
    if (!accept(x, z)) continue
    dummy.position.set(x, 0.09, z)
    dummy.rotation.y = i * 2.4
    dummy.scale.setScalar(0.35 + (Math.sin(i * 6.7) + 1) * 0.25)
    dummy.updateMatrix()
    plants.setMatrixAt(used, dummy.matrix)
    color.set(coastal ? '#9ba47b' : '#78996b').multiplyScalar(0.8 + (Math.sin(i) + 1) * 0.15)
    plants.setColorAt(used++, color)
  }
  plants.count = used
  plants.computeBoundingSphere()
  return plants
}

export function coastalLighthouse() {
  const g = new T.Group()
  g.name = 'coastal-lighthouse'
  const parts: T.BufferGeometry[] = []
  const cylinder = (r1: number, r2: number, height: number, y: number, color: string) =>
    parts.push(
      coloredGeometry(new T.CylinderGeometry(r1, r2, height, 24).translate(0, y, 0), color),
    )
  cylinder(1, 1.45, 8, 4, '#f2e6d1')
  cylinder(1.18, 1.22, 0.65, 5.7, '#c57568')
  cylinder(1.65, 1.65, 0.18, 8.05, '#9da7a1')
  cylinder(0.85, 0.85, 1.2, 8.8, '#8bb6c0')
  cylinder(0, 1.45, 1.3, 10, '#c37365')
  for (let j = 0; j < 12; j++) {
    const a = (j / 12) * Math.PI * 2
    parts.push(
      coloredGeometry(
        new T.CylinderGeometry(0.035, 0.035, 0.8, 5).translate(
          Math.cos(a) * 1.5,
          8.5,
          Math.sin(a) * 1.5,
        ),
        '#697d80',
      ),
    )
    if (j % 2 === 0)
      parts.push(
        coloredGeometry(
          new T.BoxGeometry(0.055, 1.25, 0.055).translate(
            Math.cos(a) * 0.86,
            8.85,
            Math.sin(a) * 0.86,
          ),
          '#5e7075',
        ),
      )
  }
  parts.push(
    coloredGeometry(
      new T.TorusGeometry(1.5, 0.04, 6, 32).rotateX(Math.PI / 2).translate(0, 8.9, 0),
      '#788a87',
    ),
  )
  for (let i = 0; i < 3; i++)
    parts.push(
      coloredGeometry(
        new T.BoxGeometry(0.25, 0.55, 0.04).translate(0, 2 + i * 1.8, 1.34 - i * 0.12),
        '#687e84',
      ),
    )
  g.add(mergedMesh(parts))
  return g
}

export class CherryPetals {
  readonly mesh: T.InstancedMesh<T.ShapeGeometry, T.MeshStandardMaterial>
  private dummy = new T.Object3D()
  private count: number
  private width: number
  private depth: number
  private riding: boolean
  constructor(count = 100, width = 22, depth = 55, riding = false) {
    this.count = count
    this.width = width
    this.depth = depth
    this.riding = riding
    const shape = new T.Shape()
    shape.moveTo(0, -0.09)
    shape.bezierCurveTo(-0.13, -0.03, -0.1, 0.13, -0.025, 0.11)
    shape.lineTo(0, 0.08)
    shape.lineTo(0.025, 0.11)
    shape.bezierCurveTo(0.1, 0.13, 0.13, -0.03, 0, -0.09)
    this.mesh = new T.InstancedMesh(
      new T.ShapeGeometry(shape, 4),
      new T.MeshStandardMaterial({
        color: '#ffd4e5',
        roughness: 0.65,
        side: T.DoubleSide,
        emissive: '#a34568',
        emissiveIntensity: 0.12,
      }),
      count,
    )
    this.mesh.name = 'floating-cherry-petals'
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)
    // Dynamic instances span the camera corridor; do not cull from an initial frame's bounds.
    this.mesh.frustumCulled = false
    const color = new T.Color()
    for (let i = 0; i < count; i++)
      this.mesh.setColorAt(i, color.set(['#ffd5e6', '#f6a8ca', '#fff1f5'][i % 3]!))
    this.update(0)
  }
  update(time: number, travel = 0) {
    for (let i = 0; i < this.count; i++) {
      const phase = i * 2.39996,
        fall = (((i * 0.618 + time * (0.13 + (i % 5) * 0.009)) % 1) + 1) % 1
      const z = (((i * 7.37 + time * 0.65 + travel * 0.85) % this.depth) + this.depth) % this.depth
      this.dummy.position.set(
        (Math.sin(phase) * this.width) / 2 + Math.sin(time * 0.6 + phase) * 1.4,
        0.4 + (1 - fall) * 7,
        this.riding ? 4 - z : z - this.depth / 2,
      )
      this.dummy.rotation.set(time * 0.8 + phase, time * 0.5 + phase, Math.sin(time + phase) * 0.7)
      this.dummy.scale.setScalar(0.65 + (i % 4) * 0.22)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
