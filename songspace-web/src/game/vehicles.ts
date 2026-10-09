import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export type VehicleModel = 'bicycle-rack' | 'ae86' | 'motorcycle'
export const VEHICLES = {
  'bicycle-rack': { name: '后货架旧式单车', speed: 14, radius: .48 },
  ae86: { name: 'AE86', speed: 16, radius: .32 },
  motorcycle: { name: '烂摩托', speed: 15, radius: .44 },
} as const

// All three models face -Z; rotating wheels use their local X axle.
export function buildVehicle(kind: VehicleModel) {
  const group = new T.Group(), wheels: T.Group[] = []
  group.name = kind
  const materials = new Map<string, T.MeshStandardMaterial>()
  function material(color: string, metal = false) {
    const key = color + metal
    if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness: metal ? .38 : .78, metalness: metal ? .7 : .05 }))
    return materials.get(key)!
  }
  function mesh(name: string, geometry: T.BufferGeometry, color: string, x: number, y: number, z: number, parent: T.Object3D = group, metal = false) {
    const m = new T.Mesh(geometry, material(color, metal))
    m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m)
    return m
  }
  function box(name: string, color: string, x: number, y: number, z: number, w: number, h: number, d: number, round = .015) {
    return mesh(name, new RoundedBoxGeometry(w, h, d, 2, round), color, x, y, z)
  }
  function tube(name: string, color: string, a: number[], b: number[], radius = .025, parent: T.Object3D = group) {
    const from = new T.Vector3(...a as [number, number, number]), to = new T.Vector3(...b as [number, number, number])
    const direction = to.clone().sub(from)
    const m = mesh(name, new T.CylinderGeometry(radius, radius, direction.length(), 10), color, 0, 0, 0, parent, true)
    m.position.copy(from).add(to).multiplyScalar(.5)
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize())
    return m
  }
  function wheel(x: number, z: number, radius: number, width: number, spokes: boolean) {
    const w = new T.Group(); w.name = 'wheel'; w.position.set(x, radius + .045, z); group.add(w); wheels.push(w)
    const tire = mesh('tire', spokes ? new T.TorusGeometry(radius - width * .45, width * .45, 12, 48) : new T.CylinderGeometry(radius, radius, width, 48), '#262b2a', 0, 0, 0, w)
    if (spokes) tire.rotation.y = Math.PI / 2
    else tire.rotation.z = Math.PI / 2
    const rim = mesh('rim', new T.TorusGeometry(radius - width, .016, 8, 40), '#acb1aa', 0, 0, 0, w, true); rim.rotation.y = Math.PI / 2
    const hub = mesh('axle', new T.CylinderGeometry(.055, .055, width + .06, 12), '#5c6460', 0, 0, 0, w, true); hub.rotation.z = Math.PI / 2
    for (let i = 0; i < (spokes ? 32 : 8); i++) {
      const a = i * Math.PI * 2 / (spokes ? 32 : 8)
      tube('spoke', '#b5b9b0', [0, 0, 0], [0, Math.sin(a) * (radius - width), Math.cos(a) * (radius - width)], spokes ? .006 : .023, w)
    }
    if (!spokes) for (const side of [-1, 1]) {
      const face = side * (width / 2 + .003)
      const disc = mesh('alloy-face', new T.CylinderGeometry(.215, .215, .009, 32), '#444c47', face, 0, 0, w, true); disc.rotation.z = Math.PI / 2
      const lip = mesh('polished-rim-lip', new T.TorusGeometry(.224, .012, 8, 40), '#b8bdb8', face, 0, 0, w, true); lip.rotation.y = Math.PI / 2
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4
        tube('alloy-spoke', '#828981', [face + side * .008, Math.sin(a) * .052, Math.cos(a) * .052], [face + side * .008, Math.sin(a) * .198, Math.cos(a) * .198], .022, w)
      }
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; mesh('wheel-bolt', new T.SphereGeometry(.009, 6, 4), '#babeb4', face + side * .021, Math.sin(a) * .044, Math.cos(a) * .044, w, true) }
    }
  }
  function fender(z: number, radius: number, width: number, color: string) {
    const f = mesh('mudguard', new T.TorusGeometry(radius, width, 8, 32, Math.PI), color, 0, radius - .025, z, group, true)
    f.rotation.y = Math.PI / 2
  }
  function sideProfile(name: string, points: number[][], width: number, color: string) {
    const s = new T.Shape(); points.forEach(([z, y], i) => i ? s.lineTo(z!, y!) : s.moveTo(z!, y!)); s.closePath()
    const geometry = new T.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, steps: 1 })
    const m = mesh(name, geometry, color, width / 2, 0, 0); m.rotation.y = -Math.PI / 2
    return m
  }

  function panel(name: string, points: number[][], color: string) {
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(points.flat(), 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals()
    const m = mesh(name, geometry, color, 0, 0, 0)
    m.material = m.material.clone(); m.material.side = T.DoubleSide
    return m
  }
  function curvedTube(name: string, color: string, points: number[][], radius: number) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p as [number, number, number])))
    return mesh(name, new T.TubeGeometry(curve, Math.max(32, points.length * 2), radius, 8, false), color, 0, 0, 0, group, true)
  }
  function motorcycleFender(z: number, color: string) {
    const positions: number[] = [], indices: number[] = []
    for (let i = 0; i <= 32; i++) {
      const a = .15 + i / 32 * (Math.PI - .3)
      for (const side of [-1, 1]) positions.push(side * .075, .485 + Math.sin(a) * .51, z + Math.cos(a) * .51)
      if (i < 32) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2) }
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
    const m = mesh('pressed-steel-mudguard', geometry, color, 0, 0, 0); m.material = m.material.clone(); m.material.side = T.DoubleSide
  }

  if (kind === 'bicycle-rack') {
    wheel(0, -.85, .48, .07, true); wheel(0, .85, .48, .07, true)
    const a = [0, .525, -.85], c = [0, .525, .85], d = [0, .66, .08], e = [0, 1.15, .4], f = [0, 1.2, -.6]
    for (const [u, v] of [[a, f], [f, e], [e, d], [d, f], [d, c], [e, c]]) tube('steel-frame', '#354b41', u!, v!, .035)
    tube('saddle-post', '#999f94', e, [0, 1.36, .4])
    box('leather-saddle', '#6b4631', 0, 1.38, .4, .29, .08, .38, .035)
    tube('steering-stem', '#999f94', f, [0, 1.45, -.72])
    for (const side of [-1, 1]) {
      tube('swept-handlebar', '#bec2b7', [0, 1.45, -.72], [side * .39, 1.46, -.72])
      box('rubber-grip', '#383c35', side * .39, 1.46, -.72, .15, .07, .10)
      tube('rack-support', '#a5aa9d', [side * .13, .525, .85], [side * .18, 1.12, 1.07], .015)
      tube('rack-rail', '#a5aa9d', [side * .18, 1.12, .55], [side * .18, 1.12, 1.2], .019)
    }
    for (let i = 0; i < 7; i++) tube('rear-rack', '#a5aa9d', [-.18, 1.12, .55 + i * .10], [.18, 1.12, .55 + i * .10], .012)
    fender(-.85, .56, .025, '#889186'); fender(.85, .56, .025, '#889186')
    const chain = mesh('chainring', new T.TorusGeometry(.16, .017, 8, 28), '#a6ac9e', .08, .7, .05); chain.rotation.y = Math.PI / 2
    box('chain-guard', '#354b41', .09, .67, .48, .04, .13, .68)
    box('rear-reflector', '#a33927', 0, 1.11, 1.21, .12, .07, .04)
    tube('kickstand', '#6e7569', [.06, .6, .38], [.12, .1, .6], .012)
    const lamp = mesh('front-lamp', new T.CylinderGeometry(.085, .085, .10, 20), '#e7dbad', 0, 1.26, -.78); lamp.rotation.x = Math.PI / 2
  } else if (kind === 'motorcycle') {
    wheel(0, -.9, .44, .13, true); wheel(0, .86, .44, .13, true)
    for (const side of [-1, 1]) {
      tube('front-fork', '#939b91', [side * .10, .485, -.9], [side * .10, 1.3, -.63], .035)
      tube('swingarm', '#6b7367', [side * .1, .485, .86], [side * .1, .65, .08], .035)
      tube('rear-suspension', '#727c72', [side * .14, .57, .79], [side * .14, 1.1, .49], .025)
      const spring: number[][] = []
      const start = new T.Vector3(side * .14, .62, .76), end = new T.Vector3(side * .14, 1.05, .52)
      const axis = end.clone().sub(start).normalize(), across = new T.Vector3(1, 0, 0), around = axis.clone().cross(across)
      for (let i = 0; i <= 100; i++) { const p = start.clone().lerp(end, i / 100).addScaledVector(across, Math.cos(i / 100 * Math.PI * 16) * .045).addScaledVector(around, Math.sin(i / 100 * Math.PI * 16) * .045); spring.push(p.toArray()) }
      curvedTube('suspension-coil', '#b0ada0', spring, .008)
      tube('frame', '#4d5b4c', [side * .12, .55, .06], [side * .12, 1.20, -.45], .034)
      tube('seat-rail', '#4d5b4c', [side * .12, .7, .05], [side * .16, 1.3, .9], .03)
      tube('handlebar', '#9b9f90', [0, 1.42, -.70], [side * .39, 1.46, -.72], .027)
      box('grip', '#3b3c33', side * .39, 1.46, -.72, .14, .075, .095)
      tube('mirror-stalk', '#7e8778', [side * .31, 1.46, -.72], [side * .43, 1.78, -.8], .011)
      const mirror = mesh('mirror', new T.SphereGeometry(.08, 12, 8), '#bec9c5', side * .43, 1.78, -.8); mirror.scale.set(1, .7, .25)
    }
    const tankProfile = [[0, -.34], [.10, -.31], [.18, -.22], [.22, -.06], [.21, .10], [.15, .24], [0, .30]].map(([r, z]) => new T.Vector2(r!, z!))
    const tank = mesh('faded-fuel-tank', new T.LatheGeometry(tankProfile, 32), '#788574', 0, 1.16, -.34)
    tank.rotation.x = Math.PI / 2; tank.scale.z = .78
    mesh('fuel-cap', new T.CylinderGeometry(.055, .055, .025, 16), '#acaa97', 0, 1.33, -.32)
    box('worn-long-seat', '#403c31', 0, 1.38, .52, .35, .10, .76, .045)
    for (let i = 0; i < 8; i++) box('seat-seam', '#59513e', 0, 1.435, .2 + i * .085, .28, .006, .01, .002)
    box('engine', '#585c50', 0, .68, -.12, .34, .34, .36, .05)
    for (let i = 0; i < 7; i++) box('cooling-fin', '#8c9282', 0, .69 + i * .03, -.22, .40, .012, .27, .004)
    for (const side of [-1, 1]) {
      const casing = mesh('crankcase-cover', new T.CylinderGeometry(.145, .145, .045, 24), '#737b70', side * .19, .64, -.03, group, true); casing.rotation.z = Math.PI / 2
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; mesh('engine-bolt', new T.SphereGeometry(.012, 6, 4), '#b6b8a5', side * .219, .64 + Math.sin(a) * .10, -.03 + Math.cos(a) * .10, group, true) }
      box('side-cover', '#63725d', side * .17, 1.08, .30, .045, .23, .32, .04)
      for (let i = 0; i < 4; i++) box('side-cover-vent', '#353f35', side * .195, 1.07 + i * .026, .28, .008, .009, .16, .002)
    }
    curvedTube('exhaust-header', '#776646', [[.16, .80, -.32], [.19, .51, -.38], [.24, .39, -.17], [.25, .42, .28]], .035)
    tube('exhaust', '#807b69', [.25, .42, .23], [.25, .48, 1.10], .062)
    const outlet = mesh('exhaust-outlet', new T.CylinderGeometry(.045, .045, .02, 16), '#222923', .25, .484, 1.115); outlet.rotation.x = Math.PI / 2
    const lamp = mesh('round-headlight', new T.CylinderGeometry(.148, .148, .18, 32), '#536355', 0, 1.24, -.78, group, true); lamp.rotation.x = Math.PI / 2
    mesh('headlight-bezel', new T.TorusGeometry(.135, .016, 8, 32), '#b0b4a6', 0, 1.24, -.878, group, true)
    const lens = mesh('headlight-glass', new T.CircleGeometry(.123, 32), '#d8d1ad', 0, 1.24, -.884); lens.rotation.y = Math.PI
    for (let i = -3; i <= 3; i++) tube('headlight-fluting', '#b9b697', [i * .026, 1.24 - Math.sqrt(.116 ** 2 - (i * .026) ** 2), -.889], [i * .026, 1.24 + Math.sqrt(.116 ** 2 - (i * .026) ** 2), -.889], .003)
    box('taillight', '#8d382b', 0, 1.24, .98, .22, .09, .07)
    box('license-plate', '#b4aa8b', 0, 1.1, 1.06, .24, .14, .025)
    motorcycleFender(-.9, '#768370'); motorcycleFender(.86, '#768370')
    for (let i = 0; i < 20; i++) {
      const side = i % 2 ? 1 : -1
      const z = -.18 + (i / 20) * .36, angle = i * 2.39996
      const r = .21 - Math.abs(z) * .15
      const y = Math.sin(angle) * r * .78, x = side * Math.sqrt(r * r - (y / .78) ** 2)
      const patch = new T.Shape(); for (let j = 0; j < 7; j++) { const a = j * Math.PI * 2 / 7, radius = .013 + ((i + j * 3) % 7) * .002; if (j) patch.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); else patch.moveTo(Math.cos(a) * radius, Math.sin(a) * radius) } patch.closePath()
      const rust = mesh('rust-chip', new T.ShapeGeometry(patch), i % 3 ? '#855e38' : '#b29b71', x + side * .002, 1.16 + y, -.34 + z)
      rust.rotation.y = side * Math.PI / 2
    }
    tube('foot-rest', '#747969', [-.31, .70, .22], [.31, .70, .22], .023)
  } else {
    // Three-door Trueno: long wedge bonnet, narrow low cabin and sloping liftback.
    const white = '#f2f1ea', black = '#242727', glass = '#52656a'
    const paint = new T.MeshStandardMaterial({ color: white, roughness: .3, metalness: .16 })
    for (const x of [-.655, .655]) for (const z of [-1.04, .94]) wheel(x, z, .285, .15, false)
    const bodyOutline: number[][] = [[-1.67, .40], [-1.67, .60], [-1.45, .64], [-.57, .73], [.98, .73], [1.62, .65], [1.67, .42]]
    for (const center of [.94, -1.04]) {
      bodyOutline.push([center + .335, .26])
      for (let i = 0; i <= 20; i++) { const a = i * Math.PI / 20; bodyOutline.push([center + Math.cos(a) * .335, .33 + Math.sin(a) * .335]) }
      bodyOutline.push([center - .335, .26])
    }
    bodyOutline.push([-1.67, .26])
    // Thin side skins leave an actual hollow passenger compartment.
    for (const side of [-1, 1]) {
      const body = sideProfile('white-body', bodyOutline, .024, white); body.position.x = side * .655; body.material = paint
      // Clip the finished shell, preserving wheel openings through the two-tone paint.
      const attribute = body.geometry.getAttribute('position'), index = body.geometry.index, clipped: number[] = [], upper: number[] = []
      for (let i = 0; i < (index?.count || attribute.count); i += 3) {
        const triangle = [0, 1, 2].map(j => new T.Vector3().fromBufferAttribute(attribute, index ? index.getX(i + j) : i + j))
        for (const below of [true, false]) {
          const polygon: T.Vector3[] = []
          for (let j = 0; j < 3; j++) {
            const a = triangle[j]!, b = triangle[(j + 1) % 3]!
            if ((a.y <= .47) === below) polygon.push(a)
            if ((a.y <= .47) !== (b.y <= .47)) polygon.push(a.clone().lerp(b, (.47 - a.y) / (b.y - a.y)))
          }
          for (let j = 1; j < polygon.length - 1; j++) (below ? clipped : upper).push(...polygon[0]!.toArray(), ...polygon[j]!.toArray(), ...polygon[j + 1]!.toArray())
        }
      }
      body.geometry.dispose(); body.geometry = new T.BufferGeometry(); body.geometry.setAttribute('position', new T.Float32BufferAttribute(upper, 3)); body.geometry.computeVertexNormals()
      const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(clipped, 3)); geometry.computeVertexNormals()
      const lower = mesh('panda-lower-body', geometry, black, body.position.x, 0, 0); lower.rotation.copy(body.rotation)
    }
    box('cabin-floor', '#303432', 0, .36, .15, 1.25, .065, 2.10)
    panel('bonnet', [[-.64, .613, -1.65], [.64, .613, -1.65], [.64, .735, -.59], [-.64, .735, -.59]], white).material = paint
    panel('front-valance', [[-.64, .40, -1.675], [.64, .40, -1.675], [.64, .61, -1.675], [-.64, .61, -1.675]], white)
    panel('rear-valance', [[-.65, .39, 1.67], [.65, .39, 1.67], [.65, .65, 1.67], [-.65, .65, 1.67]], white)
    panel('windshield', [[-.60, .74, -.57], [.60, .74, -.57], [.51, 1.125, -.15], [-.51, 1.125, -.15]], glass)
    panel('rear-hatch-glass', [[-.51, 1.125, .49], [.51, 1.125, .49], [.61, .765, 1.30], [-.61, .765, 1.30]], glass)
    panel('hatch-tail-panel', [[-.61, .765, 1.30], [.61, .765, 1.30], [.65, .657, 1.64], [-.65, .657, 1.64]], white).material = paint
    box('roof', white, 0, 1.145, .17, 1.055, .035, .66, .012).material = paint
    for (const side of [-1, 1]) {
      const x = side * .615, roofX = side * .52
      panel('front-side-window', [[x, .745, -.53], [x, .745, .42], [roofX, 1.118, .42], [roofX, 1.118, -.13]], glass)
      panel('rear-quarter-window', [[x, .745, .49], [x, .745, 1.25], [roofX, 1.118, .49], [roofX, 1.118, .46]], glass)
      tube('A-pillar', white, [x, .74, -.57], [roofX, 1.13, -.15], .018)
      tube('B-pillar', black, [x, .74, .455], [roofX, 1.128, .455], .020)
      tube('C-pillar', white, [roofX, 1.128, .50], [x, .744, 1.33], .028)
      tube('window-weatherstrip', black, [x, .740, -.57], [x, .740, 1.33], .010)
      tube('roof-gutter', '#9b9f9b', [roofX, 1.148, -.16], [roofX, 1.148, .5], .006)
      tube('panda-belt-line', black, [side * .673, .50, -.68], [side * .673, .50, .59], .014)
      box('door-handle', black, side * .679, .686, .32, .022, .026, .12, .004)
      for (const z of [-.54, .48]) tube('door-seam', '#747a76', [side * .674, .705, z], [side * .674, .285, z], .003)
      tube('door-sill', black, [side * .676, .275, -.65], [side * .676, .275, .55], .018)
      for (const z of [-1.04, .94]) {
        const arc: number[][] = []
        for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI; arc.push([side * .674, .33 + Math.sin(a) * .338, z + Math.cos(a) * .338]) }
        curvedTube('wheel-arch-lip', white, arc, .010)
      }
      tube('mirror-mount', black, [x, .77, -.40], [side * .735, .79, -.40], .019)
      box('side-mirror', black, side * .74, .81, -.40, .11, .065, .13, .016)
      // Tall tilted lamp lids, with the lenses set into their forward faces.
      const lamp = box('raised-pop-up-housing', white, side * .435, .742, -1.34, .31, .215, .25, .009); lamp.rotation.x = -.24
      box('headlight-recess', black, side * .435, .755, -1.475, .285, .134, .020, .004)
      box('headlight-lens', '#eee6cd', side * .435, .755, -1.49, .253, .106, .008, .002)
      for (let i = -3; i <= 3; i++) box('headlight-prism', '#ccc8b9', side * .435 + i * .032, .755, -1.496, .003, .095, .003, .001)
      box('front-marker', '#d8d4c4', side * .49, .528, -1.702, .27, .061, .020, .003)
      box('amber-indicator', '#c48032', side * .60, .528, -1.716, .075, .055, .015, .003)
      box('rear-light-housing', black, side * .435, .575, 1.68, .42, .132, .026, .003)
      box('rear-light', '#b73c31', side * .425, .583, 1.699, .35, .073, .014, .002)
      box('rear-reverse-lamp', '#dbd7ca', side * .435, .526, 1.7, .34, .027, .014, .002)
      box('rear-amber-lamp', '#bd7330', side * .59, .584, 1.711, .075, .067, .011, .002)
      for (let i = 0; i < 5; i++) box('tail-light-separator', '#673b34', side * (.285 + i * .06), .584, 1.716, .004, .069, .003, .001)
      box('seat', '#363b38', side * .28, .59, .24, .31, .08, .34, .025)
      const backrest = box('seat-backrest', '#363b38', side * .28, .77, .40, .31, .34, .075, .022); backrest.rotation.x = -.17
      box('head-rest', '#343936', side * .28, .976, .42, .17, .12, .075, .021)
    }
    box('front-bumper', black, 0, .424, -1.70, 1.355, .115, .095, .009)
    box('front-lower-lip', black, 0, .326, -1.705, 1.36, .060, .09, .006)
    box('front-air-intake', '#151c1c', 0, .421, -1.751, .67, .058, .008, .001)
    box('grille', black, 0, .535, -1.683, .54, .07, .018, .002)
    for (let i = 0; i < 3; i++) box('grille-slat', '#646b66', 0, .516 + i * .019, -1.695, .48, .004, .005, .001)
    box('front-plate', '#deded2', 0, .438, -1.762, .23, .078, .014, .002)
    box('rear-bumper', black, 0, .409, 1.70, 1.355, .13, .10, .009)
    box('rear-plate-recess', black, 0, .57, 1.686, .29, .123, .019, .002)
    box('rear-plate', '#deded2', 0, .57, 1.705, .23, .078, .014, .002)
    box('tailgate-spoiler', black, 0, .776, 1.34, 1.285, .032, .105, .005)
    tube('exhaust-tip', '#929792', [-.46, .23, 1.41], [-.46, .23, 1.77], .032)
    const steering = mesh('steering-wheel', new T.TorusGeometry(.10, .013, 8, 24), black, .28, .895, -.325); steering.rotation.x = -.4
    box('dashboard', '#333936', 0, .77, -.43, 1.16, .105, .18)
    for (let i = 0; i < 2; i++) tube('windshield-wiper', black, [-.46 + i * .47, .755, -.562], [-.20 + i * .42, .80, -.515], .006)
    tube('rear-wiper', black, [.03, .798, 1.26], [.32, .87, 1.10], .006)
    tube('radio-aerial', '#969e96', [-.56, .77, 1.12], [-.56, 1.11, 1.10], .004)
    wheels.forEach(w => w.traverse(o => {
      if (o instanceof T.Mesh && /alloy-face|alloy-spoke|spoke/.test(o.name)) o.material = material('#313633', true)
    }))
  }
  group.userData.vehicle = kind
  group.userData.wheels = wheels
  return { group, wheels, radius: VEHICLES[kind].radius }
}
