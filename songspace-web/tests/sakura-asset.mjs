import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const data = await readFile(new URL('../public/models/sakura-botanical.glb', import.meta.url))
const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')
const bounds = new T.Box3().setFromObject(gltf.scene)
assert.ok(bounds.min.y > -.06 && bounds.max.y < 5, 'Y-up model must stand on the ground with shallow buried roots')
let meshes = 0, triangles = 0
gltf.scene.traverse(o => {
  if (!o.isMesh) return
  meshes++
  assert.ok(o.geometry.getAttribute('color'), 'Botanical colors must survive GLB export')
  for (const name of ['position', 'normal']) assert.ok([...o.geometry.getAttribute(name).array].every(Number.isFinite))
  triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3
})
assert.equal(meshes, 3, 'Bark, blossoms and leaves must stay batched into three draws')
assert.ok(triangles < 40000, 'Tree must remain within its geometry budget')
// Exercise the actual asynchronous replacement and disposal guard without a browser.
const originalLoad = GLTFLoader.prototype.loadAsync
GLTFLoader.prototype.loadAsync = async () => gltf
globalThis.window = {}
const { cherryTree } = await import('../src/worlds/songWorlds.ts')
const { preloadSakura } = await import('../src/worlds/sakuraAsset.ts')
const abandoned = cherryTree(0)
abandoned.userData.assetDisposed = true
const originalChild = abandoned.children[0]
await preloadSakura()
await Promise.resolve()
assert.equal(abandoned.children[0], originalChild, 'Disposed trees must not receive late assets')
const a = cherryTree(1), b = cherryTree(2)
assert.equal(a.userData.sourceAsset, 'sakura-botanical.glb')
const first = a.children[0].children.find(o => o.isMesh), second = b.children[0].children.find(o => o.isMesh)
assert.notEqual(first.geometry, second.geometry, 'Recycling one chunk must not dispose another tree')
assert.notEqual(first.material, second.material)
GLTFLoader.prototype.loadAsync = originalLoad
delete globalThis.window
console.log(`PASS: Blender GLB ${meshes} batches, ${triangles} triangles; Y-up, finite normals, lazy replacement and disposal isolation`)
