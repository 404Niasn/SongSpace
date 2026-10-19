import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { forestUnderstory } from '../src/worlds/scenery.ts'
import { weatheredSurface } from '../src/worlds/surfaceDetail.ts'

const loaded = new Map()
for (const id of ['forest-pine', 'coastal-palm', 'jiangnan-roof']) {
  const data = await readFile(new URL(`../public/models/${id}.glb`, import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')
  loaded.set(id, gltf)
  let meshes = 0, triangles = 0
  gltf.scene.traverse(o => {
    if (!o.isMesh) return
    meshes++
    for (const field of ['position', 'normal', 'color']) assert.ok([...o.geometry.getAttribute(field).array].every(Number.isFinite), `${id}: finite ${field}`)
    triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3
  })
  assert.ok(meshes <= 3 && triangles < 16000, `${id}: draw and triangle budget`)
  const bounds = new T.Box3().setFromObject(gltf.scene)
  assert.ok(bounds.min.y > (id === 'jiangnan-roof' ? -.2 : -.08), 'Roof rafters may extend below the mounting plane')
  assert.ok(bounds.max.y < (id === 'jiangnan-roof' ? 2.1 : 7))
  console.log(`${id}: ${meshes} batches, ${triangles} triangles`)
}
const originalLoad = GLTFLoader.prototype.loadAsync
GLTFLoader.prototype.loadAsync = async url => loaded.get(url.split('/').pop().replace('.glb', ''))
globalThis.window = {}
const { upgradeLandscape, preloadLandscape } = await import('../src/worlds/landscapeAssets.ts')
const late = new T.Group()
upgradeLandscape(late, 'forest-pine'); late.userData.assetDisposed = true
await preloadLandscape('forest-pine'); await Promise.resolve()
assert.equal(late.children.length, 0, 'Disposed chunks cannot receive late assets')
const a = new T.Group(), b = new T.Group()
upgradeLandscape(a, 'forest-pine'); upgradeLandscape(b, 'forest-pine')
assert.notEqual(a.children[0].children[0].geometry, b.children[0].children[0].geometry)
assert.notEqual(a.children[0].children[0].material, b.children[0].children[0].material)
GLTFLoader.prototype.loadAsync = originalLoad
delete globalThis.window
const ferns = forestUnderstory(73)
const position = ferns.geometry.getAttribute('position')
for (let i = 0; i < position.count; i++) assert.ok(Math.abs(position.getX(i)) > 4.4, 'Fern leaves must leave the road clear')
for (const kind of ['wood', 'plaster', 'stone']) {
  const mat = weatheredSurface('#888888', kind)
  const shader = { vertexShader: '#include <begin_vertex>', fragmentShader: '#include <color_fragment>' }
  mat.onBeforeCompile(shader)
  assert.ok(shader.vertexShader.includes('vSurfaceDetail') && shader.fragmentShader.includes('vSurfaceDetail'))
}
console.log('PASS: GLB geometry, Y-up, asynchronous disposal, instance isolation and road clearance')
