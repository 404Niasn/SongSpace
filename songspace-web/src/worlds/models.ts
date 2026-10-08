import * as THREE from 'three'
import { jiangnanHouse } from './jiangnan'
import type { DecorationKind, WorldId, WorldModel } from './types'

const RADIUS = 43

function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

// Shared materials and geometry stay local to a world so switching can dispose everything.
export function buildWorld(id: WorldId): WorldModel {
  const rng = random(id === 'forest' ? 73 : id === 'sea' ? 91 : 137)
  const group = new THREE.Group()
  group.name = id
  const colliders: WorldModel['colliders'] = []
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const animated: { object: THREE.Object3D; baseY: number; phase: number }[] = []
  const material = (color: string) => {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.87, flatShading: true }),
      )
    return materials.get(color)!
  }
  const mesh = (geometry: THREE.BufferGeometry, color: string, parent: THREE.Object3D = group) => {
    const object = new THREE.Mesh(geometry, material(color))
    object.castShadow = true
    object.receiveShadow = true
    parent.add(object)
    return object
  }
  const box = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color: string,
    parent: THREE.Object3D = group,
  ) => {
    const object = mesh(new THREE.BoxGeometry(width, height, depth), color, parent)
    object.position.set(x, y, z)
    return object
  }
  const cylinder = (
    x: number,
    y: number,
    z: number,
    top: number,
    bottom: number,
    height: number,
    color: string,
    parent: THREE.Object3D = group,
    segments = 10,
  ) => {
    const object = mesh(new THREE.CylinderGeometry(top, bottom, height, segments), color, parent)
    object.position.set(x, y, z)
    return object
  }
  const coast = (z: number) => -8 + Math.sin(z * 0.11) * 2
  const stream = (z: number) => -7 + Math.sin(z / 9) * 4
  const isWater = (x: number, z: number) =>
    id === 'sea'
      ? x < coast(z)
      : id === 'forest'
        ? Math.abs(x - stream(z)) < 2.2
        : Math.abs(x) < 5.8
  const routeCenter = id === 'sea' ? 14 : 4
  const onRoad = (x: number, _z: number) => Math.abs(x - routeCenter) < 2.1
  const heightAt = (x: number, z: number) => {
    if (id === 'jiangnan' && Math.abs(x) < 9 && Math.abs(Math.abs(z) - 25) < 3.6)
      return 0.14 + Math.cos(((x / 9) * Math.PI) / 2) * 1.9
    return 0.08
  }
  const isWalkable = (x: number, z: number) => {
    if (Math.abs(x) > 40.5 || Math.abs(z) > 36) return false
    if (id === 'sea' && x > -21 && x < -4 && Math.abs(z - 9) < 1.65) return true // pier
    return !isWater(x, z) || onRoad(x, z)
  }

  // Low polygon plinth; the separate land surface leaves actual openings for water.
  box(0, -2.0, 0, 86, 3.4, 76, id === 'sea' ? '#c5c6b0' : '#a6b4a1')
  box(0, -3.83, 0, 85, 0.26, 75, '#e5e7da')
  const positions: number[] = []
  const colors: number[] = []
  const landColor = new THREE.Color(
    id === 'forest' ? '#8baf77' : id === 'sea' ? '#bad1a0' : '#afbea5',
  )
  const sandColor = new THREE.Color('#e3d5b4')
  const step = 0.8
  for (let x = -RADIUS; x < RADIUS; x += step)
    for (let z = -RADIUS; z < RADIUS; z += step) {
      for (const triangle of [
        [
          [x, z],
          [x, z + step],
          [x + step, z],
        ],
        [
          [x + step, z],
          [x, z + step],
          [x + step, z + step],
        ],
      ]) {
        const cx = triangle.reduce((sum, p) => sum + p[0]!, 0) / 3
        const cz = triangle.reduce((sum, p) => sum + p[1]!, 0) / 3
        if (Math.abs(cx) > 42.8 || Math.abs(cz) > 37.8 || isWater(cx, cz)) continue
        const color = (id === 'sea' && cx < coast(cz) + 7 ? sandColor : landColor)
          .clone()
          .multiplyScalar(0.96 + rng() * 0.08)
        for (const p of triangle) {
          positions.push(p[0]!, 0.035, p[1]!)
          colors.push(color.r, color.g, color.b)
        }
      }
    }
  const groundGeometry = new THREE.BufferGeometry()
  groundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  groundGeometry.computeVertexNormals()
  const ground = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  )
  ground.receiveShadow = true
  group.add(ground)

  const water = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      kind: { value: id === 'sea' ? 0 : id === 'forest' ? 1 : 2 },
      deep: { value: new THREE.Color(id === 'sea' ? '#4c9fae' : '#70a79b') },
      light: { value: new THREE.Color('#b2d9cd') },
    },
    vertexShader: `uniform float time; uniform float kind; varying vec3 world;
      void main(){ vec4 p=modelMatrix*vec4(position,1.0); float amp=kind<0.5?0.1:0.025;
      p.y=-0.04+sin(p.x*0.43+time*0.8)*cos(p.z*0.3+time*0.5)*amp; world=p.xyz;
      gl_Position=projectionMatrix*viewMatrix*p; }`,
    fragmentShader: `uniform float time; uniform float kind; uniform vec3 deep; uniform vec3 light; varying vec3 world;
      void main(){ vec2 p=world.xz; if(abs(p.x)>42.9||abs(p.y)>37.9) discard;
      float edge; if(kind<0.5){edge=(-8.0+sin(p.y*0.11)*2.0)-p.x;} else if(kind<1.5){edge=2.2-abs(p.x-(-7.0+sin(p.y/9.0)*4.0));}else{edge=5.8-abs(p.x);}
      if(edge<0.0) discard; float wave=sin(p.x*1.5+p.y*0.8-time*1.1);
      float shine=pow(max(0.0,sin(p.x*2.0-p.y*1.5+time*0.7)),18.0)*0.035;
      float foam=(1.0-smoothstep(0.0,1.2,edge))*0.35;
      gl_FragColor=vec4(mix(deep,light,foam+wave*0.025+shine),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  })
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(86, 86, 48, 48), water)
  waterMesh.rotation.x = -Math.PI / 2
  group.add(waterMesh)

  // A straight road crosses a rectangular miniature landscape.
  if (id !== 'jiangnan') {
    const trail = mesh(
      new THREE.PlaneGeometry(id === 'sea' ? 4 : 3.6, 75),
      id === 'sea' ? '#677a7a' : '#c7b793',
    )
    trail.rotation.x = -Math.PI / 2
    trail.position.set(routeCenter, 0.13, 0)
  }

  const tree = (
    x: number,
    z: number,
    scale: number,
    type: 'pine' | 'round' | 'willow' = 'pine',
  ) => {
    const plant = new THREE.Group()
    plant.position.set(x, 0, z)
    plant.scale.setScalar(scale)
    group.add(plant)
    cylinder(0, 1.5, 0, 0.18, 0.35, 3, '#6f6850', plant, 7)
    if (type === 'pine') {
      for (let layer = 0; layer < 3; layer++)
        cylinder(
          0,
          2.7 + layer * 1.25,
          0,
          0,
          2.05 - layer * 0.44,
          3.0 - layer * 0.25,
          ['#416f50', '#4a7d57', '#5a8b63'][layer]!,
          plant,
          7,
        )
    } else {
      const crown = mesh(
        new THREE.IcosahedronGeometry(type === 'willow' ? 2.5 : 2.0, 1),
        type === 'willow' ? '#81a96b' : '#78975b',
        plant,
      )
      crown.position.y = 4.3
      crown.scale.set(1, type === 'willow' ? 0.7 : 1.1, 1)
      if (type === 'willow')
        for (let j = 0; j < 22; j++) {
          const a = (j / 22) * Math.PI * 2
          const branch = cylinder(
            Math.cos(a) * 1.9,
            2.8,
            Math.sin(a) * 1.9,
            0.018,
            0.045,
            2.0 + rng(),
            '#8fae71',
            plant,
            5,
          )
          branch.rotation.z = Math.sin(a) * 0.16
        }
    }
    colliders.push({ x, z, radius: 0.55 * scale })
  }
  const rock = (x: number, z: number, scale: number) => {
    const object = mesh(new THREE.DodecahedronGeometry(1, 0), '#a3ada0')
    object.position.set(x, scale * 0.3, z)
    object.scale.set(scale, scale * 0.7, scale * 0.8)
    object.rotation.set(rng(), rng() * 3, rng())
    colliders.push({ x, z, radius: scale * 0.8 })
  }
  const roof = (
    parent: THREE.Group,
    width: number,
    depth: number,
    wallHeight: number,
    chinese: boolean,
  ) => {
    const roofPosition: number[] = []
    const roofIndex: number[] = []
    const profile = chinese
      ? [
          [-width / 2 - 0.65, 0.4],
          [-width / 2 + 0.15, 0],
          [0, 1.55],
          [width / 2 - 0.15, 0],
          [width / 2 + 0.65, 0.4],
        ]
      : [
          [-width / 2 - 0.5, 0],
          [0, 2],
          [width / 2 + 0.5, 0],
        ]
    for (let i = 0; i < profile.length; i++) {
      const point = profile[i]!
      roofPosition.push(
        point[0]!,
        wallHeight + point[1]!,
        -depth / 2 - 0.55,
        point[0]!,
        wallHeight + point[1]!,
        depth / 2 + 0.55,
      )
      if (i < profile.length - 1) {
        const n = i * 2
        roofIndex.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(roofPosition, 3))
    geometry.setIndex(roofIndex)
    geometry.computeVertexNormals()
    const roofMesh = mesh(geometry, chinese ? '#515e60' : '#675c53', parent)
    roofMesh.material = material(chinese ? '#515e60' : '#675c53').clone()
    roofMesh.material.side = THREE.DoubleSide
    box(
      0,
      wallHeight + (chinese ? 1.57 : 2.02),
      0,
      0.15,
      0.16,
      depth + 1.3,
      chinese ? '#697373' : '#87776b',
      parent,
    )
    if (chinese)
      for (let j = 0; j < 15; j++) {
        const z = -depth / 2 + (j / 14) * depth
        for (const side of [-1, 1]) {
          const tile = box(
            (side * width) / 4,
            wallHeight + 0.83,
            z,
            width / 2,
            0.05,
            0.055,
            '#728080',
            parent,
          )
          tile.rotation.z = -side * Math.atan(1.55 / (width / 2))
        }
      }
  }
  const house = (x: number, z: number, chinese = false, rotation = 0, scale = 1) => {
    if (chinese) {
      const building = jiangnanHouse(Math.abs(Math.round(z * 2)))
      building.position.set(x, 0.12, z)
      building.rotation.y = rotation
      building.scale.setScalar(scale)
      group.add(building)
      colliders.push({ x, z, radius: 3.1 * scale })
      return
    }
    const building = new THREE.Group()
    group.add(building)
    building.position.set(x, 0.12, z)
    building.rotation.y = rotation
    building.scale.setScalar(scale)
    box(0, 0.16, 0, 6.9, 0.32, 5.9, '#9ea49a', building)
    box(0, 1.9, 0, 6, 3.8, 5, chinese ? '#f2f0df' : '#9a7755', building)
    roof(building, 6, 5, 3.8, chinese)
    for (const side of [-1, 1]) {
      const gable = new THREE.BufferGeometry()
      gable.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-3, 3.8, side * 2.5, 3, 3.8, side * 2.5, 0, chinese ? 5.35 : 5.8, side * 2.5],
          3,
        ),
      )
      gable.computeVertexNormals()
      const panel = mesh(gable, chinese ? '#f2f0df' : '#9a7755', building)
      panel.material = material(chinese ? '#f2f0df' : '#9a7755').clone()
      panel.material.side = THREE.DoubleSide
    }
    box(0, 1.15, 2.53, 1.1, 2.3, 0.1, '#5b6258', building)
    for (const side of [-1, 1]) {
      box(side * 1.9, 2.1, 2.55, 1.2, 1.25, 0.12, '#697b72', building)
      box(side * 1.9, 2.1, 2.64, 0.075, 1.25, 0.1, '#b5b7a0', building)
      box(side * 1.9, 2.1, 2.64, 1.2, 0.075, 0.1, '#b5b7a0', building)
      if (chinese) {
        cylinder(side * 2.5, 2.7, 3.0, 0.22, 0.22, 0.52, '#c58361', building, 8)
        box(side * 2.5, 3.25, 2.8, 0.06, 0.5, 0.06, '#67645a', building)
      }
    }
    if (!chinese)
      for (let i = 0; i < 10; i++)
        box(0, 0.5 + i * 0.31, 2.55, 5.9, 0.035, 0.025, '#b4936f', building)
    colliders.push({ x, z, radius: 4 * scale })
  }
  const boat = (x: number, z: number, sail: boolean, scale = 1) => {
    const vessel = new THREE.Group()
    vessel.position.set(x, 0.05, z)
    vessel.scale.setScalar(scale)
    vessel.rotation.y = rng() * 0.8
    group.add(vessel)
    const hull = mesh(new THREE.SphereGeometry(1, 10, 6), sail ? '#eee7d5' : '#806e57', vessel)
    hull.scale.set(0.7, 0.32, 2.0)
    box(0, 0.26, 0, 1.0, 0.12, 2.7, sail ? '#bb9b77' : '#ac9476', vessel)
    if (sail) {
      cylinder(0, 1.9, 0, 0.045, 0.045, 3.8, '#c0aa83', vessel, 6)
      const sailGeometry = new THREE.BufferGeometry()
      sailGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0.05, 3.7, 0, 0.05, 0.8, 0, 0.05, 0.8, 2.2], 3),
      )
      sailGeometry.computeVertexNormals()
      const cloth = mesh(sailGeometry, '#f2ecd9', vessel)
      cloth.material = material('#f2ecd9').clone()
      cloth.material.side = THREE.DoubleSide
    } else {
      const canopyVertices: number[] = []
      const canopyIndices: number[] = []
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI
        canopyVertices.push(
          Math.cos(a) * 0.63,
          0.4 + Math.sin(a) * 0.58,
          -0.9,
          Math.cos(a) * 0.63,
          0.4 + Math.sin(a) * 0.58,
          0.9,
        )
        if (i < 12) {
          const n = i * 2
          canopyIndices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3)
        }
      }
      const canopyGeometry = new THREE.BufferGeometry()
      canopyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(canopyVertices, 3))
      canopyGeometry.setIndex(canopyIndices)
      canopyGeometry.computeVertexNormals()
      const canopy = mesh(canopyGeometry, '#8a816d', vessel)
      canopy.material = material('#8a816d').clone()
      canopy.material.side = THREE.DoubleSide
    }
    animated.push({ object: vessel, baseY: 0.05, phase: rng() * 6 })
  }

  if (id === 'forest') {
    house(10, -9, false, -0.35, 1.15)
    house(17, 8, false, 0.5, 0.72)
    for (let i = 0; i < 105; i++) {
      const x = (rng() - 0.5) * 81
      const z = (rng() - 0.5) * 81
      if (
        Math.abs(x) > 39 ||
        Math.abs(z) > 34 ||
        isWater(x, z) ||
        onRoad(x, z) ||
        colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.radius + 2)
      )
        continue
      tree(x, z, 0.7 + rng() * 0.8, rng() < 0.14 ? 'round' : 'pine')
    }
    for (let i = 0; i < 15; i++) {
      const z = -35 + rng() * 70
      rock(stream(z) + (rng() < 0.5 ? -3.2 : 3.2), z, 0.5 + rng() * 0.8)
    }
    // Trail crossings read as timber bridges rather than a road floating on water.
    for (const z of [-24, 24])
      for (let i = -3; i <= 3; i++) {
        const x = stream(z) + i * 0.65
        box(x, 0.17, z, 0.55, 0.18, 3.0, '#b39b76')
      }
    for (let i = 0; i < 5; i++) {
      const hill = mesh(new THREE.IcosahedronGeometry(6, 1), '#718a68')
      hill.position.set(-24 + i * 10, 1.5, -32)
      hill.scale.set(1, 0.7 + rng() * 0.7, 0.75)
      colliders.push({ x: hill.position.x, z: hill.position.z, radius: 5.5 })
    }
  } else if (id === 'sea') {
    // Lighthouse with a gallery, glazing and red conical roof.
    cylinder(-3, 3.5, -20, 1.05, 1.55, 7, '#f3ead3', group, 16)
    cylinder(-3, 3.9, -20, 1.23, 1.26, 0.65, '#bf7864', group, 16)
    cylinder(-3, 7.3, -20, 1.65, 1.65, 0.2, '#a2a298', group, 16)
    cylinder(-3, 8.0, -20, 0.83, 0.83, 1.35, '#9abdc1', group, 12)
    cylinder(-3, 9.15, -20, 0, 1.38, 1.4, '#c17964', group, 12)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      cylinder(
        -3 + Math.cos(a) * 1.5,
        7.75,
        -20 + Math.sin(a) * 1.5,
        0.04,
        0.04,
        0.85,
        '#748886',
        group,
        5,
      )
    }
    colliders.push({ x: -3, z: -20, radius: 1.8 })
    house(18, -9, false, -0.45, 1)
    house(30, 12, false, -Math.PI / 2, 0.75)
    for (let i = 0; i < 10; i++) {
      const z = -33 + i * 7
      const x = 3.3 + Math.sin(i) * 1.5
      const palm = new THREE.Group()
      palm.position.set(x, 0, z)
      group.add(palm)
      const trunk = cylinder(0, 2.8, 0, 0.14, 0.28, 5.6, '#a29372', palm, 7)
      trunk.rotation.z = 0.1
      for (let j = 0; j < 7; j++) {
        const leaf = mesh(new THREE.ConeGeometry(0.55, 4, 4), '#678e65', palm)
        const a = (j / 7) * Math.PI * 2
        leaf.position.set(Math.cos(a) * 1.4, 5.5, Math.sin(a) * 1.4)
        leaf.rotation.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1)
      }
      colliders.push({ x, z, radius: 0.6 })
    }
    for (let i = 0; i < 11; i++) {
      const x = 13 + rng() * 22
      const z = (rng() - 0.5) * 65
      if (
        Math.abs(x) < 39 &&
        Math.abs(z) < 34 &&
        !onRoad(x, z) &&
        !colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.radius + 2)
      )
        tree(x, z, 0.7 + rng() * 0.6, 'round')
    }
    for (let x = -20; x < -4; x += 0.55) box(x, 0.22, 9, 0.46, 0.25, 3.1, '#b79974')
    for (const x of [-19, -14, -9])
      for (const z of [7.6, 10.4]) cylinder(x, -0.2, z, 0.16, 0.16, 1.8, '#827b64')
    boat(-19, -12, true, 1.6)
    boat(-29, 8, true, 1.3)
    boat(-24, 23, true, 0.9)
    for (let z = -33; z < 36; z += 8) box(14, 0.15, z, 0.12, 0.025, 2, '#e7d1a0')
  } else {
    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = 512
    textureCanvas.height = 512
    const ctx = textureCanvas.getContext('2d')!
    ctx.fillStyle = '#919b98'
    ctx.fillRect(0, 0, 512, 512)
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 8; col++) {
        const shade = Math.floor(160 + rng() * 27)
        ctx.fillStyle = `rgb(${shade - 3},${shade + 4},${shade + 2})`
        ctx.fillRect(col * 64 + (row % 2) * 32 + 1.5, row * 64 + 1.5, 61, 61)
        ctx.strokeStyle = 'rgba(238,242,229,0.13)'
        ctx.strokeRect(col * 64 + (row % 2) * 32 + 3, row * 64 + 3, 57, 57)
      }
    const stoneTexture = new THREE.CanvasTexture(textureCanvas)
    stoneTexture.colorSpace = THREE.SRGBColorSpace
    stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping
    const stoneMaterial = material('#c5c6b6')
    stoneMaterial.map = stoneTexture
    for (const side of [-1, 1]) {
      const streetGeometry = new THREE.PlaneGeometry(4.4, 64)
      const streetUv = streetGeometry.getAttribute('uv')
      for (let i = 0; i < streetUv.count; i++)
        streetUv.setXY(i, streetUv.getX(i) * 1.1, streetUv.getY(i) * 16)
      const street = new THREE.Mesh(streetGeometry, stoneMaterial)
      street.rotation.x = -Math.PI / 2
      street.position.set(side * 8.1, 0.095, 0)
      street.receiveShadow = true
      group.add(street)
      box(side * 6.0, 0.15, 0, 0.18, 0.32, 65, '#9ca79c')
      for (let i = 0; i < 5; i++)
        house(
          side * (13.7 + (i % 2) * 1.8),
          -17 + i * 8.5,
          true,
          side < 0 ? Math.PI / 2 : -Math.PI / 2,
          0.83 + rng() * 0.18,
        )
      for (const z of [-31, -11, 10, 31]) tree(side * 10.6, z, 0.8, 'willow')
      for (const z of [-25, 25]) {
        // Two arched bridges connect both banks; rail height follows the traversable deck.
        for (let x = -8.5; x <= 8.5; x += 0.85)
          for (const rail of [-1, 1]) {
            const height = heightAt(x, z)
            box(x, height + 0.58, z + rail * 1.65, 0.16, 1.1, 0.18, '#98a398')
            const bar = box(x, height + 1.07, z + rail * 1.65, 0.95, 0.13, 0.17, '#abb4a6')
            bar.rotation.z = -Math.sin(((x / 9) * Math.PI) / 2) * 0.25
          }
      }
    }
    boat(1.7, -7, false, 1.45)
    boat(-1.7, 15, false, 1.1)
    // Open waterside pavilion, intentionally kept at human scale.
    const pavilion = new THREE.Group()
    pavilion.position.set(-20, 0.15, 4)
    group.add(pavilion)
    box(0, 0.15, 0, 5.5, 0.3, 5.5, '#a8b2a0', pavilion)
    for (const x of [-1.8, 1.8])
      for (const z of [-1.8, 1.8]) cylinder(x, 1.8, z, 0.13, 0.16, 3.3, '#7f7661', pavilion)
    const canopy = mesh(new THREE.ConeGeometry(4.1, 2.0, 4), '#596967', pavilion)
    canopy.position.y = 4.1
    canopy.rotation.y = Math.PI / 4
    cylinder(0, 5.3, 0, 0, 0.22, 0.7, '#7a8874', pavilion)
    colliders.push({ x: -20, z: 4, radius: 2.6 })
  }

  return {
    group,
    ground,
    water,
    colliders,
    isWalkable,
    heightAt,
    spawn:
      id === 'jiangnan' ? new THREE.Vector3(8.1, 0.1, -17) : new THREE.Vector3(routeCenter, 0.1, 0),
    update(time) {
      water.uniforms.time!.value = time
      for (const item of animated) {
        item.object.position.y = item.baseY + Math.sin(time * 0.8 + item.phase) * 0.05
        item.object.rotation.z = Math.sin(time + item.phase) * 0.025
      }
    },
  }
}

export function buildDecoration(kind: DecorationKind): THREE.Group {
  const group = new THREE.Group()
  const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  const add = (geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry, mat(color))
    object.position.set(x, y, z)
    object.castShadow = true
    object.receiveShadow = true
    group.add(object)
    return object
  }
  if (kind === 'bench') {
    for (const x of [-0.9, 0.9]) add(new THREE.BoxGeometry(0.12, 0.7, 0.65), '#62746c', x, 0.35, 0)
    for (const z of [-0.3, -0.08, 0.14, 0.36])
      add(new THREE.BoxGeometry(2.2, 0.1, 0.17), '#b9966c', 0, 0.65, z)
    for (const y of [0.98, 1.22]) add(new THREE.BoxGeometry(2.2, 0.19, 0.1), '#b9966c', 0, y, -0.33)
  } else if (kind === 'lamp') {
    add(new THREE.CylinderGeometry(0.07, 0.11, 3.0, 8), '#68786e', 0, 1.5, 0)
    add(new THREE.BoxGeometry(0.5, 0.65, 0.5), '#ecd8a2', 0, 3.15, 0)
    add(new THREE.ConeGeometry(0.5, 0.3, 4), '#617064', 0, 3.63, 0).rotation.y = Math.PI / 4
    add(new THREE.CylinderGeometry(0.32, 0.4, 0.18, 8), '#748475', 0, 0.09, 0)
  } else {
    const colors = ['#e6b292', '#f1deb1', '#c398a7']
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4
      const radius = 0.2 + i * 0.09
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const height = 0.35 + (i % 3) * 0.15
      add(new THREE.CylinderGeometry(0.025, 0.025, height, 5), '#6d916b', x, height / 2, z)
      add(new THREE.IcosahedronGeometry(0.18, 0), colors[i % 3]!, x, height, z)
    }
  }
  return group
}

export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  root.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Points ||
      object instanceof THREE.Line
    ) {
      geometries.add(object.geometry)
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(mat)
        if (mat instanceof THREE.MeshStandardMaterial && mat.map) textures.add(mat.map)
      }
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  textures.forEach((texture) => texture.dispose())
}
