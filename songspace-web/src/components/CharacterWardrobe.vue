<script setup lang="ts">
import { computed } from 'vue'
import { wardrobe, equippedOutfits, equipOutfit, unequipOutfit } from '@/game/save'
import { OUTFIT_SLOTS, type OutfitSlot } from '@/game/outfits'
const emit = defineEmits<{ message: [text: string] }>()
const base = import.meta.env.BASE_URL
const backpack = computed(() => equippedOutfits.value.find((outfit) => outfit.slot === 'back'))
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
        <span>{{ ownedCount }} 件装扮</span>
      </div>
      <figure class="outfit-character">
        <svg
          viewBox="0 0 220 260"
          role="img"
          :aria-label="backpack ? '人物已穿戴旅途背包，背面示意' : '未穿戴装扮的人物，背面示意'"
        >
          <ellipse cx="110" cy="238" rx="57" ry="8" fill="#dbe3eb" />
          <path
            d="m94 168-7 57m40-57 7 57"
            stroke="#cad3d9"
            stroke-width="20"
            stroke-linecap="round"
          />
          <path
            d="m86 98-21 66m70-66 21 66"
            stroke="#efe5d6"
            stroke-width="16"
            stroke-linecap="round"
          />
          <rect x="80" y="86" width="60" height="94" rx="25" fill="#f6f0e5" stroke="#d6d4cc" />
          <circle cx="110" cy="56" r="28" fill="#efe5d6" />
          <path d="M80 56a30 30 0 0 1 60 0Z" fill="#8cc8be" />
          <g v-if="backpack">
            <path d="M89 103v57m42-57v57" stroke="#637a70" stroke-width="6" />
            <rect x="86" y="101" width="48" height="64" rx="12" fill="#bd8966" stroke="#956a50" />
            <rect x="94" y="136" width="32" height="22" rx="5" fill="#ae7957" stroke="#956a50" />
            <path d="M98 140h24" stroke="#dfc2a2" stroke-width="2" />
            <rect x="106" y="113" width="8" height="5" rx="1" fill="#efdfba" />
          </g>
          <path d="M76 229h21m28 0h21" stroke="#516568" stroke-width="10" stroke-linecap="round" />
        </svg>
        <figcaption>背面示意 · 探索人物同步穿戴</figcaption>
      </figure>
      <div class="outfit-slots">
        <div v-for="(label, slot) in OUTFIT_SLOTS" :key="slot">
          <span>{{ label }}</span
          ><b>{{ equippedOutfits.find((outfit) => outfit.slot === slot)?.name || '未穿戴' }}</b>
          <button
            v-if="equippedOutfits.some((outfit) => outfit.slot === slot)"
            class="text-button"
            @click="remove(slot)"
          >
            卸下
          </button>
        </div>
      </div>
    </aside>
    <div class="outfit-collection">
      <div class="outfit-intro">
        <h2>歌曲衣橱</h2>
        <p>抽到对应歌曲卡，即可解锁装扮。穿戴不消耗卡片，每个部位可穿戴一件。</p>
      </div>
      <article
        v-for="outfit in wardrobe"
        :key="outfit.id"
        class="outfit-entry"
        :class="{ locked: !outfit.owned }"
      >
        <img :src="base + outfit.preview" :alt="outfit.name + '示意'" />
        <div>
          <span class="outfit-slot-label">{{ OUTFIT_SLOTS[outfit.slot] }}装扮</span>
          <h3>{{ outfit.name }}</h3>
          <p>{{ outfit.description }}</p>
          <p class="outfit-source">来源：《{{ outfit.songTitle }}》 · {{ outfit.artist }}</p>
          <div class="outfit-entry-action">
            <span>{{
              outfit.owned ? (outfit.equipped ? '正在穿戴' : '已解锁') : '抽到歌曲卡后解锁'
            }}</span
            ><button
              class="lime-btn"
              :disabled="!outfit.owned || outfit.equipped"
              @click="wear(outfit.id)"
            >
              {{ outfit.equipped ? '已穿戴' : outfit.owned ? '穿戴' : '未解锁' }}
            </button>
          </div>
        </div>
      </article>
      <p class="outfit-footnote">
        装扮仅改变人物外观，不影响速度、技能或积分。头部与配饰槽位已预留。
      </p>
    </div>
  </div>
</template>

<style scoped>
.character-wardrobe {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 24px;
  margin-top: 24px;
  color: #29364d;
}
.outfit-profile {
  background: linear-gradient(145deg, #f9fcff, #edf2f7);
  border: 1px solid #d5dfeb;
  border-radius: 12px;
  padding: 22px;
}
.outfit-profile-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.outfit-profile h2,
.outfit-intro h2 {
  font-size: 18px;
}
.outfit-profile-heading span {
  font-size: 11px;
  color: #61728b;
}
.outfit-character {
  margin: 12px 0 22px;
  text-align: center;
}
.outfit-character svg {
  width: 100%;
  max-width: 220px;
  height: 260px;
}
.outfit-character figcaption {
  font-size: 10px;
  color: #61728b;
}
.outfit-slots > div {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 45px;
  border-top: 1px solid #dbe3ed;
  font-size: 12px;
}
.outfit-slots span {
  color: #61728b;
}
.outfit-slots b {
  font-weight: 550;
}
.outfit-slots button {
  margin-left: auto;
  font-size: 11px;
}
.outfit-intro {
  margin: 4px 0 20px;
}
.outfit-intro p {
  font-size: 12px;
  line-height: 1.8;
  color: #61728b;
  margin-top: 10px;
}
.outfit-entry {
  display: flex;
  gap: 24px;
  padding: 22px;
  background: #fff;
  border: 1px solid #d5dfeb;
  border-radius: 12px;
}
.outfit-entry > img {
  width: 155px;
  height: 155px;
  object-fit: contain;
  border-radius: 8px;
}
.outfit-entry.locked > img {
  filter: grayscale(0.85);
  opacity: 0.65;
}
.outfit-entry > div {
  flex: 1;
  min-width: 0;
}
.outfit-slot-label {
  font-size: 10px;
  color: #637a70;
}
.outfit-entry h3 {
  font-size: 19px;
  margin: 8px 0;
}
.outfit-entry p {
  font-size: 12px;
  line-height: 1.7;
  color: #61728b;
}
.outfit-source {
  margin-top: 10px;
}
.outfit-entry-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 15px;
}
.outfit-entry-action > span {
  font-size: 11px;
  color: #4e6871;
}
.outfit-entry-action button {
  font-size: 12px;
  padding: 10px 20px;
}
.outfit-entry-action button:disabled {
  background: #edf1f6;
  color: #67758b;
  border-color: #dce3ed;
  opacity: 1;
  box-shadow: none;
}
.outfit-footnote {
  font-size: 11px;
  color: #61728b;
  line-height: 1.8;
  margin-top: 20px;
}
@media (max-width: 850px) {
  .character-wardrobe {
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 16px;
  }
  .outfit-entry {
    flex-direction: column;
    gap: 12px;
  }
  .outfit-entry > img {
    width: 100%;
    height: 150px;
  }
}
@media (max-width: 600px) {
  .character-wardrobe {
    grid-template-columns: 1fr;
  }
  .outfit-profile {
    padding: 20px;
  }
  .outfit-character svg {
    height: 210px;
  }
  .outfit-entry {
    flex-direction: row;
    padding: 16px;
    gap: 14px;
  }
  .outfit-entry > img {
    width: 100px;
    height: 120px;
  }
  .outfit-entry h3 {
    font-size: 17px;
  }
  .outfit-entry-action {
    flex-wrap: wrap;
  }
  .outfit-entry-action button {
    padding: 9px 17px;
  }
}
</style>
