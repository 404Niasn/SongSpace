import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { OutfitDefinition, OutfitId, OutfitSlot } from '../game/outfits.ts'

// Placeholder geometry. Replace each builder with the final asset without changing unlocks or saves.
export function buildOutfit(id: OutfitId): T.Group {
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
    for (const side of [-1, 1]) {
      const strap = add(new T.TorusGeometry(0.2, 0.022, 6, 18), trim, side * 0.16, 0.04, -0.16)
      strap.rotation.y = Math.PI / 2
      strap.scale.y = 1.2
    }
    const handle = add(new T.TorusGeometry(0.07, 0.014, 6, 16, Math.PI), trim, 0, 0.245, 0)
    handle.rotation.z = 0
  }
  return group
}

const anchors: Record<OutfitSlot, { position: [number, number, number]; tilt: number }> = {
  back: { position: [0, 1.92, 0.61], tilt: -0.3 },
  head: { position: [0, 2.72, 0.06], tilt: 0 },
  accessory: { position: [0.33, 1.8, 0.18], tilt: 0 },
}
export function addCharacterOutfits(character: T.Group, outfits: readonly OutfitDefinition[]) {
  const attachments = new T.Group()
  attachments.name = 'character-outfits'
  for (const outfit of outfits) {
    const model = buildOutfit(outfit.id)
    const anchor = anchors[outfit.slot]
    model.position.set(...anchor.position)
    model.rotation.x = anchor.tilt
    attachments.add(model)
  }
  character.add(attachments)
  return attachments
}
