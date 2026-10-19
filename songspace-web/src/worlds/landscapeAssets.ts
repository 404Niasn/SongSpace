import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

type Asset = 'forest-pine' | 'coastal-palm' | 'jiangnan-roof'
const templates = new Map<Asset, T.Group>()
const loading = new Map<Asset, Promise<void>>()
export function preloadLandscape(id: Asset) {
  if (!loading.has(id)) loading.set(id, new GLTFLoader()
    .loadAsync(`${import.meta.env?.BASE_URL ?? '/'}models/${id}.glb`)
    .then(gltf => { templates.set(id, gltf.scene) }))
  return loading.get(id)!
}

export function upgradeLandscape(root: T.Group, id: Asset, options: { rotation?: number; scaleX?: number; y?: number } = {}) {
  const install = () => {
    const template = templates.get(id)
    if (!template || root.userData.assetDisposed) return
    for (const child of [...root.children]) {
      child.traverse(o => {
        if (!(o instanceof T.Mesh || o instanceof T.Line)) return
        o.geometry.dispose()
        for (const material of Array.isArray(o.material) ? o.material : [o.material]) material.dispose()
      })
      root.remove(child)
    }
    const model = template.clone(true)
    model.rotation.y = options.rotation ?? 0
    model.scale.x = options.scaleX ?? 1
    model.position.y = options.y ?? 0
    model.traverse(o => {
      if (!(o instanceof T.Mesh)) return
      o.geometry = o.geometry.clone()
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone()
      o.castShadow = true; o.receiveShadow = true
    })
    root.add(model); root.userData.sourceAsset = `${id}.glb`
  }
  if (templates.has(id)) { install(); return true }
  if (typeof window !== 'undefined') void preloadLandscape(id).then(install).catch(error => console.warn(`模型 ${id} 加载失败，保留备用模型`, error))
  return false
}
