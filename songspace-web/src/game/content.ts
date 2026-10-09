import { COMMENT_QUOTES } from './commentQuotes.ts'
export type SkillId = 'shield' | 'magnet' | 'revive' | 'courage' | 'tea' | 'freeze' | 'double' | 'rewind' | 'friend'
export type ImageryModel = 'garden' | 'pavilion' | 'fireworks' | 'lantern' | 'snow' | 'record'
export const ITEMS: Record<string, { id: SkillId; name: string; description: string; prose: string }> = {
  心墙: { id: 'shield', name: '心墙护盾', description: '抵挡一次碰撞；护盾持续到触发', prose: COMMENT_QUOTES["心墙"]!.excerpt },
  你要的全拿走: { id: 'magnet', name: '拾光磁铁', description: '吸取前方 12 米、相邻车道金币，持续 8 秒', prose: COMMENT_QUOTES["你要的全拿走"]!.excerpt },
  至少还有你: { id: 'revive', name: '守护信物', description: '自动复活一次，恢复 1 格生命并无敌 3 秒', prose: COMMENT_QUOTES["至少还有你"]!.excerpt },
  勇气: { id: 'courage', name: '勇气徽章', description: '冲刺并防撞 6 秒，速度增加 6 m/s', prose: COMMENT_QUOTES["勇气"]!.excerpt },
  茶汤: { id: 'tea', name: '回甘茶盏', description: '恢复 1 格生命；满生命时不消耗次数', prose: COMMENT_QUOTES["茶汤"]!.excerpt },
  冻结: { id: 'freeze', name: '冰晶沙漏', description: '冻结动态障碍 5 秒；仍需躲避静态障碍', prose: COMMENT_QUOTES["冻结"]!.excerpt },
  倒数: { id: 'double', name: '倒数计时器', description: '倒计时 3 秒后，金币收益翻倍 8 秒', prose: COMMENT_QUOTES["倒数"]!.excerpt },
  反方向的钟: { id: 'rewind', name: '倒转怀表', description: '回到 3 秒前，恢复当时生命、位置与金币', prose: COMMENT_QUOTES["反方向的钟"]!.excerpt },
  朋友: { id: 'friend', name: '友情助力', description: '伙伴助力加速 8 秒，速度增加 6 m/s', prose: COMMENT_QUOTES["朋友"]!.excerpt },
}
export interface ImageryContent { name: string; model: ImageryModel; value: number; prose: string }
const DECORATIONS: Record<string, ImageryContent> = {
  樱花草: { name: '春信花园', model: 'garden', value: 20, prose: '把没说完的话，交给下一次花开。' },
  夏夜最后的烟火: { name: '并肩观景台', model: 'fireworks', value: 50, prose: '烟火会散场，但有人陪你看过的夜，会在心里亮很久。' },
  认真的雪: { name: '旧街雪庭', model: 'snow', value: 35, prose: '雪落下来的时候，城市安静了，记忆却有了声音。' },
  青花: { name: '青花月灯', model: 'lantern', value: 30, prose: '把一段旧时光，藏进温润的蓝白之间。' },
  晴天: { name: '等风花园', model: 'garden', value: 25, prose: '青春里有些雨，下了很久；想起你时，仍像晴天。' },
  下一个天亮: { name: '天亮候亭', model: 'pavilion', value: 40, prose: '慢一点没关系，愿你等到的天亮，真的有光。' },
  我记得: { name: '记忆唱片亭', model: 'record', value: 40, prose: '有些相遇不需要记清日期，只要心里还留着回声。' },
  黄昏: { name: '暮色候亭', model: 'pavilion', value: 35, prose: '日落替一天合上书，也替明天留下一页。' },
  一样的月光: { name: '月下回声灯', model: 'lantern', value: 30, prose: '路走得不同，抬头时，仍能看见一样的月光。' },
}
export function imageryFor(title: string): ImageryContent {
  return DECORATIONS[title] || { name: '回声唱片亭', model: 'record', value: 20, prose: '让这首歌有一个停留的地方，也让赶路的人歇一歇。' }
}
export function skillLevel(copies: number) { return Math.min(5, 1 + Math.floor(Math.max(0, copies - 1) / 3)) }
export function itemDescription(title: string, level: number) {
  const id = ITEMS[title]!.id, up = Math.max(0, level - 1)
  if (id === 'magnet') return `吸取前方 12 米、相邻车道金币，持续 ${8 + up * 2} 秒`
  if (id === 'courage') return `冲刺并防撞 ${6 + up} 秒，速度增加 6 m/s`
  if (id === 'freeze') return `冻结动态障碍 ${5 + up} 秒；静态障碍仍需躲避`
  if (id === 'revive') return `自动复活一次，恢复 1 格生命并无敌 ${3 + up} 秒`
  if (id === 'double') return `倒计时 3 秒后，金币收益翻倍 ${8 + up * 2} 秒`
  if (id === 'friend') return `伙伴助力加速 ${8 + up * 2} 秒，速度增加 6 m/s`
  const safety = up ? `；额外防撞 ${up} 秒` : ''
  return ITEMS[title]!.description + safety
}
export function decorationMultiplier(value: number) { return 1 + Math.min(0.5, Math.max(0, value) / 1000) }
export function artPath(id: string) { return `${import.meta.env.BASE_URL}art/imagery/${id}.svg` }

