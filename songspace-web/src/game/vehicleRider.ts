import { buildVehicle, type VehicleModel } from './vehicles.ts'
import { buildRider, poseRider } from './rider.ts'
import { addCharacterOutfits } from '../worlds/outfitModels.ts'
import type { OutfitDefinition } from './outfits.ts'

// Shared mounting transforms keep inspection previews identical to exploration.
export function buildMountedVehicle(kind: VehicleModel, outfits: readonly OutfitDefinition[] = []) {
  const model = buildVehicle(kind), rider = buildRider(kind === 'ae86' ? 'driving' : 'riding')
  if (kind === 'ae86') {
    rider.group.scale.setScalar(.39)
    rider.group.position.set(.28, .085, .10)
  }
  if (kind !== 'bicycle-rack') for (const leg of rider.legs) { leg.pedal.visible = false; leg.crank.visible = false }
  poseRider(rider.legs, 0, kind !== 'bicycle-rack')
  addCharacterOutfits(rider.group, outfits)
  model.group.add(rider.group)
  return { ...model, rider: rider.group, legs: rider.legs }
}
