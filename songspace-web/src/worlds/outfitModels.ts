import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { OutfitDefinition, OutfitId, OutfitSlot } from '../game/outfits.ts'

// Shared by the wardrobe preview and exploration character.
export function buildOutfit(id: OutfitId, pose: 'riding' | 'standing' = 'standing'): T.Group {
  const group = new T.Group()
  group.name = id
  if (id === 'red-high-heels') {
    for (const side of [-1, 1]) {
      const shoe = buildHighHeel(); shoe.name = `heel-${side}`
      shoe.position.x = side * .17; group.add(shoe)
    }
  }
  if (id === 'travel-backpack') {
    const cloth = new T.MeshStandardMaterial({ color: '#bd8966', roughness: 0.9 })
    const trim = new T.MeshStandardMaterial({ color: '#667c70', roughness: 0.8 })
    const label = new T.MeshStandardMaterial({ color: '#efdfba', roughness: 0.8 })
    const add = (geometry: T.BufferGeometry, material: T.Material, x = 0, y = 0, z = 0) => {
      const mesh = new T.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      group.add(mesh)
      return mesh
    }
    add(new RoundedBoxGeometry(0.43, 0.51, 0.25, 3, 0.065), cloth)
    add(new RoundedBoxGeometry(0.32, 0.2, 0.085, 2, 0.03), cloth, 0, -0.1, 0.15)
    add(new T.BoxGeometry(0.09, 0.045, 0.015), label, 0, 0.12, 0.13)
    const origin = pose === 'riding' ? new T.Vector3(...anchors.back.position) : new T.Vector3(0, 1.04, .44)
    const inverseTilt = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), pose === 'riding' ? -anchors.back.tilt : 0)
    for (const side of [-1, 1]) {
      // Route the straps over the actual shoulders, independently of the bag's height.
      const shoulderPoints = pose === 'riding'
        ? [[.29, 1.82, -.06], [.29, 1.94, -.24], [.30, 2.08, -.13], [.25, 2.05, .11]]
        : [[.29, 1.00, -.02], [.29, 1.19, -.12], [.29, 1.39, 0], [.25, 1.35, .16]]
      const path = new T.CatmullRomCurve3([
        new T.Vector3(side * .16, -.18, -.125),
        ...shoulderPoints.map(([x, y, z]) => new T.Vector3(side * x!, y!, z!).sub(origin).applyQuaternion(inverseTilt)),
        new T.Vector3(side * .16, .24, -.125),
      ])
      add(new T.TubeGeometry(path, 32, .018, 8, false), trim)
    }
    const handle = add(new T.TorusGeometry(0.07, 0.014, 6, 16, Math.PI), trim, 0, 0.245, 0)
    handle.rotation.z = 0
  }
  return group
}

const anchors: Record<OutfitSlot, { position: [number, number, number]; tilt: number }> = {
  back: { position: [0, 1.86, 0.63], tilt: -0.85 },
  head: { position: [0, 2.72, 0.06], tilt: 0 },
  accessory: { position: [0.33, 1.8, 0.18], tilt: 0 },
  feet: { position: [0, 0, 0], tilt: 0 },
}
export function addCharacterOutfits(character: T.Group, outfits: readonly OutfitDefinition[], pose: 'riding' | 'standing' = 'riding') {
  const attachments = new T.Group()
  attachments.name = 'character-outfits'
  for (const outfit of outfits) {
    const model = buildOutfit(outfit.id, pose)
    if (outfit.slot === 'feet') {
      // Bind to foot bones; a detached outfit returns its meshes for normal disposal.
      const feet: T.Bone[] = []
      character.traverse(object => {
        if (object instanceof T.SkinnedMesh) feet.push(object.skeleton.bones[3]!, object.skeleton.bones[6]!)
      })
      if (feet.length === 2) {
        const shoes = [...model.children]
        shoes.forEach((shoe, index) => { shoe.position.set(0, 0, 0); feet[index]!.add(shoe) })
        attachments.addEventListener('removed', () => shoes.forEach(shoe => model.add(shoe)))
      }
      attachments.add(model)
      continue
    }
    const anchor = anchors[outfit.slot]
    if (pose === 'standing') {
      const standing = { back: [0, 1.04, .44], head: [0, 2.03, 0], accessory: [.33, .95, 0] } as const
      const [x, y, z] = standing[outfit.slot]
      model.position.set(x, y, z)
    } else {
      model.position.set(...anchor.position)
      model.rotation.x = anchor.tilt
    }
    attachments.add(model)
  }
  character.add(attachments)
  return attachments
}

/** Continuous low-cut pump upper over a curved sole, with a tapered stiletto. */
function buildHighHeel() {
  const shoe = new T.Group()
  const leather = new T.MeshPhysicalMaterial({ color: '#ae142b', roughness: .30, clearcoat: .55, clearcoatRoughness: .28, side: T.DoubleSide })
  const sole = new T.MeshStandardMaterial({ color: '#491923', roughness: .65 })
  const lining = new T.MeshStandardMaterial({ color: '#d3a382', roughness: .9, side: T.DoubleSide })
  function mesh(geometry: T.BufferGeometry, material: T.Material, name: string) {
    const result = new T.Mesh(geometry, material)
    result.name = name; result.castShadow = true; result.receiveShadow = true
    shoe.add(result); return result
  }
  const outline = new T.CatmullRomCurve3([
    [0, 0, -.345], [-.046, 0, -.29], [-.103, 0, -.21], [-.125, 0, -.12],
    [-.105, 0, -.015], [-.105, 0, .105], [-.075, 0, .155], [0, 0, .172],
    [.075, 0, .155], [.105, 0, .105], [.105, 0, -.015], [.125, 0, -.12],
    [.103, 0, -.21], [.046, 0, -.29],
  ].map(([x, y, z]) => new T.Vector3(x!, y!, z!)), true, 'centripetal')
  const samples = 112, rings = 8
  const edge = Array.from({ length: samples }, (_, i) => outline.getPoint(i / samples))
  const baseY = (z: number) => -.216 + .154 * T.MathUtils.smoothstep(z, -.17, .11)
  const rim = edge.map((_, i) => {
    const angle = i / samples * Math.PI * 2
    const rear = (1 - Math.cos(angle)) / 2
    return new T.Vector3(-.111 * Math.sin(angle), -.085 + .115 * rear ** 1.6, .025 - .132 * Math.cos(angle))
  })
  function geometry(vertices: number[], indices: number[]) {
    const result = new T.BufferGeometry()
    result.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
    result.setIndex(indices); result.computeVertexNormals(); return result
  }
  const upperVertices: number[] = [], upperIndices: number[] = []
  for (let ring = 0; ring <= rings; ring++) for (let i = 0; i < samples; i++) {
    const t = ring / rings, bottom = edge[i]!, top = rim[i]!
    const point = new T.Vector3(bottom.x, baseY(bottom.z) + .009, bottom.z).lerp(top, t)
    // A softly rounded leather surface, rather than separate toe and ankle pieces.
    point.x += Math.sign(point.x) * Math.sin(t * Math.PI) * .009
    point.y += Math.sin(t * Math.PI) * .02
    upperVertices.push(point.x, point.y, point.z)
    if (ring < rings) {
      const at = ring * samples + i, next = ring * samples + (i + 1) % samples
      upperIndices.push(at, next, at + samples, next, next + samples, at + samples)
    }
  }
  mesh(geometry(upperVertices, upperIndices), leather, 'pump-upper')
  // A narrow rolled edge follows the actual low-cut opening.
  const rimPath = new T.CatmullRomCurve3(rim, true, 'centripetal')
  mesh(new T.TubeGeometry(rimPath, samples, .0035, 6, true), leather, 'pump-opening')
  const interiorVertices: number[] = [], interiorIndices: number[] = []
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < samples; i++) {
    const point = rim[i]!.clone(); point.x *= .96
    point.y = ring === 0 ? point.y - .005 : baseY(point.z) + .012
    interiorVertices.push(point.x, point.y, point.z)
    if (ring === 0) { const next = (i + 1) % samples; interiorIndices.push(i, i + samples, next, next, i + samples, next + samples) }
  }
  mesh(geometry(interiorVertices, interiorIndices), lining, 'pump-lining')
  const soleVertices: number[] = [], soleIndices: number[] = []
  for (let ring = 0; ring < 2; ring++) for (const point of edge) soleVertices.push(point.x, baseY(point.z) + ring * .012, point.z)
  for (let i = 0; i < samples; i++) {
    const next = (i + 1) % samples
    soleIndices.push(i, i + samples, next, next, i + samples, next + samples)
  }
  mesh(geometry(soleVertices, soleIndices), sole, 'pump-outsole')
  // Footbed follows the arch; toe and heel support meet the same ground plane.
  const bedVertices: number[] = [], bedIndices: number[] = []
  for (let i = 0; i < samples / 2; i++) {
    const left = edge[i]!, right = edge[(samples - i) % samples]!
    bedVertices.push(left.x, baseY(left.z) + .013, left.z, right.x, baseY(right.z) + .013, right.z)
    if (i < samples / 2 - 1) { const at = i * 2; bedIndices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2) }
  }
  mesh(geometry(bedVertices, bedIndices), lining, 'pump-footbed')
  const heelVertices: number[] = [], heelIndices: number[] = []
  for (let ring = 0; ring <= 12; ring++) for (let i = 0; i < 24; i++) {
    const t = ring / 12, angle = i / 24 * Math.PI * 2
    const radius = .015 + .022 * t ** 2.5
    heelVertices.push(Math.cos(angle) * radius, -.211 + t * .158, .115 + Math.sin(angle) * radius - .011 * (1 - t))
    if (ring < 12) {
      const at = ring * 24 + i, next = ring * 24 + (i + 1) % 24
      heelIndices.push(at, at + 24, next, next, at + 24, next + 24)
    }
  }
  mesh(geometry(heelVertices, heelIndices), leather, 'pump-stiletto')
  const tip = mesh(new T.CylinderGeometry(.0155, .0155, .01, 20), sole, 'pump-heel-tip')
  tip.position.set(0, -.211, .104)
  return shoe
}
