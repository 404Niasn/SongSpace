<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildVehicle, type VehicleModel } from '@/game/vehicles'
import { buildSimpleBicycle } from '@/game/simpleBicycle'
import { disposeObject } from '@/worlds/models'

const props = defineProps<{ model?: VehicleModel; name?: string; framing?: number }>()
const host = ref<HTMLElement>(), failed = ref(false)
let scene: T.Scene, camera: T.PerspectiveCamera, renderer: T.WebGLRenderer
let controls: OrbitControls, observer: ResizeObserver, model: T.Group | undefined, frame = 0
function updateModel() {
  if (!scene) return
  if (model) { scene.remove(model); disposeObject(model) }
  model = props.model ? buildVehicle(props.model).group : buildSimpleBicycle()
  scene.add(model)
  const bounds = new T.Box3().setFromObject(model), center = bounds.getCenter(new T.Vector3())
  const size = bounds.getSize(new T.Vector3()).length()
  controls.target.copy(center)
  camera.position.copy(center).add(new T.Vector3(size * .9 * (props.framing || 1), size * .5 * (props.framing || 1), size * .75 * (props.framing || 1)))
  camera.near = .01; camera.far = size * 20; camera.updateProjectionMatrix(); controls.update()
  renderer.domElement.setAttribute('aria-label', (props.name || '载具') + '实时三维模型，可拖动旋转')
}
watch(() => [props.model, props.name, props.framing], updateModel)
onMounted(() => {
  try {
    scene = new T.Scene(); camera = new T.PerspectiveCamera(35, 1, .01, 100)
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.domElement.setAttribute('role', 'img'); host.value!.append(renderer.domElement)
    scene.add(new T.HemisphereLight('#ffffff', '#a3b9a9', 2.5))
    const light = new T.DirectionalLight('#ffffff', 3); light.position.set(3, 5, 4); scene.add(light)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true
    updateModel()
    observer = new ResizeObserver(() => {
      const width = host.value!.clientWidth, height = host.value!.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix()
    }); observer.observe(host.value!)
    const draw = () => { frame = requestAnimationFrame(draw); if (!document.hidden) { controls.update(); renderer.render(scene, camera) } }
    draw()
  } catch { failed.value = true }
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose(); if (scene) disposeObject(scene); renderer?.dispose(); renderer?.domElement.remove() })
</script>
<template><div ref="host" class="vehicle-preview"><span v-if="failed">3D 预览暂不可用</span></div></template>
<style scoped>
.vehicle-preview { width:100%;height:132px;min-height:0;background:radial-gradient(ellipse at center,#eef5ef,#fafcfb 75%);border-radius:8px;cursor:grab; }.vehicle-preview:active{cursor:grabbing}.vehicle-preview :deep(canvas){display:block;touch-action:none}.vehicle-preview>span{display:block;text-align:center;padding:50px 8px;color:#7f9186;font-size:11px}
</style>
