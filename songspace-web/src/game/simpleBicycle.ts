import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// Match the bare mint bicycle used when no collectible vehicle is equipped.
export function buildSimpleBicycle() {
  const group = new T.Group()
  group.name = 'simple-bicycle'
  const materials = new Map<string, T.MeshStandardMaterial>()
  function mesh(geometry: T.BufferGeometry, color: string, parent: T.Group = group) {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .7 }))
    const part = new T.Mesh(geometry, materials.get(color)!)
    parent.add(part)
    return part
  }
  function link(from: T.Vector3, to: T.Vector3, radius: number, color: string, parent: T.Group = group) {
    const direction = to.clone().sub(from)
    const part = mesh(new T.CylinderGeometry(radius, radius, direction.length(), 10), color, parent)
    part.position.copy(from).add(to).multiplyScalar(.5)
    part.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize())
  }
  for (const z of [-.85, .85]) {
    const wheel = new T.Group()
    wheel.position.set(0, .52, z)
    group.add(wheel)
    mesh(new T.TorusGeometry(.48, .06, 10, 32), '#303d43', wheel).rotation.y = Math.PI / 2
    mesh(new T.TorusGeometry(.44, .018, 8, 32), '#d4ddd9', wheel).rotation.y = Math.PI / 2
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6
      link(new T.Vector3(), new T.Vector3(0, Math.sin(angle) * .43, Math.cos(angle) * .43), .008, '#bfc9c7', wheel)
    }
  }
  const a = new T.Vector3(0, .55, -.85), c = new T.Vector3(0, .58, .85)
  const d = new T.Vector3(0, .66, .08), e = new T.Vector3(0, 1.15, .4), f = new T.Vector3(0, 1.2, -.6)
  for (const [from, to] of [[a, f], [f, e], [e, d], [d, f], [d, c], [e, c]]) link(from!, to!, .042, '#50c5b4')
  link(e, new T.Vector3(0, 1.36, .4), .028, '#566466')
  mesh(new RoundedBoxGeometry(.29, .08, .38, 3, .035), '#324c51').position.set(0, 1.38, .4)
  link(f, new T.Vector3(0, 1.45, -.72), .028, '#566466')
  link(new T.Vector3(-.4, 1.46, -.72), new T.Vector3(.4, 1.46, -.72), .035, '#50c5b4')
  for (const x of [-.39, .39]) mesh(new T.BoxGeometry(.15, .07, .1), '#344348').position.set(x, 1.46, -.72)
  const chain = mesh(new T.TorusGeometry(.16, .016, 8, 24), '#bac8bd')
  chain.position.set(.07, .7, .05)
  chain.rotation.y = Math.PI / 2
  return group
}
