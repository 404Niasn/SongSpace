export type OutfitSlot = 'back' | 'head' | 'accessory' | 'feet'
export type OutfitId = 'travel-backpack' | 'red-high-heels' | 'qinghua-token'
export interface OutfitDefinition {
  id: OutfitId
  name: string
  slot: OutfitSlot
  songTitle: string
  artist: string
  description: string
  scoreBonus: number
  preview: string
  decoration?: boolean
}
export const OUTFIT_SLOTS: Record<OutfitSlot, string> = {
  back: '背部',
  head: '头部',
  accessory: '配饰',
  feet: '足部',
}
// Add song mappings here; models live in worlds/outfitModels.ts.
export const OUTFITS: OutfitDefinition[] = [

  {
    id: 'travel-backpack',
    name: '旅途背包',
    slot: 'back',
    songTitle: '你的背包',
    artist: '陈奕迅',
    description: '把一首歌背在身后，陪你走下一段路。人物外观装扮。',
    scoreBonus: .10,
    preview: 'art/outfits/travel-backpack.svg',
  },
  {
    id: 'red-high-heels', name: '红色高跟鞋', slot: 'feet',
    songTitle: '红色高跟鞋', artist: '蔡健雅',
    description: '红色尖头高跟鞋，随人物双脚踩踏。',
    scoreBonus: .10, preview: 'art/outfits/red-high-heels.svg',
  },
  { id: 'qinghua-token', name: '青花信物', slot: 'accessory', songTitle: '青花', artist: '周传雄',
    description: '腰侧佩戴的青花玉佩，瓷釉纹样、编绳与流苏随人物出行。', scoreBonus: 0,
    preview: 'art/outfits/qinghua-token.svg', decoration: true },
]
export function outfitForSong(song: { title: string; artists: { name: string }[] }) {
  return OUTFITS.find(
    (outfit) =>
      outfit.songTitle === song.title &&
      song.artists.some((artist) => artist.name === outfit.artist),
  )
}
