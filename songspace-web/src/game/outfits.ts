export type OutfitSlot = 'back' | 'head' | 'accessory' | 'feet'
export type OutfitId = 'travel-backpack' | 'red-high-heels'
export interface OutfitDefinition {
  id: OutfitId
  name: string
  slot: OutfitSlot
  songTitle: string
  artist: string
  description: string
  scoreBonus: number
  preview: string
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
]
export function outfitForSong(song: { title: string; artists: { name: string }[] }) {
  return OUTFITS.find(
    (outfit) =>
      outfit.songTitle === song.title &&
      song.artists.some((artist) => artist.name === outfit.artist),
  )
}
