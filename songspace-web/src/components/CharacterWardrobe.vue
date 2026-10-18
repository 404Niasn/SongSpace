<script setup lang="ts">
import { computed, ref } from 'vue'
import CharacterPreview from './CharacterPreview.vue'
import { wardrobe, equippedOutfits, outfitScoreBonus, equipOutfit, unequipOutfit } from '@/game/save'
import { OUTFIT_SLOTS, type OutfitSlot } from '@/game/outfits'
const emit = defineEmits<{ message: [text: string] }>()
import { coverPath } from '@/game/coverAssets'
const filter = ref<'all' | OutfitSlot>('all')
const selectedId = ref('travel-backpack')
const items = computed(() => wardrobe.value.filter(item => filter.value === 'all' || item.slot === filter.value))
const selected = computed(() => items.value.find(item => item.id === selectedId.value) || items.value[0])
const emptySlots = computed(() => Math.max(0, 18 - items.value.length))
const ownedCount = computed(() => wardrobe.value.filter((outfit) => outfit.owned).length)
function wear(id: string) {
  if (equipOutfit(id)) emit('message', '装扮已穿戴，进入探索即可看到。')
}
function remove(slot: OutfitSlot) {
  if (unequipOutfit(slot)) emit('message', '装扮已卸下，仍保留在衣橱中。')
}
</script>

<template>
  <div class="character-wardrobe">
    <aside class="outfit-profile">
      <div class="outfit-profile-heading">
        <h2>我的人物</h2>
        <span>穿戴积分 +{{ Math.round(outfitScoreBonus * 100) }}%</span>
      </div>
      <CharacterPreview :outfits="equippedOutfits" />
      <div class="outfit-slots">
        <div v-for="(label, slot) in OUTFIT_SLOTS" :key="slot">
          <span>{{ label }}</span
          ><b>{{ equippedOutfits.find((outfit) => outfit.slot === slot)?.name || '未穿戴' }}</b>
        </div>
      </div>
    </aside>
    <section class="outfit-inventory" aria-label="装扮物品栏">
      <header class="inventory-heading"><div><h2>装扮物品栏</h2><p>抽到对应歌曲卡即可解锁，穿戴不消耗卡片。</p></div><span>{{ ownedCount }} 件已拥有</span></header>
      <div class="inventory-tabs" aria-label="装扮部位">
        <button :aria-pressed="filter === 'all'" :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
        <button v-for="(label, slot) in OUTFIT_SLOTS" :key="slot" :aria-pressed="filter === slot" :class="{ active: filter === slot }" @click="filter = slot">{{ label }}</button>
      </div>
      <div class="inventory-grid" aria-label="装扽物品">
        <button v-for="item in items" :key="item.id" class="inventory-item" :class="{ selected: selected?.id === item.id, locked: !item.owned, equipped: item.equipped }" :aria-pressed="selected?.id === item.id" :aria-label="`${item.name}，${item.equipped ? '已穿戴' : item.owned ? '已拥有' : '未解锁'}`" @click="selectedId = item.id">
          <span class="item-state">{{ item.equipped ? '已穿戴' : item.owned ? '已拥有' : '未解锁' }}</span>
          <img :src="coverPath(item.preview)" :alt="item.name" />
          <span class="item-name">{{ item.name }}</span>
        </button>
        <div v-for="n in emptySlots" :key="'empty-' + n" class="inventory-empty-slot" aria-hidden="true"><span>＋</span></div>
      </div>
      <p v-if="!items.length" class="inventory-empty">这个部位暂时没有装扮。</p>
      <article v-if="selected" class="inventory-detail">
        <img :src="coverPath(selected.preview)" :alt="selected.name" />
        <div><span class="detail-slot">{{ OUTFIT_SLOTS[selected.slot] }}装扮 · 穿戴积分 +{{ Math.round(selected.scoreBonus * 100) }}%</span><h3>{{ selected.name }}</h3><p v-if="selected.lyric" class="detail-lyric">{{ selected.lyric }}</p><p class="detail-source">——《{{ selected.songTitle }}》 · {{ selected.artist }}</p></div>
        <button v-if="selected.equipped" class="lime-btn" @click="remove(selected.slot)">卸下</button>
        <button v-else class="lime-btn" :disabled="!selected.owned" @click="wear(selected.id)">{{ selected.owned ? '穿戴' : '未解锁' }}</button>
      </article>
      <p class="outfit-footnote">穿戴后增加探索积分，与地图装饰加成相加；不影响速度和技能。</p>
    </section>
  </div>
</template>

<style scoped>
.inventory-detail .detail-lyric{white-space:normal}
.character-wardrobe {
  display: grid;
  grid-template-columns: minmax(300px, .85fr) minmax(0, 2fr);
  width: 100%;
  gap: 20px;
  margin: 14px auto 0;
  color: #35463f;
}
.outfit-profile {
  background: linear-gradient(145deg, #fcfdfb, #eef4ef);
  border: 1px solid #dce5de;
  border-radius: 12px;
  padding: 16px;
  --character-stage-height: clamp(340px, 29vw, 410px);
}
.outfit-profile-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.outfit-profile h2,
.inventory-heading h2 {
  font-size: 18px;
}
.outfit-profile-heading span {
  font-size: 11px;
  color: #4b6555;
}
.outfit-slots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  margin-top: 10px;
}
.outfit-slots > div {
  display: grid;
  grid-template-rows: 16px 18px;
  align-content: start;
  justify-items: center;
  gap: 2px;
  padding-top: 8px;
  border-top: 1px solid #dce5de;
  font-size: 11px;
  line-height: 16px;
}
.outfit-slots span { color: #47604f; }
.outfit-slots b {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #263e32;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}
.outfit-inventory{min-width:0;background:#fcfdfb;border:1px solid #dce5de;border-radius:12px;padding:24px;align-self:stretch}
.inventory-heading{display:flex;justify-content:space-between;align-items:start;gap:12px}.inventory-heading h2{font-size:18px;margin:0}.inventory-heading p{font-size:12px;line-height:1.8;color:#4b6555;margin:8px 0 0}.inventory-heading>span{font-size:11px;color:#4b6555;white-space:nowrap;padding-top:4px}
.inventory-tabs{display:flex;gap:6px;margin:8px 0}.inventory-tabs button{font-size:12px;padding:6px 14px;border:1px solid transparent;border-radius:7px;background:transparent;color:#4b6555;cursor:pointer}.inventory-tabs button.active{background:#e4eeea;color:#365d51;border-color:#c5d8ce}
.inventory-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
.inventory-item,.inventory-empty-slot{height:108px;border:1px solid #dce4eb;border-radius:9px;background:#fff;min-width:0}.inventory-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px 4px;cursor:pointer}.inventory-item img{width:52px;height:52px;object-fit:contain}.inventory-item.locked img{filter:grayscale(.8);opacity:.65}.inventory-item.selected{border-color:#7b9f90;box-shadow:0 0 0 2px #c7dcd2;background:#f0f7f3}.inventory-item:hover{border-color:#8fa99e}.inventory-item:focus-visible,.inventory-tabs button:focus-visible{outline:2px solid #668c80;outline-offset:3px}.item-name{font-size:12px;color:#2e463a;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.item-state{position:absolute;right:5px;top:3px;font-size:10px;color:#577260}.equipped .item-state{color:#3c7860}.inventory-empty-slot{display:grid;place-items:center;background:#f3f6f3;border-style:dashed;border-color:#dfe5eb}.inventory-empty-slot span{font-size:17px;color:#d4dce3;font-weight:300}.inventory-empty{font-size:12px;color:#4b6555;text-align:center;margin:16px 0}
.inventory-detail{display:flex;align-items:center;gap:16px;padding-top:20px;margin-top:22px;border-top:1px solid #dce4eb}.inventory-detail>img{width:68px;height:68px;object-fit:contain;flex-shrink:0}.inventory-detail>div{flex:1;min-width:0}.detail-slot{font-size:10px;color:#416a54}.inventory-detail h3{font-size:16px;margin:4px 0 6px}.inventory-detail p{font-size:11px;color:#4b6555;line-height:1.7;margin:0}.inventory-detail .detail-source{margin-top:5px}.inventory-detail>button{font-size:12px;padding:9px 16px;flex-shrink:0}.inventory-detail>button:disabled{background:#edf1f6;color:#67758b;border-color:#dce3ed;box-shadow:none;opacity:1}.outfit-footnote{font-size:11px;color:#4b6555;line-height:1.8;margin:18px 0 0}
@media(min-width:701px){.inventory-detail{gap:12px;padding-top:8px;margin-top:8px}.inventory-detail>img{width:48px;height:48px}.outfit-footnote{margin-top:12px}}
@media(max-width:850px){.inventory-item,.inventory-empty-slot{height:86px}.inventory-item img{width:40px;height:40px}.outfit-profile{--character-stage-height:330px}.character-wardrobe{grid-template-columns:300px minmax(0,1fr);gap:16px}.outfit-inventory{padding:18px}.inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.inventory-tabs{gap:0}.inventory-tabs button{padding:8px 12px}.inventory-heading{display:block}.inventory-heading>span{display:block;margin-top:8px}.inventory-detail{flex-wrap:wrap}.inventory-detail>button{margin-left:auto}}
@media(max-width:700px){.character-wardrobe{grid-template-columns:1fr}.outfit-profile{padding:20px}.inventory-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.inventory-heading{display:flex}.inventory-heading>span{margin-top:0}.inventory-detail>img{width:54px;height:54px}}
</style>
