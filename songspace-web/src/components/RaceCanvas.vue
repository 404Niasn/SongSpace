<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Race, type RaceStatus } from '@/game/race'
import type { WorldId } from '@/worlds/types'
import type { SkillSlot } from '@/game/skills'
import type { OutfitDefinition } from '@/game/outfits'
import type { VehicleModel } from '@/game/vehicles'
import type { WeatherId } from '@/game/content'
const props = defineProps<{ world: WorldId; color: string; baseSpeed: number; evening: boolean; skills: SkillSlot[]; outfits: OutfitDefinition[]; vehicleModel?: VehicleModel; weather?: WeatherId }>()
const emit = defineEmits<{ status: [RaceStatus]; end: [RaceStatus]; ready: []; error: [string] }>()
const host = ref<HTMLElement>()
let race: Race | undefined
onMounted(() => {
  try {
    race = new Race(
      host.value!,
      props.world,
      (s) => emit('status', s),
      (s) => emit('end', s),
      props.color,
      props.baseSpeed,
      props.evening,
      props.skills,
      props.outfits,
      props.vehicleModel,
      props.weather,
    )
    emit('ready')
  } catch (e) {
    emit('error', '3D 场景未能启动，请确认浏览器支持 WebGL。')
    console.error(e)
  }
})
onBeforeUnmount(() => race?.dispose())
defineExpose({
  camera: (mode: number) => race?.setCamera(mode),
  start: () => race?.start(),
  enter: () => race?.enter() ?? Promise.resolve(false),
  finish: () => race?.finish(),
  pause: () => race?.togglePause(),
  control: (a: string) => race?.control(a),
  boost: (seconds: number) => race?.useBoost(seconds),
  useSkill: (index: number) => race?.useSkill(index) || false,
})
</script>
<template><div ref="host" class="race-canvas" /></template>
