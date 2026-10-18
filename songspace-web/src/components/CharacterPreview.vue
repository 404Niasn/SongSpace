<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildRider } from '@/game/rider'
import { addCharacterOutfits } from '@/worlds/outfitModels'
import { disposeObject } from '@/worlds/models'
import type { OutfitDefinition } from '@/game/outfits'

const props = defineProps<{ outfits: readonly OutfitDefinition[] }>()
const host = ref<HTMLElement>(), error = ref(false)
let renderer: T.WebGLRenderer | undefined, controls: OrbitControls | undefined
let resize: ResizeObserver | undefined, frame = 0, character: T.Group | undefined
let attachments: T.Group | undefined, scene: T.Scene | undefined
let turn = 0, greeting = -10, wearingHeels = false
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
function dress() {
  if (!character || !scene) return
  const heels = props.outfits.some(outfit => outfit.id === 'red-high-heels')
  if (heels !== wearingHeels) {
    const rotation = character.rotation.clone()
    if (attachments) { character.remove(attachments); disposeObject(attachments); attachments = undefined }
    scene.remove(character); disposeObject(character)
    character = buildRider('standing', heels).group
    character.rotation.copy(rotation); scene.add(character); wearingHeels = heels
  }
  if (attachments) { character.remove(attachments); disposeObject(attachments) }
  attachments = addCharacterOutfits(character, props.outfits, 'standing')
}
watch(() => props.outfits.map(outfit => outfit.id).join(','), dress)
function greet() { greeting = performance.now() / 1000 }
onMounted(() => {
  try {
    const target = host.value!
    scene = new T.Scene()
    const camera = new T.PerspectiveCamera(35, 1, .1, 30)
    camera.position.set(1.05, 1.45, -4.0)
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.VSMShadowMap
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', '可旋转的三维人物，展示当前穿戴装扮')
    target.append(renderer.domElement)
    scene.add(new T.HemisphereLight('#ffffff', '#9baeb3', 2))
    const light = new T.DirectionalLight('#fff5e5', 2.2)
    light.position.set(-2, 6, 3); light.castShadow = true
    light.shadow.mapSize.set(1024, 1024)
    Object.assign(light.shadow.camera, { left: -2, right: 2, top: 3, bottom: -2 })
    light.shadow.normalBias = .015
    light.shadow.radius = 8
    light.shadow.blurSamples = 8
    light.shadow.bias = -.0001
    scene.add(light)
    const rim = new T.DirectionalLight('#eaf3ff', .8)
    rim.position.set(3, 4, -3); scene.add(rim)
    const ground = new T.Mesh(new T.PlaneGeometry(20, 20), new T.ShadowMaterial({ opacity: .12 }))
    ground.rotation.x = -Math.PI / 2; ground.position.y = .005; ground.receiveShadow = true
    scene.add(ground)
    character = buildRider('standing').group
    scene.add(character); dress()
    controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.03, 0)
    controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true
    controls.minPolarAngle = .65; controls.maxPolarAngle = Math.PI / 2
    controls.update()
    resize = new ResizeObserver(() => {
      const width = target.clientWidth, height = target.clientHeight
      if (!width || !height) return
      renderer!.setSize(width, height)
      camera.aspect = width / height
      // Frame the whole silhouette, including heels, in the narrow wardrobe panel.
      const distance = Math.max(3.75, 1.25 / (Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect))
      camera.position.sub(controls!.target).normalize().multiplyScalar(distance).add(controls!.target)
      camera.updateProjectionMatrix(); controls!.update()
    })
    resize.observe(target)
    let previous = performance.now()
    function render(now: number) {
      frame = requestAnimationFrame(render)
      const dt = Math.min((now - previous) / 1000, .05); previous = now
      if (document.hidden) return
      const time = now / 1000
      character!.rotation.y = T.MathUtils.damp(character!.rotation.y, turn, 6, dt)
      character!.scale.y = reducedMotion ? 1 : 1 + Math.sin(time * 1.8) * .003
      character!.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.1) * .008
      const progress = T.MathUtils.clamp((time - greeting) / 1.3, 0, 1)
      character!.rotation.x = Math.sin(progress * Math.PI) * .12
      controls!.update()
      // Keep the studio key light on the viewer's left while dragging the camera.
      const azimuth = controls!.getAzimuthalAngle()
      light.position.set(-2 * Math.cos(azimuth) + 3 * Math.sin(azimuth), 6, 2 * Math.sin(azimuth) + 3 * Math.cos(azimuth))
      renderer!.render(scene!, camera)
    }
    frame = requestAnimationFrame(render)
  } catch (e) { error.value = true; console.error(e) }
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); resize?.disconnect(); controls?.dispose()
  if (scene) disposeObject(scene)
  renderer?.dispose(); renderer?.domElement.remove()
})
</script>

<template>
  <div class="character-preview">
    <div ref="host" class="character-stage"><p v-if="error" class="preview-error">暂时无法显示 3D 人物，请使用支持 WebGL 的浏览器。</p></div>
    <div v-if="!error" class="character-actions">
      <button type="button" @click="turn += Math.PI">转身</button>
      <button type="button" @click="greet">打个招呼</button>
    </div>
    <p class="character-hint">拖动旋转 · 穿戴同步到探索</p>
  </div>
</template>

<style scoped>
.character-stage{width:100%;height:var(--character-stage-height,360px);cursor:grab}.character-stage:active{cursor:grabbing}.character-stage :deep(canvas){display:block;max-width:100%;touch-action:none}.character-actions{display:flex;justify-content:center;gap:10px}.character-actions button{padding:7px 15px;border:1px solid #d5dfeb;border-radius:8px;background:#ffffffb8;color:#355442;font-size:12px;cursor:pointer}.character-actions button:hover{background:#e5eeeb;border-color:#b2c8c0}.character-actions button:focus-visible{outline:2px solid #668c80;outline-offset:3px}.character-hint{margin:12px 0 0;text-align:center;font-size:11px;color:#46614f}.preview-error{padding:80px 12px;font-size:12px;line-height:1.8;text-align:center;color:#61728b}@media(max-width:600px){.character-stage{height:var(--character-stage-height,330px)}}
</style>
