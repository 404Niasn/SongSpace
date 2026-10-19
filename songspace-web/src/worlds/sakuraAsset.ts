import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

let template: T.Group | undefined
let loading: Promise<void> | undefined

// One cached download; instances own their geometry/materials so chunk recycling is safe.
export function preloadSakura() {
  return loading ??= new GLTFLoader()
    .loadAsync(`${import.meta.env?.BASE_URL ?? '/'}models/sakura-botanical.glb`)
    .then(gltf => { template = gltf.scene })
}

export function upgradeSakura(group: T.Group, seed: number) {
  const install = () => {
    if (!template || group.userData.assetDisposed) return
    for (const child of [...group.children]) {
      child.traverse(o => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose()
          for (const mat of Array.isArray(o.material) ? o.material : [o.material]) mat.dispose()
        }
      })
      group.remove(child)
    }
    const model = template.clone(true)
    model.rotation.y = seed * 2.399
    model.scale.set(.84, 1, .84)
    model.traverse(o => {
      if (!(o instanceof T.Mesh)) return
      o.geometry = o.geometry.clone()
      const materials = Array.isArray(o.material) ? o.material : [o.material]
      const clones = materials.map(mat => mat.clone())
      o.material = Array.isArray(o.material) ? clones : clones[0]!
      o.castShadow = true
      o.receiveShadow = true
    })
    group.add(model)
    group.userData.sourceAsset = 'sakura-botanical.glb'
  }
  if (template) { install(); return true }
  else if (typeof window !== 'undefined') {
    void preloadSakura().then(install).catch(error => {
      console.warn('樱花模型加载失败，使用备用树木', error)
    })
  }
  return false
}
