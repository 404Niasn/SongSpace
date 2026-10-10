import * as THREE from 'three'
import { buildWorld, disposeObject } from './models'
import { WORLD_OPTIONS, type WorldId } from './types'

// These are snapshots of the actual models, so the map selector matches the playable world.
export function renderWorldThumbnails(): Record<WorldId, string> {
  const thumbnails = {} as Record<WorldId, string>
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(600, 400)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  try {
    for (const option of WORLD_OPTIONS) {
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(option.id === 'space' ? '#070b21' : option.id === 'fuji' ? '#eee0e7' : '#e7ebde')
      const model = buildWorld(option.id)
      const sunlight = new THREE.DirectionalLight('#fff2ce', 3)
      sunlight.position.set(-40, 65, 35)
      sunlight.castShadow = true
      sunlight.shadow.mapSize.set(512, 512)
      Object.assign(sunlight.shadow.camera, {
        left: -50,
        right: 50,
        top: 50,
        bottom: -50,
        near: 1,
        far: 170,
      })
      scene.add(model.group, sunlight, new THREE.HemisphereLight('#f6f5e7', '#889c78', 2))
      const camera = new THREE.PerspectiveCamera(39, 1.5, 0.1, 300)
      camera.position.set(80, 80, 90)
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      thumbnails[option.id] = renderer.domElement.toDataURL('image/jpeg', 0.85)
      disposeObject(scene)
      sunlight.shadow.map?.dispose()
    }
    return thumbnails
  } finally {
    renderer.dispose()
    renderer.forceContextLoss()
  }
}
