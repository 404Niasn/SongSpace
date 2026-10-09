<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import PackModel from './PackModel.vue'
import SongCard from './SongCard.vue'
import CardAura from './CardAura.vue'
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
const emit = defineEmits<{ warehouse: []; daily: []; message: [string] }>()
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
const animationClocks = new Map<ReturnType<typeof setInterval>, gsap.core.Timeline>()
const distribution = computed(() => ({
  map: catalog.songs.filter((s) => kindFor(s) === 'map').length,
  item: catalog.songs.filter((s) => kindFor(s) === 'item').length,
  vehicle: catalog.songs.filter((s) => kindFor(s) === 'vehicle').length,
  outfit: catalog.songs.filter((s) => kindFor(s) === 'outfit').length,
  decoration: catalog.songs.filter((s) => kindFor(s) === 'decoration').length,
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
  flipped.value = false
  tear.value = 0
  openingProgress.value = 0
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
          { y: 0, rotation: 0, opacity: 1, duration: 0.65, ease: 'back.out(1.4)' },
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
function pointerUp(e: PointerEvent) {
  if (drag.value === null) return
  const distance = e.clientX - drag.value
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
    .to(node.querySelector('.tear-strip'), { opacity: 0, duration: reduced ? .01 : .1 }, 0)
    .to(openingProgress, { value: 1, duration: reduced ? .01 : .85, ease: 'power2.inOut' }, 0)
    .fromTo(node.querySelector('.emerging-card'), { y: 82, opacity: 1, clipPath: 'inset(0% 0% 100% 0%)' },
      { y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? .01 : 1.05, ease: 'power2.inOut' }, reduced ? .01 : .65)
    .to(node.querySelector('.pack-glow'), { opacity: .3, duration: reduced ? .01 : .6 }, reduced ? 0 : .7)
    .to(node.querySelector('.pack-ground'), { scaleX: .7, opacity: 0, duration: reduced ? .01 : .55 }, reduced ? .02 : 1.15)
    .to(node.querySelector('.foil-pack'), { y: 480, rotation: 5, opacity: 0, duration: reduced ? .01 : .8, ease: 'power2.in' }, reduced ? .02 : 1.15)
  play(timeline, async () => {
    phase.value = 'cards'
    busy.value = false
    await nextTick()
    entrance(true)
  })
}
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
function entrance(fromPack = false) {
  const el = root.value?.querySelector('.single-card')
  if (!el) return
  busy.value = true
  play(gsap.timeline({ paused: true }).fromTo(el,
    { y: fromPack ? 0 : 24, rotationX: fromPack ? 0 : 6, rotationZ: fromPack ? 0 : -2, opacity: fromPack ? 1 : 0, scale: fromPack ? 1 : .96 },
    { y: 0, rotationX: 0, rotationZ: 0, opacity: 1, scale: 1, duration: reducedMotion() ? .01 : .5, ease: 'power3.out' }),
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
    .to(shell, { y: -14, scale: 1.035, duration: reduced ? .01 : .24, ease: 'power2.out' }, 0)
    .to(el, { rotationY: 180, duration: reduced ? .01 : .85, ease: 'power2.inOut' }, 0)
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
    { x: -80, y: 12, rotationZ: -8, scale: .94, opacity: 0, duration: reducedMotion() ? .01 : .28, ease: 'power2.in' }), async () => {
    revealed.value++
    flipped.value = false
    await nextTick()
    const next = root.value?.querySelector('.single-card')
    if (next) gsap.set(next, { clearProps: 'all' })
    entrance()
  })
}
async function showAll() {
  clearAnimations()
  phase.value = 'summary'
  revealed.value = cards.value.length
  busy.value = true
  await nextTick()
  const entries = root.value?.querySelectorAll('.revealed-grid > .reveal-card')
  if (!entries?.length) { busy.value = false; return }
  play(gsap.timeline({ paused: true }).fromTo(entries,
    { y: 30, rotationY: -12, opacity: 0, scale: .97 },
    { y: 0, rotationY: 0, opacity: 1, scale: 1, stagger: reducedMotion() ? 0 : .075,
      duration: reducedMotion() ? .01 : .55, ease: 'power3.out', clearProps: 'all' }),
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
        <h1>卡包商店<span class="heading-count">{{ pending }} 包待拆</span></h1>
      </div>
      <button class="outline-btn" @click="emit('warehouse')">
        我的仓库 {{ ownedCount }}/{{ catalog.songs.length }} ↗
      </button>
    </div>
    <div class="pack-summary">
      <div>
        <small>待开启卡包</small><strong>{{ pending }}<span> 包</span></strong>
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
      <h2>选一包</h2>
      <span>金卡＝道具 · 彩卡＝地图 · 载具按属性分档</span>
    </div>
    <div class="pack-shop">
      <article v-for="p in visiblePacks" :key="p.id" class="pack-product" :class="p.tone">
        <div class="pack-visual">
          <PackModel :title="p.title" :count="p.count" :tone="p.tone" preview />
        </div>
        <div class="pack-product-copy">
          <h3>{{ p.title }}</h3>

          <span class="stock">{{ p.id==='five' ? '每日猜歌首猜奖励' : '库存 ' + (game.packs[p.id] || 0) + ' 包' }}</span
          ><button
            class="lime-btn"
            :disabled="!game.packs[p.id] || !catalog.songs.length"
            @click="choose(p.id)"
          >
            打开卡包</button
          ><button v-if="p.id!=='five'" class="buy-btn" @click="purchase(p.id)"><span>购买卡包</span><b>♪ {{ p.price }}</b></button><button v-else class="reward-pack-btn" @click="emit('daily')">猜歌赢五连包 ↗</button>
        </div>
      </article>
    </div>
    <details class="odds">
      <summary>查看开包规则与概率</summary>
      <p>歌曲库精选了 QQ 音乐热歌榜 Top 100 和经典歌曲。<template v-if="catalog.chartDate">榜单采集日期：{{ catalog.chartDate }}。</template>榜单歌曲保留采集时的排名，经典歌曲作为额外精选加入，不代表当前实时榜单。当前彩色闪卡为《江南》《光年之外》，地图卡包含在普通歌曲卡池中；《光年之外》对应的太空地图后续开放。</p>
      <p>
        歌曲包在 {{ catalog.songs.length }} 首歌曲中等概率抽取。卡片类型由歌曲固定分配：彩卡
        {{ distribution.map }} 首、金卡 {{ distribution.item }} 首、载具卡
        {{ distribution.vehicle }}
        首、装扮卡 {{ distribution.outfit }} 首、装饰卡 {{ distribution.decoration }} 首。单抽基础概率：彩卡 {{ (distribution.map / Math.max(1, catalog.songs.length) * 100).toFixed(2) }}%、金卡 {{ (distribution.item / Math.max(1, catalog.songs.length) * 100).toFixed(2) }}%，保底触发时按保底规则结算。五连至少一张金卡或彩卡；歌曲包连续 20 抽未出金卡或彩卡，第 20
        抽替换为金卡。地图卡包含在普通歌曲卡池中。五连包只能通过奖励获得，无法购买；商店不出售地图包。载具包仅从载具卡池抽取，不计歌曲包保底。重复卡累计数量，每
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
    @click="backdropClick"
  >
    <button v-if="!busy" class="opening-close" aria-label="关闭开包" @click="close">×</button>
    <button v-if="phase !== 'summary'" class="opening-skip outline-btn" @click="skipAll">查看全部 · 跳过动画</button>
    <h2>{{ phase === 'summary' ? '本包收获' : phase === 'cards' ? (flipped ? '已揭晓' : '点击翻牌') : pack?.title }}</h2>
    <div v-if="phase === 'sealed' || phase === 'opening'" class="opening-stage">
      <div class="pack-glow" />
      <div class="pack-ground" aria-hidden="true" />
      <div v-if="phase === 'opening'" class="emerging-card card-reverse card-back-design"><CardAura /><small>SONGSPACE</small><strong>♪</strong><span>音乐收藏卡</span></div>
      <div class="foil-pack" :class="pack?.tone">
        <div class="pack-body">
          <PackModel
            :title="pack!.title"
            :count="pack!.count"
            :tone="pack!.tone"
            :tear="tear"
            :opening="phase === 'opening'"
            :opening-progress="openingProgress"
          >
            <button
              class="tear-strip"
              @pointerdown="pointerDown"
              @pointermove.stop="pointerMove"
              @pointerup="pointerUp"
              @pointercancel="drag = null; tear = 0"
              aria-label="向右撕开包装"
            />
          </PackModel>
        </div>
      </div>
    </div>
    <template v-if="phase === 'sealed'"
      ><p class="opening-hint">按住顶部封口，向右撕开</p>
      <button class="lime-btn" @click="rip()">撕开包装</button></template
    >
    <div v-if="phase === 'cards'" class="single-reveal-stage">
      <button :key="revealed" class="single-card" :disabled="busy" :aria-label="flipped ? '下一张卡片' : '翻开第 ' + (revealed + 1) + ' 张卡'" @click="advance">
        <CardAura :rarity="flipped ? cards[revealed]!.rarity : 'normal'" />
        <span class="card-turner">
          <span class="card-side card-reverse card-back-design" :aria-hidden="flipped">
            <small>SONGSPACE</small><strong>♪</strong><span>音乐收藏卡</span>
          </span>
          <span class="card-side card-obverse" :aria-hidden="!flipped">
            <SongCard :card="cards[revealed]!" /><span class="card-shine" />
          </span>
        </span>
      </button>
    </div>
    <template v-if="phase === 'summary'">
      <p class="pack-result-count">这一包 {{ cards.length }} 张 · 新卡 {{ cards.filter(c => c.isNew).length }} 张 · 重复 {{ cards.filter(c => !c.isNew).length }} 张</p>
      <div class="revealed-grid">
        <div v-for="(card, i) in cards" :key="i" class="reveal-card face" :class="card.rarity"><CardAura :rarity="card.rarity" /><SongCard :card="card" /></div>
      </div>
      <div class="opening-actions"><button class="outline-btn" @click="close">收下，继续开包</button><button class="spectrum-btn" @click="goWarehouse">去仓库查看 ↗</button></div>
    </template>
  </div>
</template>
