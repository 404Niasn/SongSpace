import { computed, reactive } from 'vue'
import { ITEMS, imageryFor, itemDescription, skillLevel } from './content.ts'
import { COMMENT_QUOTES, type CommentQuote } from './commentQuotes.ts'
import {
  OUTFITS,
  OUTFIT_SLOTS,
  outfitForSong,
  type OutfitDefinition,
  type OutfitId,
  type OutfitSlot,
} from './outfits.ts'
export interface Song {
  id: string
  rank: number
  title: string
  artists: { name: string }[]
  album: string
  duration_seconds: number
  song_url: string
  cover_path: string
}
export type CardKind = 'decoration' | 'item' | 'vehicle' | 'map' | 'outfit'
export interface GameCard {
  id: string
  song: Song
  kind: CardKind
  rarity: 'normal' | 'gold' | 'rainbow'
  effect: string
  count: number
  prose: string
  commentQuote?: CommentQuote
  art: string
  isNew?: boolean
  outfit?: OutfitDefinition
}
interface Save {
  name: string
  notes: number
  owned: Record<string, number>
  packs: Record<string, number>
  daily: string
  best: number
  runs: number
  pity: number
  history: { score: number; distance: number; coins: number; notes: number; map: string }[]
  equippedTheme: string
  equippedVehicle: string
  equippedItem: string
  equippedItems: string[]
  equippedOutfits: Partial<Record<OutfitSlot, OutfitId>>
  challengeAttempts: string[]
  challengeWon: boolean
  challengeDay: string
  openedPacks: number
  totalDistance: number
  dailyClaims: number
  challengeWins: number
  unlockedAchievements: string[]
  claimedAchievements: string[]
}
const fresh: Save = {
  name: '',
  notes: 120,
  owned: {},
  packs: { single: 0, triple: 0, five: 1, vehicle: 0, theme: 0 },
  daily: '',
  best: 0,
  runs: 0,
  pity: 0,
  history: [],
  equippedTheme: '',
  equippedVehicle: '',
  equippedItem: '',
  equippedItems: [],
  equippedOutfits: {},
  challengeAttempts: [],
  challengeWon: false,
  challengeDay: '',
  openedPacks: 0,
  totalDistance: 0,
  dailyClaims: 0,
  challengeWins: 0,
  unlockedAchievements: [],
  claimedAchievements: [],
}
const defaults: Save = JSON.parse(JSON.stringify(fresh))
let saved: Partial<Save> = {}
try {
  saved = JSON.parse(localStorage.getItem('songspace.game.v1') || '{}')
} catch {
  /* fall back to a fresh local save */
}
export const game = reactive<Save>({
  ...fresh,
  ...saved,
  owned: saved.owned || {},
  packs: { ...fresh.packs, ...saved.packs },
  history: saved.history || [],
  equippedOutfits:
    saved.equippedOutfits && typeof saved.equippedOutfits === 'object'
      ? { ...saved.equippedOutfits }
      : {},
  equippedItems: Array.isArray(saved.equippedItems)
    ? saved.equippedItems.slice(0, 2)
    : saved.equippedItem
      ? [saved.equippedItem]
      : [],
  totalDistance:
    saved.totalDistance ?? (saved.history || []).reduce((sum, run) => sum + run.distance, 0),
  dailyClaims: saved.dailyClaims ?? (saved.daily ? 1 : 0),
  challengeWins: saved.challengeWins ?? (saved.challengeWon ? 1 : 0),
  unlockedAchievements: Array.isArray(saved.unlockedAchievements) ? saved.unlockedAchievements : [],
  claimedAchievements: Array.isArray(saved.claimedAchievements) ? saved.claimedAchievements : [],
})
export const catalog = reactive<{ songs: Song[]; error: string }>({ songs: [], error: '' })
export function replaceGame(state: Partial<Save>) {
  Object.assign(game, JSON.parse(JSON.stringify(defaults)), state)
  game.packs = { ...defaults.packs, ...state.packs }
}
export function freshGame(): Save { return JSON.parse(JSON.stringify(defaults)) }
export function persist() {
  syncAchievements()
  try {
    localStorage.setItem('songspace.game.v1', JSON.stringify(game))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('songspace:save'))
  } catch {
    catalog.error = '浏览器无法保存，进度仅保留到本次页面关闭。'
  }
}
export function today() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
}
export async function loadCatalog() {
  if (catalog.songs.length) return
  try {
    const r = await fetch(import.meta.env.BASE_URL + 'catalog/qqmusic-hot-100.json')
    if (!r.ok) throw Error()
    const data = await r.json()
    if (!Array.isArray(data.songs) || !data.songs.length) throw Error()
    catalog.songs = data.songs
  } catch {
    catalog.error = '卡库载入失败，请刷新后重试。'
  }
}
export function kindFor(song: Song): CardKind {
  if (outfitForSong(song)) return 'outfit'
  if (ITEMS[song.title]) return 'item'
  if ([25, 48, 54].includes(song.rank)) return 'map'
  if (song.rank % 8 === 0) return 'vehicle'
  return 'decoration'
}
export function cardFor(song: Song, rarity?: GameCard['rarity']): GameCard {
  const kind = kindFor(song)
  const copies = game.owned[song.id] || 0
  const upgrade = Math.max(0, Math.floor((copies - 1) / 3))
  const content = ITEMS[song.title]
  const decoration = imageryFor(song.title)
  const outfit = outfitForSong(song)
  return {
    id: song.id,
    song,
    kind,
    rarity: rarity || (kind === 'map' ? 'rainbow' : kind === 'item' ? 'gold' : 'normal'),
    effect: outfit
      ? outfit.name + ' · 人物装扮 · ' + OUTFIT_SLOTS[outfit.slot]
      : kind === 'map'
        ? '夜间探索主题 · 星空与暮色'
        : kind === 'vehicle'
          ? '巡航自行车 · ' + (14 + (song.rank % 3) + Math.min(2, upgrade)) + ' m/s'
          : kind === 'item'
            ? content!.name +
              ' · ' +
              itemDescription(song.title, skillLevel(copies)) +
              ' · LV.' +
              skillLevel(copies)
            : decoration.name + ' · 装饰值 +' + decoration.value,
    count: game.owned[song.id] || 0,
    prose: outfit
      ? outfit.description
      : kind === 'item'
        ? content!.prose
        : kind === 'decoration'
          ? decoration.prose
          : '把一首歌收藏起来，让下一段路有了新的颜色。',
    art: kind === 'item' ? content!.id : kind === 'decoration' ? decoration.model : '',
    commentQuote: kind === 'item' ? COMMENT_QUOTES[song.title] : undefined,
    outfit,
  }
}
export const KIND_NAMES = {
  decoration: '装饰卡',
  item: '道具卡',
  vehicle: '载具卡',
  map: '地图卡',
  outfit: '装扮卡',
}
// Owning any matching song card unlocks the outfit without consuming the card.
export const wardrobe = computed(() =>
  OUTFITS.map((outfit) => {
    const owned = catalog.songs.some(
      (song) => outfitForSong(song)?.id === outfit.id && (game.owned[song.id] || 0) > 0,
    )
    return { ...outfit, owned, equipped: owned && game.equippedOutfits[outfit.slot] === outfit.id }
  }),
)
export const equippedOutfits = computed(() =>
  wardrobe.value.filter((outfit) => outfit.owned && outfit.equipped),
)
export function equipOutfit(id: string) {
  const outfit = wardrobe.value.find((outfit) => outfit.id === id && outfit.owned)
  if (!outfit) return false
  game.equippedOutfits[outfit.slot] = outfit.id
  persist()
  return true
}
export function unequipOutfit(slot: OutfitSlot) {
  if (!game.equippedOutfits[slot]) return false
  delete game.equippedOutfits[slot]
  persist()
  return true
}
export const PACKS = [
  { id: 'single', title: '歌曲单抽包', count: 1, price: 60, tag: '一首歌，一份惊喜', tone: 'mint' },
  { id: 'triple', title: '歌曲三连包', count: 3, price: 150, tag: '三张歌曲收藏', tone: 'blue' },
  {
    id: 'five',
    title: '歌曲五连包',
    count: 5,
    price: 240,
    tag: '至少一张金卡或彩卡',
    tone: 'gold',
  },
  {
    id: 'vehicle',
    title: '载具歌单包',
    count: 1,
    price: 120,
    tag: '新配色 · 更快的巡航速度',
    tone: 'blue',
  },
  {
    id: 'theme',
    title: '世界主题包',
    count: 1,
    price: 180,
    tag: '彩卡 · 解锁夜间探索主题',
    tone: 'rainbow',
  },
] as const
export function buyPack(id: string) {
  if (id === 'five' || id === 'theme') return false
  const p = PACKS.find((p) => p.id === id)
  if (!p || game.notes < p.price) return false
  game.notes -= p.price
  game.packs[id] = (game.packs[id] || 0) + 1
  persist()
  return true
}
export function openPack(id: string): GameCard[] {
  const pack = PACKS.find((p) => p.id === id)
  if (!pack || !catalog.songs.length || !game.packs[id]) return []
  game.packs[id]!--
  let pool = catalog.songs.filter((s) =>
    id === 'vehicle' ? kindFor(s) === 'vehicle' : id === 'theme' ? kindFor(s) === 'map' : true,
  )
  const result: GameCard[] = []
  for (let i = 0; i < pack.count; i++) {
    const songPack = !['vehicle', 'theme'].includes(id)
    if (songPack) game.pity++
    let song =
      pool[Math.floor((crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296) * pool.length)]!
    if (
      (id === 'five' && i === pack.count - 1 && !result.some((c) => c.rarity !== 'normal')) ||
      (songPack && game.pity >= 20)
    ) {
      const gold = catalog.songs.filter((s) => kindFor(s) === 'item')
      song = gold[Math.floor(Math.random() * gold.length)]!
    }
    const c = cardFor(song)
    c.isNew = !game.owned[song.id]
    game.owned[song.id] = (game.owned[song.id] || 0) + 1
    c.count = game.owned[song.id]!
    c.effect = cardFor(song).effect
    if (songPack && c.rarity !== 'normal') game.pity = 0
    result.push(c)
  }
  game.openedPacks++
  persist()
  return result
}
export function claimDaily() {
  if (game.daily === today()) return false
  game.daily = today()
  game.dailyClaims++
  game.notes += 50
  persist()
  return true
}
export const ownedCount = computed(
  () => Object.keys(game.owned).filter((k) => game.owned[k]! > 0).length,
)
export function settle(score: number, distance: number, coins: number, map: string) {
  const notes = Math.max(0, Math.floor(score / 40))
  game.notes += notes
  game.best = Math.max(game.best, score)
  game.runs++
  game.totalDistance += Math.max(0, Math.floor(distance))
  game.history.unshift({ score, distance: Math.floor(distance), coins, notes, map })
  game.history = game.history.slice(0, 10)
  persist()
  return notes
}

export type AchievementIcon =
  'wheel' | 'route' | 'trophy' | 'disc' | 'collection' | 'spark' | 'sun' | 'headphones'
export type AchievementCategory = '探索' | '收藏' | '日常'
export const ACHIEVEMENTS = [
  {
    id: 'first-ride',
    title: '第一段旋律',
    description: '完成 1 次探索结算',
    category: '探索',
    icon: 'wheel',
    target: 1,
    reward: 'single',
    metric: () => game.runs,
  },
  {
    id: 'ten-rides',
    title: '追风听众',
    description: '累计完成 10 次探索',
    category: '探索',
    icon: 'wheel',
    target: 10,
    reward: 'triple',
    metric: () => game.runs,
  },
  {
    id: 'long-road',
    title: '沿歌远行',
    description: '累计探索 10,000 米',
    category: '探索',
    icon: 'route',
    target: 10000,
    reward: 'five',
    metric: () => game.totalDistance,
  },
  {
    id: 'high-score',
    title: '高光时刻',
    description: '单局最高分达到 3,000',
    category: '探索',
    icon: 'trophy',
    target: 3000,
    reward: 'five',
    metric: () => game.best,
  },
  {
    id: 'first-collection',
    title: '初遇一首歌',
    description: '收藏 1 首不同歌曲',
    category: '收藏',
    icon: 'disc',
    target: 1,
    reward: 'single',
    metric: () => ownedCount.value,
  },
  {
    id: 'ten-songs',
    title: '私人歌单',
    description: '收藏 10 首不同歌曲',
    category: '收藏',
    icon: 'collection',
    target: 10,
    reward: 'triple',
    metric: () => ownedCount.value,
  },
  {
    id: 'thirty-songs',
    title: '唱片收藏家',
    description: '收藏 30 首不同歌曲',
    category: '收藏',
    icon: 'collection',
    target: 30,
    reward: 'five',
    metric: () => ownedCount.value,
  },
  {
    id: 'ten-packs',
    title: '惊喜拆封师',
    description: '累计开启 10 个卡包',
    category: '收藏',
    icon: 'spark',
    target: 10,
    reward: 'triple',
    metric: () => game.openedPacks,
  },
  {
    id: 'first-sign',
    title: '今日序曲',
    description: '领取 1 次每日签到补给',
    category: '日常',
    icon: 'sun',
    target: 1,
    reward: 'single',
    metric: () => game.dailyClaims,
  },
  {
    id: 'seven-signs',
    title: '音乐常伴',
    description: '累计签到 7 天，无需连续',
    category: '日常',
    icon: 'sun',
    target: 7,
    reward: 'triple',
    metric: () => game.dailyClaims,
  },
  {
    id: 'first-guess',
    title: '心有灵犀',
    description: '成功猜中 1 次每日歌曲',
    category: '日常',
    icon: 'headphones',
    target: 1,
    reward: 'triple',
    metric: () => game.challengeWins,
  },
  {
    id: 'five-guesses',
    title: '旋律知音',
    description: '累计猜中 5 次每日歌曲',
    category: '日常',
    icon: 'headphones',
    target: 5,
    reward: 'five',
    metric: () => game.challengeWins,
  },
] satisfies {
  id: string
  title: string
  description: string
  category: AchievementCategory
  icon: AchievementIcon
  target: number
  reward: string
  metric: () => number
}[]

export function syncAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    if (
      achievement.metric() >= achievement.target &&
      !game.unlockedAchievements.includes(achievement.id)
    ) {
      game.unlockedAchievements.push(achievement.id)
    }
  }
}
export const achievements = computed(() =>
  ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    progress: Math.min(achievement.target, Math.max(0, achievement.metric())),
    unlocked: game.unlockedAchievements.includes(achievement.id),
    claimed: game.claimedAchievements.includes(achievement.id),
  })),
)
export const claimableAchievements = computed(
  () => achievements.value.filter((a) => a.unlocked && !a.claimed).length,
)
export function claimAchievement(id: string) {
  syncAchievements()
  const achievement = ACHIEVEMENTS.find((a) => a.id === id)
  if (
    !achievement ||
    !game.unlockedAchievements.includes(id) ||
    game.claimedAchievements.includes(id)
  )
    return false
  game.claimedAchievements.push(id)
  game.packs[achievement.reward] = (game.packs[achievement.reward] || 0) + 1
  persist()
  return true
}
// Recover achievements supported by the existing local save.
syncAchievements()
