<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PhHouse, PhCompass, PhCards, PhVinylRecord, PhHeadphones, PhTrophy, PhCube, PhMusicNotes, PhUserCircle, PhCloudSlash, PhX, PhEye, PhEyeSlash, PhCopy, PhCheck, PhSignOut } from '@phosphor-icons/vue'
import { connectSave, cloud, identity, logoutGame, retrySave } from '@/game/cloud'
import WorldCanvas from '@/components/WorldCanvas.vue'
import GameHall from '@/components/GameHall.vue'
import SpectrumGrid from '@/components/SpectrumGrid.vue'
import RaceCanvas from '@/components/RaceCanvas.vue'
import PackRoom from '@/components/PackRoom.vue'
import Warehouse from '@/components/Warehouse.vue'
import DailyGuess from '@/components/DailyGuess.vue'
import AchievementRoom from '@/components/AchievementRoom.vue'
import ItemLoadout from '@/components/ItemLoadout.vue'
import SkillBar from '@/components/SkillBar.vue'
import { ITEMS, artPath, imageryFor, skillLevel } from '@/game/content'
import { availableImagery, worldValue, worldMultiplier } from '@/game/imagery'
import { WORLD_OPTIONS, type WorldId } from '@/worlds/types'
import { renderWorldThumbnails } from '@/worlds/thumbnails'
import {
  game,
  catalog,
  loadCatalog,
  persist,
  settle,
  ownedCount,
  cardFor,
  claimableAchievements,
  equippedOutfits,
  type GameCard,
} from '@/game/save'
import type { RaceStatus } from '@/game/race'
const router = useRouter()
const showGameId = ref(false)
const accountNotice = ref('')
const loggingOut = ref(false)
async function signOut() {
  if (loggingOut.value) return
  loggingOut.value = true
  accountNotice.value = ''
  try {
    await logoutGame()
    nickname.value?.close()
    await router.replace('/login')
  } catch (error) {
    accountNotice.value = error instanceof Error ? error.message : '退出失败，请稍后再试。'
  } finally { loggingOut.value = false }
}
function openAccount() {
  name.value = game.name
  showGameId.value = false
  accountNotice.value = ''
  nickname.value?.showModal()
}
async function copyGameId() {
  try { await navigator.clipboard.writeText(identity.gameId); accountNotice.value = '账号 ID 已复制。' }
  catch { showGameId.value = true; accountNotice.value = '请选中账号 ID 手动复制。' }
}
const page = ref<'home' | 'race' | 'packs' | 'warehouse' | 'world' | 'records' | 'daily' | 'achievements'>('home'),
  world = ref<WorldId>('sea'),
  thumbnails = ref<Partial<Record<WorldId, string>>>({})
watch(page, () => window.scrollTo({ top: 0, behavior: 'auto' }))
const selected = computed(() => WORLD_OPTIONS.find((w) => w.id === world.value)!)
const race = ref<InstanceType<typeof RaceCanvas>>(),
  cameraMode = ref(0),
  worldCanvas = ref<InstanceType<typeof WorldCanvas>>()
const started = ref(false),
  mapOpened = ref(false),
  entering = ref(false),
  ready = ref(false),
  version = ref(0),
  result = ref<(RaceStatus & { notes: number; baseScore: number; multiplier: number }) | null>(null),
  toast = ref(''),
  name = ref(game.name),
  evening = ref(false),
  placement = ref<string | null>(null),
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
const vehicle = ref<GameCard | null>(null)
const runMultiplier = ref(1)
const currentValue = computed(() => worldValue(world.value))
const currentMultiplier = computed(() => worldMultiplier(world.value))
const skillSlots = computed(() => game.equippedItems.filter(Boolean).map(id => catalog.songs.find(s => s.id === id && game.owned[id] && ITEMS[s.title])).filter(s => !!s).map(s => ({ id: ITEMS[s!.title]!.id, name: ITEMS[s!.title]!.name, level: skillLevel(game.owned[s!.id] || 0) })).slice(0, 2))
const ownedDecorations = computed(() => catalog.songs.map(s => cardFor(s)).filter(c => c.kind === 'decoration' && c.count))
const color = computed(() =>
  vehicle.value ? ['#e58b69', '#7d9ae3', '#d8bd64'][vehicle.value.song.rank % 3]! : '#58c6b4',
)
let timer: ReturnType<typeof setTimeout> | undefined
function decorateOwned(c: GameCard) {
  page.value = 'world'
  placement.value = c.id
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
watch(() => game.unlockedAchievements.length, (count, previous) => {
  if (count > previous) message(`新成就达成！${count - previous} 枚勋章已点亮，前往「成就」领取卡包。`)
})
function navigate(p: typeof page.value) {
  if (entering.value) return
  if (started.value && !result.value) {
    if (!state.value.paused) race.value?.pause()
    message('先结算本局，再进入其他页面。')
    return
  }
  page.value = p
  placement.value = null
}
const navIcons = { home: PhHouse, race: PhCompass, packs: PhCards, warehouse: PhVinylRecord, daily: PhHeadphones, achievements: PhTrophy, world: PhCube }
function changeCamera(mode:number) {
  cameraMode.value=mode
  race.value?.camera(mode)
}
function selectMap(id: WorldId) {
  world.value = id
  reset()
  mapOpened.value = true
}
function reset() {
  started.value = false
  ready.value = false
  result.value = null
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
async function start() {
  if (!ready.value || entering.value) return
  runMultiplier.value = currentMultiplier.value
  entering.value = true
  const ok = await race.value?.enter()
  entering.value = false
  if (ok) started.value = true
}
function returnToMaps() { reset(); mapOpened.value = false }
function end(s: RaceStatus) {
  if (result.value) return
  const score = Math.floor(s.score * runMultiplier.value)
  const notes = settle(score, s.distance, s.coins, selected.value.title)
  result.value = { ...s, score, notes, baseScore: s.score, multiplier: runMultiplier.value }
  started.value = false
}
const vehicleSpeed = computed(() =>
  vehicle.value
    ? 14 +
      (vehicle.value.song.rank % 3) +
      Math.min(2, Math.floor(((game.owned[vehicle.value.id] || vehicle.value.count) - 1) / 3))
    : 13,
)
function useItem(index: number) {
  if (!started.value || state.value.paused) return
  if (!race.value?.useSkill(index)) message('当前无法使用：检查剩余次数、生命或回溯所需的 3 秒探索时间。')
}
function equip(c: GameCard) {
  if (c.kind === 'map') {
    evening.value = true
    game.equippedTheme = c.id
    persist()
    message('已解锁夜间探索主题 · 星空与暮色')
    reset()
  } else if (c.kind === 'vehicle') {
    vehicle.value = c
    game.equippedVehicle = c.id
    persist()
    message(`已装备《${c.song.title}》自行车`)
    reset()
  } else {
    const next = [...game.equippedItems]
    if (!next.includes(c.id)) next[next.findIndex(id => !id) >= 0 ? next.findIndex(id => !id) : next.length < 2 ? next.length : 0] = c.id
    game.equippedItems = next.slice(0, 2)
    game.equippedItem = c.id
    persist()
    message(`已装备${ITEMS[c.song.title]!.name}`)
    reset()
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
  message('昵称已保存。')
}
const nickname = ref<HTMLDialogElement>(),
  help = ref<HTMLDialogElement>()
onMounted(async () => {
  await connectSave()
  if (!identity.valid) { await router.replace('/login'); return }
  name.value = game.name
  await loadCatalog()
  evening.value = !!game.equippedTheme
  const savedVehicle = catalog.songs.find((s) => s.id === game.equippedVehicle && game.owned[s.id])
  if (savedVehicle) vehicle.value = cardFor(savedVehicle)
  game.equippedItems = [...new Set(game.equippedItems)].filter(id => catalog.songs.some(s => s.id === id && game.owned[id] && ITEMS[s.title])).slice(0, 2)
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
    <SpectrumGrid ambient />
    <header class="play-header">
      <a href="/" @click.prevent="navigate('home')" class="play-brand"
        ><span class="brand-disc"><PhVinylRecord :size="29" weight="light" /></span><b>歌境<small>SONGSPACE</small></b></a
      >
      <nav aria-label="游戏导航">
        <button
          v-for="(label, key) in {
            home: '大厅',
            race: '探索',
            packs: '卡包',
            warehouse: '收藏',
            daily: '猜歌',
            achievements: '成就',
            world: '世界',
          }"
          :key="key"
          :class="{ active: page === key }"
          @click="navigate(key)"
        >
          <component :is="navIcons[key as keyof typeof navIcons]" :size="23" weight="duotone" aria-hidden="true" />
          {{ label
          }}<span
            v-if="(key === 'packs' && Object.values(game.packs).some((n) => n > 0)) || (key === 'achievements' && claimableAchievements > 0)"
            class="nav-dot"
          />
        </button>
      </nav>
      <div class="player-wallet">
        <PhMusicNotes class="wallet-note" :size="21" weight="light" /><b>{{ game.notes.toLocaleString() }}</b
        ><small>音符</small
        ><button class="player-name" @click="openAccount">
          <PhUserCircle :size="22" weight="light" />{{ game.name || '歌境玩家' }}
        </button>
      </div>
    </header>
    <div v-if="cloud.status === 'loading'" class="save-loading" role="status">正在读取存档…</div>
    <button v-if="cloud.status === 'offline' || cloud.status === 'conflict'" class="save-notice" @click="retrySave" :disabled="cloud.status === 'conflict'"><PhCloudSlash :size="16" weight="light" />{{ cloud.error }}<span v-if="cloud.status === 'offline'">重新连接</span></button>
    <GameHall v-if="page === 'home'" @enter="navigate" @message="message" />
    <section v-else-if="page === 'race'" class="race-page">
      <div class="race-topline">
        <div>
          <h1>{{ mapOpened ? selected.title : '地图库' }}</h1>
        </div>
        <button v-if="mapOpened && !started && !entering" class="text-button" @click="returnToMaps">← 地图库</button>
        <button v-else class="text-button" :disabled="entering" @click="openHelp">怎么玩 ↗</button>
      </div>
      <div class="race-layout">
        <aside v-if="!started && !result && !entering" class="race-menu">
          <div v-if="!mapOpened" class="race-map-choices" aria-label="选择地图">
          <button
            v-for="w in WORLD_OPTIONS"
            :key="w.id"
            class="track-option"
            :class="{ active: world === w.id }"
            :aria-pressed="world === w.id"
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
          </button>
          </div>
          <div v-if="mapOpened" class="race-prepare">
            <ItemLoadout @change="reset" />
            <details class="race-equipment">
              <summary>装备与加成 <span>×{{ currentMultiplier.toFixed(2) }}</span></summary>
              <div class="race-equipment-popover">
            <button v-if="game.equippedTheme" class="loadout-item" @click="evening = !evening">
              主题灯光：{{ evening ? '星空夜景' : '白昼' }}
            </button>
            <p>{{ vehicle ? vehicle.song.title + ' · 自行车' : '薄荷绿 · 初始自行车' }}</p>
            <button class="loadout-item" @click="navigate('warehouse')">人物装扮：{{ equippedOutfits.map(outfit => outfit.name).join(' / ') || '未穿戴' }} ↗</button>
            <p>{{ currentValue }} 装饰值 · 积分 ×{{ currentMultiplier.toFixed(2) }}</p>
              </div>
            </details>
          <button class="lime-btn start-race" :disabled="!ready" @click="start">
            {{ ready ? '进入地图 →' : '正在准备地图…' }}
          </button>
          </div>
        </aside>
        <div v-if="mapOpened" class="race-stage" :class="{ playing: started || entering || result, entering, finished: !!result }">
          <RaceCanvas
            :key="world + version + color + evening + equippedOutfits.map(outfit => outfit.id).join(',')"
            ref="race"
            :world="world"
            :color="color"
            :base-speed="vehicleSpeed"
            :skills="skillSlots"
            :outfits="equippedOutfits"
            :evening="evening"
            @ready="ready = true"
            @status="state = $event"
            @end="end"
            @error="raceError = $event"
          />
          <div v-if="started" class="camera-switch" aria-label="镜头机位">
            <button
              v-for="(label, i) in ['追随', '侧后方', '第一人称']"
              :key="i"
              :class="{ active: cameraMode === i }"
              @click="changeCamera(i)"
            >
              {{ label }}
            </button>
          </div>
          <div v-if="started" class="stage-title">
            <small>{{ selected.english }}</small
            ><b>{{ selected.title }}</b
            ><span>无尽赛道 · 第 {{ state.stage }} 关</span>
          </div>
          <div v-if="raceError" class="race-error" role="alert">{{ raceError }}</div>
          <template v-if="started"
            ><div class="race-hud">
              <div>
                <small>分数 · ×{{ runMultiplier.toFixed(2) }}</small><b>{{ Math.floor(state.score * runMultiplier).toLocaleString() }}</b>
              </div>
              <div>
                <small>金币</small><b class="coin-number">{{ state.coins }}</b>
              </div>
              <div>
                <small>探索距离</small><b>{{ state.distance }}<em> m</em></b>
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
              <button class="outline-btn" @click="race?.pause()">暂停</button
              ><button class="outline-btn" @click="race?.finish()">结算本局</button>
            </div>
            <SkillBar :state="state" @use="useItem" />
            <div v-if="state.event && !state.paused" class="skill-feedback" role="status">{{ state.event }}</div>
            <div class="touch-race">
              <button aria-label="向左换道" @click="race?.control('left')">←</button
              ><button @click="race?.control('jump')">跳跃</button
              ><button aria-label="向右换道" @click="race?.control('right')">→</button>
            </div>
            <div v-if="state.paused" class="pause-overlay">
              <h2>已暂停</h2>
              <button class="lime-btn" @click="race?.pause()">继续探索 →</button
              ><button class="outline-btn" @click="race?.finish()">结算本局</button>
            </div></template
          >
          <div v-if="result" class="result-overlay">
            <article>
              <header class="receipt-head"><span>本次探索</span><span>{{ selected.title }}</span></header>
              <dl class="ride-receipt">
                <div><dt>探索距离</dt><dd>{{ result.distance }} m</dd></div>
                <div><dt>收集金币</dt><dd>{{ result.coins }}</dd></div>
                <div><dt>到达关卡</dt><dd>{{ result.stage }}</dd></div>
                <div><dt>基础积分</dt><dd>{{ result.baseScore.toLocaleString() }}</dd></div>
                <div><dt>装饰加成 · ×{{ result.multiplier.toFixed(2) }}</dt><dd>+{{ result.score - result.baseScore }}</dd></div>
                <div class="receipt-total"><dt>总积分</dt><dd>{{ result.score.toLocaleString() }}</dd></div>
                <div class="receipt-reward"><dt><PhMusicNotes :size="18" />音符已到账</dt><dd>+{{ result.notes }}</dd></div>
              </dl>
              <div class="result-actions">
                <button class="outline-btn" @click="returnToMaps">返回地图库</button
                ><button class="lime-btn" @click="reset">再次探索</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
    <PackRoom v-else-if="page === 'packs'" @warehouse="page = 'warehouse'" @daily="page = 'daily'" @message="message" />
    <DailyGuess v-else-if="page === 'daily'" @packs="page = 'packs'" @message="message" />
    <AchievementRoom v-else-if="page === 'achievements'" @packs="page = 'packs'" @message="message" />
    <Warehouse v-else-if="page === 'warehouse'" @equip="equip" @decorate="decorateOwned" @message="message" />
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
        ><span>装饰值 {{ currentValue }} · 积分 ×{{ currentMultiplier.toFixed(2) }}</span>
        <button v-if="placement" @click="placement = null">取消摆放</button>
        <button @click="worldCanvas?.undo()" :disabled="!decorations">撤回上一件</button
        ><button @click="evening = !evening">{{ evening ? '切换白昼' : '切换黄昏' }}</button
        ><small>已摆放 {{ decorations }} 件 · 本机保存</small>
      </div>
      <div class="imagery-shelf">
        <button v-for="c in ownedDecorations" :key="c.id" :class="{ active: placement === c.id }" :disabled="availableImagery(c.id) < 1" @click="placement = placement === c.id ? null : c.id"><img :src="artPath(c.art)" alt=""/><span><b>{{ imageryFor(c.song.title).name }}</b><small>《{{ c.song.title }}》</small><em>可用 {{ availableImagery(c.id) }} / {{ c.count }} · 装饰值 +{{ imageryFor(c.song.title).value }}</em></span></button>
        <p v-if="!ownedDecorations.length">开出一张装饰卡，就能把歌曲的意象放进世界。</p>
      </div>
      <p class="placement-hint">选择一件意象，移动鼠标预览位置，点击摆放 · R 旋转 · Esc 取消</p>
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
          <p class="eyebrow">YOUR EXPLORATION RECORDS</p>
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
    <dialog ref="nickname" class="account-dialog" aria-labelledby="account-title" @close="showGameId = false">
      <header class="account-heading">
        <span class="account-avatar"><PhUserCircle :size="30" weight="duotone" /></span>
        <div><h2 id="account-title">我的歌境</h2><p>管理昵称与账号</p></div>
        <button class="account-icon" aria-label="关闭账号设置" @click="nickname?.close()"><PhX :size="20" /></button>
      </header>
      <form class="account-name-form" @submit.prevent="saveName">
        <label for="account-name">昵称</label>
        <div class="account-name-row">
        <input
          id="account-name"
          v-model="name"
          placeholder="你的昵称"
          maxlength="16"
          required
        /><button class="account-save" :disabled="loggingOut || !name.trim() || name.trim() === game.name"><PhCheck :size="17" />保存</button>
        </div>
      </form>
      <section class="account-identity">
        <label for="account-id">账号 ID</label>
        <div class="account-id-row">
          <input id="account-id" :type="showGameId ? 'text' : 'password'" :value="identity.gameId" readonly autocomplete="off" @focus="($event.target as HTMLInputElement).select()" />
          <button class="account-icon" :aria-label="showGameId ? '隐藏账号 ID' : '显示账号 ID'" :aria-pressed="showGameId" @click="showGameId = !showGameId"><component :is="showGameId ? PhEyeSlash : PhEye" :size="19" /></button>
        </div>
        <div class="account-id-actions"><small>请妥善保存，不要分享。</small><button class="account-copy" @click="copyGameId"><PhCopy :size="17" />复制 ID</button></div>
        <p v-if="accountNotice" class="account-notice" role="status">{{ accountNotice }}</p>
      </section>
      <footer class="account-footer"><span>账号管理</span><button :disabled="loggingOut" @click="signOut">{{ loggingOut ? '正在退出…' : '退出登录' }}<PhSignOut :size="17" /></button></footer>
    </dialog>
    <dialog ref="help" class="nickname-dialog">
      <button class="opening-close" aria-label="关闭玩法说明" @click="help?.close()">×</button>
      <h2>探索 → 音符 → 开包</h2>
      <p>
        载具自动前进，A / D 或方向键换道，空格跳跃，S
        减速。收集金币，躲避路障；三次碰撞结束本局。Esc 暂停。
      </p>
      <p>
        每 500 米进入下一关，赛道会持续延伸。距离每米 1 分，金币每枚 50 分；结算时每 40 分兑换 1
        音符。
      </p>
      <p>
        在开歌曲包页面购买或开启库存卡包，撕开包装、逐张翻卡。新卡点亮仓库，重复卡每 3
        张提升一级；开局可携带两件道具，每局各用一次。局内点击图标或按 1 / 2 使用，复活信物自动发动。
      </p>
      <p>初始三张地图直接开放。存档会自动同步，断网时保留本机进度。</p>
    </dialog>
  </main>
</template>
<style scoped>
.account-dialog { width:min(440px,calc(100vw - 32px)); max-height:calc(100dvh - 32px); overflow-y:auto; padding:0; border:1px solid #e0e7e2; border-radius:20px; background:#fff; color:#34443b; box-shadow:0 24px 90px #263d3426; }
.account-dialog::backdrop { background:#1f302e55; backdrop-filter:blur(5px); }
.account-heading { display:flex; align-items:center; gap:13px; padding:26px 26px 22px; }
.account-avatar { display:grid; place-items:center; flex-shrink:0; width:48px; height:48px; border-radius:14px; background:#edf3ee; color:#456b56; }
.account-heading h2 { font-size:21px; font-weight:600; letter-spacing:-.4px; }.account-heading p { margin-top:5px; color:#6b7a70; font-size:12px; }
.account-icon { display:grid; place-items:center; width:40px; height:40px; padding:0; flex-shrink:0; border-radius:9px; color:#68796f; background:transparent; }.account-heading>.account-icon { margin-left:auto; align-self:flex-start; }.account-icon:hover { background:#edf3ee; }
.account-name-form,.account-identity { margin:0; padding:0 26px; }.account-dialog label { display:block; font-size:12px; font-weight:600; color:#52655a; margin-bottom:10px; }
.account-name-row { display:flex; gap:10px; }.account-dialog input { min-width:0; width:100%; height:46px; border-radius:9px; padding:12px; font-size:14px; color:#34443b; border:1px solid #d9e2dc; background:#fafcfb; box-shadow:none; }.account-dialog input::placeholder { color:#738278; }.account-dialog input:focus { outline:2px solid #456b56; outline-offset:2px; }.account-dialog button:focus-visible { outline:2px solid #456b56; outline-offset:3px; }
.account-save { display:flex; align-items:center; justify-content:center; gap:6px; padding:0 16px; min-height:46px; border-radius:9px; background:#456b56; color:#fff; font-size:13px; white-space:nowrap; }.account-save:disabled { opacity:1; background:#edf1ee; color:#68796f; }
.account-identity { padding-top:26px; padding-bottom:24px; }.account-id-row { display:flex; align-items:center; position:relative; }.account-id-row input { padding-right:48px; font-family:inherit; font-size:13px; }.account-id-row>.account-icon { position:absolute; right:3px; }
.account-id-actions { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; }.account-id-actions small { font-size:11px; color:#6b7a70; }.account-copy { display:flex; align-items:center; gap:6px; min-height:36px; padding:0 10px; background:#edf3ee; color:#456b56; border-radius:8px; font-size:12px; white-space:nowrap; }
.account-notice { margin-top:10px; font-size:12px; line-height:1.6; color:#456b56; }.account-footer { display:flex; align-items:center; justify-content:space-between; padding:18px 26px; background:#f7f9f7; border-top:1px solid #e5ebe6; font-size:12px; color:#6b7a70; }.account-footer button { display:flex; align-items:center; gap:9px; min-height:36px; padding:0 4px; color:#456b56; }
@media(max-width:440px) { .account-heading { padding:22px 20px; }.account-name-form,.account-identity { padding-left:20px; padding-right:20px; }.account-footer { padding:16px 20px; } }
.race-page { max-width: 1280px; margin: auto; padding: 26px 36px; }
.race-page .race-topline { margin-bottom: 20px; }
.race-page .race-topline h1 { color: #34433b; font-size: 23px; }
.race-page .race-layout { display: flex; flex-direction: column; gap: 16px; }
.race-page .race-menu { display: contents; }
.race-map-choices { order: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.race-map-choices .track-option { margin: 0; padding: 10px 16px; background: #fff; border: 1px solid #e0e5e1; border-radius: 10px; min-width: 0; gap: 14px; }
.race-map-choices .track-option.active { background: #eef3ed; border-color: #7c9a80; box-shadow: inset 0 -2px #7c9a80; }
.race-map-choices .track-option img { width: 76px; height: 52px; object-fit: cover; border-radius: 5px; }
.race-map-choices .track-option h3 { color: #35463a; font-size: 14px; }
.race-map-choices .track-option p { color: #8a948c; font-size: 11px; margin-top: 5px; }
.race-page .race-stage { order: 2; min-height: 300px; height: clamp(300px, 49dvh, 520px); max-height: none; border: 0; border-radius: 12px; }
.race-page .race-stage.playing { height: calc(100dvh - 200px); min-height: 460px; }
.race-prepare { order: 3; display: flex; align-items: center; gap: 20px; padding: 3px 0; }
.race-prepare :deep(.item-loadout) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; width: 460px; max-width: 55%; }
.race-prepare :deep(.item-loadout > small) { display: none; }
.race-prepare :deep(.item-slot) { min-height: 60px; background: #fff; border-color: #e0e5e1; border-radius: 8px; padding: 6px 12px; }
.race-prepare :deep(.item-slot img) { width: 43px; height: 43px; }
.race-prepare :deep(.item-slot small) { display: none; }
.race-prepare :deep(.item-slot em) { font-size: 10px; }
.race-prepare .start-race { width: auto; min-width: 185px; margin: 0 0 0 auto; padding: 18px 25px; background: #3e5b46; color: #fff; border-color: #3e5b46; box-shadow: none; }
.race-equipment { position: relative; color: #748077; font-size: 12px; }
.race-equipment summary { cursor: pointer; white-space: nowrap; padding: 12px 0; }
.race-equipment summary span { margin-left: 8px; font-variant-numeric: tabular-nums; }
.race-equipment-popover { position: absolute; right: 0; bottom: calc(100% + 10px); width: 260px; z-index: 12; padding: 18px; background: #fff; border: 1px solid #dfe5de; border-radius: 10px; box-shadow: 0 10px 35px #253b2820; }
.race-equipment-popover p { margin: 10px 0; font-size: 12px; }
.race-equipment-popover .loadout-item { text-align: left; padding: 8px 0; color: #4d6654; }
.race-page .race-topline h1 { font-size: 18px; font-weight: 600; }
.race-map-choices { gap: 24px; padding-top: 12px; }
.race-map-choices .track-option { display: flex; flex-direction: column; align-items: stretch; padding: 0; gap: 0; overflow: hidden; text-align: left; background: #e7ebde; border-radius: 12px; transition: transform 180ms ease, box-shadow 180ms ease; }
.race-map-choices .track-option:hover { transform: translateY(-4px); box-shadow: 0 12px 28px #34433b14; }
.race-map-choices .track-option.active { background: #e7ebde; border-color: #d7dfd2; box-shadow: none; }
.race-map-choices .track-option img { width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 0; }
.race-map-choices .track-option > div { padding: 18px 20px; background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.race-map-choices .track-option h3 { font-size: 15px; font-weight: 600; }
.race-map-choices .track-option p { margin: 0; font-size: 11px; }
.race-stage { background: #e7ebde; }
.race-stage.entering { pointer-events: none; }
.race-page .pause-overlay h2 { font-size: 18px; font-weight: 600; }
.race-page .result-overlay { background: #e9eeea40; backdrop-filter: none; padding: 24px; overflow: auto; }
.race-page .result-overlay article { margin: auto; width: min(100%, 400px); max-width: 400px; padding: 24px 26px; border: 1px solid #d6ddd5; border-radius: 10px; box-shadow: 0 15px 45px #1c302c24; text-align: left; flex-shrink: 0; background: #fcfcf9; color: #35433c; }
.receipt-head { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 20px; border-bottom: 1px solid #dce2da; font-size: 13px; }
.receipt-head span:last-child { color: #758079; }
.ride-receipt { margin: 12px 0 0; font-size: 13px; }
.ride-receipt > div { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 9px 0; }
.ride-receipt dt { color: #728078; }
.ride-receipt dd { margin: 0; font-weight: 500; font-variant-numeric: tabular-nums; color: #35433c; }
.ride-receipt .receipt-total { margin-top: 8px; padding-top: 16px; border-top: 1px solid #dce2da; }
.ride-receipt .receipt-total dd { font-size: 22px; }
.ride-receipt .receipt-reward { padding: 16px 0; }
.receipt-reward dt { display: flex; align-items: center; gap: 7px; color: #45694e; }
.ride-receipt .receipt-reward dd { font-size: 22px; color: #45694e; }
.race-page .result-actions { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.result-actions button { padding: 12px 10px; font-size: 13px; }
.result-actions .lime-btn { background: #3e5b46; color: #fff; border-color: #3e5b46; box-shadow: none; }
@media(max-width: 700px) {
  .race-page { padding: 22px 16px; }
  .race-map-choices { grid-template-columns: 1fr; gap: 16px; }
  .race-map-choices .track-option > div { padding: 14px 18px; }
  .race-page .result-overlay { padding: 14px; }
  .race-prepare { flex-wrap: wrap; gap: 12px; }
  .race-prepare :deep(.item-loadout) { width: 100%; max-width: none; }
  .race-prepare .start-race { min-width: 160px; padding: 15px 20px; }
  .race-equipment-popover { right: auto; left: 0; }
  .race-page .race-stage.playing { min-height: 430px; }
}
</style>
