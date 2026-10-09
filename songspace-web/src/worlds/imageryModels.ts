import * as T from 'three'
import type { ImageryModel, SkillId } from '../game/content'

// Sculpted silhouettes, joinery, etched glass and planted detail share the world's materials.
export function buildImagery(model: ImageryModel): T.Group {
  const g = new T.Group()
  const add = (geo: T.BufferGeometry, color: string, x = 0, y = 0, z = 0, metal = 0) => {
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness: metal ? 0.3 : 0.7, metalness: metal }))
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m
  }
  const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number) => add(new T.BoxGeometry(w, h, d), c, x, y, z)
  const sphere = (r: number, c: string, x: number, y: number, z: number) => add(new T.SphereGeometry(r, 12, 8), c, x, y, z)
  const plank = (x: number, y: number, z: number) => box(3.8, 0.09, 0.26, '#a7805c', x, y, z)
  box(4.6, 0.2, 3.6, model === 'snow' ? '#eff3ec' : '#aaa48a', 0, 0.1, 0)
  if (model === 'garden' || model === 'snow') {
    for (let i = 0; i < 3; i++) {
      box(3.8 - i * 0.7, 0.22, 0.65, model === 'snow' ? '#e0e9e7' : '#718d68', 0, 0.3 + i * 0.2, -0.9 + i * 0.7)
      for (let j = 0; j < 8; j++) {
        const x = (j - 3.5) * 0.38, z = -0.9 + i * 0.7, y = 0.5 + i * 0.2
        add(new T.CylinderGeometry(0.018, 0.027, 0.5, 7), '#627353', x, y + 0.1, z)
        for (let p = 0; p < 5; p++) {
          const a = p * Math.PI * 2 / 5
          const petal = sphere(0.115, model === 'snow' ? '#e9e4db' : ['#e8b6c4', '#d4a091', '#f3d4ba'][i]!, x + Math.cos(a) * 0.095, y + 0.4, z + Math.sin(a) * 0.095)
          petal.scale.y = 0.3
        }
        sphere(0.06, '#e6c47e', x, y + 0.42, z)
      }
    }
    // Slatted seat, iron feet and a curved back distinguish this from a flower pile.
    for (let j = 0; j < 3; j++) box(1.5, 0.09, 0.15, '#b18b65', 0, 0.5, 1 + j * 0.17)
    for (const x of [-0.6, 0.6]) box(0.09, 0.48, 0.42, '#576663', x, 0.28, 1.2)
    for (let j = 0; j < 2; j++) box(1.5, 0.1, 0.08, '#b18b65', 0, 0.85 + j * 0.17, 1.4)
    if (model === 'snow') {
      add(new T.CylinderGeometry(0.07, 0.12, 2.5, 9), '#786c5d', -1.5, 1.4, 0.8)
      for (let j = 0; j < 5; j++) { const b = add(new T.CylinderGeometry(0.025, 0.045, 1.2, 7), '#786c5d', -1.5 + Math.sin(j) * 0.3, 2 + j * 0.12, 0.8); b.rotation.z = (j - 2) * 0.4; sphere(0.25, '#f0f4f2', b.position.x, b.position.y + 0.5, 0.8) }
    }
  } else if (model === 'lantern') {
    const foot = add(new T.LatheGeometry([new T.Vector2(0.5, 0), new T.Vector2(0.45, 0.2), new T.Vector2(0.2, 0.3), new T.Vector2(0.18, 1.1), new T.Vector2(0.44, 1.25)], 24), '#e2e1d6', 0, 0.2, 0)
    foot.material = new T.MeshStandardMaterial({ color: '#e2e1d6', roughness: 0.23 })
    const body = add(new T.LatheGeometry([new T.Vector2(0.35, 0), new T.Vector2(0.55, 0.2), new T.Vector2(0.6, 0.7), new T.Vector2(0.42, 1.05), new T.Vector2(0.26, 1.1)], 32), '#f7ecc9', 0, 1.4, 0)
    ;(body.material as T.MeshStandardMaterial).emissive.set('#cfa769'); (body.material as T.MeshStandardMaterial).emissiveIntensity = 0.35
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8
      const stem = add(new T.CylinderGeometry(0.018, 0.018, 0.72, 6), '#3c6483', Math.sin(a) * 0.57, 1.93, Math.cos(a) * 0.57); stem.rotation.z = Math.sin(a) * 0.2
      sphere(0.055, '#3c6483', Math.sin(a) * 0.55, 1.8 + (i % 3) * 0.16, Math.cos(a) * 0.55)
    }
    add(new T.ConeGeometry(0.62, 0.2, 24), '#39596b', 0, 2.65, 0)
    sphere(0.09, '#bd9c58', 0, 2.84, 0)
    for (const x of [-1.5, 1.5]) { box(0.7, 0.3, 0.7, '#989779', x, 0.3, 0); for (let j = 0; j < 5; j++) sphere(0.2, '#769071', x + Math.sin(j) * 0.18, 0.7 + j * 0.1, Math.cos(j) * 0.18) }
  } else {
    for (let j = 0; j < 10; j++) plank(0, 0.28, -1.3 + j * 0.29)
    for (const x of [-1.65, 1.65]) for (const z of [-1.25, 1.25]) {
      box(0.13, 2.4, 0.13, '#775c46', x, 1.5, z)
      box(0.32, 0.12, 0.32, '#b59263', x, 0.4, z)
    }
    // Curved eaves are extruded from a traced roof profile, with individual tile ridges.
    const shape = new T.Shape(); shape.moveTo(-2, 0); shape.quadraticCurveTo(-1.5, 0.02, 0, 0.65); shape.quadraticCurveTo(1.5, 0.02, 2, 0); shape.lineTo(2, -0.14); shape.quadraticCurveTo(0, 0.3, -2, -0.14); shape.closePath()
    const roof = add(new T.ExtrudeGeometry(shape, { depth: 3.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2, steps: 1 }), '#657e79', 0, 2.6, -1.55)
    for (let j = 0; j < 13; j++) { const ridge = add(new T.CylinderGeometry(0.035, 0.035, 3.12, 6), '#7d9390', -1.8 + j * 0.3, roof.position.y + 0.07 + 0.5 * (1 - Math.abs(j - 6) / 6), 0); ridge.rotation.x = Math.PI / 2 }
    for (const x of [-1.15, 1.15]) { box(0.55, 0.1, 1.5, '#ba9970', x, 0.8, 0); for (const z of [-0.5, 0.5]) box(0.1, 0.48, 0.1, '#745d4a', x, 0.55, z) }
    box(0.8, 0.08, 0.7, '#b49b7c', 0, 0.85, 0); box(0.1, 0.55, 0.1, '#765f49', 0, 0.55, 0)
    if (model === 'record') {
      const record = add(new T.CylinderGeometry(0.36, 0.36, 0.04, 40), '#263c3c', 0, 1.08, -0.2); record.rotation.x = Math.PI / 2
      for (let j = 0; j < 5; j++) { const groove = add(new T.TorusGeometry(0.15 + j * 0.037, 0.004, 4, 40), '#67817a', 0, 1.08, -0.172); groove.rotation.z = j }
      const label = add(new T.CylinderGeometry(0.1, 0.1, 0.045, 24), '#cc9866', 0, 1.08, -0.17); label.rotation.x = Math.PI / 2
      box(0.5, 0.1, 0.42, '#ad7854', 0, 0.97, 0.25)
    } else {
      for (const x of [-0.22, 0.22]) {
        add(new T.LatheGeometry([new T.Vector2(0.08, 0), new T.Vector2(0.1, 0.12), new T.Vector2(0.11, 0.14)], 16), '#e5d8b8', x, 0.9, 0)
        const steam = new T.CatmullRomCurve3([new T.Vector3(x, 1.08, 0), new T.Vector3(x + 0.06, 1.23, 0), new T.Vector3(x - 0.04, 1.4, 0), new T.Vector3(x + 0.03, 1.56, 0)])
        const vapor = add(new T.TubeGeometry(steam, 16, 0.012, 5, false), '#edf1e5'); (vapor.material as T.MeshStandardMaterial).transparent = true; (vapor.material as T.MeshStandardMaterial).opacity = 0.45
      }
      box(0.23, 0.01, 0.16, '#f3e6be', 0.2, 0.9, 0.23)
    }
    if (model === 'fireworks') {
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12
        const spark = sphere(0.038, i % 2 ? '#e9c37b' : '#f4a698', Math.cos(a) * 0.9, 3.9 + Math.sin(a) * 0.9, -0.1)
        ;(spark.material as T.MeshStandardMaterial).emissive.set(i % 2 ? '#e9c37b' : '#f4a698'); (spark.material as T.MeshStandardMaterial).emissiveIntensity = 0.7
        spark.userData.spark = i
      }
    }
  }
  g.userData.model = model
  return g
}

export function buildSkillEffect(id: SkillId, broken = false): T.Group {
  const g = new T.Group()
  const color = id === 'freeze' ? '#8cdae9' : id === 'revive' || id === 'shield' ? '#eeb3bd' : '#efd18a'
  const mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false })
  const jewel = (shape: T.Shape, x: number, y: number, size = 1) => {
    const m = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3 }), mat.clone())
    m.position.set(x, y, -0.1); m.scale.setScalar(size); g.add(m); return m
  }
  const star = new T.Shape()
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.2 : 0.48; if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r); else star.lineTo(Math.cos(a) * r, Math.sin(a) * r) }; star.closePath()
  const tube = (points: T.Vector3[], radius = 0.016) => { const mesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, radius, 6, false), mat.clone()); g.add(mesh); return mesh }
  const ring = (r: number, y: number) => { const m = new T.Mesh(new T.TorusGeometry(r, 0.025, 8, 64), mat.clone()); m.rotation.x = Math.PI / 2; m.position.y = y; g.add(m); return m }
  if (id === 'shield') {
    const shell = new T.Mesh(new T.SphereGeometry(1.45, 32, 24), new T.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.2, side: T.DoubleSide, depthWrite: false }))
    shell.scale.set(0.7, 1, 0.8); shell.position.y = 1.3; if (!broken) g.add(shell); else { shell.geometry.dispose(); (shell.material as T.Material).dispose() }
    const heart = new T.Shape(); heart.moveTo(0, 0); heart.bezierCurveTo(-0.55, 0.4, -0.4, 0.85, 0, 0.5); heart.bezierCurveTo(0.4, 0.85, 0.55, 0.4, 0, 0)
    if (!broken) jewel(heart, 0, 2.6)
    else for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8
      const shard = new T.Mesh(new T.SphereGeometry(1.45, 5, 4, a, 0.18, 0.4 + (i % 4) * 0.55, 0.22), mat.clone())
      shard.position.set(Math.cos(a) * 0.25, 1.3, Math.sin(a) * 0.25); g.add(shard)
    }
  } else if (id === 'revive' || id === 'friend') {
    jewel(star, -0.35, 2.6, 0.75); jewel(star, 0.35, 2.8, 0.65)
    tube([new T.Vector3(-0.35, 2.6, 0), new T.Vector3(0, 2.9, 0), new T.Vector3(0.35, 2.8, 0)])
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; jewel(star, Math.cos(a), 1.4 + Math.sin(a), 0.12) }
  } else if (id === 'courage') {
    for (const side of [-1, 1]) {
      const wing = new T.Shape(); wing.moveTo(0, 0); wing.bezierCurveTo(side * 0.45, 0.65, side * 1.4, 0.85, side * 1.65, 0.65)
      for (let i = 0; i < 5; i++) wing.quadraticCurveTo(side * (1.5 - i * 0.23), 0.2 - i * 0.08, side * (1.32 - i * 0.23), 0.1 - i * 0.05)
      wing.closePath(); jewel(wing, side * 0.12, 2.1, 0.75)
      for (let i = 0; i < 4; i++) tube([new T.Vector3(side * (0.7 + i * 0.12), 1.7 - i * 0.15, -0.8), new T.Vector3(side * (0.9 + i * 0.12), 1.5 - i * 0.15, 0.5), new T.Vector3(side * (1 + i * 0.12), 1.6 - i * 0.15, 2.3)])
    }
    jewel(star, 0, 2.25, 0.5)
  } else if (id === 'tea') {
    const cup = new T.Mesh(new T.LatheGeometry([new T.Vector2(0.12, 0), new T.Vector2(0.16, 0.05), new T.Vector2(0.25, 0.3), new T.Vector2(0.22, 0.32)], 32), mat.clone()); cup.position.set(0, 2.35, 0); g.add(cup)
    for (let i = 0; i < 3; i++) tube([new T.Vector3((i - 1) * 0.12, 2.65, 0), new T.Vector3((i - 1) * 0.12 + 0.08, 2.85, 0), new T.Vector3((i - 1) * 0.12 - 0.04, 3.15, 0)], 0.012)
    ring(1, 0.35); ring(1.15, 0.4)
  } else if (id === 'rewind') {
    const face = new T.Mesh(new T.TorusGeometry(0.45, 0.045, 10, 64), mat.clone()); face.position.y = 2.65; g.add(face)
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; tube([new T.Vector3(Math.sin(a) * 0.34, 2.65 + Math.cos(a) * 0.34, 0), new T.Vector3(Math.sin(a) * 0.4, 2.65 + Math.cos(a) * 0.4, 0)], 0.012) }
    tube([new T.Vector3(0, 2.65, 0), new T.Vector3(-0.23, 2.8, 0)]); tube([new T.Vector3(0, 2.65, 0), new T.Vector3(0.08, 2.97, 0)])
    for (let j = 0; j < 3; j++) tube([new T.Vector3(-0.6, 0.5, 0.4 + j), new T.Vector3(0, 0.7, 0.9 + j), new T.Vector3(0.6, 0.5, 0.4 + j)])
  } else if (id === 'freeze') {
    const glass = new T.Mesh(new T.LatheGeometry([new T.Vector2(0.22, 0), new T.Vector2(0.21, 0.12), new T.Vector2(0.05, 0.36), new T.Vector2(0.21, 0.6), new T.Vector2(0.22, 0.72)], 24), mat.clone()); glass.position.y = 2.3; g.add(glass)
    for (const y of [2.3, 3.02]) ring(0.25, y)
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const p = new T.Vector3(Math.cos(a) * 1.2, 1.3 + Math.sin(a) * 1.2, 0); tube([new T.Vector3(0, 1.3, 0), p]); for (const side of [-1, 1]) tube([p.clone().multiplyScalar(0.7), p.clone().add(new T.Vector3(side * 0.12, -0.2, 0))], 0.01) }
  } else if (id === 'double') {
    for (const x of [-0.26, 0.26]) { const panel = new T.Mesh(new T.BoxGeometry(0.43, 0.55, 0.08), mat.clone()); panel.position.set(x, 2.6, 0); g.add(panel); tube([new T.Vector3(x - 0.21, 2.6, 0.06), new T.Vector3(x + 0.21, 2.6, 0.06)], 0.01) }
    for (const x of [-0.22, 0.22]) { const coin = new T.Mesh(new T.TorusGeometry(0.15, 0.025, 8, 32), mat.clone()); coin.position.set(x, 3.15, 0); g.add(coin); jewel(star, x, 3.15, 0.13) }
  } else if (id === 'magnet') {
    for (let j = 0; j < 3; j++) { const m = ring(0.9 + j * 0.12, 1 + j * 0.32); m.rotation.z = (j - 1) * 0.2 }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; tube([new T.Vector3(Math.cos(a) * 1.5, 0.5, Math.sin(a) * 1.5), new T.Vector3(Math.cos(a + 0.5), 1.2, Math.sin(a + 0.5)), new T.Vector3(0, 1.5, 0)], 0.012) }
  }
  return g
}
