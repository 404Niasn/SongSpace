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
  const wood = world === 'space' ? '#4b6079' : world === 'jiangnan' ? '#998665' : world === 'sea' ? '#a78964' : '#937255'
  // Obstacle rows often occur every three steps; divide the route index so all styles appear.
  const style = Math.floor(variant / 3) % 3
  const names = {
    forest: ['原木堆', '林地石墩', '育苗木箱'], sea: ['码头货箱', '浮标绳桶', '渔笼'],
    jiangnan: ['瓷器竹筐', '茶叶木箱', '荷叶陶缸'], fuji: ['樱花竹束', '石灯笼运输架', '祭典灯笼箱'],
    space: ['陨石碎块', '轨道补给箱', '巡检机器人'],
  }
  group.name = names[world][style]!
  group.userData.obstacleKind = `${world}:${style}`
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
  if (world === 'fuji' || world === 'space' || style !== 0) {
    themedBody({ group, mesh, box }, world, style, floor)
  } else if (world === 'forest') {
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
  // Keep rotating wheels separate; batch static detail by material for the endless track.
  const batches = new Map<T.Material, T.BufferGeometry[]>()
  for (const object of [...group.children]) {
    if (!(object instanceof T.Mesh) || wheels.includes(object)) continue
    object.updateMatrix()
    const geometry = (object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()).applyMatrix4(object.matrix)
    const material = object.material as T.Material, geometries = batches.get(material) || []
    geometries.push(geometry); batches.set(material, geometries)
    object.geometry.dispose(); group.remove(object)
  }
  for (const [material, geometries] of batches) {
    const object = new T.Mesh(mergeGeometries(geometries)!, material)
    object.castShadow = true; object.receiveShadow = true; group.add(object)
    geometries.forEach(geometry => geometry.dispose())
  }
  group.userData.wheels = wheels
  return group
}

function themedBody(b: ReturnType<typeof builder>, world: WorldId, style: number, floor: number) {
  const { mesh, box } = b
  const cylinder = (top: number, bottom: number, height: number, color: string, x: number, y: number, z = 0, segments = 16) => mesh(new T.CylinderGeometry(top, bottom, height, segments), color, x, floor + y, z)
  const ring = (radius: number, color: string, y: number, x = 0, z = 0, tube = .016) => {
    const geometry = new T.TorusGeometry(radius, tube, 6, 24); geometry.rotateX(Math.PI / 2)
    return mesh(geometry, color, x, floor + y, z)
  }
  const crate = (color: string, trim: string) => {
    box(1.02, .43, .66, color, 0, floor + .215)
    for (const z of [-.34, .34]) {
      for (const x of [-.43, .43]) box(.07, .46, .045, trim, x, floor + .24, z)
      for (const y of [.08, .24, .4]) box(.85, .014, .025, trim, 0, floor + y, z)
    }
  }
  if (world === 'forest' && style === 1) {
    const geometry = new T.IcosahedronGeometry(.48, 1)
    const rock = mesh(geometry, '#829080', 0, floor + .32); rock.scale.set(1.18, .75, .85)
    for (let i = 0; i < 6; i++) {
      const moss = mesh(new T.SphereGeometry(.11, 8, 6), ['#93a467', '#acb980'][i % 2]!, Math.sin(i * 2.4) * .25, floor + .58, Math.cos(i * 2.4) * .22); moss.scale.y = .35
    }
    for (const x of [-.35, .32]) {
      cylinder(.025, .035, .15, '#e1d5bc', x, .12, .22, 6)
      const cap = mesh(new T.SphereGeometry(.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#ba8667', x, floor + .2, .22)
      cap.scale.y = .7
    }
  } else if (world === 'forest') {
    crate('#8a694a', '#bca27a')
    for (const x of [-.24, .24]) {
      cylinder(.095, .07, .16, '#bb9271', x, .49)
      cylinder(.014, .02, .2, '#6d8050', x, .65, 0, 6)
      for (let i = 0; i < 3; i++) { const leaf = mesh(new T.SphereGeometry(.07, 8, 6), '#88a563', x + Math.sin(i * 2.4) * .05, floor + .69, Math.cos(i * 2.4) * .05); leaf.scale.set(1, .4, .7) }
    }
  } else if (world === 'sea' && style === 1) {
    cylinder(.26, .3, .43, '#7d9d9f', -.12, .215)
    for (const y of [.07, .36]) ring(.29, '#c5d5cd', y, -.12)
    for (let i = 0; i < 4; i++) ring(.16 + i * .018, '#ddc399', .46, -.12, 0, .018)
    const buoy = mesh(new T.SphereGeometry(.18, 16, 12), '#e48e62', .31, floor + .34, .08); buoy.scale.y = 1.35
    cylinder(.05, .05, .12, '#f4dfbe', .31, .6, .08)
    ring(.04, '#687e85', .69, .31, .08, .008)
  } else if (world === 'sea') {
    box(1.05, .08, .66, '#a48966', 0, floor + .04)
    for (let i = 0; i < 6; i++) {
      const hoop = new T.TorusGeometry(.28, .016, 5, 18, Math.PI); hoop.rotateY(Math.PI / 2)
      mesh(hoop, '#a6b2a1', -.46 + i * .185, floor + .1, 0)
      for (const z of [-.32, .32]) box(.025, .29, .025, '#869b91', -.46 + i * .185, floor + .2, z)
    }
    for (const z of [-.28, -.14, 0, .14, .28]) box(.96, .02, .02, '#a6b2a1', 0, floor + .36 - Math.abs(z) * .4, z)
    const float = mesh(new T.SphereGeometry(.1, 12, 8), '#de926c', .24, floor + .47, .05); float.scale.y = 1.25
  } else if (world === 'jiangnan' && style === 1) {
    crate('#85694e', '#bda37b')
    for (const x of [-.25, .25]) {
      cylinder(.12, .12, .19, '#79978e', x, .53)
      cylinder(.13, .13, .035, '#b8c6aa', x, .64)
      cylinder(.035, .035, .025, '#e0dac0', x, .67)
    }
    box(.22, .2, .028, '#d5c6a0', 0, floor + .25, .366)
    for (let i = 0; i < 3; i++) box(.13 - i * .02, .014, .008, '#7b8862', 0, floor + .21 + i * .035, .387)
  } else if (world === 'jiangnan') {
    const profile = [[0,0],[.25,0],[.31,.14],[.32,.35],[.26,.5],[.24,.54]]
    const jar = mesh(new T.LatheGeometry(profile.map(([r,y]) => new T.Vector2(r!,y!)), 24), '#819f98', 0, floor)
    jar.material.roughness = .3; ring(.245, '#c3c9ac', .54)
    for (let i = 0; i < 3; i++) {
      const leaf = mesh(new T.SphereGeometry(.18, 12, 8), ['#819d73', '#a1b887'][i % 2]!, Math.sin(i * 2.4) * .19, floor + .57 + i * .03, Math.cos(i * 2.4) * .14)
      leaf.scale.set(1, .12, .8); leaf.rotation.z = Math.sin(i) * .2
    }
  } else if (world === 'fuji' && style === 0) {
    for (let i = 0; i < 5; i++) {
      const bamboo = new T.CylinderGeometry(.065, .08, 1.05, 12); bamboo.rotateZ(Math.PI / 2)
      const y = .12 + Math.floor(i / 3) * .14, z = (i % 3 - 1) * .15
      mesh(bamboo, ['#a7b67c', '#c2c69a'][i % 2]!, 0, floor + y, z)
      for (const x of [-.53, .53]) { const cut = new T.CylinderGeometry(.055, .055, .01, 12); cut.rotateZ(Math.PI / 2); mesh(cut, '#e9d8ae', x, floor + y, z) }
    }
    for (const x of [-.32, .32]) {
      for (const y of [.06, .32]) box(.035, .025, .5, '#b99072', x, floor + y)
      for (const z of [-.24, .24]) box(.035, .28, .025, '#b99072', x, floor + .19, z)
    }
    const branch = new T.CylinderGeometry(.012, .018, .8, 6); branch.rotateZ(1.2); mesh(branch, '#86656a', 0, floor + .45, .08)
    for (let i = 0; i < 7; i++) { const bloom = mesh(new T.IcosahedronGeometry(.07, 1), i % 2 ? '#f8d6e2' : '#eba9c5', -.3 + i * .1, floor + .44 + Math.sin(i) * .07, .08); bloom.scale.y = .65 }
  } else if (world === 'fuji' && style === 1) {
    box(.95, .1, .63, '#ad8c6f', 0, floor + .05)
    cylinder(.25, .32, .12, '#9caa9d', 0, .15, 0, 8)
    cylinder(.1, .14, .22, '#b6beac', 0, .32, 0, 8)
    box(.42, .09, .42, '#bfc5b5', 0, floor + .46)
    for (const x of [-.14, .14]) for (const z of [-.14, .14]) box(.055, .17, .055, '#9ca993', x, floor + .58, z)
    const roof = new T.ConeGeometry(.38, .16, 4); roof.rotateY(Math.PI / 4); mesh(roof, '#a5b29d', 0, floor + .69)
    for (const x of [-.43, .43]) box(.06, .37, .63, '#bc9a77', x, floor + .23)
    const light = mesh(new T.SphereGeometry(.065, 8, 6), '#edcb8e', 0, floor + .59); light.material.emissive.set('#493316')
  } else if (world === 'fuji') {
    crate('#84676b', '#c6a493')
    for (const x of [-.24, .24]) {
      const lantern = mesh(new T.SphereGeometry(.16, 16, 12), '#df9baa', x, floor + .58); lantern.scale.set(.8, 1, .8)
      for (const y of [.43, .72]) cylinder(.08, .08, .025, '#8e6870', x, y)
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; box(.012, .22, .012, '#ecc8c2', x + Math.sin(a) * .126, floor + .58, Math.cos(a) * .126) }
    }
  } else if (world === 'space' && style === 0) {
    const geometry = new T.IcosahedronGeometry(.46, 2), p = geometry.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), warp = 1 + .055 * Math.sin(x * 19 + y * 11) * Math.cos(z * 17)
      p.setXYZ(i, x * warp, y * warp, z * warp)
    }
    geometry.computeVertexNormals()
    const rock = mesh(geometry, '#7787a0', -.08, floor + .36); rock.scale.set(1.2, .8, .85)
    for (let i = 0; i < 4; i++) {
      const shard = mesh(new T.OctahedronGeometry(.09 + i * .012, 0), '#8de4eb', .12 + i * .06, floor + .47 + i * .012, -.09 + i * .055)
      shard.scale.set(.5, 1.6, .7); shard.rotation.z = -.3 + i * .16; shard.material.emissive.set('#2b617a'); shard.material.emissiveIntensity = .45
    }
    for (let i = 0; i < 3; i++) box(.23, .018, .025, '#a5b0bd', -.18 + i * .12, floor + .66 - i * .035, .13 - i * .08).rotation.z = -.3
  } else if (world === 'space' && style === 1) {
    box(1.02, .43, .66, '#506983', 0, floor + .24)
    box(1.08, .08, .72, '#98aebd', 0, floor + .49)
    for (const x of [-.46, .46]) {
      for (const z of [-.31, .31]) box(.1, .47, .1, '#98aebd', x, floor + .25, z)
      box(.09, .08, .74, '#98aebd', x, floor + .05)
      box(.065, .025, .48, '#9ce7ed', x * .78, floor + .54).material.emissive.set('#316e87')
    }
    box(.62, .24, .025, '#344755', 0, floor + .27, .347)
    for (const x of [-.35, .35]) {
      const grip = new T.TorusGeometry(.075, .012, 5, 16, Math.PI); grip.rotateZ(Math.PI)
      mesh(grip, '#98aebd', x, floor + .28, .369)
    }
    for (let i = 0; i < 4; i++) box(.055, .075, .018, '#e4b97c', -.16 + i * .105, floor + .27, .372).rotation.z = -.4
    const latch = box(.18, .065, .025, '#98aebd', 0, floor + .44, .367); latch.material.metalness = .65
  } else {
    box(.68, .22, .52, '#697f98', 0, floor + .24)
    cylinder(.18, .24, .1, '#b0bfce', 0, .4)
    const dome = mesh(new T.SphereGeometry(.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#a8c4d7', 0, floor + .46)
    dome.material.metalness = .45; dome.material.roughness = .35
    for (const x of [-.34, .34]) {
      const tread = box(.17, .2, .64, '#344755', x, floor + .1)
      for (let j = 0; j < 7; j++) box(.18, .015, .03, '#68818e', x, floor + .2, -.27 + j * .09)
      void tread
    }
    const eye = mesh(new T.SphereGeometry(.065, 12, 8), '#95e7f0', 0, floor + .44, .225); eye.material.emissive.set('#429ab3')
    for (const x of [-.11, .11]) {
      const lens = new T.CylinderGeometry(.045, .055, .04, 16); lens.rotateX(Math.PI / 2)
      mesh(lens, '#344755', x, floor + .45, .205)
      const rim = new T.TorusGeometry(.055, .008, 5, 20); mesh(rim, '#b0bfce', x, floor + .45, .231)
    }
    for (let i = 0; i < 4; i++) box(.035, .13, .018, '#344755', -.09 + i * .06, floor + .25, -.275)
    cylinder(.014, .018, .16, '#8caabb', .15, .69, 0, 6)
    mesh(new T.SphereGeometry(.02, 8, 6), '#e8bc87', .15, floor + .75)
  }
}

export function freezeRaceObstacle(group: T.Object3D, frozen: boolean) {
  if (group.userData.frozen === frozen) return
  group.userData.frozen = frozen
  group.traverse(object => {
    if (!(object instanceof T.Mesh)) return
    const material = object.material as T.MeshStandardMaterial
    material.userData.baseEmissive ??= material.emissive.getHex()
    material.color.set(frozen ? '#bce5eb' : material.userData.baseColor)
    material.emissive.set(frozen ? '#183a42' : material.userData.baseEmissive)
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
