import * as T from 'three'
import type { WorldModel } from './types'
import { lakesidePavilion, observatory, stoneLantern } from './mapLandmarks.ts'
import {
  CherryPetals,
  coloredGeometry,
  mergedMesh,
  groundPlants,
  terrainMaterial,
  rockFormation,
} from './scenery.ts'

function mesh(parent: T.Object3D, geometry: T.BufferGeometry, color: string, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({ color, roughness: 0.78, flatShading: true }),
  )
  object.position.set(x, y, z)
  object.castShadow = true
  object.receiveShadow = true
  parent.add(object)
  return object
}
function box(
  g: T.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  return mesh(g, new T.BoxGeometry(w, h, d), color, x, y, z)
}
export function cherryTree() {
  const g = new T.Group()
  g.name = 'branching-sakura'
  const branches: T.BufferGeometry[] = [
    coloredGeometry(new T.CylinderGeometry(0.14, 0.32, 3.7, 9).translate(0, 1.85, 0), '#70565b'),
  ]
  const flowers: T.BufferGeometry[] = []
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4,
      end = new T.Vector3(Math.sin(a) * 1.7, 3.2 + (i % 3) * 0.45, Math.cos(a) * 1.5)
    const curve = new T.QuadraticBezierCurve3(
      new T.Vector3(0, 1.8, 0),
      new T.Vector3(end.x * 0.3, 2.8, end.z * 0.3),
      end,
    )
    branches.push(coloredGeometry(new T.TubeGeometry(curve, 5, 0.085, 6, false), '#806269'))
    for (let j = 0; j < 6; j++) {
      const bloom = new T.IcosahedronGeometry(0.48 + (j % 3) * 0.12, 1)
      bloom.scale(1.1, 0.8, 1)
      bloom.translate(
        end.x + Math.sin(j * 2.4 + i) * 0.75,
        end.y + 0.1 + (j % 3) * 0.25,
        end.z + Math.cos(j * 2.4 + i) * 0.75,
      )
      flowers.push(
        coloredGeometry(bloom, ['#edafc7', '#f9d3df', '#e49ebc', '#ffe5e9'][(i + j) % 4]!),
      )
    }
  }
  g.add(mergedMesh(branches), mergedMesh(flowers, 0.82))
  return g
}
export function fujiMountain() {
  const g = new T.Group()
  g.name = 'ridged-fuji'
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = []
  const color = new T.Color(),
    segments = 96,
    levels = 28
  for (let j = 0; j <= levels; j++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        t = j / levels
      const ridge = Math.sin(a * 13) * 0.045 + Math.sin(a * 21 + 0.5) * 0.025
      const r = 3.6 + 20.65 * Math.pow(1 - t, 1.4) * (1 + ridge * Math.sin(t * Math.PI))
      const y = t * 26 + (Math.sin(a * 5) * 0.28 + Math.sin(a * 9) * 0.17) * t
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r)
      const snowLine = 0.76 + Math.sin(a * 7) * 0.035 + Math.sin(a * 13) * 0.025
      color
        .set(t > snowLine ? '#f2f1f6' : t > 0.42 ? '#8b91ad' : '#778987')
        .multiplyScalar(1 + ridge * 1.8)
      colors.push(color.r, color.g, color.b)
      if (j < levels && i < segments) {
        const k = j * (segments + 1) + i
        indices.push(k, k + segments + 1, k + 1, k + 1, k + segments + 1, k + segments + 2)
      }
    }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const mountain = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T.DoubleSide }),
  )
  mountain.castShadow = true
  mountain.receiveShadow = true
  g.add(mountain)
  // A continuous inward slope makes the summit an open crater, not a disk on a peak.
  const craterPositions: number[] = [],
    craterColors: number[] = [],
    craterIndices: number[] = []
  const radii = [3.6, 3.2, 2.45, 1.35, 0],
    heights = [26, 25.5, 24.3, 22.9, 22.5]
  for (let j = 0; j < radii.length; j++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        rim = (Math.sin(a * 5) * 0.28 + Math.sin(a * 9) * 0.17) * (1 - j / 4)
      craterPositions.push(Math.cos(a) * radii[j]!, heights[j]! + rim, Math.sin(a) * radii[j]!)
      color.set(['#e9e9f0', '#adb2c4', '#788096', '#535e73', '#414e63'][j]!)
      craterColors.push(color.r, color.g, color.b)
      if (j < 4 && i < segments) {
        const k = j * (segments + 1) + i
        craterIndices.push(k, k + 1, k + segments + 1, k + 1, k + segments + 2, k + segments + 1)
      }
    }
  const craterGeometry = new T.BufferGeometry()
  craterGeometry.setAttribute('position', new T.Float32BufferAttribute(craterPositions, 3))
  craterGeometry.setAttribute('color', new T.Float32BufferAttribute(craterColors, 3))
  craterGeometry.setIndex(craterIndices)
  craterGeometry.computeVertexNormals()
  const crater = new T.Mesh(
    craterGeometry,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T.DoubleSide }),
  )
  crater.name = 'fuji-crater-interior'
  crater.receiveShadow = true
  g.add(crater)
  return g
}
export function ringPlanet() {
  const g = new T.Group()
  g.name = 'banded-ring-planet'
  const globe = new T.SphereGeometry(8, 48, 32),
    positions = globe.getAttribute('position'),
    colors: number[] = [],
    c = new T.Color()
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i),
      stripe = Math.sin(y * 2.2 + Math.sin(positions.getX(i) * 0.45) * 0.3)
    c.set('#a99cd8').lerp(new T.Color('#d7bfda'), (stripe + 1) * 0.32)
    colors.push(c.r, c.g, c.b)
  }
  globe.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  g.add(new T.Mesh(globe, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 })))
  const ring = new T.Mesh(
    new T.RingGeometry(10, 14, 128, 12),
    new T.MeshStandardMaterial({
      color: '#cfbfde',
      transparent: true,
      opacity: 0.7,
      side: T.DoubleSide,
      roughness: 0.8,
    }),
  )
  ring.rotation.x = 1.1
  ring.rotation.y = 0.25
  g.add(ring)
  for (const radius of [10.3, 11.2, 12.8, 13.7]) {
    const band = new T.Mesh(
      new T.RingGeometry(radius, radius + 0.12, 128),
      new T.MeshBasicMaterial({ color: '#f1d6e7', side: T.DoubleSide }),
    )
    band.rotation.copy(ring.rotation)
    g.add(band)
  }
  return g
}
export function buildSongWorld(id: 'fuji' | 'space'): WorldModel {
  const group = new T.Group()
  group.name = id
  const space = id === 'space'
  const colliders: WorldModel['colliders'] = []
  const ground = box(group, space ? '#262c4b' : '#a9bdab', 0, -0.6, 0, 84, 1.2, 74)
  ground.material.dispose()
  ground.material = terrainMaterial(space ? '#262c4b' : '#a9bdab', space)
  box(group, space ? '#111729' : '#778e87', 0, -2, 0, 82, 1.6, 72)
  // The animated surface is part of the model, so normal world disposal releases it.
  const water = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new T.Color(space ? '#668ee6' : '#7eb9c7') } },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: space
      ? `uniform float time;uniform vec3 color;varying vec2 vUv;
      void main(){float r=length((vUv-.5)*2.);float rings=pow(max(0.,sin(r*45.-time*.6)),12.);
      gl_FragColor=vec4(color*(.3+rings*.6+smoothstep(.8,1.,r)*.5),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
      : `uniform float time;uniform vec3 color;varying vec2 vUv;
      void main(){float r=length((vUv-.5)*2.);float wave=sin(vUv.x*130.+vUv.y*35.+sin(vUv.y*40.)-time*.7);
      float shine=pow(max(0.,wave),14.)*.06;float shore=smoothstep(.86,1.,r);
      gl_FragColor=vec4(mix(color*.72,color,shore*.55+vUv.y*.25)+shine+shore*.045,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  })
  const surface = new T.Mesh(new T.CircleGeometry(space ? 8 : 13, 64), water)
  surface.rotation.x = -Math.PI / 2
  surface.position.set(-20, 0.025, 7)
  group.add(surface)
  box(group, space ? '#495677' : '#dcd0c4', 5, 0.04, 0, 7, 0.08, 72)
  const animated = new T.Group()
  group.add(animated)
  const petals = space ? undefined : new CherryPetals(140, 25, 66)
  if (!space) {
    const pavilion = lakesidePavilion()
    pavilion.position.set(24, 0.08, -12)
    pavilion.rotation.y = -0.35
    group.add(pavilion)
    colliders.push({ x: 24, z: -12, radius: 4.5 })
    for (const x of [0.6, 9.4])
      for (const z of [-28, -14, 0, 14, 28]) {
        const lantern = stoneLantern()
        lantern.position.set(x, 0.08, z)
        group.add(lantern)
      }
    for (let i = 0; i < 12; i++) box(group, '#b9bcb0', 10.5 + i * 1.15, 0.12, -12, 1, 0.15, 1.6)
    for (let i = 0; i < 7; i++) {
      const rock = rockFormation(i + 17)
      rock.position.set(21 + Math.sin(i * 2.4) * 6, 0.25, 14 + Math.cos(i * 2.4) * 5)
      rock.scale.setScalar(0.8 + (i % 3) * 0.3)
      group.add(rock)
      colliders.push({ x: rock.position.x, z: rock.position.z, radius: 1.4 })
      const tree = cherryTree()
      tree.position.set(rock.position.x + 1.5, 0, rock.position.z + 1.5)
      tree.scale.setScalar(0.65 + (i % 3) * 0.08)
      tree.rotation.y = i
      group.add(tree)
      colliders.push({ x: tree.position.x, z: tree.position.z, radius: 0.5 })
    }
    const mountain = fujiMountain()
    mountain.position.set(-20, 0, -21)
    mountain.scale.setScalar(0.65)
    group.add(mountain)
    colliders.push({ x: -20, z: -21, radius: 16 })
    for (let i = 0; i < 16; i++) {
      const x = i % 2 ? 13 : -2,
        z = 31 - Math.floor(i / 2) * 7
      const tree = cherryTree()
      tree.position.set(x, 0, z)
      group.add(tree)
      colliders.push({ x, z, radius: 0.65 })
    }
    for (const x of [1, 9]) {
      box(group, '#b55054', x, 3, 20, 0.5, 6, 0.5)
      colliders.push({ x, z: 20, radius: 0.5 })
    }
    box(group, '#b55054', 5, 5.3, 20, 10, 0.4, 0.6)
    box(group, '#524752', 5, 6.1, 20, 11, 0.45, 0.9)
    box(group, '#b5977c', -12, 0.18, 15, 18, 0.3, 2.8)
    petals!.mesh.position.x = 5
    group.add(petals!.mesh)
    group.add(
      groundPlants(
        360,
        78,
        66,
        (x, z) =>
          Math.abs(x - 5) > 4.5 &&
          Math.hypot(x + 20, z - 7) > 14 &&
          Math.hypot(x + 20, z + 23) > 18,
        14,
      ),
    )
    // Stone banks and a timber promenade give the lake a visible shore.
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2,
        x = -20 + Math.cos(a) * 13.3,
        z = 7 + Math.sin(a) * 13.3
      const stone = mesh(group, new T.IcosahedronGeometry(0.55, 1), '#abb8b2', x, 0.12, z)
      stone.scale.set(1.4, 0.5, 0.9)
    }
    for (let i = 0; i < 22; i++)
      box(group, i % 2 ? '#baa18b' : '#cbb49e', -20.5 + i * 0.8, 0.35, 15, 0.76, 0.13, 2.8)
    for (const z of [13.7, 16.3]) {
      box(group, '#847264', -12, 1.05, z, 18, 0.1, 0.1)
      for (let x = -20; x < -3; x += 3) box(group, '#847264', x, 0.65, z, 0.12, 1.2, 0.12)
    }
  } else {
    const station = observatory()
    station.position.set(24, 0, -12)
    group.add(station)
    colliders.push({ x: 24, z: -12, radius: 7 })
    const planet = ringPlanet()
    planet.position.set(-19, 19, -20)
    group.add(planet)
    const moon = mesh(group, new T.IcosahedronGeometry(4, 2), '#7f9da7', 25, 15, -26)
    moon.rotation.z = 0.4
    for (let i = 0; i < 24; i++) {
      const x = Math.sin(i * 4.1) * 30,
        z = Math.cos(i * 2.7) * 30
      if (Math.abs(x - 5) < 7) continue
      if (Math.hypot(x - 24, z + 12) < 8) continue
      const rock = rockFormation(i, true)
      rock.position.set(x, 0.5, z)
      rock.scale.setScalar(1 + (i % 3) * 0.5)
      group.add(rock)
      rock.rotation.set(i, i * 0.7, 0)
      colliders.push({ x, z, radius: 2.6 })
      const crystal = mesh(group, new T.ConeGeometry(0.22, 1.8, 5), '#9de7ee', x + 0.6, 1.1, z)
      crystal.material.emissive.set('#438dc3')
      crystal.material.emissiveIntensity = 0.6
    }
    for (const x of [1.2, 8.8])
      for (let i = 0; i < 18; i++) {
        const light = box(group, '#80dfff', x, 0.18, 34 - i * 4, 0.12, 0.15, 2)
        light.material.emissive.set('#5ccfff')
        light.material.emissiveIntensity = 2
      }
    for (let i = 0; i < 24; i++) {
      const panel = box(group, i % 2 ? '#465476' : '#3a4767', 5, 0.09, 34 - i * 3, 6.7, 0.08, 2.85)
      panel.material.metalness = 0.45
      panel.material.roughness = 0.5
      for (const x of [2, 8]) box(group, '#9eb7cf', x, 0.14, 34 - i * 3, 0.08, 0.025, 0.5)
    }
    for (const z of [-22, 0, 22]) {
      const arch = mesh(
        group,
        new T.TorusGeometry(5.7, 0.18, 8, 64, Math.PI),
        '#729ac4',
        5,
        0.12,
        z,
      )
      arch.material.metalness = 0.6
      arch.material.emissive.set('#284c75')
      arch.material.emissiveIntensity = 0.5
    }
    // Depressed bowls with rough rims read as lunar craters rather than scattered boxes.
    for (let i = 0; i < 9; i++) {
      const x = i % 2 ? 20 + (i % 3) * 4 : -9 - (i % 3) * 6,
        z = -29 + i * 7
      const bowl = mesh(group, new T.CylinderGeometry(2.3, 1.8, 0.16, 24), '#1a223b', x, 0.08, z)
      bowl.material.roughness = 1
      const rim = mesh(group, new T.TorusGeometry(2.3, 0.25, 6, 32), '#515c7b', x, 0.13, z)
      rim.rotation.x = Math.PI / 2
      rim.scale.y = 0.6
    }
    const positions: number[] = []
    for (let i = 0; i < 480; i++)
      positions.push(
        Math.sin(i * 12.7) * 110,
        15 + (Math.sin(i * 7.9) + 1) * 45,
        Math.cos(i * 3.1) * 110,
      )
    const stars = new T.BufferGeometry()
    stars.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    animated.add(
      new T.Points(stars, new T.PointsMaterial({ color: '#d7e6ff', size: 0.22, fog: false })),
    )
  }
  return {
    group,
    ground,
    water,
    spawn: new T.Vector3(5, 0.08, 29),
    colliders,
    heightAt: () => 0.08,
    isWalkable: (x, z) =>
      Math.abs(x) < 40 &&
      Math.abs(z) < 35 &&
      (space || Math.hypot(x + 20, z - 7) > 13 || (Math.abs(z - 15) < 1.4 && x > -21 && x < -3)) &&
      colliders.every((c) => Math.hypot(x - c.x, z - c.z) > c.radius + 0.35),
    update(time) {
      water.uniforms.time!.value = time
      if (space) animated.rotation.y = time * 0.003
      else petals!.update(time)
    },
  }
}
