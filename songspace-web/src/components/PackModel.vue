<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { PackModel } from '@/game/packModel'
const props = defineProps<{
  title: string
  count: number
  tone: string
  tear?: number
  opening?: boolean
  openingProgress?: number
  preview?: boolean
}>()
const host = ref<HTMLElement>()
let model: PackModel | undefined
onMounted(() => {
  if (host.value)
    model = new PackModel(host.value, props.title, props.count, props.tone, props.preview)
})
watch(
  () => props.tear,
  (v) => model?.tear(v || 0),
)
watch(
  () => props.opening,
  (v) => {
    if (v) model?.open()
  },
)
watch(() => props.openingProgress, (value) => model?.openingAt(value || 0))
onBeforeUnmount(() => model?.dispose())
function move(e: PointerEvent) {
  const rect = host.value!.getBoundingClientRect()
  model?.tilt(((e.clientX - rect.left) / rect.width - 0.5) * 2)
}
</script>
<template>
  <div ref="host" class="pack-model" @pointermove="move" @pointerleave="model?.tilt(0)"><slot /></div>
</template>
