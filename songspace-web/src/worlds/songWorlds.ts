import * as T from 'three'
import type { WorldModel } from './types'

function mesh(parent: T.Object3D, geometry: T.BufferGeometry, color: string, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, new T.MeshStandardMaterial({ color, roughness: .78, flatShading: true }))
  object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true
  parent.add(object)
  return object
}
function box(g: T.Object3D, color: string, x: number, y: number, z: number, w: number, h: number, d: number) {
  return mesh(g, new T.BoxGeometry(w, h, d), color, x, y, z)
}
export function cherryTree() {
  const g = new T.Group()
  mesh(g, new T.CylinderGeometry(.17, .34, 3.4, 8), '#776069', 0, 1.7)
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4
    const bloom = mesh(g, new T.IcosahedronGeometry(1.4, 1), ['#efb4cc', '#f8d5df', '#d891b0'][i % 3]!, Math.sin(a) * 1.2, 3.5 + (i % 3) * .5, Math.cos(a) * .9)
    bloom.scale.y = .75
  }
  return g
}
export function fujiMountain() {
  const g = new T.Group()
  // Matching slopes keep the snow cap flush with the volcanic cone.
  mesh(g, new T.CylinderGeometry(5, 24, 22, 48), '#858fa9', 0, 11)
  mesh(g, new T.CylinderGeometry(1.2, 5, 4.4, 48), '#f2f2fa', 0, 24.2)
  mesh(g, new T.CylinderGeometry(1.15, 1.15, .08, 32), '#aeb8cc', 0, 26.43)
  return g
}
export function ringPlanet() {
  const g = new T.Group()
  mesh(g, new T.SphereGeometry(8, 32, 24), '#a79ad7')
  const ring = new T.Mesh(new T.RingGeometry(10, 14, 96), new T.MeshBasicMaterial({ color: '#c3b4ee', transparent: true, opacity: .65, side: T.DoubleSide, depthWrite: false }))
  ring.rotation.x = 1.1; ring.rotation.y = .25; g.add(ring)
  return g
}
export function buildSongWorld(id: 'fuji' | 'space'): WorldModel {
  const group = new T.Group(); group.name = id
  const space = id === 'space'
  const colliders: WorldModel['colliders'] = []
  const ground = box(group, space ? '#262c4b' : '#a9bdab', 0, -.6, 0, 84, 1.2, 74)
  box(group, space ? '#111729' : '#778e87', 0, -2, 0, 82, 1.6, 72)
  // The animated surface is part of the model, so normal world disposal releases it.
  const water = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new T.Color(space ? '#668ee6' : '#7eb9c7') } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float time;uniform vec3 color;varying vec2 vUv;void main(){float wave=sin(vUv.x*65.+time)*sin(vUv.y*45.-time*.6);gl_FragColor=vec4(color+wave*.04,1.);}',
  })
  const surface = new T.Mesh(new T.CircleGeometry(space ? 8 : 13, 64), water)
  surface.rotation.x = -Math.PI / 2; surface.position.set(-20, .025, 7); group.add(surface)
  box(group, space ? '#495677' : '#dcd0c4', 5, .04, 0, 7, .08, 72)
  const animated = new T.Group(); group.add(animated)
  if (!space) {
    const mountain = fujiMountain(); mountain.position.set(-20, 0, -23); mountain.scale.setScalar(.7); group.add(mountain)
    colliders.push({ x: -20, z: -23, radius: 17 })
    for (let i = 0; i < 16; i++) {
      const x = i % 2 ? 13 : -2, z = 31 - Math.floor(i / 2) * 7
      const tree = cherryTree(); tree.position.set(x, 0, z); group.add(tree)
      colliders.push({ x, z, radius: .65 })
    }
    for (const x of [1, 9]) { box(group, '#b55054', x, 3, 20, .5, 6, .5); colliders.push({ x, z: 20, radius: .5 }) }
    box(group, '#b55054', 5, 5.3, 20, 10, .4, .6)
    box(group, '#524752', 5, 6.1, 20, 11, .45, .9)
    box(group, '#b5977c', -12, .18, 15, 18, .3, 2.8)
    for (let i = 0; i < 40; i++) {
      const petal = mesh(animated, new T.PlaneGeometry(.16, .09), '#f5c5d8', Math.sin(i * 7) * 16 + 5, 2 + i % 5, Math.cos(i * 3) * 30)
      petal.material.side = T.DoubleSide
    }
  } else {
    const planet = ringPlanet(); planet.position.set(-19, 19, -20); group.add(planet)
    const moon = mesh(group, new T.IcosahedronGeometry(4, 2), '#7f9da7', 25, 15, -26)
    moon.rotation.z = .4
    for (let i = 0; i < 24; i++) {
      const x = Math.sin(i * 4.1) * 30, z = Math.cos(i * 2.7) * 30
      if (Math.abs(x - 5) < 7) continue
      const rock = mesh(group, new T.DodecahedronGeometry(1 + i % 3 * .5), '#66718a', x, .5, z)
      rock.rotation.set(i, i * .7, 0); colliders.push({ x, z, radius: 2.6 })
    }
    for (const x of [1.2, 8.8]) for (let i = 0; i < 18; i++) {
      const light = box(group, '#80dfff', x, .18, 34 - i * 4, .12, .15, 2)
      light.material.emissive.set('#5ccfff'); light.material.emissiveIntensity = 2
    }
    const positions: number[] = []
    for (let i = 0; i < 480; i++) positions.push(Math.sin(i * 12.7) * 110, 15 + (Math.sin(i * 7.9) + 1) * 45, Math.cos(i * 3.1) * 110)
    const stars = new T.BufferGeometry(); stars.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    animated.add(new T.Points(stars, new T.PointsMaterial({ color: '#d7e6ff', size: .22, fog: false })))
  }
  return {
    group, ground, water, spawn: new T.Vector3(5, .08, 29), colliders,
    heightAt: () => .08,
    isWalkable: (x, z) => Math.abs(x) < 40 && Math.abs(z) < 35 &&
      (space || Math.hypot(x + 20, z - 7) > 13 || (Math.abs(z - 15) < 1.4 && x > -21 && x < -3)) &&
      colliders.every(c => Math.hypot(x - c.x, z - c.z) > c.radius + .35),
    update(time) {
      water.uniforms.time!.value = time
      if (space) animated.rotation.y = time * .003
      else animated.children.forEach((p, i) => { p.position.y = 1 + ((i * .37 + time * .22) % 5); p.rotation.set(time * .3 + i, time * .2, i) })
    },
  }
}
