<script setup lang="ts">
import { computed, ref } from 'vue'
import AchievementBadge from './AchievementBadge.vue'
import { achievements, claimableAchievements, claimAchievement, PACKS } from '@/game/save'
const emit = defineEmits<{ packs: []; message: [text: string] }>()
const filter = ref('全部')
const filters = ['全部', '可领取', '探索', '收藏', '日常']
const completed = computed(() => achievements.value.filter((a) => a.unlocked).length)
const visible = computed(() =>
  achievements.value.filter(
    (a) =>
      filter.value === '全部' ||
      (filter.value === '可领取' ? a.unlocked && !a.claimed : a.category === filter.value),
  ),
)
function rewardName(id: string) {
  return PACKS.find((p) => p.id === id)!.title
}
function claim(id: string, reward: string) {
  if (claimAchievement(id))
    emit('message', `成就奖励已领取：${rewardName(reward)} ×1，去开歌曲包看看吧。`)
}
</script>

<template>
  <section class="achievement-room">
    <div class="achievement-heading">
      <div>
        <h1>成就</h1>
        <p>达成成就，领取卡包。</p>
      </div>
      <button class="outline-btn" @click="emit('packs')">去开歌曲包 ↗</button>
    </div>
    <div class="achievement-summary">
      <AchievementBadge icon="trophy" />
      <div>
        <span>我的成就</span
        ><strong
          >{{ completed }}<small> / {{ achievements.length }}</small></strong
        >
      </div>
      <div class="achievement-summary-copy">
        <b>{{
          claimableAchievements
            ? `${claimableAchievements} 份卡包奖励等你领取`
            : '下一枚勋章，藏在下一段旅程里'
        }}</b>
        <p>达成后永久点亮，每项奖励可领取一次。</p>
      </div>
    </div>
    <div class="filter-tabs achievement-filters" aria-label="成就筛选">
      <button
        v-for="label in filters"
        :key="label"
        :class="{ active: filter === label }"
        :aria-pressed="filter === label"
        @click="filter = label"
      >
        {{ label }}{{ label === '可领取' ? ` (${claimableAchievements})` : '' }}
      </button>
    </div>
    <div v-if="visible.length" class="achievement-grid">
      <article
        v-for="a in visible"
        :key="a.id"
        class="achievement-entry"
        :class="{ unlocked: a.unlocked, claimed: a.claimed }"
      >
        <div class="achievement-art">
          <AchievementBadge :icon="a.icon" :tone="a.category" :locked="!a.unlocked" /><span>{{
            a.category
          }}</span>
        </div>
        <div class="achievement-copy">
          <div class="achievement-title">
            <h2>{{ a.title }}</h2>
            <small>{{ a.claimed ? '已领取 ✓' : a.unlocked ? '已达成' : '未达成' }}</small>
          </div>
          <p>{{ a.description }}</p>
          <div class="achievement-progress">
            <progress
              :value="a.unlocked ? a.target : a.progress"
              :max="a.target"
              :aria-label="a.title + '进度'"
            /><span
              >{{ (a.unlocked ? a.target : a.progress).toLocaleString() }} /
              {{ a.target.toLocaleString() }}</span
            >
          </div>
          <div class="achievement-reward">
            <span>{{ rewardName(a.reward) }} <b>×1</b></span
            ><button
              class="lime-btn"
              :disabled="!a.unlocked || a.claimed"
              @click="claim(a.id, a.reward)"
            >
              {{ a.claimed ? '已领取' : a.unlocked ? '领取卡包' : '待解锁' }}
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="achievement-empty">
      <AchievementBadge icon="spark" />
      <h2>奖励都收好了</h2>
      <p>继续探索、收藏或猜歌，点亮下一枚勋章。</p>
      <button class="outline-btn" @click="filter = '全部'">查看全部成就</button>
    </div>
    <p class="achievement-save-note">
      成就进度自动保存。
    </p>
  </section>
</template>

<style scoped>
.achievement-room {
  max-width: 1400px;
  margin: auto;
  padding: 32px 40px 44px;
  color: #29364d;
}
.achievement-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.achievement-heading h1 {
  font-size: 28px;
  letter-spacing: -0.8px;
}
.achievement-heading p {
  font-size: 13px;
  color: #61728b;
  margin-top: 10px;
}
.achievement-summary {
  display: flex;
  align-items: center;
  gap: 25px;
  padding: 20px 32px;
  background: linear-gradient(110deg, #f0f8f6, #f2f5fc 60%, #fff);
  border: 1px solid #d3dfeb;
  border-radius: 14px;
  margin-bottom: 24px;
}
.achievement-summary > div > span {
  font-size: 12px;
  color: #61728b;
}
.achievement-summary strong {
  display: block;
  font-size: 42px;
  line-height: 1.3;
  letter-spacing: -1px;
}
.achievement-summary small {
  font-size: 18px;
  color: #677992;
  font-weight: 400;
}
.achievement-summary-copy {
  margin-left: 35px;
}
.achievement-summary-copy b {
  font-size: 16px;
}
.achievement-summary-copy p {
  font-size: 12px;
  color: #61728b;
  margin-top: 10px;
}
.achievement-filters {
  display: flex;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 22px;
  flex-wrap: wrap;
}
.achievement-filters button {
  padding: 10px 18px;
  font-size: 12px;
}
.achievement-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.achievement-entry {
  display: flex;
  gap: 22px;
  padding: 24px;
  background: #ffffffd9;
  border: 1px solid #dce3ed;
  border-radius: 12px;
  min-width: 0;
}
.achievement-entry.unlocked {
  border-color: #b7ccdc;
  background: #fff;
  box-shadow: 0 6px 22px #7b93b011;
}
.achievement-entry.claimed {
  box-shadow: none;
}
.achievement-art {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}
.achievement-art > span {
  font-size: 10px;
  color: #63748c;
}
.achievement-copy {
  flex: 1;
  min-width: 0;
}
.achievement-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.achievement-title h2 {
  font-size: 17px;
  font-weight: 650;
}
.achievement-title small {
  font-size: 10px;
  color: #61728b;
  white-space: nowrap;
}
.unlocked:not(.claimed) .achievement-title small {
  color: #287266;
}
.achievement-copy > p {
  font-size: 12px;
  color: #61728b;
  margin-top: 8px;
  line-height: 1.6;
}
.achievement-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 17px 0;
}
.achievement-progress progress {
  width: 100%;
  height: 5px;
  border: 0;
  border-radius: 4px;
  overflow: hidden;
}
.achievement-progress > span {
  font-size: 10px;
  color: #61728b;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.achievement-reward {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.achievement-reward > span {
  font-size: 11px;
  color: #4c607c;
}
.achievement-reward b {
  margin-left: 4px;
}
.achievement-reward button {
  font-size: 11px;
  padding: 9px 13px;
  white-space: nowrap;
}
.achievement-reward button:disabled {
  color: #67758b;
  background: #edf1f6;
  border-color: #dce3ed;
  opacity: 1;
  box-shadow: none;
  cursor: default;
}
.achievement-save-note {
  font-size: 11px;
  line-height: 1.7;
  color: #64748b;
  margin-top: 24px;
}
.achievement-empty {
  text-align: center;
  padding: 36px 20px;
  background: #fff;
  border: 1px solid #dce3ed;
  border-radius: 12px;
}
.achievement-empty h2 {
  font-size: 20px;
  margin: 15px 0 10px;
}
.achievement-empty p {
  font-size: 13px;
  color: #61728b;
  margin-bottom: 20px;
}
@media (max-width: 1100px) {
  .achievement-entry {
    gap: 14px;
    padding: 20px;
  }
  .achievement-art :deep(svg) {
    width: 80px;
    height: 90px;
  }
  .achievement-title {
    align-items: start;
    flex-direction: column;
    gap: 5px;
  }
}
@media (max-width: 750px) {
  .achievement-room {
    padding: 24px 20px;
  }
  .achievement-grid {
    grid-template-columns: 1fr;
  }
  .achievement-heading h1 {
    font-size: 23px;
  }
  .achievement-heading {
    align-items: start;
    flex-direction: column;
    gap: 15px;
  }
  .achievement-summary {
    gap: 15px;
    padding: 18px;
    flex-wrap: wrap;
  }
  .achievement-summary-copy {
    margin-left: 0;
    flex-basis: 100%;
  }
  .achievement-summary :deep(svg) {
    width: 75px;
    height: 84px;
  }
  .achievement-title {
    flex-direction: row;
  }
  .achievement-filters button {
    padding: 10px 12px;
  }
  .achievement-entry {
    padding: 20px 16px;
  }
  .achievement-reward > span {
    font-size: 10px;
  }
}
</style>
