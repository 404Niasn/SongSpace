import { computed, reactive } from 'vue'
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
export type CardKind = 'decoration' | 'item' | 'vehicle' | 'map'
export interface GameCard {
  id: string
  song: Song
  kind: CardKind
  rarity: 'normal' | 'gold' | 'rainbow'
  effect: string
  count: number
  isNew?: boolean
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
  challengeAttempts: string[]
  challengeWon: boolean
  challengeDay: string
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
  challengeAttempts: [],
  challengeWon: false,
  challengeDay: '',
}
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
})
export const catalog = reactive<{ songs: Song[]; error: string }>({ songs: [], error: '' })
export function persist() {
  try {
    localStorage.setItem('songspace.game.v1', JSON.stringify(game))
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
    if (data.songs.length !== 100) throw Error()
    catalog.songs = data.songs
  } catch {
    catalog.error = '卡库载入失败，请刷新后重试。'
  }
}
export function kindFor(song: Song): CardKind {
  if ([25, 48, 54].includes(song.rank)) return 'map'
  if (song.rank % 8 === 0) return 'vehicle'
  if (song.rank % 5 === 0) return 'item'
  return 'decoration'
}
export function cardFor(song: Song, rarity?: GameCard['rarity']): GameCard {
  const kind = kindFor(song)
  const copies = game.owned[song.id] || 0
  const upgrade = Math.max(0, Math.floor((copies - 1) / 3))
  return {
    id: song.id,
    song,
    kind,
    rarity: rarity || (kind === 'map' ? 'rainbow' : kind === 'item' ? 'gold' : 'normal'),
    effect:
      kind === 'map'
        ? '夜骑主题 · 星空与暮色'
        : kind === 'vehicle'
          ? '巡航自行车 · ' + (14 + (song.rank % 3) + Math.min(2, upgrade)) + ' m/s'
          : kind === 'item'
            ? '友情助力 · 加速 ' + (8 + Math.min(12, upgrade * 2)) + ' 秒'
            : '意象装饰 · 花簇',
    count: game.owned[song.id] || 0,
  }
}
export const KIND_NAMES = { decoration: '装饰卡', item: '道具卡', vehicle: '载具卡', map: '地图卡' }
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
    tag: '彩卡 · 解锁夜骑主题',
    tone: 'rainbow',
  },
] as const
export function buyPack(id: string) {
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
  persist()
  return result
}
export function claimDaily() {
  if (game.daily === today()) return false
  game.daily = today()
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
  game.history.unshift({ score, distance: Math.floor(distance), coins, notes, map })
  game.history = game.history.slice(0, 10)
  persist()
  return notes
}
