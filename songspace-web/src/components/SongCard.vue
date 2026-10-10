<script setup lang="ts">
import type { GameCard } from '@/game/save'
import '@/assets/record-room.css'
const CARD_LABELS = { map: '彩卡 · 地图', item: '金卡 · 道具', decoration: '银卡 · 装饰', outfit: '蓝卡 · 人物装扮', vehicle: '紫卡 · 载具' }
import { skillLevel } from '@/game/content'
import { coverPath } from '@/game/coverAssets'
defineProps<{ card: GameCard; large?: boolean; collection?: boolean }>()
</script>
<template>
  <div class="song-card-print" :class="[card.rarity, { vehicle: card.kind === 'vehicle', outfit: card.kind === 'outfit', locked: !card.count, large }]">
    <div class="print-art">
      <img :src="coverPath(card.song.cover_path)" :alt="card.outfit ? card.outfit.name + '装扮示意' : card.song.title + '封面'" loading="lazy" /><span>{{
        card.rarity === 'gold' ? '✦' : card.rarity === 'rainbow' ? '✧' : '♪'
      }}</span>
    </div>
    <div class="print-title">
      <small>{{ CARD_LABELS[card.kind] }}</small>
      <h3>{{ card.song.title }}</h3>
      <p v-if="!collection">{{ card.song.artists.map((a) => a.name).join(' / ') }}</p>
      <div v-else class="print-artist-row">
        <p>{{ card.song.artists.map((a) => a.name).join(' / ') }}</p>
        <span class="print-inline-level">{{ !card.count ? '未获得' : card.outfit ? '已解锁' : card.kind === 'decoration' ? '×' + card.count : 'LV.' + skillLevel(card.count) }}</span>
      </div>
      <p v-if="card.outfit">人物装扮 · {{ card.outfit.name }}</p>
    </div>
    <blockquote v-if="card.prose" class="card-prose" aria-label="歌词摘句">{{ card.prose }}</blockquote>
    <div v-if="!collection" class="print-footer">
      <span>{{ card.count ? card.outfit ? '装扮已解锁' : card.kind === 'decoration' ? '装饰库存' : 'LV.' + skillLevel(card.count) : '未获得' }}</span
      ><b>{{ card.count ? '×' + card.count : '—' }}</b>
    </div>
  </div>
</template>
<style scoped>
.card-prose { margin: 0; }
</style>
