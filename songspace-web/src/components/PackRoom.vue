<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { gsap } from 'gsap'
import PackModel from './PackModel.vue'
import SongCard from './SongCard.vue'
import {
  game,
  catalog,
  PACKS,
  buyPack,
  openPack,
  claimDaily,
  today,
  ownedCount,
  KIND_NAMES,
  kindFor,
  type GameCard,
} from '@/game/save'
const emit = defineEmits<{ warehouse: []; message: [string] }>()
const active = ref<string | null>(null),
  cards = ref<GameCard[]>([]),
  phase = ref<'sealed' | 'opening' | 'cards'>('sealed'),
  revealed = ref(0),
  root = ref<HTMLElement>(),
  drag = ref<number | null>(null),
  tear = ref(0),
  busy = ref(false)
const pack = computed(() => PACKS.find((p) => p.id === active.value))
const pending = computed(() => Object.values(game.packs).reduce((a, b) => a + b, 0))
const animationClocks = new Map<ReturnType<typeof setInterval>, gsap.core.Timeline>()
const distribution = computed(() => ({
  map: catalog.songs.filter((s) => kindFor(s) === 'map').length,
  item: catalog.songs.filter((s) => kindFor(s) === 'item').length,
  vehicle: catalog.songs.filter((s) => kindFor(s) === 'vehicle').length,
}))
let previousOverflow = ''
function play(timeline: gsap.core.Timeline, finish?: () => void) {
  timeline.pause()
  const began = performance.now()
  const duration = timeline.totalDuration()
  const clock = setInterval(() => {
    const elapsed = (performance.now() - began) / 1000
    timeline.totalTime(Math.min(elapsed, duration), true)
    if (elapsed >= duration) {
      clearInterval(clock)
      animationClocks.delete(clock)
      timeline.totalTime(duration, true)
      finish?.()
    }
  }, 16)
  animationClocks.set(clock, timeline)
}
function clearAnimations() {
  animationClocks.forEach((timeline, clock) => {
    clearInterval(clock)
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
  tear.value = 0
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  await nextTick()
  const el = root.value?.querySelector('.foil-pack')
  if (el)
    play(
      gsap
        .timeline({ paused: true })
        .fromTo(
          el,
          { y: 50, rotation: -8, opacity: 0 },
          { y: 0, rotation: -4, opacity: 1, duration: 0.65, ease: 'back.out(1.4)' },
        ),
    )
}
function purchase(id: string) {
  if (buyPack(id)) emit('message', '卡包已放入库存，可以开启了。')
  else emit('message', '音符不足，去闯关收集更多音符吧。')
}
function pointerDown(e: PointerEvent) {
  if (phase.value !== 'sealed') return
  drag.value = e.clientX
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function pointerMove(e: PointerEvent) {
  if (drag.value === null) return
  tear.value = Math.min(1, Math.max(0, (e.clientX - drag.value) / 130))
}
function pointerUp() {
  drag.value = null
  if (tear.value > 0.7) rip()
  else tear.value = 0
}
async function rip() {
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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const node = root.value!
  const timeline = gsap
    .timeline({ paused: true })
    .to(node.querySelector('.tear-strip'), {
      x: 120,
      y: -95,
      rotation: 28,
      opacity: 0,
      duration: reduced ? 0.01 : 0.55,
      ease: 'power3.in',
    })
    .to(node.querySelector('.pack-glow'), { opacity: 1, scale: 1.5, duration: 0.3 }, 0)
    .to(node.querySelector('.pack-body'), { opacity: 0, duration: reduced ? 0.01 : 0.25 }, 0.65)
    .to(node.querySelector('.foil-pack'), { opacity: 0, duration: 0.2 }, 0.75)
  play(timeline, async () => {
    phase.value = 'cards'
    busy.value = false
    await nextTick()
    const elements = root.value?.querySelectorAll('.reveal-card')
    if (elements?.length)
      play(
        gsap.timeline({ paused: true }).fromTo(
          elements,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: reduced ? 0.01 : 0.45,
            clearProps: 'all',
            ease: 'power2.out',
          },
        ),
      )
  })
}
async function reveal() {
  if (revealed.value >= cards.value.length) return
  const index = revealed.value++
  await nextTick()
  const el = root.value?.querySelectorAll('.reveal-card')[index]
  if (!el) return
  gsap.set(el, { clearProps: 'all' })
  play(
    gsap
      .timeline({ paused: true })
      .fromTo(
        el,
        { rotationY: -85 },
        { rotationY: 0, y: 0, opacity: 1, duration: 0.5, clearProps: 'all', ease: 'power2.out' },
      ),
  )
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
onBeforeUnmount(() => {
  clearAnimations()
  if (active.value) document.body.style.overflow = previousOverflow
})
</script>
<template>
  <section class="packs-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">SONGSPACE / CARD PACKS</p>
        <h1>下一首，是什么？</h1>
        <p>把沿途收集的音符，换成一包新的惊喜。</p>
      </div>
      <button class="outline-btn" @click="emit('warehouse')">
        我的仓库 {{ ownedCount }}/100 ↗
      </button>
    </div>
    <div class="pack-summary">
      <div>
        <small>待开启卡包</small><strong>{{ pending }}<span> 包</span></strong>
      </div>
      <div>
        <small>收藏进度</small><strong>{{ ownedCount }}<span> / 100</span></strong
        ><progress :value="ownedCount" max="100" />
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
      <h2>挑一包，亲手拆开</h2>
      <span>金卡＝道具 · 彩卡＝地图 · 载具按属性分档</span>
    </div>
    <div class="pack-shop">
      <article v-for="p in PACKS" :key="p.id" class="pack-product" :class="p.tone">
        <div class="pack-visual">
          <PackModel :title="p.title" :count="p.count" :tone="p.tone" preview />
        </div>
        <div class="pack-product-copy">
          <h3>{{ p.title }}</h3>
          <p>{{ p.tag }}</p>
          <span class="stock">库存 {{ game.packs[p.id] || 0 }} 包</span
          ><button
            class="lime-btn"
            :disabled="!game.packs[p.id] || !catalog.songs.length"
            @click="choose(p.id)"
          >
            打开卡包</button
          ><button class="buy-btn" @click="purchase(p.id)">♪ {{ p.price }} 音符 · 购买</button>
        </div>
      </article>
    </div>
    <details class="odds">
      <summary>查看开包规则与概率</summary>
      <p>
        歌曲包在 100 首歌曲中等概率抽取。卡片类型由歌曲固定分配：彩卡
        {{ distribution.map }} 首、金卡 {{ distribution.item }} 首、载具卡
        {{ distribution.vehicle }}
        首，其余为装饰卡。五连至少一张金卡或彩卡；歌曲包连续 20 抽未出金卡或彩卡，第 20
        抽替换为金卡。载具包仅从载具卡池抽取，主题包仅从地图卡池抽取。载具包与主题包不计歌曲包保底。重复卡累计数量，每
        3 张提升一级。初始三张地图无需抽卡即可游玩。
      </p>
    </details>
    <p v-if="catalog.error" role="alert">{{ catalog.error }}</p>
  </section>
  <div
    v-if="active"
    ref="root"
    class="pack-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="开启歌曲卡包"
  >
    <button v-if="!busy" class="opening-close" aria-label="关闭开包" @click="close">×</button>
    <p class="eyebrow">{{ phase === 'cards' ? 'YOUR NEW COLLECTION' : 'A LITTLE SURPRISE' }}</p>
    <h2>{{ phase === 'cards' ? '新的歌曲，已经入库' : pack?.title }}</h2>
    <div v-if="phase !== 'cards'" class="opening-stage">
      <div class="pack-glow" />
      <div class="foil-pack" :class="pack?.tone">
        <button
          class="tear-strip"
          :style="{ '--tear': tear }"
          @pointerdown="pointerDown"
          @pointermove="pointerMove"
          @pointerup="pointerUp"
          @pointercancel="pointerUp"
          aria-label="向右撕开包装"
        >
          <span>从这里向右撕开</span><b>→</b>
        </button>
        <div class="pack-body">
          <PackModel
            :title="pack!.title"
            :count="pack!.count"
            :tone="pack!.tone"
            :tear="tear"
            :opening="phase === 'opening'"
          />
        </div>
      </div>
    </div>
    <template v-if="phase === 'sealed'"
      ><p class="opening-hint">拖动包装顶封，或点击下方按钮</p>
      <button class="lime-btn" @click="rip">撕开包装</button></template
    >
    <div v-if="phase === 'cards'" class="revealed-grid">
      <button
        v-for="(card, i) in cards"
        :key="i"
        class="reveal-card"
        :class="[card.rarity, { face: i < revealed }]"
        @click="i >= revealed && reveal()"
      >
        <template v-if="i < revealed"
          ><small>{{ card.isNew ? 'NEW · 首次获得' : `重复卡 · ×${card.count}` }}</small
          ><SongCard :card="card" />
          <p>{{ card.effect }}</p></template
        ><template v-else
          ><small>SONGSPACE</small><strong>♪</strong
          ><span>点击翻开第 {{ i + 1 }} 张</span></template
        >
      </button>
    </div>
    <div v-if="phase === 'cards'" class="opening-actions">
      <button v-if="revealed < cards.length" class="lime-btn" @click="reveal">
        揭晓下一张 {{ revealed }}/{{ cards.length }}</button
      ><template v-else
        ><button class="outline-btn" @click="close">继续开包</button
        ><button class="lime-btn" @click="goWarehouse">去仓库查看 ↗</button></template
      >
    </div>
  </div>
</template>
