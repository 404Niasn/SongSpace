import assert from 'node:assert/strict'
import { collectionChange } from '../src/game/collectionChange.ts'
const card = (kind, count, title='心墙') => ({kind,count,song:{title},effect:'测试效果 · 描述'})
assert.match(collectionChange(card('map',1,'富士山下'),0).title,/解锁/)
assert.doesNotMatch(collectionChange(card('map',2,'富士山下'),1).title,/解锁/)
assert.match(collectionChange(card('item',4),3).title,/LV.2/)
assert.match(collectionChange(card('item',3),2).detail,/再收集 1 张/)
assert.match(collectionChange(card('item',13),12).detail,/最高等级/)
assert.match(collectionChange(card('vehicle',7),6).title,/速度已提升/)
assert.match(collectionChange(card('decoration',3,'樱花草'),1).detail,/新增 2 件/)
assert.match(collectionChange(card('decoration',1,'认真的雪'),0).title,/天气已解锁/)
assert.doesNotMatch(collectionChange(card('decoration',2,'认真的雪'),1).detail,/新增.*件/)
console.log('PASS: collection messages reflect real unlocks, upgrade thresholds, repeated maps and weather')
