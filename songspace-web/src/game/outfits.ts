export type OutfitSlot = 'back' | 'head' | 'accessory'
export type OutfitId = 'travel-backpack'
export interface OutfitDefinition {
  id: OutfitId
  name: string
  slot: OutfitSlot
  songTitle: string
  artist: string
  description: string
  preview: string
}
export const OUTFIT_SLOTS: Record<OutfitSlot, string> = {
  back: '背部',
  head: '头部',
  accessory: '配饰',
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
    preview: 'art/outfits/travel-backpack.svg',
  },
]
export function outfitForSong(song: { title: string; artists: { name: string }[] }) {
  return OUTFITS.find(
    (outfit) =>
      outfit.songTitle === song.title &&
      song.artists.some((artist) => artist.name === outfit.artist),
  )
}
