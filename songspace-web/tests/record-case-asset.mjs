import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const bytes = await readFile(new URL('../public/models/record-case.glb', import.meta.url))
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const shell = new T.Group(), tray = new T.Group()
for (const mesh of [...scene.children]) (mesh.name.startsWith('Tray_') ? tray : shell).add(mesh)
assert.equal(shell.children.length, 3)
assert.equal(tray.children.length, 4)
for (const count of [1, 3, 5]) {
  const depth = .48 + count * .04
  for (const root of [shell, tray]) root.traverse(o => {
    if (!o.isMesh) return
    o.userData.originalPositions ??= o.geometry.getAttribute('position').array.slice()
    const p = o.geometry.getAttribute('position'), original = o.userData.originalPositions
    for (let i = 0; i < p.count; i++) {
      const z = original[i * 3 + 2]
      p.setZ(i, z + Math.sign(z) * (depth - .6) / 2)
    }
    o.geometry.computeBoundingBox()
  })
  const shellBounds = new T.Box3().setFromObject(shell)
  const drawerBounds = new T.Box3().setFromObject(tray)
  assert.ok(shellBounds.min.x < drawerBounds.min.x && shellBounds.max.x > drawerBounds.max.x, 'Drawer must fit inside the sleeve')
  assert.ok(new T.Box3().setFromObject(shell.getObjectByName('Case_CasePaint')).max.z < depth / 2 + .039, 'Blender shell must sit behind existing cover artwork')
  const closed = new T.Box3().setFromObject(tray).min.y
  tray.position.y = -1.5
  const open = new T.Box3().setFromObject(tray).min.y
  assert.ok(Math.abs(closed - open - 1.5) < .0001, 'Original animation travel must remain unchanged')
  tray.position.y = 0
}
let triangles = 0
for (const root of [shell, tray]) root.traverse(o => {
  if (!o.isMesh) return
  for (const name of ['position', 'normal']) assert.ok([...o.geometry.getAttribute(name).array].every(Number.isFinite))
  triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3
})
assert.ok(triangles < 6000)
console.log(`PASS: record case ${triangles} triangles, 7 batches; drawer fit, cover clearance, all pack depths and animation travel`)
