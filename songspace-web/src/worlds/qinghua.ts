import * as T from 'three'
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Original porcelain keepsake: glazed medallion, cobalt petals, braided cord and tassel. */
export function qinghuaToken() {
  const group = new T.Group()
  group.name = 'qinghua-token'
  const porcelain = new T.MeshPhysicalMaterial({ color: '#f2f4ed', roughness: .19, clearcoat: 1, clearcoatRoughness: .12 })
  const blue = new T.MeshStandardMaterial({ color: '#24528a', roughness: .35 })
  const silk = new T.MeshStandardMaterial({ color: '#355c7a', roughness: .72 })
  const gold = new T.MeshStandardMaterial({ color: '#c3ac77', metalness: .75, roughness: .3 })
  const add = (geometry: T.BufferGeometry, material: T.Material, x = 0, y = 0, z = 0) => {
    const mesh = new T.Mesh(geometry, material); mesh.position.set(x, y, z)
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh
  }
  const body = add(new T.SphereGeometry(.29, 40, 24), porcelain)
  body.scale.set(1, 1.13, .25)
  add(new T.TorusGeometry(.265, .009, 6, 64), blue, 0, 0, .038).scale.y = 1.13
  const pattern: T.BufferGeometry[] = []
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4
    const leaf = new T.Shape()
    leaf.moveTo(.03, 0); leaf.bezierCurveTo(.07, .085, .17, .075, .19, 0)
    leaf.bezierCurveTo(.14, -.05, .065, -.045, .03, 0)
    const geo = new T.ShapeGeometry(leaf, 7)
    geo.rotateZ(a)
    if (side < 0) geo.rotateY(Math.PI)
    geo.translate(0, 0, side * .071)
    pattern.push(geo)
    const vine = new T.CatmullRomCurve3(Array.from({length:18},(_,j)=>{
      const t=j/17, angle=a+t*1.8, r=.195+Math.sin(t*Math.PI)*.026
      return new T.Vector3(Math.cos(angle)*r,Math.sin(angle)*r,side*.071)
    }))
    pattern.push(new T.TubeGeometry(vine,18,.0025,4,false))
  }
  // Paint follows the glazed surface, avoiding the shadow of a floating decal.
  for (let part = 0; part < pattern.length; part++) {
    const original = pattern[part]!
    const geometry = new TessellateModifier(.025, 5).modify(original)
    original.dispose(); pattern[part] = geometry
    const p=geometry.getAttribute('position')
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),side=Math.sign(p.getZ(i))
      p.setZ(i,side*(.0725*Math.sqrt(Math.max(.02,1-(x/.29)**2-(y/.3277)**2))+.0015))
    }
    geometry.computeVertexNormals()
  }
  const paint = add(mergeGeometries(pattern)!, blue); paint.material.side = T.DoubleSide
  paint.castShadow = false
  pattern.forEach(g => g.dispose())
  add(new T.TorusGeometry(.038, .01, 8, 24), gold, 0, .35, 0)
  const cord = new T.CatmullRomCurve3([new T.Vector3(0,.36,0), new T.Vector3(-.1,.57,0), new T.Vector3(0,.7,0), new T.Vector3(.1,.57,0), new T.Vector3(0,.36,0)])
  add(new T.TubeGeometry(cord, 32, .012, 6, false), silk)
  add(new T.SphereGeometry(.035, 12, 8), gold, 0, -.36, 0)
  const threads: T.BufferGeometry[] = []
  for (let i = 0; i < 12; i++) {
    const x = Math.sin(i * 2.4) * .035, z = Math.cos(i * 2.4) * .025
    const path = new T.CatmullRomCurve3([new T.Vector3(0,-.36,0), new T.Vector3(x,-.48,z), new T.Vector3(x*1.5,-.68+(i%3)*.02,z)])
    threads.push(new T.TubeGeometry(path, 7, .004, 4, false))
  }
  const tassel = add(mergeGeometries(threads)!, silk); tassel.name = 'qinghua-tassel'
  threads.forEach(g => g.dispose())
  return group
}

export function qinghuaDisplay() {
  const group = new T.Group(); group.name = 'qinghua-display'; group.userData.model = 'qinghua'
  const wood = new T.MeshStandardMaterial({ color: '#574a3c', roughness: .7 })
  const base = new T.Mesh(new T.CylinderGeometry(.7, .75, .18, 40), wood); base.position.y = .09; group.add(base)
  for (const x of [-.5,.5]) {
    const post = new T.Mesh(new T.CylinderGeometry(.035,.045,1.8,10), wood); post.position.set(x,.95,0); group.add(post)
  }
  const rail = new T.Mesh(new T.BoxGeometry(1.15,.07,.09),wood); rail.position.y = 1.86; group.add(rail)
  const token = qinghuaToken(); token.scale.setScalar(1.1); token.position.y = 1.09; group.add(token)
  return group
}
