<script setup lang="ts">
import type { GameCard } from '@/game/save'
import { KIND_NAMES } from '@/game/save'
import { skillLevel } from '@/game/content'
defineProps<{ card: GameCard; large?: boolean }>()
</script>
<template>
  <div class="song-card-print" :class="[card.rarity, { locked: !card.count, large }]">
    <div class="print-art">
      <img :src="card.song.cover_path" :alt="card.outfit ? card.outfit.name + '装扮示意' : card.song.title + '封面'" loading="lazy" /><span>{{
        card.rarity === 'gold' ? '✦' : card.rarity === 'rainbow' ? '✧' : '♪'
      }}</span>
    </div>
    <div class="print-title">
      <small>{{ KIND_NAMES[card.kind] }}</small>
      <h3>{{ card.song.title }}</h3>
      <p>{{ card.song.artists.map((a) => a.name).join(' / ') }}</p>
      <p v-if="card.outfit">人物装扮 · {{ card.outfit.name }}</p>
    </div>
    <blockquote v-if="card.prose" class="card-prose">{{ card.prose }}</blockquote>
    <div class="print-footer">
      <span>{{ card.count ? card.outfit ? '装扮已解锁' : card.kind === 'decoration' ? '装饰库存' : 'LV.' + skillLevel(card.count) : '未获得' }}</span
      ><b>{{ card.count ? '×' + card.count : '—' }}</b>
    </div>
  </div>
</template>
<style scoped>
.card-prose { margin: 0; }
</style>
