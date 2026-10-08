<script setup lang="ts">
import type { GameCard } from '@/game/save'
import { KIND_NAMES } from '@/game/save'
defineProps<{ card: GameCard; large?: boolean }>()
</script>
<template>
  <div class="song-card-print" :class="[card.rarity, { locked: !card.count, large }]">
    <div class="print-header">
      <span>SONGSPACE</span><b>{{ String(card.song.rank).padStart(3, '0') }}</b>
    </div>
    <div class="print-art">
      <img :src="card.song.cover_path" :alt="card.song.title + '封面'" loading="lazy" /><span>{{
        card.rarity === 'gold' ? '✦' : card.rarity === 'rainbow' ? '✧' : '♪'
      }}</span>
    </div>
    <div class="print-title">
      <small
        >{{ KIND_NAMES[card.kind] }} /
        {{
          card.rarity === 'gold' ? 'GOLD' : card.rarity === 'rainbow' ? 'WORLD' : 'COLLECTION'
        }}</small
      >
      <h3>{{ card.song.title }}</h3>
      <p>{{ card.song.artists.map((a) => a.name).join(' / ') }}</p>
    </div>
    <div class="print-footer">
      <span>{{ card.count ? 'LV.' + (1 + Math.floor((card.count - 1) / 3)) : '未获得' }}</span
      ><b>{{ card.count ? '×' + card.count : '—' }}</b>
    </div>
  </div>
</template>
