<script setup lang="ts">
import { coverPath } from '@/game/coverAssets'
import { computed } from 'vue'
import { PhCompass, PhCards, PhCube, PhHeadphones, PhTrophy, PhCheck, PhVinylRecord } from '@phosphor-icons/vue'
import { cloud } from '@/game/cloud'
import PackModel from './PackModel.vue'
import { game, catalog, ownedCount, claimDaily, dailySignDay, today, claimableAchievements } from '@/game/save'
const emit = defineEmits<{ enter: [page: 'race' | 'packs' | 'warehouse' | 'daily' | 'world' | 'records' | 'achievements']; message: [text: string] }>()
const pending = computed(() => Object.values(game.packs).reduce((a, b) => a + b, 0))
const covers = computed(() => { const owned = catalog.songs.filter(s => game.owned[s.id]); return (owned.length ? owned : catalog.songs).slice(0, 5) })
const guessed = computed(() => game.challengeDay === today() && game.challengeWon)
const signDay = computed(() => dailySignDay())
const signed = computed(() => game.daily === today())
const completedDays = computed(() => signDay.value - (signed.value ? 0 : 1))
const base = import.meta.env.BASE_URL
function sign() {
  if (claimDaily()) emit('message', '签到奖励：单抽包 ×1' + (game.dailyStreak === 5 ? '、三连包 ×1' : game.dailyStreak === 7 ? '、五连包 ×1' : ''))
}
</script>
<template>
<section class="product-hall">
  <div class="hall-title-row"><div><h1>{{ game.name ? game.name + '的歌境' : '游戏大厅' }}</h1><span>收藏音乐，走进它的世界。</span></div></div>
  <div class="hall-primary">
    <section class="hall-music-entry">
      <img class="hall-banner-art" :src="base + 'illustrations/music-world-banner-white-v2.webp'" alt="" aria-hidden="true" fetchpriority="high" />
      <div class="hall-music-copy">
        <h2 aria-label="Build with AI, Build with Music">
          <span class="build-line build-ai"><span class="build-word">Build</span><span class="build-with">with</span><span class="build-medium">AI</span></span>
          <span class="build-line build-music"><span class="build-word">Build</span><span class="build-with">with</span><span class="build-medium">Music</span></span>
        </h2>
        <button class="spectrum-btn" @click="emit('enter', 'race')">进入探索<PhCompass :size="20" weight="duotone" /></button>
      </div>
    </section>
    <aside class="hall-daily-panel">
      <div class="hall-daily-top"><b>每日签到</b><small>{{ today().slice(5).replace('-', ' / ') }}</small></div>
      <div class="sign-record" :class="{ signed }">
        <span class="sign-record-label">已经连续签到</span>
        <div class="sign-tally"><strong>{{ String(completedDays).padStart(2, '0') }}</strong><span>天</span><PhCheck v-if="signed" class="sign-stamp" :size="28" weight="bold" /></div>
      </div>
      <ol class="sign-week" aria-label="连续七天签到进度" title="每天领取单抽包；第 5 天加送三连包，第 7 天加送五连包。断签后重新开始。"><li v-for="day in 7" :key="day" :class="{ complete: day <= completedDays, current: day === signDay, bonus: day === 5 || day === 7 }" :aria-label="`第 ${day} 天${day <= completedDays ? '已签到' : day === signDay ? '待签到' : ''}${day === 5 ? '，加送三连包' : day === 7 ? '，加送五连包' : ''}`"><span><PhCheck v-if="day <= completedDays" :size="14" weight="bold" /><template v-else>{{ day }}</template></span></li></ol>
      <div class="sign-milestones"><span>签到 5 天，加送三连包 ×1</span><span>签到 7 天，加送五连包 ×1</span></div>
      <button class="spectrum-btn sign-button" :disabled="signed" @click="sign">{{ signed ? '今日已签到' : '签到 · 领取单抽包' }}<PhCheck v-if="signed" :size="18" weight="duotone" /><PhCards v-else :size="18" weight="duotone" /></button>
      <button class="hall-task-link" @click="emit('enter', 'daily')"><PhHeadphones :size="24" weight="duotone" /><span><b>每日猜歌</b><small>{{ guessed ? '已完成' : '首猜命中 · 五连包' }}</small></span></button>
      <button class="hall-task-link" @click="emit('enter', 'achievements')"><PhTrophy :size="24" weight="duotone" /><span><b>成就</b><small>{{ claimableAchievements ? claimableAchievements + ' 份奖励待领' : '查看进度' }}</small></span></button>
    </aside>
  </div>
  <div class="hall-collection-row">
    <button class="hall-pack-panel" @click="emit('enter', 'packs')"><div class="hall-pack-info"><PhCards :size="27" weight="duotone" /><h2>卡包</h2><span>{{ pending ? pending + ' 包待拆' : '选择你的下一包' }}</span><b>进入商店</b></div><div class="hall-pack-object"><PackModel title="歌曲三连包" :count="3" tone="mint" preview /></div></button>
    <button class="hall-library-panel" @click="emit('enter', 'warehouse')"><div class="hall-library-heading"><PhVinylRecord :size="25" weight="duotone" /><h2>收藏</h2><span>{{ ownedCount }}<small> / {{ catalog.songs.length || 100 }}</small></span></div><div class="hall-albums"><div v-for="s in covers" :key="s.id"><img :src="coverPath(s.cover_path)" :alt="s.title" :class="{locked: !game.owned[s.id]}"/><span>{{ s.title }}</span></div></div></button>
  </div>
  <div class="hall-footer-links"><button @click="emit('enter', 'world')"><PhCube :size="21" weight="duotone" />微缩世界</button><button @click="emit('enter', 'records')"><PhCompass :size="21" weight="duotone" />探索记录</button><span>最高分 <b>{{ game.best.toLocaleString() }}</b></span><span class="hall-sync" :class="cloud.status"><i />{{ cloud.status === 'synced' ? '存档已同步' : cloud.status === 'loading' ? '连接中' : cloud.status === 'pending' ? '正在保存' : '本机存档' }}</span></div>
</section>
</template>
<style scoped>
.product-hall { background: #fff; }
.hall-daily-panel { padding: 24px; background: #fff; gap: 0; min-height: 520px; }
.hall-daily-top { color: #3e4d46; }
.hall-daily-top b { font-size: 14px; font-weight: 550; }
.sign-record { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 28px 0 30px; }
.sign-record-label { font-size: 13px; color: #718279; }
.sign-tally { display: flex; align-items: baseline; gap: 12px; position: relative; margin-top: 5px; font-family: 'SongSpace Display', sans-serif; font-variant-numeric: tabular-nums; }
.sign-tally strong { font-size: 76px; font-weight: 400; line-height: 1.1; letter-spacing: -.07em; color: #365a46; }
.sign-tally>span { font-size: 22px; color: #a3b3a9; }
.sign-stamp { position: absolute; right: 6px; top: 25px; color: #6f967d; }
.sign-week { padding: 0; margin: 0; display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 5px; list-style: none; }
.sign-week li { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.sign-week li>span { display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 1; border-radius: 6px; background: #f6f8f6; border: 1px solid #e8eeea; font-size: 12px; color: #8b9a91; }
.sign-week li>small { font-size: 9px; color: #8b9690; }.sign-week .current>span { border-color: #91b09c; color: #345b44; background: #f2f7f3; }.sign-week .complete>span { background: #e6f0e9; color: #4b7358; border-color: #d9e8dc; }.sign-week .bonus>span { color: #6a876e; }
.sign-milestones { display: flex; flex-direction: column; gap: 6px; margin: 12px 0 22px; font-size: 14px; line-height: 1.5; color: #475c50; }
.sign-button { width: 100%; margin: 0; display: flex; justify-content: space-between; padding: 12px 14px; font-size: 12px; background: #edf4ef; border-color: #d8e5dc; color: #42634c; }.sign-button:disabled { opacity: .75; }
.sign-button { margin-bottom: 24px; }
.hall-task-link { margin: 0; padding: 14px 0; }.hall-task-link b { font-size: 12px; }.hall-task-link small { font-size: 10px; }
@font-face { font-family: 'SongSpace Display'; src: url('/fonts/SpaceGrotesk-Variable.ttf') format('truetype'); font-weight: 300 700; font-style: normal; font-display: swap; }
.hall-music-entry { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; min-height: 350px; background: #fafcfb; border: 1px solid #e8eeea; border-radius: 12px; }
.hall-banner-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; pointer-events: none; animation: banner-drift 16s ease-in-out infinite alternate; }
.hall-music-entry::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg,#fafcfbe8 0%,#fafcfb80 35%,#fafcfb00 66%); pointer-events: none; }
.hall-music-copy { position: relative; z-index: 2; padding: 40px 34px; color: #203d30; }
.hall-music-copy h2 { font-family: 'SongSpace Display', 'Segoe UI', sans-serif; font-size: clamp(44px, 4.7vw, 70px); line-height: 1.16; letter-spacing: -.06em; margin: 0 0 31px; color: #203d30; font-weight: 500; }
.build-line { display: flex; align-items: baseline; gap: .17em; white-space: nowrap; animation: type-arrive 1s cubic-bezier(.2,.75,.25,1) both; }
.build-with { font-size: .32em; letter-spacing: -.025em; font-weight: 400; margin: 0 .16em; }
.build-ai .build-medium { font-weight: 700; }
.build-music { margin-left: .55em; animation-delay: .14s; }
.build-music .build-word { font-weight: 400; }
.build-music .build-medium { color: #4e765c; font-weight: 600; }
.hall-music-copy button { display: flex; align-items: center; gap: 32px; padding: 13px 18px; background: #284d3c; color: #fff; border-color: #284d3c; animation: type-arrive 1s .28s cubic-bezier(.2,.75,.25,1) both; transition: background .25s, box-shadow .25s; }
.hall-music-copy button:hover { background: #345e48; box-shadow: 0 5px 18px #25453120; }
.hall-music-copy button svg { transition: transform .25s; }
.hall-music-copy button:hover svg { transform: translate(3px,-3px); }
@keyframes type-arrive { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes banner-drift { from { transform: scale(1.025) translateX(-.35%); } to { transform: scale(1.065) translateX(.35%); } }
@media(max-width:1100px) { .hall-music-copy h2 { font-size: clamp(35px,4.5vw,50px); }.hall-music-copy { padding: 32px 24px; }.build-music { margin-left: .25em; }.hall-music-entry::after { background: linear-gradient(90deg,#fafcfbf5,#fafcfbb0 45%,#fafcfb10 85%); }.hall-daily-panel { padding: 20px; }.sign-week { gap: 3px; } }
@media(max-width:650px) { .hall-music-entry { min-height: 340px; align-items: flex-start; }.hall-music-copy { padding: 30px 22px; }.hall-music-copy h2 { font-size: clamp(32px,8vw,48px); margin-bottom: 23px; }.hall-banner-art { object-position: 65% center; }.hall-music-entry::after { background: linear-gradient(130deg,#fafcfbf0,#fafcfb90 48%,#fafcfb00 85%); }.hall-daily-panel { display: block; padding: 22px; min-height: auto; }.sign-record { padding: 22px 0; }.sign-tally strong { font-size: 64px; }.sign-stamp { top: 20px; }.sign-week { gap: 8px; }.sign-week li>span { max-width: 36px; } }
@media(prefers-reduced-motion:reduce) { .hall-banner-art,.build-line,.hall-music-copy button { animation: none; }.hall-music-copy button svg { transition: none; } }
</style>
