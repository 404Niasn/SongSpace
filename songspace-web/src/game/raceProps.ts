import * as T from 'three'
import { raceDifficulty } from './raceDifficulty.ts'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { WorldId } from '../worlds/types.ts'

// Each prop owns its resources so the endless track can dispose passed objects.
function builder() {
  const group = new T.Group(), materials = new Map<string, T.MeshStandardMaterial>()
  function mesh(geometry: T.BufferGeometry, color: string, x = 0, y = 0, z = 0) {
    let material = materials.get(color)
    if (!material) {
      material = new T.MeshStandardMaterial({ color, roughness: .7 })
      material.userData.baseColor = material.color.getHex()
      materials.set(color, material)
    }
    const object = new T.Mesh(geometry, material)
    object.position.set(x, y, z)
    object.castShadow = true
    object.receiveShadow = true
    group.add(object)
    return object
  }
  function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0) {
    return mesh(new RoundedBoxGeometry(w, h, d, 1, .025), color, x, y, z)
  }
  return { group, mesh, box }
}

export function buildRaceCoin() {
  const group = new T.Group()
  const gold = new T.MeshStandardMaterial({ color: '#f4c65b', metalness: .58, roughness: .26 })
  const face = new T.MeshStandardMaterial({ color: '#e9b044', metalness: .45, roughness: .36 })
  const relief = new T.MeshStandardMaterial({ color: '#fff0b0', metalness: .5, roughness: .24 })
  const profile = [[0, -.066], [.29, -.066], [.335, -.045], [.345, -.025], [.345, .025], [.335, .045], [.29, .066], [0, .066]]
  const geometry = new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r!, y!)), 40)
  geometry.rotateX(Math.PI / 2)
  group.add(new T.Mesh(geometry, gold))
  for (const side of [-1, 1]) {
    const front = new T.Group()
    front.position.z = side * .07
    if (side < 0) front.rotation.y = Math.PI
    group.add(front)
    const disk = new T.Mesh(new T.CircleGeometry(.293, 40), face)
    front.add(disk)
    const rim = new T.Mesh(new T.TorusGeometry(.3, .012, 6, 40), relief)
    rim.position.z = .008
    front.add(rim)
    // Two connected notes, with clean rounded stems and oval noteheads.
    for (const [x, y] of [[-.075, -.092], [.075, -.055]]) {
      const head = new T.Mesh(new T.SphereGeometry(1, 12, 8), relief)
      head.scale.set(.059, .04, .012)
      head.position.set(x! - .021, y!, .014)
      head.rotation.z = .2
      front.add(head)
      const stem = new T.Mesh(new RoundedBoxGeometry(.024, .208, .018, 1, .008), relief)
      stem.position.set(x! + .023, y! + .098, .014)
      front.add(stem)
    }
    const beam = new T.Mesh(new RoundedBoxGeometry(.177, .043, .022, 1, .008), relief)
    beam.rotation.z = .24
    beam.position.set(.022, .118, .016)
    front.add(beam)
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8
      const bead = new T.Mesh(new T.SphereGeometry(.009, 6, 4), gold)
      bead.position.set(Math.cos(a) * .263, Math.sin(a) * .263, .008)
      front.add(bead)
    }
  }
  // Fine reeding around the edge catches light while the coin turns.
  const edge = new T.BoxGeometry(.011, .048, .067)
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12
    const ridge = new T.Mesh(edge, gold)
    ridge.position.set(Math.cos(a) * .342, Math.sin(a) * .342, 0)
    ridge.rotation.z = a
    group.add(ridge)
  }
  // Bake details into three material batches instead of dozens of draw calls per coin.
  group.updateMatrixWorld(true)
  const batches = new Map<T.Material, T.BufferGeometry[]>(), originals = new Set<T.BufferGeometry>()
  group.traverse(object => {
    if (!(object instanceof T.Mesh)) return
    const material = object.material as T.Material
    const geometry = (object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()).applyMatrix4(object.matrixWorld)
    const list = batches.get(material) || []
    list.push(geometry)
    batches.set(material, list)
    originals.add(object.geometry)
  })
  const coin = new T.Group()
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries)
    if (merged) coin.add(new T.Mesh(merged, material))
    for (const geometry of geometries) geometry.dispose()
  }
  for (const geometry of originals) geometry.dispose()
  return coin
}

export function buildRaceObstacle(world: WorldId, moving: boolean, variant = 0) {
  const { group, mesh, box } = builder()
  const wood = world === 'jiangnan' ? '#998665' : world === 'sea' ? '#a78964' : '#937255'
  const wheels: T.Mesh[] = []
  const floor = moving ? .35 : .06
  if (moving) {
    for (let i = 0; i < 4; i++) box(.24, .065, .76, wood, (i - 1.5) * .255, .3)
    for (const z of [-.26, .26]) {
      const axle = new T.CylinderGeometry(.025, .025, 1.14, 8)
      axle.rotateZ(Math.PI / 2)
      mesh(axle, '#53625e', 0, .18, z)
      for (const x of [-.54, .54]) {
        const tire = new T.CylinderGeometry(.17, .17, .095, 12)
        tire.rotateZ(Math.PI / 2)
        wheels.push(mesh(tire, '#4c5552', x, .18, z))
        const hub = new T.CylinderGeometry(.06, .06, .1, 10)
        hub.rotateZ(Math.PI / 2)
        mesh(hub, '#b9b8a8', x, .18, z)
      }
    }
    for (const x of [-.35, .35]) box(.045, .045, .55, wood, x, .4, .55).rotation.x = -.24
  }
  if (world === 'forest') {
    for (const [y, z] of [[floor + .18, -.18], [floor + .18, .2], [floor + .46, .02]]) {
      const log = new T.CylinderGeometry(.165, .19, 1.13, 12)
      log.rotateZ(Math.PI / 2)
      mesh(log, '#846148', 0, y!, z!)
      for (const x of [-.571, .571]) {
        const cut = new T.CylinderGeometry(.15, .15, .012, 16)
        cut.rotateZ(Math.PI / 2)
        mesh(cut, '#d8b483', x, y!, z!)
        for (const radius of [.065, .115]) {
          const ring = new T.TorusGeometry(radius, .004, 4, 16)
          ring.rotateY(Math.PI / 2)
          mesh(ring, '#a98159', x * 1.012, y!, z!)
        }
      }
      for (const angle of [0, Math.PI * .6, Math.PI * 1.3]) {
        box(.99, .013, .013, '#6e513d', 0, y! + Math.sin(angle) * .17, z! + Math.cos(angle) * .17)
      }
    }
    if (!moving) {
      for (const x of [-.35, .29]) {
        const moss = mesh(new T.SphereGeometry(.12, 8, 6), '#82955e', x, .65, .05)
        moss.scale.set(1.3, .22, .9)
      }
    }
  } else if (world === 'sea') {
    box(.98, .48, .63, wood, 0, floor + .24)
    for (const z of [-.325, .325]) {
      for (const x of [-.42, .42]) box(.064, .49, .035, '#d0b78a', x, floor + .24, z)
      box(.87, .06, .033, '#d0b78a', 0, floor + .24, z).rotation.z = -.4
      for (const y of [.14, .31]) box(.84, .012, .016, '#705c46', 0, floor + y, z)
    }
    for (let i = 0; i < 3; i++) {
      const rope = new T.TorusGeometry(.13 + i * .017, .014, 5, 18)
      rope.rotateX(Math.PI / 2)
      mesh(rope, '#e2c89c', -.19, floor + .5, .05)
    }
    mesh(new T.SphereGeometry(.14, 12, 8), variant % 2 ? '#da926e' : '#d2b36a', .25, floor + .6, -.04)
    box(.025, .055, .025, '#667f7a', .25, floor + .745, -.04)
  } else {
    box(1.02, .33, .66, wood, 0, floor + .165)
    for (const z of [-.34, .34]) {
      for (let i = 0; i < 9; i++) box(.025, .32, .019, '#d1bb87', (i - 4) * .108, floor + .17, z)
      for (const y of [.055, .16, .28]) box(1.04, .018, .022, '#d1bb87', 0, floor + y, z)
    }
    for (const x of [-.25, .25]) {
      const points = [[0, 0], [.1, 0], [.15, .06], [.16, .16], [.12, .25], [.07, .28], [.07, .31]]
      const jar = mesh(new T.LatheGeometry(points.map(([r, y]) => new T.Vector2(r!, y!)), 16), '#b1cdc7', x, floor + .33, 0)
      jar.material.roughness = .25
      const lip = new T.TorusGeometry(.07, .012, 6, 16)
      lip.rotateX(Math.PI / 2)
      mesh(lip, '#e0e7d8', x, floor + .64, 0)
      const band = new T.TorusGeometry(.147, .009, 5, 16)
      band.rotateX(Math.PI / 2)
      mesh(band, '#658a93', x, floor + .42, 0)
    }
  }
  group.userData.wheels = wheels
  return group
}

export function freezeRaceObstacle(group: T.Object3D, frozen: boolean) {
  if (group.userData.frozen === frozen) return
  group.userData.frozen = frozen
  group.traverse(object => {
    if (!(object instanceof T.Mesh)) return
    const material = object.material as T.MeshStandardMaterial
    material.color.set(frozen ? '#bce5eb' : material.userData.baseColor)
    material.emissive.set(frozen ? '#183a42' : '#000000')
  })
}

export function raceRow(row: number) {
  const section = Math.floor(row / 12), step = row % 12
  const primary = (section % 3) - 1
  const coinLane = step < 4 ? primary : step < 8 ? 0 : -primary
  const obstacleLane = ((section + Math.floor(step / 3) + 1) % 3) - 1
  const difficulty = raceDifficulty(15 + row * 7)
  const obstacle = row >= 7 && difficulty.obstacleSteps.includes(step)
  return {
    coinLane: obstacle && coinLane === obstacleLane ? (obstacleLane + 1 > 1 ? -1 : obstacleLane + 1) : coinLane,
    obstacleLane,
    obstacle,
    moving: obstacle && step === 9 && section % difficulty.movingFrequency === difficulty.movingFrequency - 1,
  }
}
