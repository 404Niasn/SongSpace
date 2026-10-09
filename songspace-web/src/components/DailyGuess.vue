<script setup lang="ts">
import { computed, ref } from 'vue'
import { game, today, persist } from '@/game/save'
const emit = defineEmits<{ packs: []; message: [string] }>()
const questions = [
  {
    title: '挪威的森林',
    artist: '伍佰',
    theme: 'forest',
    hint: '把秘密留给树木，把回忆留给远方。',
  },
  { title: '大海', artist: '张雨生', theme: 'sea', hint: '想念随浪潮涌来，远方仍是一片蓝。' },
  { title: '江南', artist: '林俊杰', theme: 'jiangnan', hint: '烟雨、石桥，还有长长的青石板街。' },
]
const question = questions[Number(today().replaceAll('-', '')) % 3]!
if (game.challengeDay !== today()) {
  game.challengeDay = today()
  game.challengeAttempts = []
  game.challengeWon = false
  persist()
}
const answer = ref(''),
  finished = computed(() => game.challengeWon || game.challengeAttempts.length >= 6)
function guess() {
  if (finished.value || !answer.value.trim()) return
  const a = answer.value.trim().replace(/[《》\s]/g, '')
  game.challengeAttempts.push(a)
  answer.value = ''
  if (a === question.title) {
    game.challengeWon = true
    game.challengeWins++
    const attempts = game.challengeAttempts.length
    const pack = attempts === 1 ? 'five' : attempts <= 3 ? 'triple' : 'single'
    game.packs[pack] = (game.packs[pack] || 0) + 1
    emit(
      'message',
      `猜对了！${attempts === 1 ? '五连' : attempts <= 3 ? '三连' : '单抽'}歌曲卡包已到账。`,
    )
  }
  persist()
}
</script>
<template>
  <section class="guess-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">DAILY / GUESS THE SONG</p>
        <h1>今天，听见哪一首？</h1>
        <p>看意象猜歌，每天六次机会。越早猜中，卡包越大。</p>
      </div>
      <span class="guess-date">{{ today() }}</span>
    </div>
    <div class="guess-layout">
      <div
        class="guess-art"
        :class="question.theme"
        role="img"
        :aria-label="
          question.theme === 'forest'
            ? '卡通森林'
            : question.theme === 'sea'
              ? '卡通海面与灯塔'
              : '卡通水乡石桥'
        "
      >
        <div class="art-sun" />
        <div class="art-water" />
        <template v-if="question.theme === 'forest'"
          ><div
            v-for="i in 7"
            :key="i"
            class="art-pine"
            :style="{
              left: 8 + i * 11 + '%',
              bottom: 25 + (i % 2) * 12 + '%',
              transform: 'scale(' + (0.6 + (i % 3) * 0.2) + ')',
            }" /></template
        ><template v-else-if="question.theme === 'sea'"
          ><div class="art-lighthouse" />
          <div class="art-sail" />
          <div class="art-wave" /></template
        ><template v-else
          ><div
            v-for="i in 3"
            :key="i"
            class="art-house"
            :style="{ left: 8 + i * 22 + '%', bottom: 40 + (i % 2) * 6 + '%' }" />
          <div class="art-bridge" /></template
        ><span>SONGSPACE / DAILY PICTURE</span>
      </div>
      <div class="guess-play">
        <p class="eyebrow">今日提示</p>
        <h2>{{ question.hint }}</h2>
        <p v-if="game.challengeAttempts.length >= 2">歌手：{{ question.artist }}</p>
        <p v-if="game.challengeAttempts.length >= 4">歌名有 {{ question.title.length }} 个字</p>
        <div class="guess-slots">
          <span
            v-for="i in 6"
            :key="i"
            :class="{
              filled: game.challengeAttempts[i - 1],
              correct: game.challengeAttempts[i - 1] === question.title,
            }"
            >{{ game.challengeAttempts[i - 1] || String(i).padStart(2, '0') }}</span
          >
        </div>
        <form v-if="!finished" @submit.prevent="guess">
          <input
            v-model="answer"
            placeholder="输入完整歌名"
            aria-label="猜歌答案"
            maxlength="40"
            required
          /><button class="lime-btn">猜一首 →</button>
        </form>
        <div v-else class="guess-finished">
          <h3>
            {{
              game.challengeWon
                ? '猜中了！歌曲卡包已到账'
                : '今天的答案是《' + question.title + '》'
            }}
          </h3>
          <p>明天还有一张新的意象。</p>
          <button class="lime-btn" @click="emit('packs')">去开歌曲包 →</button>
        </div>
        <p class="guess-rewards">第 1 次猜中：五连包<br />第 2–3 次：三连包 · 第 4–6 次：单抽包</p>
      </div>
    </div>
  </section>
</template>
