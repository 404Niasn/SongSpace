<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PhHouse, PhCompass, PhCards, PhVinylRecord, PhHeadphones, PhTrophy, PhCube, PhMusicNotes, PhUserCircle, PhCloudSlash, PhX, PhEye, PhEyeSlash, PhCopy, PhCheck, PhSignOut, PhArrowRight, PhQuestion, PhGameController } from '@phosphor-icons/vue'
import { connectSave, cloud, identity, logoutGame, retrySave } from '@/game/cloud'
import WorldCanvas from '@/components/WorldCanvas.vue'
import WeatherPicker from '@/components/WeatherPicker.vue'
import GameHall from '@/components/GameHall.vue'
import SpectrumGrid from '@/components/SpectrumGrid.vue'
import RaceCanvas from '@/components/RaceCanvas.vue'
import PackRoom from '@/components/PackRoom.vue'
import Warehouse from '@/components/Warehouse.vue'
import DailyGuess from '@/components/DailyGuess.vue'
import AchievementRoom from '@/components/AchievementRoom.vue'
import ItemLoadout from '@/components/ItemLoadout.vue'
import SkillBar from '@/components/SkillBar.vue'
import VehiclePreview from '@/components/VehiclePreview.vue'
import VehiclePicker from '@/components/VehiclePicker.vue'
import { raceDifficulty } from '@/game/raceDifficulty'
import { ITEMS, artPath, imageryFor, skillLevel } from '@/game/content'
import { availableImagery, worldValue, worldMultiplier, weatherForWorld, activeWeatherSong, setWorldWeather } from '@/game/imagery'
import { WORLD_OPTIONS, type WorldId } from '@/worlds/types'
import {
  game,
  catalog,
  loadCatalog,
  persist,
  settle,
  ownedCount,
  cardFor,
  kindFor,
  claimableAchievements,
  equippedOutfits,
  outfitScoreBonus,
  type GameCard,
} from '@/game/save'
import type { RaceStatus } from '@/game/race'
import { VEHICLES } from '@/game/vehicles'
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
  world = ref<WorldId>('sea')
watch(page, () => window.scrollTo({ top: 0, behavior: 'auto' }))
const selected = computed(() => WORLD_OPTIONS.find((w) => w.id === world.value)!)
const race = ref<InstanceType<typeof RaceCanvas>>(),
  cameraMode = ref(0),
  worldCanvas = ref<InstanceType<typeof WorldCanvas>>()
const started = ref(false),
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
const currentMultiplier = computed(() => worldMultiplier(world.value) + outfitScoreBonus.value)
const skillSlots = computed(() => game.equippedItems.filter(Boolean).map(id => catalog.songs.find(s => s.id === id && game.owned[id] && ITEMS[s.title])).filter(s => !!s).map(s => ({ id: ITEMS[s!.title]!.id, name: ITEMS[s!.title]!.name, level: skillLevel(game.owned[s!.id] || 0) })).slice(0, 2))
const ownedDecorations = computed(() => catalog.songs.map(s => cardFor(s)).filter(c => c.kind === 'decoration' && c.count))
const ownedWeather = computed(() => ownedDecorations.value.filter(c => imageryFor(c.song.title).weather))
const weather = computed(() => weatherForWorld(world.value))
const weatherSongId = computed(() => activeWeatherSong(world.value)?.id || '')
const worldSaveStatus = computed(() => ({ loading: '正在读取账号歌境', synced: '已同步到账号', pending: '正在同步', offline: '连接中断，等待同步', conflict: '同步冲突，请重新连接' })[cloud.status])
function chooseWeather(songId: string) {
  if (!setWorldWeather(world.value, songId)) { message('先获得对应歌曲卡，才能解锁天气。'); return }
  placement.value = null
  reset()
  message(songId ? `已启用${imageryFor(catalog.songs.find(s => s.id === songId)!.title).name}，闯关中同步生效。` : '已恢复地图默认天气。')
}
function chooseDecoration(c: GameCard) {
  if (imageryFor(c.song.title).weather) chooseWeather(weatherSongId.value === c.id ? '' : c.id)
  else placement.value = placement.value === c.id ? null : c.id
}
const color = computed(() =>
  vehicle.value ? ['#e58b69', '#7d9ae3', '#d8bd64'][vehicle.value.song.rank % 3]! : '#58c6b4',
)
let timer: ReturnType<typeof setTimeout> | undefined
function decorateOwned(c: GameCard) {
  page.value = 'world'
  if (imageryFor(c.song.title).weather) chooseWeather(c.id)
  else placement.value = c.id
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
  if (world.value === id) return
  world.value = id
  reset()
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
function returnToMaps() { reset() }
function end(s: RaceStatus) {
  if (result.value) return
  const score = Math.floor(s.score * runMultiplier.value)
  const notes = settle(score, s.distance, s.coins, selected.value.title)
  result.value = { ...s, score, notes, baseScore: s.score, multiplier: runMultiplier.value }
  started.value = false
}
const vehicleSpeed = computed(() =>
  vehicle.value
    ? (vehicle.value.song.vehicle_model ? VEHICLES[vehicle.value.song.vehicle_model].speed : 14 + (vehicle.value.song.rank % 3)) +
      Math.min(2, Math.floor(((game.owned[vehicle.value.id] || vehicle.value.count) - 1) / 3))
    : 13,
)
const ownedVehicles = computed(() => catalog.songs.filter(song => game.owned[song.id] && kindFor(song) === 'vehicle'))
function selectVehicle(id: string) {
  if (id === (vehicle.value?.id || '')) return
  const song = ownedVehicles.value.find(song => song.id === id)
  if (id && !song) return
  vehicle.value = song ? cardFor(song) : null
  game.equippedVehicle = song?.id || ''
  persist()
  reset()
}
function useItem(index: number) {
  if (!started.value || state.value.paused) return
  if (!race.value?.useSkill(index)) message('当前无法使用：检查剩余次数、生命或回溯所需的 3 秒探索时间。')
}
function equip(c: GameCard) {
  if (c.kind === 'map') {
    if (c.song.title === '光年之外') { message('已收藏《光年之外》彩卡，太空地图后续开放。'); return }
    world.value = 'jiangnan'
    evening.value = false
    game.equippedTheme = c.id
    persist()
    message('已选择《江南》地图 · 烟雨与青石板街')
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
  if (catalog.songs.some(s => s.id === game.equippedTheme && s.title === '江南' && game.owned[s.id])) world.value = 'jiangnan'
  evening.value = false
  const savedVehicle = catalog.songs.find((s) => s.id === game.equippedVehicle && game.owned[s.id])
  if (savedVehicle && kindFor(savedVehicle) === 'vehicle') vehicle.value = cardFor(savedVehicle)
  game.equippedItems = [...new Set(game.equippedItems)].filter(id => catalog.songs.some(s => s.id === id && game.owned[id] && ITEMS[s.title])).slice(0, 2)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <main class="play-app">
    <SpectrumGrid ambient />
    <header class="play-header">
      <a href="/" @click.prevent="navigate('home')" class="play-brand"
        ><img class="brand-logo" src="/brand/songspace-logo.webp" alt="歌境 Logo" width="42" height="42" /><b>歌境<small>SONGSPACE</small></b></a
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
          <h1>{{ started || entering || result ? selected.title : '探索' }}</h1>

        </div>
        <button class="exploration-guide" :disabled="entering" @click="openHelp"><PhQuestion :size="19" weight="duotone" />玩法指南</button>
      </div>
      <div class="race-layout" :class="{ 'race-active': started || entering || result }">
        <aside v-if="!started && !result && !entering" class="race-menu">
          <div class="explore-sidebar">
          <div class="race-map-choices" aria-label="选择地图">
          <div class="map-list-heading"><b>音乐地图</b><span>{{ WORLD_OPTIONS.length }} 个世界</span></div>
          <button
            v-for="w in WORLD_OPTIONS"
            :key="w.id"
            class="track-option"
            :class="{ active: world === w.id }"
            :aria-pressed="world === w.id"
            @click="selectMap(w.id)"
          >
            <img :src="w.cover" :alt="w.artist + '《' + w.album + '》专辑封面'" width="68" height="68" />
            <div>
              <h3>{{ w.title }}</h3>
              <p>
                {{ w.artist }}
              </p>

            </div>
          </button>
          </div>
          <section class="prepare-vehicle" aria-label="选择载具">
            <div class="map-list-heading"><b>选择载具</b><span>{{ ownedVehicles.length + 1 }} 辆可用</span></div>
            <div class="vehicle-model-card">
              <span class="vehicle-speed">{{ vehicleSpeed }} m/s</span>
              <VehiclePreview :model="vehicle?.song.vehicle_model" :name="vehicle?.song.vehicle_name || '初始单车'" :framing="1.12" />
            </div>
            <div class="vehicle-picker-wrap"><VehiclePicker :model-value="vehicle?.id || ''" :songs="ownedVehicles" @update:model-value="selectVehicle" /></div>
            <div v-if="!ownedVehicles.length" class="vehicle-hint"><span>开载具卡，获得更多载具</span><button @click="navigate('packs')">去开卡<PhArrowRight :size="13" /></button></div>
          </section>
          </div>
          <div class="race-prepare">
            <div class="prepare-equipment">
              <section class="prepare-items" aria-label="选择探索道具"><h2>携带道具 <span>每局各一次</span></h2><ItemLoadout @change="reset" /></section>

            </div>
            <div class="prepare-footer">
              <div class="score-bonus">
                <div class="score-bonus-heading"><span>本局积分倍率</span><strong>×{{ currentMultiplier.toFixed(2) }}</strong><span class="bonus-percent">+{{ Math.round((currentMultiplier - 1) * 100) }}%</span><span class="bonus-value">{{ currentValue }} 装饰值</span></div>
                <p>每 100 装饰值增加 10% 积分，装饰加成最高 +50%；已穿戴装扮额外 +{{ Math.round(outfitScoreBonus * 100) }}%。</p>
                <div class="score-bonus-progress"><progress :value="Math.min(currentValue, 500)" max="500" /><span>{{ currentValue }} / 500 装饰值</span></div>
                <small>结算积分 = 基础积分 × 倍率 · 每 40 积分兑换 1 音符</small>
                <div class="prepare-bonus"><button class="text-button" @click="navigate('world')">{{ weatherSongId ? imageryFor(activeWeatherSong(world)!.title).name + ' · 调整歌境 ↗' : '去布置歌境，提升倍率 ↗' }}</button><button v-if="game.equippedTheme && weather === 'clear'" class="text-button" @click="evening = !evening; reset()">{{ evening ? '星空夜景' : '白昼' }} ↗</button><button class="text-button" @click="navigate('warehouse')">人物装扮 ↗</button></div>
              </div>
              <button class="lime-btn start-race" :disabled="!ready || !!raceError" @click="start">
                <span><b>{{ raceError ? '地图加载失败' : ready ? '进入地图' : '正在准备地图…' }}</b></span><span class="start-arrow"><PhArrowRight :size="22" weight="bold" /></span>
              </button>
            </div>
          </div>
        </aside>
        <div class="race-stage" :class="{ playing: started || entering || result, entering, finished: !!result }">
          <div v-if="!started && !entering && !result" class="map-preview-heading"><div><h2>{{ selected.title }}</h2></div><span>歌境</span></div>
          <RaceCanvas
            :key="world + version + color + evening + weather + game.equippedVehicle + equippedOutfits.map(outfit => outfit.id).join(',')"
            ref="race"
            :world="world"
            :color="color"
            :base-speed="vehicleSpeed"
            :vehicle-model="vehicle?.song.vehicle_model"
            :skills="skillSlots"
            :outfits="equippedOutfits"
            :evening="evening"
            :weather="weather"
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
              <div class="life-status" :class="{ critical: state.health === 1 }" role="status" :aria-label="`剩余生命 ${state.health}，最多 3 点`">
                <small>剩余生命</small>
                <b class="life-count">{{ state.health }}<em> / 3</em></b>
                <span class="life-pips" aria-hidden="true"><i v-for="point in 3" :key="point" :class="{ lost: point > state.health }">♥</i></span>
              </div>
            </div>
            <div class="stage-progress">
              <span>第 {{ state.stage }} 关</span
              ><progress :value="state.distance % 500" max="500" /><span
                >{{ 500 - (state.distance % 500) }} m</span
              >
            </div>
            <div class="race-difficulty" aria-label="当前关卡难度">
              <span>速度 <b>+{{ raceDifficulty(state.distance).speedBonus }} m/s</b></span>
              <span>障碍密度 <b>{{ Math.round(raceDifficulty(state.distance).obstacleSteps.length / 12 * 100) }}%</b></span>
              <span>{{ state.stage >= 6 ? '最高难度' : '每 500 米提升' }}</span>
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
                <div><dt>积分加成 · ×{{ result.multiplier.toFixed(2) }}</dt><dd>+{{ result.score - result.baseScore }}</dd></div>
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
        >
        <WeatherPicker :model-value="weatherSongId" :cards="ownedWeather" @update:model-value="chooseWeather" />
        <small aria-live="polite">已摆放 {{ decorations }} 件 · {{ worldSaveStatus }}</small>
        <button v-if="cloud.status === 'offline'" @click="retrySave()">重新同步</button>
      </div>
      <div class="imagery-shelf">
        <button v-for="c in ownedDecorations" :key="c.id" :class="{ active: placement === c.id || weatherSongId === c.id }" :disabled="!imageryFor(c.song.title).weather && availableImagery(c.id) < 1" @click="chooseDecoration(c)"><img :src="artPath(c.art)" alt=""/><span><b>{{ imageryFor(c.song.title).name }}</b><small>《{{ c.song.title }}》</small><em v-if="imageryFor(c.song.title).weather">{{ weatherSongId === c.id ? '当前已启用' : '已解锁天气' }} · 装饰值 +{{ imageryFor(c.song.title).value }}</em><em v-else>可用 {{ availableImagery(c.id) }} / {{ c.count }} · 装饰值 +{{ imageryFor(c.song.title).value }}</em></span></button>
        <p v-if="!ownedDecorations.length">开出一张装饰卡，就能把歌曲的意象放进世界。</p>
      </div>
      <p class="placement-hint">天气点击即可启用；实体装饰选择后点击地图摆放 · R 旋转 · Esc 取消。布置会同步到闯关。</p>
      <div class="mini-stage">
        <WorldCanvas
          ref="worldCanvas"
          :world="world"
          mode="overview"
          :evening="evening"
          :weather="weather"
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
    <dialog ref="help" class="exploration-help" aria-labelledby="exploration-help-title" @click="($event.target === help) && help?.close()">
      <header><span class="help-symbol"><PhGameController :size="25" weight="duotone" /></span><h2 id="exploration-help-title">玩法指南</h2><button aria-label="关闭玩法说明" @click="help?.close()"><PhX :size="20" /></button></header>
      <div class="help-content">
        <section><h3>操作</h3><div class="help-controls"><div><kbd>A</kbd><kbd>D</kbd><span>左右换道</span></div><div><kbd>Space</kbd><span>跳跃</span></div><div><kbd>S</kbd><span>减速</span></div><div><kbd>Esc</kbd><span>暂停</span></div><div><kbd>1</kbd><kbd>2</kbd><span>使用道具</span></div><div><b>触屏</b><span>屏幕按钮操作</span></div></div></section>
        <section><h3>得分与奖励</h3><div class="help-metrics"><span><b>1 米</b>1 积分</span><span><b>1 金币</b>50 积分</span><span><b>40 积分</b>1 音符</span></div><div class="help-rules"><span>初始 3 点生命，耗尽结束</span><span>每 500 米升级，速度与障碍递增</span><span>第 6 关达到最高难度</span><span>积分 × 装饰倍率，最高 ×1.50</span></div></section>
        <section><h3>旅途装备</h3><div class="help-rules"><span>2 个道具槽 · 每局各使用一次</span><span>复活信物自动发动</span><span>额外 3 张重复卡提升一级</span><span>载具和人物装扮永久解锁</span></div></section>
      </div>
      <footer><button @click="help?.close()">明白了<PhCheck :size="17" /></button></footer>
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
/* Exploration setup: album list on the left, live miniature and equipment on the right. */
.race-hud .life-status { min-width:78px;padding-left:16px;border-left:1px solid #cedbd1; }
.race-hud .life-count { color:#496c57;font-size:26px; }.life-count em { font-size:13px;color:#6d8375; }
.life-pips { display:flex;gap:6px;color:#619879;font-size:16px;line-height:1;margin-top:4px; }.life-pips i { font-style:normal; }.life-pips .lost { color:#cdd7d0; }
.race-hud .life-status.critical .life-count,.life-status.critical .life-pips { color:#b15e4c; }
.race-difficulty { position:absolute;top:172px;right:20px;display:flex;gap:14px;align-items:center;padding:10px 14px;border:1px solid #d6e3db;border-radius:8px;background:#f5faf6ee;color:#627d6b;font-size:11px; }
.race-difficulty b { color:#385943;font-weight:600; }
@media(max-width:700px) { .race-hud .life-status { padding-left:10px;min-width:64px; }.race-hud .life-count { font-size:22px; }.life-pips { font-size:13px; }.race-difficulty { top:140px;right:13px;gap:10px;font-size:10px; }.race-difficulty>span:last-child { display:none; } }
.race-page { max-width: 1400px; margin: auto; padding: 26px 36px; }
.race-page .race-topline { margin-bottom: 20px; }
.race-page .race-topline h1 { color: #34433b; font-size: 23px; font-weight: 600; }
.explore-subtitle { color: #89948d; font-size: 12px; margin-top: 7px; }
.race-page .race-layout { display: grid; grid-template-columns: 284px minmax(0, 1fr); grid-template-rows: auto auto; gap: 18px 24px; align-items: start; }
.race-page .race-layout.race-active { grid-template-columns: minmax(0, 1fr); }
.race-page .race-menu { display: contents; }
.explore-sidebar { grid-column: 1; grid-row: 1 / 3; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.race-map-choices { display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 18px 12px; background: #fff; border: 1px solid #e0e5e1; border-radius: 12px; }
.map-list-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 6px 12px; font-size: 13px; color: #40534a; }
.map-list-heading span { font-size: 10px; color: #8a948d; }
.race-map-choices .track-option { display: flex; align-items: center; gap: 13px; width: 100%; min-width: 0; margin: 0; padding: 12px 10px; background: transparent; border: 1px solid transparent; border-radius: 8px; text-align: left; transition: background 160ms ease, border-color 160ms ease; }
.race-map-choices .track-option:hover { background: #f5f7f5; }
.race-map-choices .track-option.active { background: #edf3ef; border-color: #c5d6cb; box-shadow: none; }
.race-map-choices .track-option img { width: 68px; height: 68px; object-fit: cover; border-radius: 5px; flex-shrink: 0; box-shadow: 0 3px 9px #253b2814; }
.race-map-choices .track-option > div { min-width: 0; }
.race-map-choices .track-option h3 { color: #35463a; font-size: 14px; font-weight: 600; }
.race-map-choices .track-option p { color: #6e7b73; font-size: 11px; margin-top: 7px; }
.race-map-choices .track-option small { display: block; font-size: 10px; color: #919a94; margin-top: 5px; line-height: 1.6; }
.race-page .race-stage { grid-column: 2; grid-row: 1; min-width: 0; min-height: 320px; height: clamp(320px, 47dvh, 500px); max-height: none; border: 1px solid #dde3db; border-radius: 12px; background: #e7ebde; }
.race-page .race-stage.playing { grid-column: 1; height: calc(100dvh - 200px); min-height: 460px; }
.map-preview-heading { position: absolute; top: 22px; left: 24px; right: 24px; z-index: 2; display: flex; align-items: start; justify-content: space-between; gap: 12px; pointer-events: none; color: #405345; }
.map-preview-heading h2 { font-size: 18px; font-weight: 600; }
.map-preview-heading p { font-size: 11px; color: #7b8779; margin-top: 7px; }
.map-preview-heading > span { font-size: 10px; padding: 6px 9px; border: 1px solid #ffffff8a; border-radius: 5px; background: #ffffff59; }
.race-prepare { grid-column: 2; grid-row: 2; min-width: 0; padding: 18px 20px; background: #fff; border: 1px solid #e0e5e1; border-radius: 12px; }
.prepare-equipment { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; }
.prepare-equipment h2 { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 600; color: #40534a; margin-bottom: 12px; }
.prepare-equipment h2 span { font-size: 10px; font-weight: 400; color: #909a94; }
.race-prepare :deep(.item-loadout) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0; }
.race-prepare :deep(.item-loadout > small) { display: none; }
.race-prepare :deep(.item-slot) { position: relative; min-width: 0; min-height: 108px; gap: 14px; background: #fcfcfa; border: 1px dashed #d9dfd8; border-radius: 12px; padding: 16px; transition: border-color .18s, background .18s, box-shadow .18s; }
.race-prepare :deep(.item-slot.equipped) { background: linear-gradient(120deg,#fdfbf3,#fff 75%); border: 1px solid #e7dfc9; }
.race-prepare :deep(.item-slot:hover) { border-color: #9bae9e; box-shadow: 0 4px 14px #334a3810; }
.race-prepare :deep(.item-slot .item-slot-art) { display: grid; place-items: center; flex: 0 0 56px; width: 56px; height: 56px; border-radius: 14px; color: #8b9b8e; background: #eef2ed; }
.race-prepare :deep(.item-slot.equipped .item-slot-art) { background: #f5edda; }
.race-prepare :deep(.item-slot img) { width: 48px; height: 48px; }
.race-prepare :deep(.item-slot .item-slot-copy) { display: grid; min-width: 0; gap: 6px; }
.race-prepare :deep(.item-slot b) { font-size: 14px; color: #3b4e40; }
.race-prepare :deep(.item-slot small) { font-size: 10px; line-height: 1.6; color: #869188; }
.race-prepare :deep(.item-slot .item-slot-label) { font-size: 9px; letter-spacing: .5px; color: #a09271; }
.race-prepare :deep(.item-slot em) { display: flex; align-items: center; gap: 3px; align-self: flex-start; white-space: nowrap; font-size: 10px; margin-left: auto; color: #738975; }
.prepare-vehicle { padding: 18px 12px 12px; border: 1px solid #e0e5e1; border-radius: 12px; background: #fff; }
.vehicle-model-card { position:relative;min-height:130px;overflow:hidden;border:1px solid #e3ece5;border-radius:10px;background:#f6faf7; }
.vehicle-model-card :deep(.vehicle-preview) { height:168px; }
.vehicle-speed { position:absolute;right:10px;top:10px;z-index:1;font-size:10px;color:#64836c;background:#ffffffbd;border:1px solid #dde9e0;border-radius:5px;padding:4px 7px; }
.vehicle-picker-wrap { margin-top:10px; flex-shrink:0; }
.vehicle-hint { display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:10px;font-size:10px;color:#84968a; }.vehicle-hint button { display:flex;align-items:center;gap:4px;padding:4px 6px;color:#4d785c;background:#eaf3ed;border-radius:5px;white-space:nowrap; }
.prepare-footer { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #edf0ed; }
.score-bonus { flex: 1; min-width: 0; }.score-bonus-heading { display: flex; align-items: center; gap: 12px; color: #40534a; font-size: 12px; }.score-bonus-heading strong { font-size: 30px; letter-spacing: -1px; font-weight: 600; color: #3e684c; }.bonus-percent { font-size: 11px; padding: 4px 7px; background: #eaf2ec; color: #5e8268; border-radius: 5px; }
.score-bonus p { font-size: 11px; color: #728176; line-height: 1.8; margin-top: 6px; }.score-bonus > small { display: block; font-size: 10px; color: #89958c; line-height: 1.7; }
.score-bonus-progress { display: flex; align-items: center; gap: 12px; margin: 10px 0; font-size: 10px; color: #86948a; }.score-bonus-progress progress { width: 135px; height: 5px; accent-color: #7ea289; border: 0; border-radius: 5px; overflow: hidden; background: #edf1ed; }.score-bonus-progress progress::-webkit-progress-bar { background: #edf1ed; }.score-bonus-progress progress::-webkit-progress-value { background: #7ea289; border-radius: 5px; }
.prepare-bonus { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 8px; color: #849087; font-size: 10px; }
.prepare-bonus .text-button { font-size: 10px; padding: 4px 0; color: #58755e; }
.race-prepare .start-race { display: flex; align-items: center; justify-content: space-between; gap: 22px; width: auto; flex-shrink: 0; min-width: 216px; min-height: 78px; margin: 0; padding: 16px 18px 16px 22px; background: #3e5b46; color: #fff; border: 1px solid #3e5b46; border-radius: 12px; box-shadow: 0 5px 14px #3e5b4618; text-align: left; transition: background .18s, transform .18s; }
.start-race > span:first-child { display: grid; gap: 8px; }.start-race b { font-size: 15px; font-weight: 600; }.start-race small { font-size: 10px; font-weight: 400; color: #c7d7ca; }.start-arrow { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: #ffffff14; border: 1px solid #ffffff20; }
.race-prepare .start-race:hover:not(:disabled) { background: #314e39; transform: translateY(-1px); }.race-prepare .start-race:disabled { background: #eff2ee; border-color: #e1e6df; box-shadow: none; color: #8e9b90; }.start-race:disabled small { color: #9ba79d; }
.race-map-choices .track-option:focus-visible, .race-prepare :deep(.item-slot:focus-visible), .start-race:focus-visible { outline: 2px solid #6c9b80; outline-offset: 3px; }
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
/* Compact desktop preparation fits inside the viewport. */
@media(min-width:701px) {
  .race-page { height:calc(100dvh - 78px); min-height:550px; padding:16px 36px; display:flex; flex-direction:column; }
  .play-app:has(.save-notice) .race-page { height:calc(100dvh - 115px); }
  .race-page .race-topline { margin-bottom:12px; min-height:36px; flex-shrink:0; }
  .race-page .race-layout { flex:1; min-height:0; grid-template-rows:minmax(220px,1fr) 216px; gap:12px 20px; }
  .race-page .race-layout.race-active { grid-template-rows:minmax(0,1fr); }
  .race-page .race-stage,.race-page .race-stage.playing { height:100%;min-height:0; }
  .explore-sidebar { height:100%;min-height:0;gap:12px; }
  .race-map-choices { padding:14px 10px;gap:5px;flex:1;min-height:0;overflow-y:auto; }
  .map-list-heading { padding-bottom:8px; }
  .race-map-choices .track-option { padding:10px;gap:12px;flex:1;min-height:74px; }
  .race-map-choices .track-option img { width:clamp(52px,7dvh,68px);height:clamp(52px,7dvh,68px); }
  .race-map-choices .track-option p { margin-top:5px; }
  .prepare-vehicle { display:flex;flex-direction:column;min-height:0;padding:12px 10px;flex-shrink:0;margin-top:auto; }
  .vehicle-model-card { flex:0 0 auto;height:clamp(132px,21dvh,170px);min-height:0; }
  .vehicle-model-card :deep(.vehicle-preview) { height:100%; }

  .vehicle-hint { flex-shrink:0; }
  .race-prepare { height:100%;padding:12px 16px; }
  .prepare-equipment h2 { margin-bottom:8px; }
  .race-prepare :deep(.item-slot) { min-height:64px;padding:9px 12px;gap:10px;border-radius:9px; }
  .race-prepare :deep(.item-slot .item-slot-art) { flex-basis:40px;width:40px;height:40px;border-radius:10px; }
  .race-prepare :deep(.item-slot img) { width:36px;height:36px; }
  .race-prepare :deep(.item-slot .item-slot-copy) { gap:4px; }
  .race-prepare :deep(.item-slot .item-slot-copy > small:last-child) { display:none; }
  .prepare-footer { margin-top:10px;padding-top:9px;gap:16px; }
  .score-bonus-heading strong { font-size:24px; }
  .score-bonus p { margin-top:3px;font-size:10px; }
  .score-bonus-progress { display:none; }
  .score-bonus > small { display:none; }
  .prepare-bonus { margin-top:2px; }
  .race-prepare .start-race { min-height:54px;min-width:190px;padding:10px 16px;border-radius:10px; }
}
.exploration-guide { display:flex;align-items:center;gap:8px;min-height:36px;padding:8px 13px;border:1px solid #d6e3db;border-radius:9px;background:#eff5f1;color:#52715e;font-size:12px; }.exploration-guide:hover{background:#e4efe7}.exploration-guide:focus-visible{outline:2px solid #6c9b80;outline-offset:3px}
.exploration-help { width:min(560px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;padding:0;border:1px solid #dce7df;border-radius:18px;background:#fcfefd;color:#354b3e;box-shadow:0 24px 90px #213a2b30; }
.exploration-help::backdrop { background:#253d3155;backdrop-filter:blur(5px); }
.exploration-help header { display:flex;align-items:center;gap:12px;padding:20px 24px;border-bottom:1px solid #e6eee8; }.help-symbol{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#e6f1e9;color:#5b8568}.exploration-help h2{font-size:19px;font-weight:600}.exploration-help header button{display:grid;place-items:center;margin-left:auto;width:34px;height:34px;border-radius:8px;color:#7b8e81}.exploration-help header button:hover{background:#edf3ee}
.help-content { padding:20px 24px;display:grid;gap:22px; }.help-content h3{font-size:12px;font-weight:600;margin-bottom:12px;color:#65816d}.help-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.help-controls>div{display:flex;align-items:center;gap:6px;padding:9px 10px;min-height:44px;background:#f1f6f2;border:1px solid #e2ebe4;border-radius:8px;font-size:11px}.help-controls span{margin-left:auto}.help-controls kbd{min-width:25px;padding:5px 7px;border:1px solid #d4e0d7;border-bottom-width:3px;background:#fff;border-radius:5px;font:inherit;text-align:center}.help-controls b{font-size:11px;font-weight:500}.help-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.help-metrics span{display:grid;gap:8px;padding:13px;text-align:center;background:#eaf3ed;border-radius:9px;font-size:11px;color:#718c7b}.help-metrics b{font-size:16px;font-weight:600;color:#42674e}.help-rules{display:flex;flex-wrap:wrap;gap:8px}.help-rules span{padding:7px 10px;background:#f4f7f4;border:1px solid #e1eae3;border-radius:6px;font-size:11px;color:#627c6b}.exploration-help footer{padding:14px 24px;border-top:1px solid #e6eee8;display:flex;justify-content:flex-end}.exploration-help footer button{display:flex;align-items:center;gap:16px;padding:11px 20px;border-radius:9px;background:#456b56;color:#fff;font-size:12px}
@media(max-width: 1050px) {
  .race-page { padding: 24px; }
  .race-page .race-layout { grid-template-columns: 240px minmax(0, 1fr); gap: 16px; }
  .race-map-choices .track-option { gap: 10px; padding: 10px 7px; }
  .race-map-choices .track-option img { width: 56px; height: 56px; }

}
@media(max-width: 700px) {
  .race-page { padding: 22px 16px; }
  .race-page .race-layout { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .explore-sidebar { display: contents; }
  .prepare-vehicle { grid-column: 1; grid-row: 3; }

  .race-map-choices { grid-column: 1; grid-row: 1; flex-direction: row; overflow-x: auto; padding: 10px; gap: 8px; }
  .map-list-heading { display: none; }
  .race-map-choices .track-option { flex: 0 0 172px; width: 172px; gap: 9px; }
  .race-map-choices .track-option img { width: 50px; height: 50px; }
  .race-map-choices .track-option h3 { font-size: 12px; }
  .race-map-choices .track-option small { display: none; }
  .race-page .race-stage { grid-column: 1; grid-row: 2; height: 340px; }
  .race-prepare { grid-column: 1; grid-row: 4; padding: 16px; }
  .race-prepare :deep(.item-loadout) { grid-template-columns: 1fr; }
  .map-preview-heading { left: 16px; right: 16px; top: 16px; }
  .map-preview-heading h2 { font-size: 16px; }
  .map-preview-heading > span { display: block; }
  .prepare-footer { align-items: flex-start; flex-direction: column; }
  .race-prepare .start-race { width: 100%; }
  .race-page .race-stage.playing { grid-row: 1; min-height: 430px; height: calc(100dvh - 190px); }
  .race-page .result-overlay { padding: 14px; }
}
</style>
