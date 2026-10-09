import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { OutfitDefinition, OutfitId, OutfitSlot } from '../game/outfits.ts'

// Shared by the wardrobe preview and exploration character.
export function buildOutfit(id: OutfitId, pose: 'riding' | 'standing' = 'standing'): T.Group {
  const group = new T.Group()
  group.name = id
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
}
export function addCharacterOutfits(character: T.Group, outfits: readonly OutfitDefinition[], pose: 'riding' | 'standing' = 'riding') {
  const attachments = new T.Group()
  attachments.name = 'character-outfits'
  for (const outfit of outfits) {
    const model = buildOutfit(outfit.id, pose)
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
