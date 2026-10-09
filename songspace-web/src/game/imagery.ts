import { reactive } from 'vue'
import { catalog, game, kindFor, persist } from './save.ts'
import { decorationMultiplier, imageryFor, type WeatherId } from './content.ts'
import type { WorldId } from '../worlds/types.ts'
export interface PlacedImagery { songId: string; x: number; z: number; rotation: number }
const ids: WorldId[] = ['forest', 'sea', 'jiangnan']
let stored: Partial<Record<WorldId, PlacedImagery[]>> = {}
try { stored = JSON.parse(localStorage.getItem('songspace.imagery.v2') || '{}') } catch { /* old save remains intact */ }
export const imagery = reactive<Record<WorldId, PlacedImagery[]>>({ forest: [], sea: [], jiangnan: [] })
for (const id of ids) imagery[id] = Array.isArray(stored?.[id]) ? stored[id]!.filter(p => p && typeof p.songId === 'string' && [p.x, p.z, p.rotation].every(Number.isFinite)).slice(0, 50) : []
export function placedCount(songId: string) { return ids.reduce((n, id) => n + imagery[id].filter(p => p.songId === songId).length, 0) }
export function availableImagery(songId: string) { return Math.max(0, (game.owned[songId] || 0) - placedCount(songId)) }
export function validPlacements(world: WorldId) {
  const seen: Record<string, number> = {}
  const valid: Record<WorldId, PlacedImagery[]> = { forest: [], sea: [], jiangnan: [] }
  for (const id of ids) for (const p of imagery[id]) {
    const song = catalog.songs.find(s => s.id === p.songId)
    if (!song || kindFor(song) !== 'decoration' || imageryFor(song.title).weather || (seen[p.songId] || 0) >= (game.owned[p.songId] || 0)) continue
    seen[p.songId] = (seen[p.songId] || 0) + 1
    valid[id].push(p)
  }
  return valid[world]
}
function save() {
  try { localStorage.setItem('songspace.imagery.v2', JSON.stringify(imagery)); if (typeof window !== 'undefined') window.dispatchEvent(new Event('songspace:save')); return true } catch { return false }
}
export function placeImagery(world: WorldId, p: PlacedImagery) {
  const song = catalog.songs.find(s => s.id === p.songId)
  if (!song || kindFor(song) !== 'decoration' || imageryFor(song.title).weather || availableImagery(p.songId) < 1 || imagery[world].length >= 50 || ![p.x, p.z, p.rotation].every(Number.isFinite)) return false
  imagery[world].push({ ...p })
  if (!save()) { imagery[world].pop(); return false }
  return true
}
export function undoImagery(world: WorldId) {
  const last = imagery[world].pop()
  if (!last) return false
  if (!save()) { imagery[world].push(last); return false }
  return true
}
export function worldValue(world: WorldId) {
  const weatherSong = activeWeatherSong(world)
  return validPlacements(world).reduce((n, p) => n + imageryFor(catalog.songs.find(s => s.id === p.songId)!.title).value, weatherSong ? imageryFor(weatherSong.title).value : 0)
}
export function worldMultiplier(world: WorldId) { return decorationMultiplier(worldValue(world)) }
export function activeWeatherSong(world: WorldId) {
  return catalog.songs.find(s => s.id === game.worldWeather[world] && game.owned[s.id] && kindFor(s) === 'decoration' && imageryFor(s.title).weather)
}
export function weatherForWorld(world: WorldId): WeatherId {
  const song = activeWeatherSong(world)
  return song ? imageryFor(song.title).weather! : 'clear'
}
export function setWorldWeather(world: WorldId, songId: string) {
  const song = catalog.songs.find(s => s.id === songId)
  if (songId && (!song || !game.owned[songId] || kindFor(song) !== 'decoration' || !imageryFor(song.title).weather)) return false
  game.worldWeather[world] = songId
  persist()
  return true
}
