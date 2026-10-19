import * as T from 'three'
import type { WorldModel } from './types'
import { miniatureDetails } from './miniatureDetails.ts'
import { upgradeSakura } from './sakuraAsset.ts'
import { atmosphere } from './atmosphere.ts'
import { lunarGround, lunarHeight, orbitalHabitat, solarArray, relayAntenna, lunarRover, landingPad, orbitalWalkway, navigationGate, regolithScatter, craterMoon, deepSpaceStars } from './spaceScenery.ts'
import { lakesidePavilion, stoneLantern } from './mapLandmarks.ts'
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
export function cherryTree(seed = 0) {
  const g = new T.Group()
  g.name = 'branching-sakura'
  if (upgradeSakura(g, seed)) return g
  const branches: T.BufferGeometry[] = [
    coloredGeometry(new T.CylinderGeometry(0.14, 0.32, 3.7, 9).translate(0, 1.85, 0), '#70565b'),
  ]
  const flowers: T.BufferGeometry[] = []
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + seed * .71,
      end = new T.Vector3(Math.sin(a) * (1.7 + Math.sin(i + seed) * .45), 3.2 + (i % 3) * 0.45, Math.cos(a) * 1.8)
    const curve = new T.QuadraticBezierCurve3(
      new T.Vector3(0, 1.8, 0),
      new T.Vector3(end.x * 0.3, 2.8, end.z * 0.3),
      end,
    )
    branches.push(coloredGeometry(new T.TubeGeometry(curve, 5, 0.085, 6, false), '#806269'))
    for (let k = 0; k < 3; k++) {
      const tip = end.clone().add(new T.Vector3(Math.sin(a + k) * .9, .4, Math.cos(a + k) * .9))
      const twig = new T.QuadraticBezierCurve3(end, end.clone().lerp(tip, .5), tip)
      branches.push(coloredGeometry(new T.TubeGeometry(twig, 3, .025, 5, false), '#806269'))
    }
    for (let j = 0; j < 18; j++) {
      const bloom = new T.IcosahedronGeometry(0.25 + (j % 3) * 0.055, 1)
      bloom.scale(1.1, .85 + (j % 3) * .12, 1)
      bloom.translate(
        end.x + Math.sin(j * 2.4 + i) * (0.45 + (j % 4) * .18),
        end.y + .1 + Math.sin(j * 7 + i) * .38,
        end.z + Math.cos(j * 2.4 + i) * (0.45 + (j % 4) * .18),
      )
      flowers.push(
        coloredGeometry(bloom, ['#dca0b4', '#f9d3df', '#edb9ca', '#ffe5e9'][(i + j) % 4]!),
      )
    }
  }
  g.add(mergedMesh(branches), mergedMesh(flowers, 0.82))
  return g
}
export function fallenSakura(width: number, depth: number, seed = 0) {
  const petals = new T.InstancedMesh(new T.CircleGeometry(.09, 5), new T.MeshStandardMaterial({ color: '#f4c4d0', roughness: 1, side: T.DoubleSide }), 500)
  petals.name = 'fallen-sakura'
  const dummy = new T.Object3D()
  for (let i = 0; i < 500; i++) {
    const phase = i * 2.399 + seed
    dummy.position.set(Math.sin(phase * 17.1) * width * .5, .095 + (i % 3) * .002, Math.sin(phase * 7.3) * depth * .5)
    dummy.rotation.set(-Math.PI / 2, 0, phase); dummy.scale.set(.7 + (i % 4) * .2, .6, 1)
    dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix)
  }
  petals.receiveShadow = true
  return petals
}
export function fujiMountain() {
  const g = new T.Group()
  g.name = 'ridged-fuji'
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = []
  const color = new T.Color(),
    segments = 96,
    levels = 64
  for (let j = 0; j <= levels; j++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        t = j / levels
      const ridge = Math.sin(a * 13 + t * .7) * .07 + Math.sin(a * 21 + t * 1.8 + .5) * .03 + Math.sin(a * 37 - t * 2) * .015
      const r = 3.6 + 20.65 * Math.pow(1 - t, 1.4) * (1 + ridge * Math.sin(t * Math.PI))
      const y = t * 26 + (Math.sin(a * 5) * 0.28 + Math.sin(a * 9) * 0.17) * t
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r)
      const snowLine = .73 + Math.sin(a * 7) * .055 + Math.sin(a * 13) * .035 + Math.sin(a * 23) * .018
      color.set('#82917e').lerp(new T.Color('#7d839c'), T.MathUtils.smoothstep(t, .1, .7))
      color.lerp(new T.Color('#f6f0ed'), T.MathUtils.smoothstep(t, snowLine - .02, snowLine + .02))
        .multiplyScalar(1 + ridge * 1.5 + Math.sin(a * 47 + t * 20) * .018)
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
  const group = new T.Group(); group.name = 'banded-ring-planet'
  const globe = new T.SphereGeometry(8, 96, 64), positions = globe.getAttribute('position'), colors: number[] = [], color = new T.Color()
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i)
    const flow = y * 3.7 + Math.sin(x * .6 + z * .35) * .65 + Math.sin(z * 1.3 - x * .5) * .13
    const storm = Math.exp(-((x - 3.1) ** 2 + (y + 1.6) ** 2 + (z - 6.5) ** 2) / 3)
    color.set('#a98d76').lerp(new T.Color('#e0c8a1'), .45 + Math.sin(flow) * .26)
    color.lerp(new T.Color('#836769'), Math.pow(Math.max(0, Math.sin(flow * .43 + 2)), 5) * .55)
    color.lerp(new T.Color('#b16f4d'), storm * .6).multiplyScalar(.96 + Math.sin(flow * 4) * .035)
    colors.push(color.r, color.g, color.b)
  }
  globe.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  const body = new T.Mesh(globe, new T.MeshStandardMaterial({ vertexColors: true, roughness: .92, emissive: '#080b16' })); body.name = 'gas-giant-cloud-bands'; group.add(body)
  const tilt = new T.Euler(1.12, .18, -.18)
  for (const [inner, outer] of [[9.7, 11.9], [12.22, 14.6]]) {
    const geometry = new T.RingGeometry(inner, outer, 160, 26), p = geometry.getAttribute('position'), tint: number[] = []
    for (let i = 0; i < p.count; i++) {
      const radius = Math.hypot(p.getX(i), p.getY(i))
      color.set('#b7a7a3').lerp(new T.Color('#e1d2b7'), .45 + .22 * Math.sin(radius * 38) + .14 * Math.sin(radius * 11)).multiplyScalar(.92 + Math.sin(radius * 91) * .08)
      tint.push(color.r, color.g, color.b)
    }
    geometry.setAttribute('color', new T.Float32BufferAttribute(tint, 3))
    const ring = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .82, side: T.DoubleSide, roughness: .85, depthWrite: false }))
    ring.name = 'separated-ice-ring'; ring.rotation.copy(tilt); group.add(ring)
  }
  const glow = new T.Mesh(new T.SphereGeometry(8.16, 64, 40), new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.BackSide,
    vertexShader: 'varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 vNormal;varying vec3 vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.);gl_FragColor=vec4(.32,.52,.78,rim*.28);}',
  }))
  glow.name = 'planet-atmospheric-limb'; group.add(glow)
  return group
}
export function buildSongWorld(id: 'fuji' | 'space'): WorldModel {
  const group = new T.Group()
  group.name = id
  const space = id === 'space'
  const colliders: WorldModel['colliders'] = []
  const ground = space ? lunarGround() : box(group, '#a9bdab', 0, -0.6, 0, 84, 1.2, 74)
  if (space) group.add(ground)
  else { ground.material.dispose(); ground.material = terrainMaterial('#a9bdab') }
  box(group, space ? '#111729' : '#778e87', 0, -2, 0, 82, 1.6, 72)
  // The animated surface is part of the model, so normal world disposal releases it.
  const water = new T.ShaderMaterial({
    transparent: space, depthWrite: !space,
    uniforms: { time: { value: 0 }, color: { value: new T.Color(space ? '#668ee6' : '#7eb9c7') } },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: space
      ? `uniform float time;uniform vec3 color;varying vec2 vUv;
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float rings=pow(max(0.,sin(r*38.)),16.);
      float scan=pow(max(0.,cos(atan(p.y,p.x)-time*.25)),36.);
      gl_FragColor=vec4(color*.75,(rings*.1+scan*.06+smoothstep(.93,1.,r)*.14)*smoothstep(.15,.3,r));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
      : `uniform float time;uniform vec3 color;varying vec2 vUv;
      void main(){float r=length((vUv-.5)*2.);float wave=sin(vUv.x*130.+vUv.y*35.+sin(vUv.y*40.)-time*.7);
      float shine=pow(max(0.,wave),18.)*.025;float shore=smoothstep(.86,1.,r);
      gl_FragColor=vec4(mix(color*.62,vec3(.52,.72,.66),shore*.7+vUv.y*.2)+shine+shore*.045,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  })
  const lakeGeometry = new T.CircleGeometry(space ? 8 : 13, 96)
  if (!space) {
    const positions = lakeGeometry.getAttribute('position')
    for (let i = 1; i < positions.count; i++) {
      const a = Math.atan2(-positions.getY(i), positions.getX(i)), scale = 1 + .065 * Math.sin(a * 3) + .035 * Math.cos(a * 5)
      positions.setXYZ(i, positions.getX(i) * scale, positions.getY(i) * scale, 0)
    }
    const bank = new T.Mesh(lakeGeometry.clone(), new T.MeshStandardMaterial({ color: '#b4b29b', roughness: 1 }))
    bank.rotation.x = -Math.PI / 2; bank.position.set(-20, .012, 7); bank.scale.setScalar(1.07); bank.receiveShadow = true
    group.add(bank)
  }
  const surface = new T.Mesh(lakeGeometry, water)
  surface.rotation.x = -Math.PI / 2
  surface.position.set(-20, space ? .253 : .025, 7)
  if (space) surface.scale.setScalar(.58)
  group.add(surface)
  if (!space) box(group, '#dcd0c4', 5, 0.04, 0, 7, 0.08, 72)
  let spaceDetails: T.Group | undefined
  const animated = new T.Group()
  group.add(animated)
  const petals = space ? undefined : new CherryPetals(140, 25, 66)
  if (!space) {
    const fallen = fallenSakura(18, 65)
    fallen.position.x = 5; group.add(fallen)
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
      const tree = cherryTree(i)
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
      const tree = cherryTree(i)
      tree.position.set(x + Math.sin(i * 4) * .7, 0, z)
      tree.rotation.y = i * 2.4
      tree.scale.setScalar(.88 + (i % 4) * .09)
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
        x = -20 + Math.cos(a) * 13.3 * (1 + .065 * Math.sin(a * 3) + .035 * Math.cos(a * 5)),
        z = 7 + Math.sin(a) * 13.3 * (1 + .065 * Math.sin(a * 3) + .035 * Math.cos(a * 5))
      const stone = mesh(group, new T.IcosahedronGeometry(0.55, 1), '#abb8b2', x, 0.12, z)
      stone.scale.set(1.1 + (i % 4) * .35, .4 + (i % 3) * .12, .8)
      stone.rotation.y = i * 2.4
    }
    for (let i = 0; i < 22; i++)
      box(group, i % 2 ? '#baa18b' : '#cbb49e', -20.5 + i * 0.8, 0.35, 15, 0.76, 0.13, 2.8)
    for (const z of [13.7, 16.3]) {
      box(group, '#847264', -12, 1.05, z, 18, 0.1, 0.1)
      for (let x = -20; x < -3; x += 3) box(group, '#847264', x, 0.65, z, 0.12, 1.2, 0.12)
    }
  } else {
    const station = orbitalHabitat(); station.position.set(24, 0, -12); group.add(station)
    colliders.push({ x: 24, z: -12, radius: 7.8 })
    const planet = ringPlanet(); planet.position.set(-22, 23, -25); group.add(planet)
    const moon = craterMoon(); moon.position.set(27, 19, -29); moon.rotation.set(.2, -.7, .3); group.add(moon)
    const pad = landingPad(); pad.position.set(-20, 0, 7); group.add(pad)
    const walkway = orbitalWalkway(); walkway.position.x = 5; group.add(walkway)
    group.add(regolithScatter(), atmosphere('space', false))
    const layouts = [
      { asset: solarArray(), x: 23, z: 4, radius: 3.8, rotation: -.18 },
      { asset: solarArray(), x: -28, z: -7, radius: 3.8, rotation: .25 },
      { asset: relayAntenna(), x: -33, z: 8, radius: 2, rotation: -.4 },
      { asset: relayAntenna(), x: 33, z: -8, radius: 2, rotation: .7 },
      { asset: lunarRover(), x: -12, z: 14, radius: 1.9, rotation: .5 },
      { asset: lunarRover(), x: 18, z: -23, radius: 1.9, rotation: -.8 },
    ]
    spaceDetails = new T.Group(); spaceDetails.name = 'miniature-details-space'; spaceDetails.userData.colliders = layouts.map(({ x, z, radius }) => ({ x, z, radius }))
    for (const { asset, x, z, radius, rotation } of layouts) {
      asset.position.set(x, lunarHeight(x, z) + .08, z); asset.rotation.y = rotation; spaceDetails.add(asset); colliders.push({ x, z, radius })
    }
    for (const z of [-24, 0, 24]) { const gate = navigationGate(); gate.position.set(5, 0, z); group.add(gate) }
    for (let i = 0; i < 16; i++) {
      const x = Math.sin(i * 4.1) * 35, z = Math.cos(i * 2.7) * 31
      if (Math.abs(x - 5) < 7 || Math.hypot(x + 20, z - 7) < 10 || colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.radius + 3)) continue
      const rock = rockFormation(i + 11, true), scale = .7 + (i % 3) * .4
      rock.position.set(x, lunarHeight(x, z) + .3, z); rock.scale.setScalar(scale); rock.rotation.y = i * .7; group.add(rock)
      colliders.push({ x, z, radius: scale * 1.4 })
    }
    animated.add(deepSpaceStars())
  }
  const details = spaceDetails ?? miniatureDetails(id, (x,z) => Math.abs(x-5)>7 && (space || Math.hypot(x+20,z-7)>18) && colliders.every(c=>Math.hypot(c.x-x,c.z-z)>c.radius+4))
  group.add(details); if (!space) colliders.push(...details.userData.colliders)
  return {
    group,
    ground,
    water,
    spawn: new T.Vector3(5, space ? .12 : .08, 29),
    colliders,
    heightAt: (x, z) => {
      if (!space) return .08
      // Match the raised platforms when walking or placing decorations.
      if (Math.abs(x - 5) <= 3.5 && Math.abs(z) <= 36) return .12
      const padDistance = Math.hypot(x + 20, z - 7)
      if (padDistance <= 7.1) return .25
      if (padDistance <= 7.8) return .15
      return .08 + lunarHeight(x, z)
    },
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
