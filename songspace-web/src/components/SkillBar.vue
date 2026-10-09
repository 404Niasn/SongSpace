<script setup lang="ts">
import { artPath } from '@/game/content'
import type { RaceStatus } from '@/game/race'
defineProps<{ state: RaceStatus }>()
const emit = defineEmits<{ use: [index: number] }>()
</script>
<template>
  <div class="skill-dock" aria-label="闯关道具">
    <button v-for="i in 2" :key="i" :disabled="!state.skills?.[i - 1] || state.skills[i - 1]!.used || state.skills[i - 1]!.automatic || state.paused" @click="emit('use', i - 1)" :aria-label="state.skills?.[i-1]?.name || '空道具槽，下局可装备'">
      <img v-if="state.skills?.[i-1]" :src="artPath(state.skills[i-1]!.id)" alt="" />
      <span><b>{{ state.skills?.[i-1]?.name || '未携带' }}</b><small>{{ state.skills?.[i-1]?.active || (state.skills?.[i-1]?.used ? '本局已用完' : state.skills?.[i-1]?.automatic ? '自动守护 · 1 次' : state.skills?.[i-1] ? '点击使用 · 剩余 1 次' : '开局前选择道具') }}</small></span><kbd>{{ i }}</kbd>
    </button>
  </div>
</template>
