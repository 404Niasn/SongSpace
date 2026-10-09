<script setup lang="ts">
import { computed } from 'vue'
import { PhArrowUpRight, PhCompass, PhCards, PhCube, PhHeadphones, PhMusicNotes, PhSun, PhTrophy, PhWaveform, PhArrowRight, PhCheck, PhVinylRecord } from '@phosphor-icons/vue'
import { spectrumMotion as motion } from '@/game/visual'
import { cloud } from '@/game/cloud'
import SpectrumGrid from './SpectrumGrid.vue'
import PackModel from './PackModel.vue'
import { game, catalog, ownedCount, claimDaily, today, claimableAchievements } from '@/game/save'
const emit = defineEmits<{ enter: [page: 'race' | 'packs' | 'warehouse' | 'daily' | 'world' | 'records' | 'achievements']; message: [text: string] }>()
const pending = computed(() => Object.values(game.packs).reduce((a, b) => a + b, 0))
const covers = computed(() => { const owned = catalog.songs.filter(s => game.owned[s.id]); return (owned.length ? owned : catalog.songs).slice(0, 5) })
const guessed = computed(() => game.challengeDay === today() && game.challengeWon)
function sign() { if (claimDaily()) emit('message', '+50 音符') }
</script>
<template>
<section class="product-hall">
  <div class="hall-title-row"><div><h1>{{ game.name ? game.name + '的歌境' : '游戏大厅' }}</h1><span>收藏音乐，走进它的世界。</span></div><button class="motion-switch" :aria-pressed="motion" @click="motion = !motion"><PhWaveform :size="18" weight="duotone" />光谱 {{ motion ? '开' : '关' }}</button></div>
  <div class="hall-primary">
    <section class="hall-music-entry">
      <SpectrumGrid :paused="!motion" />
      <div class="hall-music-copy"><PhHeadphones :size="30" weight="duotone" /><h2>音乐，<br />玩起来。</h2><button class="spectrum-btn" @click="emit('enter', 'race')">进入探索<PhArrowUpRight :size="20" weight="duotone" /></button></div>
      <div class="hall-music-albums" aria-hidden="true"><img v-for="s in covers.slice(0, 3)" :key="s.id" :src="s.cover_path" alt="" /></div>
    </section>
    <aside class="hall-daily-panel">
      <div class="hall-daily-top"><PhSun :size="22" weight="duotone" /><b>每日签到</b><small>{{ today().slice(5).replace('-', ' / ') }}</small></div>
      <div class="hall-daily-value"><PhMusicNotes :size="26" weight="duotone" /><strong>50</strong><span>音符</span></div>
      <button class="spectrum-btn sign-button" :disabled="game.daily === today()" @click="sign">{{ game.daily === today() ? '已签到' : '领取音符' }}<PhCheck v-if="game.daily === today()" :size="18" weight="duotone" /><PhArrowRight v-else :size="18" weight="duotone" /></button>
      <button class="hall-task-link" @click="emit('enter', 'daily')"><PhHeadphones :size="24" weight="duotone" /><span><b>每日猜歌</b><small>{{ guessed ? '已完成' : '首猜命中 · 五连包' }}</small></span><PhArrowUpRight :size="18" weight="duotone" /></button>
      <button class="hall-task-link" @click="emit('enter', 'achievements')"><PhTrophy :size="24" weight="duotone" /><span><b>成就</b><small>{{ claimableAchievements ? claimableAchievements + ' 份奖励待领' : '查看进度' }}</small></span><PhArrowUpRight :size="18" weight="duotone" /></button>
    </aside>
  </div>
  <div class="hall-collection-row">
    <button class="hall-pack-panel" @click="emit('enter', 'packs')"><div class="hall-pack-info"><PhCards :size="27" weight="duotone" /><h2>卡包</h2><span>{{ pending ? pending + ' 包待拆' : '选择你的下一包' }}</span><b>进入商店<PhArrowUpRight :size="18" weight="duotone" /></b></div><div class="hall-pack-object"><PackModel title="歌曲三连包" :count="3" tone="mint" preview /></div></button>
    <button class="hall-library-panel" @click="emit('enter', 'warehouse')"><div class="hall-library-heading"><PhVinylRecord :size="25" weight="duotone" /><h2>收藏</h2><span>{{ ownedCount }}<small> / {{ catalog.songs.length || 100 }}</small></span><PhArrowUpRight :size="18" weight="duotone" /></div><div class="hall-albums"><div v-for="s in covers" :key="s.id"><img :src="s.cover_path" :alt="s.title" :class="{locked: !game.owned[s.id]}"/><span>{{ s.title }}</span></div></div></button>
  </div>
  <div class="hall-footer-links"><button @click="emit('enter', 'world')"><PhCube :size="21" weight="duotone" />微缩世界<PhArrowUpRight :size="15" weight="duotone" /></button><button @click="emit('enter', 'records')"><PhCompass :size="21" weight="duotone" />探索记录<PhArrowUpRight :size="15" weight="duotone" /></button><span>最高分 <b>{{ game.best.toLocaleString() }}</b></span><span class="hall-sync" :class="cloud.status"><i />{{ cloud.status === 'synced' ? '存档已同步' : cloud.status === 'loading' ? '连接中' : cloud.status === 'pending' ? '正在保存' : '本机存档' }}</span></div>
</section>
</template>
<style scoped>
.hall-music-entry { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; min-height: 350px; background: #eef1ec; border: 1px solid #dfe5dc; border-radius: 12px; }
.hall-music-entry :deep(.spectrum-grid) { opacity: .1; }
.hall-music-copy { position: relative; z-index: 2; padding: 35px; flex-shrink: 0; color: #526651; }
.hall-music-copy h2 { font-size: clamp(36px, 4vw, 56px); letter-spacing: -2px; line-height: 1.15; margin: 15px 0 25px; color: #344333; font-weight: 600; }
.hall-music-copy button { display: flex; align-items: center; gap: 28px; padding: 14px 20px; }
.hall-music-albums { position: relative; flex: 1; min-width: 0; height: 250px; margin-right: 25px; }
.hall-music-albums img { position: absolute; width: 165px; aspect-ratio: 1; object-fit: cover; border: 6px solid #fff; box-shadow: 0 10px 24px #455d3b26; border-radius: 3px; left: 50%; top: 40px; }
.hall-music-albums img:nth-child(1) { transform: translateX(-95%) rotate(-14deg); }
.hall-music-albums img:nth-child(2) { transform: translateX(-45%) rotate(5deg); top: 20px; }
.hall-music-albums img:nth-child(3) { transform: translateX(5%) rotate(17deg); top: 62px; }
@media(max-width:900px) { .hall-music-albums img { width: 125px; }.hall-music-copy { padding: 25px; } }
@media(max-width:650px) { .hall-music-entry { min-height: 275px; }.hall-music-copy { padding: 24px; }.hall-music-albums { margin-right: 10px; }.hall-music-albums img { width: 110px; top: 75px; }.hall-music-albums img:nth-child(2) { top: 45px; }.hall-music-albums img:nth-child(3) { display: none; } }
</style>
