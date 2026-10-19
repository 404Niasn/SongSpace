import { mkdir, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { buildSongWorld } from '../src/worlds/songWorlds.ts'
import { orbitalHabitat, lunarRover, relayAntenna } from '../src/worlds/spaceScenery.ts'
import { buildRaceObstacle } from '../src/game/raceProps.ts'
import * as T from 'three'
globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() }).catch(error => this.onerror?.(error)) } }
const directory = new URL('../../.runtime/space-upgrade/', import.meta.url)
await mkdir(directory, { recursive: true })
const obstacles = new T.Group()
for (const [i, variant] of [0, 3, 6].entries()) { const object = buildRaceObstacle('space', false, variant); object.position.x = (i - 1) * 1.9; obstacles.add(object) }
for (const [id, group] of [['space-world', buildSongWorld('space').group], ['orbital-habitat', orbitalHabitat()], ['lunar-rover', lunarRover()], ['relay-antenna', relayAntenna()], ['space-obstacles', obstacles]]) {
  const unsupported = []
  group.traverse(o => { if (o.isPoints || o.material?.isShaderMaterial) unsupported.push(o) })
  // Sky / radar shaders remain native WebGL effects. Offline previews export the physical meshes.
  unsupported.forEach(o => o.removeFromParent())
  const buffer = await new GLTFExporter().parseAsync(group, { binary: true })
  await writeFile(new URL(`${id}.glb`, directory), Buffer.from(buffer))
  let meshes = 0, triangles = 0
  group.traverse(o => { if (o.isMesh) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3 * (o.isInstancedMesh ? o.count : 1) } })
  console.log(`${id}: ${meshes} batches, ${triangles} triangles, ${Math.round(buffer.byteLength / 1024)} KiB`)
}
