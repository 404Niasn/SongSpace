<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { WorldEngine, type WorldStatus } from '@/worlds/engine'
import type { DecorationKind, ViewMode, WorldId } from '@/worlds/types'

const props = defineProps<{
  world: WorldId
  mode: ViewMode
  evening: boolean
  firstPerson: boolean
  transport: 'bike' | 'walk'
  placement: DecorationKind | null
}>()
const emit = defineEmits<{
  status: [status: WorldStatus]
  message: [message: string]
  ready: []
  cancelPlacement: []
}>()
const host = ref<HTMLElement>()
const error = ref('')
let engine: WorldEngine | undefined

onMounted(() => {
  if (!host.value) return
  try {
    engine = new WorldEngine(
      host.value,
      props.world,
      (status) => emit('status', status),
      (message) => emit('message', message),
      (message) => {
        error.value = message
      },
      () => emit('cancelPlacement'),
    )
    engine.setEvening(props.evening)
    emit('ready')
  } catch (cause) {
    console.error('Could not create the song world', cause)
    error.value = '暂时无法打开 3D 世界，请确认浏览器已启用硬件加速，再刷新重试。'
  }
})
watch(
  () => props.world,
  (world) => engine?.setWorld(world),
)
watch(
  () => props.mode,
  (mode) => engine?.setMode(mode),
)
watch(
  () => props.evening,
  (evening) => engine?.setEvening(evening),
)
watch(
  () => props.firstPerson,
  (first) => engine?.setFirstPerson(first),
)
watch(
  () => props.transport,
  (transport) => engine?.setTransport(transport),
)
watch(
  () => props.placement,
  (placement) => engine?.setPlacement(placement),
)
onBeforeUnmount(() => engine?.dispose())
defineExpose({
  resetView: () => engine?.resetOverview(),
  resetPlayer: () => engine?.resetPlayer(),
  undo: () => engine?.undoDecoration(),
  input: (key: string, pressed: boolean) => engine?.input(key, pressed),
})
const reload = () => window.location.reload()
</script>

<template>
  <div ref="host" class="world-canvas" />
  <div v-if="error" class="world-error" role="alert">
    <p>{{ error }}</p>
    <button class="primary-button" @click="reload">重新打开</button>
  </div>
</template>
