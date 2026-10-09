import { writeFile } from 'node:fs/promises'
import { Vector3 } from 'three'
import { buildVehicle } from '../src/game/vehicles.ts'
import { buildMountedVehicle } from '../src/game/vehicleRider.ts'
import { poseRider } from '../src/game/rider.ts'

// Offline geometry inspection avoids touching the browser or player state.
const models = (process.argv.includes('--all') ? ['bicycle-rack', 'ae86', 'motorcycle'] : ['ae86', 'motorcycle']).map(id => {
  const mounted = process.argv.includes('--mounted')
  const model = mounted ? buildMountedVehicle(id) : buildVehicle(id)
  const { group } = model, triangles = [], cutaway = []
  const phase = Number(process.argv.find(arg => arg.startsWith('--phase='))?.split('=')[1] || 0)
  if (mounted && id === 'bicycle-rack') poseRider(model.legs, phase)
  group.updateMatrixWorld(true)
  group.traverse(o => {
    if (!o.isMesh) return
    for (let parent = o; parent; parent = parent.parent) if (!parent.visible) return
    const p = o.geometry.getAttribute('position'), index = o.geometry.index
    const count = index ? index.count : p.count
    for (let i = 0; i < count; i += 3) {
      const points = [0, 1, 2].map(j => {
        const vertex = index ? index.getX(i + j) : i + j
        const point = new Vector3().fromBufferAttribute(p, vertex)
        if (o.isSkinnedMesh) { o.skeleton.update(); o.applyBoneTransform(vertex, point) }
        return point.applyMatrix4(o.matrixWorld).toArray()
      })
      const face = { points, color: o.material.color.getHexString() }
      triangles.push(face)
      if (!/roof|windshield|window|glass|pillar|weatherstrip|wiper|gutter/.test(o.name)) cutaway.push(face)
    }
  })
  return { id, triangles, cutaway: mounted && id === 'ae86' ? cutaway : undefined, mounted }
})
await writeFile(process.argv[2], JSON.stringify(models))
