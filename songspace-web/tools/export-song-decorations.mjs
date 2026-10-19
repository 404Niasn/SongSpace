import { mkdir, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { Box3, Vector3 } from 'three'
import { buildSongDecoration, SONG_DECORATION_MODELS } from '../src/worlds/songDecorationModels.ts'

// GLTFExporter uses FileReader in browsers; Blob.arrayBuffer is the equivalent in Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() }).catch(error => this.onerror?.(error))
  }
}
const destination = new URL('../public/models/decorations/', import.meta.url)
await mkdir(destination, { recursive: true })
const manifest = []
for (const id of SONG_DECORATION_MODELS) {
  const model = buildSongDecoration(id)
  const buffer = await new GLTFExporter().parseAsync(model, { binary: true })
  await writeFile(new URL(`${id}.glb`, destination), Buffer.from(buffer))
  const size = new Box3().setFromObject(model).getSize(new Vector3()).toArray()
  const triangles = model.children.reduce((n, mesh) => n + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0)
  manifest.push({ id, size, radius: model.userData.radius, triangles, batches: model.children.length, bytes: buffer.byteLength, parts: model.userData.parts })
  model.traverse(o => { o.geometry?.dispose(); o.material?.dispose() })
  console.log(`${id}: ${triangles} triangles, ${model.children.length} batches, ${Math.round(buffer.byteLength / 1024)} KiB`)
}
await writeFile(new URL('manifest.json', destination), JSON.stringify(manifest, null, 2) + '\n')
