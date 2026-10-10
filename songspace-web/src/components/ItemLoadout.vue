<script setup lang="ts">
import { computed, ref } from 'vue'
import { catalog, game, cardFor, persist } from '@/game/save'
import { ITEMS, artPath, skillLevel } from '@/game/content'
import { PhPlus } from '@phosphor-icons/vue'
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
    <button v-for="(song, i) in slots" :key="i" class="item-slot" :class="{ equipped: !!song }" @click="selecting = i">
      <span class="item-slot-art">
      <img v-if="song" :src="artPath(ITEMS[song.title]!.id)" alt="" />
      <PhPlus v-else :size="22" weight="light" />
      </span>
      <span class="item-slot-copy"><small class="item-slot-label">道具 {{ i + 1 }}<template v-if="song"> · LV.{{ skillLevel(game.owned[song.id] || 0) }}</template></small><b>{{ song ? ITEMS[song.title]!.name : '添加一份助力' }}</b><small>{{ song ? ITEMS[song.title]!.description : '从已收藏的金卡中选择' }}</small></span><em>{{ song ? '更换' : '选择' }}</em>
    </button>
  </div>
  <div v-if="selecting !== null" class="card-detail-overlay" @click.self="selecting = null">
    <article class="item-picker" role="dialog" aria-modal="true" aria-label="选择闯关道具">
      <button class="opening-close" @click="selecting = null" aria-label="关闭">×</button>
      <h2>选择道具</h2>
      <div class="item-picker-list"><button v-for="song in owned" :key="song.id" @click="select(song.id)"><img :src="artPath(ITEMS[song.title]!.id)" alt=""/><div><b>{{ ITEMS[song.title]!.name }}</b><small>《{{ song.title }}》 · LV.{{ skillLevel(game.owned[song.id] || 0) }}</small><p>{{ cardFor(song).effect }}</p></div></button></div>
      <p v-if="!owned.length">还没有道具金卡，开出一张就可以带上旅途。</p>
      <button class="outline-btn" @click="select('')">清空这个槽位</button>
    </article>
  </div>
</template>

<style scoped>
.item-picker { background:#fcfefd;color:#354b3e;border:1px solid #dce7df;border-radius:18px;box-shadow:0 24px 90px #213a2b30;padding:24px; }.item-picker h2{font-size:19px;font-weight:600;margin:0 0 20px}.item-picker .opening-close{top:16px;right:16px;left:auto;border-radius:8px;background:#edf4ef;color:#65816d}.item-picker-list button{background:#f1f6f2;border:1px solid #dfe9e2;border-radius:10px;color:#42674e}.item-picker-list button:hover{background:#e8f2eb;border-color:#aac6b2}.item-picker .outline-btn{margin-top:16px;background:#fff;color:#587963;border-color:#d3e3d8}.card-detail-overlay{background:#253d3155;backdrop-filter:blur(5px)}
</style>
