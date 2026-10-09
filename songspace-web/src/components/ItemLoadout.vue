<script setup lang="ts">
import { computed, ref } from 'vue'
import { catalog, game, cardFor, persist } from '@/game/save'
import { ITEMS, artPath, skillLevel } from '@/game/content'
const emit = defineEmits<{ change: [] }>()
const selecting = ref<number | null>(null)
const owned = computed(() => catalog.songs.filter(s => game.owned[s.id] && ITEMS[s.title]))
const slots = computed(() => [0, 1].map(i => catalog.songs.find(s => s.id === game.equippedItems[i] && game.owned[s.id] && ITEMS[s.title])))
function select(id: string) {
  if (selecting.value === null) return
  const next = [...game.equippedItems]
  const duplicate = next.indexOf(id)
  if (duplicate >= 0) next[duplicate] = ''
  next[selecting.value] = id
  game.equippedItems = next.filter(Boolean).slice(0, 2)
  game.equippedItem = next.find(Boolean) || ''
  persist(); selecting.value = null; emit('change')
}
</script>
<template>
  <div class="item-loadout">
    <small>带上两份助力 · 每局各一次</small>
    <button v-for="(song, i) in slots" :key="i" class="item-slot" @click="selecting = i">
      <img v-if="song" :src="artPath(ITEMS[song.title]!.id)" alt="" />
      <span><b>{{ song ? ITEMS[song.title]!.name : `选择道具 ${i + 1}` }}</b><small>{{ song ? `LV.${skillLevel(game.owned[song.id] || 0)} · ${song.title}` : '从已收藏的金卡中携带' }}</small></span><em>更换 ↗</em>
    </button>
  </div>
  <div v-if="selecting !== null" class="card-detail-overlay" @click.self="selecting = null">
    <article class="item-picker" role="dialog" aria-modal="true" aria-label="选择闯关道具">
      <button class="opening-close" @click="selecting = null" aria-label="关闭">×</button>
      <p class="eyebrow">PACK FOR THE JOURNEY</p><h2>这一程，带什么？</h2>
      <p>首张永久解锁，每局恢复一次。复活信物自动发动。</p>
      <div class="item-picker-list"><button v-for="song in owned" :key="song.id" @click="select(song.id)"><img :src="artPath(ITEMS[song.title]!.id)" alt=""/><div><b>{{ ITEMS[song.title]!.name }}</b><small>《{{ song.title }}》 · LV.{{ skillLevel(game.owned[song.id] || 0) }}</small><p>{{ cardFor(song).effect }}</p></div></button></div>
      <p v-if="!owned.length">还没有道具金卡，开出一张就可以带上旅途。</p>
      <button class="outline-btn" @click="select('')">清空这个槽位</button>
    </article>
  </div>
</template>
