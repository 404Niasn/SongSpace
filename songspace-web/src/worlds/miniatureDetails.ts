import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { coloredGeometry, forestUnderstory } from './scenery.ts'
import type { WorldId } from './types'

/** Scenic clusters live at the edges of the miniature; they do not grant song decorations. */
export function miniatureDetails(world: WorldId, accept: (x: number, z: number) => boolean) {
  const group = new T.Group(); group.name = `miniature-details-${world}`
  group.userData.colliders = [] as { x: number; z: number; radius: number }[]
  const parts: T.BufferGeometry[] = []
  const add = (geometry: T.BufferGeometry, color: string, x: number, y: number, z: number, rotation?: T.Euler) => {
    if (rotation) geometry.applyMatrix4(new T.Matrix4().makeRotationFromEuler(rotation))
    geometry.translate(x,y,z); geometry.deleteAttribute('uv')
    parts.push(coloredGeometry(geometry.index ? geometry.toNonIndexed() : geometry, color))
    if (geometry.index) geometry.dispose()
  }
  const box = (x: number,y: number,z: number,w: number,h: number,d: number,c: string) => add(new T.BoxGeometry(w,h,d),c,x,y,z)
  const stones = (x: number,z: number,seed: number) => {
    for (let i=0;i<8;i++) {
      const geo = new T.IcosahedronGeometry(.35+(i%3)*.15,1).scale(1.3,.55,1)
      add(geo,world==='space'?'#6c7795':'#9da799',x+Math.cos(i*2.4)*2.3,.22,z+Math.sin(i*2.4+seed)*2.2)
    }
  }
  for (let i=0;i<14;i++) {
    const x = [-31,-22,23,32][i%4]!, z=-28+Math.floor(i/4)*18+(i%2)*5
    if (!accept(x,z)) continue
    group.userData.colliders.push({ x, z, radius: 3.7 })
    stones(x,z,i)
    if (world==='space') {
      for (let j=0;j<3;j++) {
        box(x+j*1.3-1.3,.7,z,.07,1.4,.07,'#8392a2')
        const panel=new T.BoxGeometry(1.15,.07,1.8)
        add(panel,'#345578',x+j*1.3-1.3,1.4,z,new T.Euler(0,0,-.3))
        for(let k=0;k<4;k++) box(x+j*1.3-1.3,1.48,z-.65+k*.42,1.1,.015,.018,'#93b4c7')
      }
      continue
    }
    if (i % 3 === 1 && (world==='jiangnan' || world==='fuji')) {
      box(x,.1,z,3.2,.2,2.6,'#a8afa0')
      add(new T.CylinderGeometry(.36,.5,.8,16),'#747f73',x,.6,z)
      box(x,1.25,z,.75,.5,.75,'#d4c9a1')
      add(new T.ConeGeometry(.75,.3,4),'#556d65',x,1.65,z)
      for(let k=0;k<4;k++) box(x-2+k*1.25,.06,z+2,1,.12,.65,'#b9baa7')
      continue
    }
    if (i % 3 === 2 && world==='jiangnan') {
      box(x,.18,z,3.4,.36,2.4,'#9a9d89')
      box(x,.38,z,3.1,.08,2.1,'#56674e')
      for(let k=0;k<16;k++) {
        const px=x+Math.sin(k*2.4)*1.3,pz=z+Math.cos(k*2.4)*.8
        add(new T.CylinderGeometry(.02,.025,.4,5),'#78906a',px,.6,pz)
        add(new T.IcosahedronGeometry(.13,1),k%2?'#caaea5':'#e4d5b1',px,.84,pz)
      }
      continue
    }
    // Two benches face a small table, creating readable places rather than loose props.
    for(const side of [-1,1]) {
      for(let k=0;k<3;k++) box(x+side*1.8+(k-1)*.22,.5,z,.18,.09,2.1,'#a08a65')
      for(const dz of [-.7,.7]) box(x+side*1.8,.24,z+dz,.4,.48,.12,'#5b6859')
    }
    add(new T.CylinderGeometry(.72,.72,.1,20),'#b1a085',x,.83,z)
    add(new T.CylinderGeometry(.09,.15,.8,8),'#72684f',x,.4,z)
    if(world==='sea') {
      add(new T.CylinderGeometry(.04,.05,3,8),'#b8a784',x,1.5,z)
      add(new T.ConeGeometry(1.7,.55,12,1,true),'#d3bca0',x,3.05,z)
      box(x+2.9,.6,z,.55,.1,1.9,'#789f9d')
    } else if(world==='jiangnan' || world==='fuji') {
      for(const side of [-1,1]) {
        add(new T.CylinderGeometry(.42,.31,.6,16),'#9c8a73',x+side*3,.3,z+1)
        for(let k=0;k<7;k++) {
          const a=k*2.4;add(new T.IcosahedronGeometry(.22,1),'#a7b28a',x+side*3+Math.sin(a)*.35,.75+(k%3)*.13,z+1+Math.cos(a)*.35)
        }
      }
      for(let k=0;k<5;k++) box(x-3+k*1.4,.07,z+3,1.05,.12,.8,'#aeb3a2')
    } else {
      const ferns=forestUnderstory(i,9,7,99)
      ferns.position.set(x,0,z);group.add(ferns)
      add(new T.CylinderGeometry(.5,.62,.45,12),'#8e7656',x+3,.22,z)
    }
  }
  if(parts.length) {
    const mesh=new T.Mesh(mergeGeometries(parts)!,new T.MeshStandardMaterial({vertexColors:true,roughness:.82,side:T.DoubleSide}))
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)
  }
  parts.forEach(g=>g.dispose())
  return group
}
