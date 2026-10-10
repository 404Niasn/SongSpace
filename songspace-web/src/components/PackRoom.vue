<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import PackModel from './PackModel.vue'
import SongCard from './SongCard.vue'

import '@/assets/record-room.css'
import {
  game,
  catalog,
  PACKS,
  buyPack,
  openPack,
  claimDaily,
  today,
  ownedCount,
  kindFor,
  type GameCard,
} from '@/game/save'
const emit = defineEmits<{ warehouse: []; daily: []; message: [string]; use: [GameCard] }>()

const resultCards = computed(() => [...new Map(cards.value.map(c => [c.id, c])).values()])

const boxTitle = (title: string) => title.replace('包', '盒')
const boxDescription: Record<string, string> = {
  single: '一首歌曲，开启一份新的音乐收藏。',
  triple: '三首歌曲，把喜欢的旋律带回收藏。',
  five: '每日猜歌或奖励获取，必出金卡。',
  vehicle: '收藏一辆音乐载具，驶向下一段旅程。',
}

function again() { const id = active.value; close(); if (id) void choose(id) }
const active = ref<string | null>(null),
  cards = ref<GameCard[]>([]),
  phase = ref<'sealed' | 'opening' | 'cards' | 'summary'>('sealed'),
  revealed = ref(0),
  flipped = ref(false),
  root = ref<HTMLElement>(),
  drag = ref<number | null>(null),
  tear = ref(0),
  openingProgress = ref(0),
  busy = ref(false)
const pack = computed(() => PACKS.find((p) => p.id === active.value))
const visiblePacks = PACKS.filter(p => p.id !== 'theme')
const pending = computed(() => Object.values(game.packs).reduce((a, b) => a + b, 0))
const animationClocks = new Map<gsap.core.Timeline, number>()
const distribution = computed(() => ({
  map: catalog.songs.filter((s) => kindFor(s) === 'map').length,
  item: catalog.songs.filter((s) => kindFor(s) === 'item').length,
  vehicle: catalog.songs.filter((s) => kindFor(s) === 'vehicle').length,
  outfit: catalog.songs.filter((s) => kindFor(s) === 'outfit').length,
  decoration: catalog.songs.filter((s) => kindFor(s) === 'decoration').length,
}))
let suppressPullClick = false
let previousOverflow = ''
function play(timeline: gsap.core.Timeline, finish?: () => void) {
  timeline.pause()
  const began = performance.now()
  const duration = timeline.totalDuration()
  const tick = () => {
    const elapsed = (performance.now() - began) / 1000
    timeline.totalTime(Math.min(elapsed, duration), true)
    if (elapsed >= duration) {
      animationClocks.delete(timeline)
      timeline.totalTime(duration, true)
      finish?.()
    } else animationClocks.set(timeline, requestAnimationFrame(tick))
  }
  animationClocks.set(timeline, requestAnimationFrame(tick))
}
function clearAnimations() {
  animationClocks.forEach((clock, timeline) => {
    cancelAnimationFrame(clock)
    timeline.kill()
  })
  animationClocks.clear()
}
async function choose(id: string) {
  if (!catalog.songs.length) {
    emit('message', '卡库仍在载入，请稍后再开包。')
    return
  }
  if (!game.packs[id]) return
  clearAnimations()
  active.value = id
  phase.value = 'sealed'
  cards.value = []
  revealed.value = 0
  flipped.value = false
  tear.value = 0
  openingProgress.value = 0
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  await nextTick()
  const el = root.value?.querySelector('.record-box')
  if (el)
    play(
      gsap
        .timeline({ paused: true })
        .fromTo(
          el,
          { y: 28, rotation: -3, opacity: 0 },
          { y: 0, rotation: 0, opacity: 1, duration: reducedMotion() ? .01 : .5, ease: 'power3.out' },
        ),
    )
}
function purchase(id: string) {
  if (buyPack(id)) emit('message', '唱片盒已放入收藏室，可以开启了。')
  else emit('message', '音符不足，去闯关收集更多音符吧。')
}
function pointerDown(e: PointerEvent) {
  if (phase.value !== 'sealed') return
  suppressPullClick = false
  drag.value = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function pointerMove(e: PointerEvent) {
  if (drag.value === null) return
  if (Math.abs(e.clientY - drag.value) > 5) suppressPullClick = true
  tear.value = Math.min(1, Math.max(0, (e.clientY - drag.value) / 100))
}
function pointerUp(e: PointerEvent) {
  if (drag.value === null) return
  const distance = e.clientY - drag.value
  drag.value = null
  if (distance >= 60 || tear.value > 0.7) void rip()
  else tear.value = 0
}
async function rip(skip = false) {
  if (busy.value || phase.value !== 'sealed' || !active.value) return

  const result = openPack(active.value)
  if (!result.length) {
    emit('message', '卡包无法开启，请重试。')
    return
  }
  clearAnimations()
  busy.value = true
  cards.value = result
  phase.value = 'opening'
  await nextTick()
  if (skip) { showAll(); return }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const node = root.value!
  const timeline = gsap.timeline({ paused: true })
    .to(node.querySelector('.drawer-pull'), { opacity: 0, duration: reduced ? .01 : .12 }, 0)
    .to(openingProgress, { value: 1, duration: reduced ? .01 : .85, ease: 'power2.inOut' }, 0)
    .to(node.querySelector('.record-box'), { opacity: 0, duration: reduced ? .01 : .35, ease: 'power2.out' }, reduced ? .01 : .98)

  play(timeline, async () => {
    phase.value = 'cards'
    await nextTick()
    enterCard()
  })
}
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
function enterCard() {
  const shell = root.value?.querySelector('.single-card')
  if (!shell) { busy.value = false; return }
  play(gsap.timeline({ paused: true }).fromTo(shell,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: reducedMotion() ? .01 : .3, ease: 'power2.out', clearProps: 'opacity,transform' }),
    () => { busy.value = false })
}
function reveal() {
  if (busy.value || flipped.value || phase.value !== 'cards') return
  const el = root.value?.querySelector('.card-turner')
  const shell = root.value?.querySelector('.single-card')
  if (!el || !shell) return
  busy.value = true
  const reduced = reducedMotion()
  const timeline = gsap.timeline({ paused: true })
    .to(shell, { y: -6, scale: 1.015, duration: reduced ? .01 : .22, ease: 'power2.out' }, .12)
    .to(el, { rotationY: 180, duration: reduced ? .01 : .7, ease: 'power2.inOut' }, 0)
    .to(shell, { y: 0, scale: 1, duration: reduced ? .01 : .48, ease: 'power3.out' }, reduced ? .01 : .45)
    .fromTo(el.querySelector('.card-shine'), { xPercent: -160, opacity: 0 },
      { xPercent: 160, opacity: .65, duration: reduced ? .01 : .6, ease: 'power2.out' }, reduced ? 0 : .5)
    .to(el.querySelector('.card-shine'), { opacity: 0, duration: reduced ? .01 : .2 })
  play(timeline, () => { flipped.value = true; busy.value = false })
}
function advance() {
  if (phase.value !== 'cards' || busy.value) return
  if (flipped.value) void nextCard()
  else reveal()
}
function backdropClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button,a,input,select,[role="button"]')) return
  advance()
}
function keyboard(event: KeyboardEvent) {
  if (!active.value || (event.target as HTMLElement)?.closest('button,input,select,a')) return
  if (event.key === 'Escape' && !busy.value) close()
  if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
    event.preventDefault()
    advance()
  }
}
async function nextCard() {
  if (busy.value || !flipped.value || phase.value !== 'cards') return
  if (revealed.value + 1 >= cards.value.length) { void showAll(); return }
  busy.value = true
  const el = root.value?.querySelector('.single-card')
  if (!el) { busy.value = false; return }
  play(gsap.timeline({ paused: true }).to(el,
    { x: -155, y: 35, rotationZ: -12, scale: .82, opacity: 0, duration: reducedMotion() ? .01 : .28, ease: 'power2.in' }), async () => {
    revealed.value++
    flipped.value = false
    await nextTick()
    enterCard()
  })
}
async function showAll() {
  clearAnimations()
  phase.value = 'summary'
  revealed.value = cards.value.length
  busy.value = true
  await nextTick()
  const entries = root.value?.querySelectorAll('.record-results > .reveal-card')
  if (!entries?.length) { busy.value = false; return }
  play(gsap.timeline({ paused: true }).fromTo(entries,
    { opacity: 0 },
    { opacity: 1, stagger: reducedMotion() ? 0 : .05,
      duration: reducedMotion() ? .01 : .3, ease: 'power2.out', clearProps: 'opacity' }),
    () => { busy.value = false })
}
async function skipAll() {
  if (phase.value === 'sealed') await rip(true)
  else showAll()
}

function goWarehouse() {
  close()
  emit('warehouse')
}
function close() {
  clearAnimations()
  active.value = null
  busy.value = false
  document.body.style.overflow = previousOverflow
}
onMounted(() => window.addEventListener('keydown', keyboard))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', keyboard)
  clearAnimations()
  if (active.value) document.body.style.overflow = previousOverflow
})
</script>
<template>
  <section class="packs-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">CARD PACKS</p>
        <h1>唱片收藏室<span class="heading-count">{{ pending }} 盒待开启</span></h1>
      </div>
      <button class="outline-btn" @click="emit('warehouse')">
        我的仓库 {{ ownedCount }}/{{ catalog.songs.length }}
      </button>
    </div>
    <div class="pack-summary">
      <div>
        <small>待开启唱片盒</small><strong>{{ pending }}<span> 盒</span></strong>
      </div>
      <div>
        <small>收藏进度</small><strong>{{ ownedCount }}<span> / {{ catalog.songs.length }}</span></strong
        ><progress :value="ownedCount" :max="catalog.songs.length" />
      </div>
      <div>
        <small>金卡保底</small><strong>{{ game.pity }}<span> / 20 抽</span></strong
        ><progress :value="game.pity" max="20" />
      </div>
    </div>
    <div class="daily-banner">
      <div><b>每日签到</b><span>今天也来听一首 · 领取 50 音符</span></div>
      <button :disabled="game.daily === today()" class="lime-btn" @click="claimDaily()">
        {{ game.daily === today() ? '今日已领取' : '领取今日音符' }}
      </button>
    </div>
    <div class="shop-title">
      <h2>选一盒音乐</h2>
      <span>彩 · 地图 / 金 · 道具 / 银 · 装饰 / 蓝 · 装扮 / 紫 · 载具</span>
    </div>
    <div class="pack-shop">
      <article v-for="p in visiblePacks" :key="p.id" class="pack-product" :class="p.tone">
        <div class="pack-visual">
          <PackModel :title="p.title" :count="p.count" :tone="p.tone" preview />
        </div>
        <div class="pack-product-copy">
          <h3>{{ boxTitle(p.title) }}</h3>
          <p class="pack-description">{{ boxDescription[p.id] }}</p>
          <span class="stock">库存 {{ game.packs[p.id] || 0 }} 盒</span
          ><button
            class="lime-btn"
            :disabled="!game.packs[p.id] || !catalog.songs.length"
            @click="choose(p.id)"
          >
            打开唱片盒</button
          ><button v-if="p.id!=='five'" class="buy-btn" @click="purchase(p.id)"><span>购买唱片盒</span><b>♪ {{ p.price }}</b></button><button v-else class="reward-pack-btn" @click="emit('daily')">猜歌赢五连包</button>
        </div>
      </article>
    </div>
    <details class="odds">
      <summary>查看开包规则与概率</summary>
      <p>歌曲库精选了 QQ 音乐热歌榜 Top 100 和经典歌曲。<template v-if="catalog.chartDate">榜单采集日期：{{ catalog.chartDate }}。</template>榜单歌曲保留采集时的排名，经典歌曲作为额外精选加入，不代表当前实时榜单。当前彩色闪卡为《江南》《富士山下》《光年之外》，地图卡包含在普通歌曲卡池中；获得《富士山下》或《光年之外》后解锁对应地图。</p>
      <p>
        歌曲包在 {{ catalog.songs.length }} 首歌曲中等概率抽取。卡片类型由歌曲固定分配：彩卡
        {{ distribution.map }} 首、金卡 {{ distribution.item }} 首、载具卡
        {{ distribution.vehicle }}
        首、装扮卡 {{ distribution.outfit }} 首、装饰卡 {{ distribution.decoration }} 首。单抽基础概率：彩卡 {{ (distribution.map / Math.max(1, catalog.songs.length) * 100).toFixed(2) }}%、金卡 {{ (distribution.item / Math.max(1, catalog.songs.length) * 100).toFixed(2) }}%，保底触发时按保底规则结算。五连必出至少一张金色道具卡，彩卡不替代五连金卡保底；歌曲包连续 20 抽未出金卡或彩卡，第 20
        抽替换为金卡。地图卡包含在普通歌曲卡池中。五连包只能通过奖励获得，无法购买；商店不出售地图包。载具包仅从载具卡池抽取，不计歌曲包保底。重复卡累计数量，每
        3 张提升一级。初始三张地图无需抽卡即可游玩。
      </p>
    </details>
    <p v-if="catalog.error" role="alert">{{ catalog.error }}</p>
  </section>
  <div v-if="active" ref="root" class="pack-overlay record-room" :class="{ 'is-summary': phase === 'summary' }" role="dialog" aria-modal="true" aria-label="开启唱片收藏盒" @click="backdropClick">
    <button v-if="!busy" class="opening-close" aria-label="关闭" @click="close">×</button>
    <button v-if="phase !== 'summary'" class="opening-skip outline-btn" @click="skipAll">直接查看全部</button>
    <div class="record-heading"><h2 v-if="phase === 'summary'">本次开盒结果</h2><h2 v-else-if="phase === 'sealed'">{{ boxTitle(pack!.title) }}</h2><p v-else class="track-progress" aria-live="polite">{{ revealed + 1 }} / {{ cards.length }}</p></div>
    <div class="record-stage" :class="{ 'results-stage': phase === 'summary' }">
      <div v-if="phase === 'sealed' || phase === 'opening'" class="record-box">
        <PackModel :title="pack!.title" :count="pack!.count" :tone="pack!.tone" :tear="tear" :opening="phase === 'opening'" :opening-progress="openingProgress">
          <button v-if="phase === 'sealed'" class="drawer-pull" @pointerdown.stop="pointerDown" @pointermove.stop="pointerMove" @pointerup.stop="pointerUp" @pointercancel="drag = null; tear = 0" @click.stop="!suppressPullClick && rip()" aria-label="向下拉开唱片盒，或点击开启" />
        </PackModel>
      </div>

      <div v-if="phase === 'cards'" class="record-card-stage">
        <button :key="revealed" class="single-card" :disabled="busy" :aria-label="flipped ? '下一首歌曲' : '揭晓歌曲'" @click.stop="advance">
          <span class="card-turner"><span class="card-side card-reverse record-back" :class="[cards[revealed]!.rarity, { vehicle: cards[revealed]!.kind === 'vehicle', outfit: cards[revealed]!.kind === 'outfit' }]" :aria-hidden="flipped"><small>SONGSPACE</small><div class="vinyl-label"><span>SS</span></div><b>一首歌，一个世界</b><span>音乐收藏卡</span></span><span class="card-side card-obverse" :aria-hidden="!flipped"><SongCard :card="cards[revealed]!" opening /><span class="card-shine" /></span></span>
        </button>
      </div>
      <div v-if="phase === 'summary'" class="record-results">
        <div v-for="card in resultCards" :key="card.id" class="reveal-card collection-card result-entry" :class="card.rarity"><SongCard :card="card" collection /></div>
      </div>
    </div>
    <div class="record-controls">
      <button v-if="phase === 'sealed' || phase === 'opening'" class="spectrum-btn" :disabled="busy" @click="rip()">{{ phase === 'opening' ? '正在开盒…' : '打开唱片盒' }}</button>
      <button v-else-if="phase === 'cards'" class="spectrum-btn" :disabled="busy" @click="advance">{{ !flipped ? '翻开卡片' : revealed + 1 === cards.length ? '查看本次结果' : '下一首' }}</button>
      <template v-else><button class="outline-btn" @click="close">完成</button><button v-if="active && game.packs[active]" class="spectrum-btn" :disabled="busy" @click="again">再开一盒</button><button v-else class="spectrum-btn" @click="goWarehouse">查看卡片</button></template>
    </div>
  </div>
</template>

<style scoped>
.pack-product-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(36px, auto) 18px 40px 44px;
  gap: 9px;
}
.pack-product-copy > * { grid-column: 1; }
.pack-product-copy h3 { grid-row: 1; }
.pack-product-copy .pack-description {
  grid-row: 2;
  align-self: start;
  margin: 0;
  color: #3e594c;
  font-size: 12px;
  line-height: 18px;
}
.pack-product-copy .stock {
  grid-row: 3;
  color: #43586a;
  margin: 0;
  line-height: 18px;
}
.pack-product-copy > .lime-btn { grid-row: 4; }
.pack-product-copy > .buy-btn,
.pack-product-copy > .reward-pack-btn { grid-row: 5; }
</style>
