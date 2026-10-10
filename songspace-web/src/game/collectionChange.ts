import type { GameCard } from './save.ts'
import { imageryFor, skillLevel } from './content.ts'

export function collectionChange(card: GameCard, before: number) {
  const after = card.count
  if (card.kind === 'map') return before === 0 ? { title: '新的歌境已解锁', detail: `现在可以走进《${card.song.title}》的世界` } : { title: '已收入音乐收藏', detail: `《${card.song.title}》· 持有 ×${after}` }
  if (card.kind === 'outfit') return { title: before === 0 ? '新的装扮已解锁' : '已收入音乐收藏', detail: before === 0 ? `${card.outfit?.name || card.song.title} · 前往衣橱试穿` : `持有 ×${after}` }
  if (card.kind === 'decoration' && imageryFor(card.song.title).weather) return { title: before === 0 ? '新的天气已解锁' : '天气歌曲已收藏', detail: before === 0 ? `${card.effect.split(' · ')[0]} · 可在歌境中启用` : `持有 ×${after} · 天气效果已解锁` }
  if (card.kind === 'decoration') return { title: before === 0 ? '新的装饰已收藏' : '装饰收藏已增加', detail: `${card.effect.split(' · ')[0]} · 新增 ${after - before} 件` }
  if (card.kind === 'vehicle') {
    const bonus = (n: number) => Math.min(2, Math.floor(Math.max(0, n - 1) / 3))
    return { title: before === 0 ? '新的载具已解锁' : bonus(after) > bonus(before) ? '载具速度已提升' : '载具收藏已增加', detail: before === 0 ? '前往探索，换乘出发' : bonus(after) > bonus(before) ? `基础速度加成 +${bonus(after)} m/s` : `持有 ×${after}${bonus(after) < 2 ? ` · 再收集 ${1 + (bonus(after) + 1) * 3 - after} 张提升速度` : ' · 速度加成已满'}` }
  }
  const level = skillLevel(after)
  return { title: before === 0 ? '新的道具已解锁' : level > skillLevel(before) ? `道具升至 LV.${level}` : '道具收藏已增加', detail: before === 0 ? card.effect : `持有 ×${after} · ${level < 5 ? `再收集 ${1 + level * 3 - after} 张升至 LV.${level + 1}` : '已达最高等级'}` }
}
