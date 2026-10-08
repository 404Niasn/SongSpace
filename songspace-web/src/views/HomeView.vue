<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WorldCanvas from '@/components/WorldCanvas.vue'
import GameHall from '@/components/GameHall.vue'
import RaceCanvas from '@/components/RaceCanvas.vue'
import PackRoom from '@/components/PackRoom.vue'
import Warehouse from '@/components/Warehouse.vue'
import DailyGuess from '@/components/DailyGuess.vue'
import { WORLD_OPTIONS, type WorldId, type DecorationKind } from '@/worlds/types'
import { renderWorldThumbnails } from '@/worlds/thumbnails'
import {
  game,
  catalog,
  loadCatalog,
  persist,
  settle,
  ownedCount,
  cardFor,
  type GameCard,
} from '@/game/save'
import type { RaceStatus } from '@/game/race'
const page = ref<'home' | 'race' | 'packs' | 'warehouse' | 'world' | 'records' | 'daily'>('home'),
  world = ref<WorldId>('sea'),
  thumbnails = ref<Partial<Record<WorldId, string>>>({})
watch(page, () => window.scrollTo({ top: 0, behavior: 'auto' }))
const selected = computed(() => WORLD_OPTIONS.find((w) => w.id === world.value)!)
const race = ref<InstanceType<typeof RaceCanvas>>(),
  cameraMode = ref(0),
  worldCanvas = ref<InstanceType<typeof WorldCanvas>>()
const started = ref(false),
  ready = ref(false),
  version = ref(0),
  result = ref<(RaceStatus & { notes: number }) | null>(null),
  toast = ref(''),
  name = ref(game.name),
  evening = ref(false),
  placement = ref<DecorationKind | null>(null),
  decorations = ref(0),
  raceError = ref('')
const state = ref<RaceStatus>({
  distance: 0,
  score: 0,
  coins: 0,
  health: 3,
  speed: 0,
  stage: 1,
  paused: false,
  boost: 0,
})
const vehicle = ref<GameCard | null>(null),
  item = ref<GameCard | null>(null),
  usedItem = ref(false)
const color = computed(() =>
  vehicle.value ? ['#e58b69', '#7d9ae3', '#d8bd64'][vehicle.value.song.rank % 3]! : '#58c6b4',
)
let timer: ReturnType<typeof setTimeout> | undefined
const hasDecoration = computed(() =>
  catalog.songs.some(
    (s) =>
      game.owned[s.id] && s.rank % 5 !== 0 && s.rank % 8 !== 0 && ![25, 48, 54].includes(s.rank),
  ),
)
function decorateOwned() {
  page.value = 'world'
  placement.value = 'flowers'
}
function backToRace() {
  page.value = 'race'
  reset()
}
function saveName() {
  rename()
  nickname.value?.close()
}
function message(s: string) {
  toast.value = s
  clearTimeout(timer)
  timer = setTimeout(() => (toast.value = ''), 3500)
}
function navigate(p: typeof page.value) {
  if (started.value && !result.value) {
    if (!state.value.paused) race.value?.pause()
    message('先结算本局，再进入其他页面。')
    return
  }
  page.value = p
  placement.value = null
}
function changeCamera(mode:number) {
  cameraMode.value=mode
  race.value?.camera(mode)
}
function selectMap(id: WorldId) {
  world.value = id
  reset()
}
function reset() {
  started.value = false
  ready.value = false
  result.value = null
  usedItem.value = false
  version.value++
  cameraMode.value = 0
  raceError.value = ''
  state.value = {
    distance: 0,
    score: 0,
    coins: 0,
    health: 3,
    speed: 0,
    stage: 1,
    paused: false,
    boost: 0,
  }
}
function openHelp() {
  if (started.value && !state.value.paused) race.value?.pause()
  help.value?.showModal()
}
function start() {
  if (!ready.value) return
  started.value = true
  race.value?.start()
}
function end(s: RaceStatus) {
  if (result.value) return
  const notes = settle(s.score, s.distance, s.coins, selected.value.title)
  result.value = { ...s, notes }
  started.value = false
}
const vehicleSpeed = computed(() =>
  vehicle.value
    ? 14 +
      (vehicle.value.song.rank % 3) +
      Math.min(2, Math.floor(((game.owned[vehicle.value.id] || vehicle.value.count) - 1) / 3))
    : 13,
)
function useItem() {
  if (!item.value || usedItem.value || !started.value) return
  usedItem.value = true
  race.value?.boost(
    8 + Math.min(12, Math.floor(((game.owned[item.value.id] || item.value.count) - 1) / 3) * 2),
  )
  message('友情助力已发动，重复卡等级越高，加速越久。')
}
function equip(c: GameCard) {
  if (c.kind === 'map') {
    evening.value = true
    game.equippedTheme = c.id
    persist()
    message('已解锁夜骑主题 · 星空与暮色')
    reset()
  } else if (c.kind === 'vehicle') {
    vehicle.value = c
    game.equippedVehicle = c.id
    persist()
    message(`已装备《${c.song.title}》自行车`)
    reset()
  } else {
    item.value = c
    game.equippedItem = c.id
    persist()
    message(`已装备《${c.song.title}》助力道具`)
  }
  page.value = 'race'
}
function rename() {
  const n = name.value.trim().slice(0, 16)
  if (!n) {
    message('输入一个昵称即可开始。')
    return
  }
  game.name = n
  persist()
  message('昵称已保存，收藏和闯关进度会留在当前浏览器。')
}
const nickname = ref<HTMLDialogElement>(),
  help = ref<HTMLDialogElement>()
onMounted(async () => {
  await loadCatalog()
  evening.value = !!game.equippedTheme
  const savedVehicle = catalog.songs.find((s) => s.id === game.equippedVehicle && game.owned[s.id])
  if (savedVehicle) vehicle.value = cardFor(savedVehicle)
  const savedItem = catalog.songs.find((s) => s.id === game.equippedItem && game.owned[s.id])
  if (savedItem) item.value = cardFor(savedItem)
  try {
    thumbnails.value = renderWorldThumbnails()
  } catch {
    message('地图缩略图暂不可用，仍可进入场景。')
  }
})
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <main class="play-app">
    <header class="play-header">
      <a href="/" @click.prevent="navigate('home')" class="play-brand"
        ><span class="brand-disc">♪</span><b>歌境<small>SONGSPACE</small></b></a
      >
      <nav aria-label="游戏导航">
        <button
          v-for="(label, key) in {
            home: '大厅',
            race: '骑行闯关',
            packs: '开歌曲包',
            warehouse: '我的仓库',
            daily: '每日猜歌',
            world: '微缩世界',
          }"
          :key="key"
          :class="{ active: page === key }"
          @click="navigate(key)"
        >
          {{ label
          }}<span
            v-if="key === 'packs' && Object.values(game.packs).some((n) => n > 0)"
            class="nav-dot"
          />
        </button>
      </nav>
      <div class="player-wallet">
        <span class="wallet-note">♪</span><b>{{ game.notes.toLocaleString() }}</b
        ><small>音符</small
        ><button class="player-name" @click="nickname?.showModal()">
          {{ game.name || '取个昵称' }} <span>↗</span>
        </button>
      </div>
    </header>
    <GameHall v-if="page === 'home'" @enter="navigate" />
    <section v-else-if="page === 'race'" class="race-page">
      <div class="race-topline">
        <div>
          <p class="eyebrow">RIDE / COLLECT / DISCOVER</p>
          <h1>{{ started ? '沿着这首歌，一直骑下去' : '下一段旅程，从哪首歌开始？' }}</h1>
        </div>
        <button class="text-button" @click="openHelp">怎么玩 ↗</button>
      </div>
      <div class="race-layout">
        <aside v-if="!started && !result" class="race-menu">
          <div class="section-top">
            <h2>选择赛道</h2>
            <span>03 WORLDS</span>
          </div>
          <button
            v-for="w in WORLD_OPTIONS"
            :key="w.id"
            class="track-option"
            :class="{ active: world === w.id }"
            @click="selectMap(w.id)"
          >
            <img v-if="thumbnails[w.id]" :src="thumbnails[w.id]" :alt="w.title + '地图'" />
            <div>
              <h3>{{ w.title }}</h3>
              <p>
                {{ w.artist }} ·
                {{ w.id === 'jiangnan' ? '青石板街' : w.id === 'forest' ? '林间步道' : '海岸公路' }}
              </p>
            </div>
            <span>{{ world === w.id ? '●' : '○' }}</span>
          </button>
          <div class="loadout">
            <button v-if="game.equippedTheme" class="loadout-item" @click="evening = !evening">
              主题灯光：{{ evening ? '星空夜骑' : '白昼' }}
            </button>
            <small>本次装备</small
            ><b>{{ vehicle ? vehicle.song.title + ' · 自行车' : '薄荷绿 · 初始自行车' }}</b
            ><button class="loadout-item" @click="page = 'warehouse'">
              {{ item ? '道具：' + item.song.title : '＋ 从仓库装备助力道具' }}
            </button>
          </div>
          <button class="lime-btn start-race" :disabled="!ready" @click="start">
            {{ ready ? '开始闯关 →' : '正在准备赛道…' }}
          </button>
          <p class="race-rule">每 500 米进入下一关<br />收集金币，躲开障碍 · 三次碰撞结束</p>
        </aside>
        <div class="race-stage" :class="{ playing: started }">
          <RaceCanvas
            :key="world + version + color + evening"
            ref="race"
            :world="world"
            :color="color"
            :base-speed="vehicleSpeed"
            :evening="evening"
            @ready="ready = true"
            @status="state = $event"
            @end="end"
            @error="raceError = $event"
          />
          <div class="camera-switch" aria-label="镜头机位">
            <button
              v-for="(label, i) in ['追随', '侧后方', '骑手视角']"
              :key="i"
              :class="{ active: cameraMode === i }"
              @click="changeCamera(i)"
            >
              {{ label }}
            </button>
          </div>
          <div class="stage-title">
            <small>{{ selected.english }}</small
            ><b>{{ selected.title }}</b
            ><span>无尽赛道 · 第 {{ state.stage }} 关</span>
          </div>
          <div v-if="!started && !result" class="stage-preview-label">
            <span>第三人称骑行</span><b>一首歌，一条看不到尽头的路。</b>
          </div>
          <div v-if="raceError" class="race-error" role="alert">{{ raceError }}</div>
          <template v-if="started"
            ><div class="race-hud">
              <div>
                <small>分数</small><b>{{ state.score.toLocaleString() }}</b>
              </div>
              <div>
                <small>金币</small><b class="coin-number">{{ state.coins }}</b>
              </div>
              <div>
                <small>骑行距离</small><b>{{ state.distance }}<em> m</em></b>
              </div>
              <div>
                <small>生命</small
                ><b class="health"
                  >{{ '●'.repeat(state.health) }}<span>{{ '○'.repeat(3 - state.health) }}</span></b
                >
              </div>
            </div>
            <div class="stage-progress">
              <span>第 {{ state.stage }} 关</span
              ><progress :value="state.distance % 500" max="500" /><span
                >{{ 500 - (state.distance % 500) }} m</span
              >
            </div>
            <div class="race-bottom">
              <span
                ><b>{{ state.speed }}</b> KM/H</span
              >
              <p>A / D 换道 · 空格跳跃 · S 减速</p>
              <button v-if="item" class="skill-btn" :disabled="usedItem" @click="useItem">
                {{
                  state.boost ? '助力 ' + state.boost + 's' : usedItem ? '本局已使用' : '友情助力 ↗'
                }}</button
              ><button class="outline-btn" @click="race?.pause()">暂停</button
              ><button class="outline-btn" @click="race?.finish()">结算本局</button>
            </div>
            <div class="touch-race">
              <button aria-label="向左换道" @click="race?.control('left')">←</button
              ><button @click="race?.control('jump')">跳跃</button
              ><button aria-label="向右换道" @click="race?.control('right')">→</button>
            </div>
            <div v-if="state.paused" class="pause-overlay">
              <h2>稍作休息</h2>
              <p>音符和金币都在等你。</p>
              <button class="lime-btn" @click="race?.pause()">继续骑行 →</button
              ><button class="outline-btn" @click="race?.finish()">结算本局</button>
            </div></template
          >
          <div v-if="result" class="result-overlay">
            <article>
              <p class="eyebrow">RIDE COMPLETE</p>
              <h2>{{ result.health ? '这一程，收获满满' : '休息一下，再出发' }}</h2>
              <div class="result-score">
                {{ result.score.toLocaleString() }}<small>本局分数</small>
              </div>
              <div class="result-stats">
                <span
                  ><b>{{ result.distance }} m</b>骑行距离</span
                ><span
                  ><b>{{ result.coins }}</b
                  >收集金币</span
                ><span
                  ><b>{{ result.stage }}</b
                  >到达关卡</span
                >
              </div>
              <div class="reward-note">♪ +{{ result.notes }}<span>音符已到账</span></div>
              <p>每 40 分兑换 1 音符 · 金币每枚加 50 分</p>
              <div class="result-actions">
                <button class="outline-btn" @click="reset">再骑一程</button
                ><button class="lime-btn" @click="page = 'packs'">用音符开卡包 →</button>
              </div>
            </article>
          </div>
        </div>
      </div>
      <div v-if="!started && !result" class="journey-footer">
        <span><i>01</i>骑行吃金币</span><span>→</span><span><i>02</i>结算获取音符</span
        ><span>→</span><span><i>03</i>撕包收集歌曲卡</span
        ><button @click="page = 'packs'">去开歌曲包 · 收集下一首 ↗</button>
      </div>
    </section>
    <PackRoom v-else-if="page === 'packs'" @warehouse="page = 'warehouse'" @message="message" />
    <DailyGuess v-else-if="page === 'daily'" @packs="page = 'packs'" @message="message" />
    <Warehouse v-else-if="page === 'warehouse'" @equip="equip" @decorate="decorateOwned" />
    <section v-else-if="page === 'world'" class="mini-world-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">YOUR LITTLE WORLD</p>
          <h1>把喜欢的歌，放进世界。</h1>
          <p>选择歌曲地图，摆放你收集到的意象。</p>
        </div>
        <button class="outline-btn" @click="backToRace">去这个世界闯关 ↗</button>
      </div>
      <div class="mini-toolbar">
        <select v-model="world" aria-label="选择微缩地图">
          <option v-for="w in WORLD_OPTIONS" :key="w.id" :value="w.id">
            {{ w.title }}
          </option></select
        ><button
          v-if="hasDecoration"
          :class="{ active: placement === 'flowers' }"
          @click="placement = placement ? null : 'flowers'"
        >
          摆放意象花簇</button
        ><span v-else>开出装饰卡后可摆放</span
        ><button @click="worldCanvas?.undo()" :disabled="!decorations">撤回上一件</button
        ><button @click="evening = !evening">{{ evening ? '切换白昼' : '切换黄昏' }}</button
        ><small>已摆放 {{ decorations }} 件 · 本机保存</small>
      </div>
      <div class="mini-stage">
        <WorldCanvas
          ref="worldCanvas"
          :world="world"
          mode="overview"
          :evening="evening"
          :first-person="false"
          transport="bike"
          :placement="placement"
          @status="decorations = $event.decorations"
          @message="message"
          @cancel-placement="placement = null"
        />
      </div>
    </section>
    <section v-else class="records-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">YOUR RIDING RECORDS</p>
          <h1>每一程，都算数。</h1>
          <p>最高分 {{ game.best.toLocaleString() }} · 已完成 {{ game.runs }} 次闯关</p>
        </div>
        <button class="lime-btn" @click="backToRace">开始新一局 →</button>
      </div>
      <div class="record-table">
        <div class="record-row record-head">
          <span>歌曲赛道</span><span>距离</span><span>金币</span><span>分数</span><span>音符</span>
        </div>
        <div v-for="(r, i) in game.history" :key="i" class="record-row">
          <b>{{ r.map }}</b
          ><span>{{ r.distance }} m</span><span>{{ r.coins }}</span
          ><b>{{ r.score }}</b
          ><span class="coin-number">+{{ r.notes }} ♪</span>
        </div>
        <p v-if="!game.history.length" class="collection-empty">你的第一条闯关记录，等着被写下。</p>
      </div>
    </section>
    <div v-if="toast" class="game-toast" role="status">{{ toast }}</div>
    <dialog ref="nickname" class="nickname-dialog">
      <button class="opening-close" aria-label="关闭昵称设置" @click="nickname?.close()">×</button>
      <p class="eyebrow">HELLO, RIDER</p>
      <h2>给这一程，留下你的名字。</h2>
      <p>本机存档 · 当前浏览器会记住你的收藏和音符。</p>
      <form @submit.prevent="saveName">
        <input
          v-model="name"
          placeholder="你的昵称"
          maxlength="16"
          required
          aria-label="你的昵称"
        /><button class="lime-btn">保存昵称</button>
      </form>
    </dialog>
    <dialog ref="help" class="nickname-dialog">
      <button class="opening-close" aria-label="关闭玩法说明" @click="help?.close()">×</button>
      <h2>骑行 → 音符 → 开包</h2>
      <p>
        自行车自动前进，A / D 或方向键换道，空格跳跃，S
        减速。收集金币，躲避路障；三次碰撞结束本局。Esc 暂停。
      </p>
      <p>
        每 500 米进入下一关，赛道会持续延伸。距离每米 1 分，金币每枚 50 分；结算时每 40 分兑换 1
        音符。
      </p>
      <p>
        在开歌曲包页面购买或开启库存卡包，撕开包装、逐张翻卡。新卡点亮仓库，重复卡每 3
        张提升一级；载具可装备配色，道具每局可使用一次。
      </p>
      <p>初始三张地图直接开放。当前存档保存在本机浏览器。</p>
    </dialog>
  </main>
</template>
