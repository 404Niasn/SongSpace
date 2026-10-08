<script setup lang="ts">
import { computed } from 'vue'
import RaceCanvas from './RaceCanvas.vue'
import { game, ownedCount } from '@/game/save'
const emit = defineEmits<{
  enter: [page: 'race' | 'packs' | 'warehouse' | 'daily' | 'world' | 'records']
}>()
const pending = computed(() => Object.values(game.packs).reduce((a, b) => a + b, 0))
</script>
<template>
  <section class="game-hall">
    <div class="hall-intro">
      <span>SONGSPACE / PLAY YOUR MUSIC</span>
      <p>{{ game.name ? game.name + '，欢迎回来。' : '欢迎来到歌境。' }}</p>
    </div>
    <div class="hall-hero">
      <RaceCanvas world="sea" color="#58c6b4" :base-speed="13" :evening="false" />
      <div class="hall-shade" />
      <div class="hall-hero-copy">
        <small>把一首歌，变成一段旅程</small>
        <h1>好歌，<br />不止用来听。</h1>
        <p>骑进歌曲里的世界，收集沿途的音符。<br />拆开一包惊喜，把喜欢的歌留下来。</p>
        <button class="lime-btn" @click="emit('enter', 'race')">开始骑行闯关 <span>↗</span></button>
      </div>
      <div class="hall-scene-caption">
        <span>01 / 初始世界</span><b>《大海》</b><small>张雨生 · 海岸公路</small>
      </div>
    </div>
    <div class="hall-section-title">
      <h2>今天，想玩点什么？</h2>
      <span>你的音乐游乐场</span>
    </div>
    <div class="hall-entries">
      <button class="hall-entry entry-packs" @click="emit('enter', 'packs')">
        <div class="entry-symbol"><i /><i /><i /></div>
        <div>
          <small>OPEN A LITTLE SURPRISE</small>
          <h2>拆一包好歌 <span>↗</span></h2>
          <p>
            {{
              pending ? pending + ' 包待开启，惊喜已经等着你。' : '用音符换卡包，亲手撕开下一首。'
            }}
          </p>
          <b>{{ pending }} 包待拆</b>
        </div>
      </button>
      <button class="hall-entry entry-daily" @click="emit('enter', 'daily')">
        <div class="entry-symbol">?</div>
        <div>
          <small>DAILY MUSIC CHALLENGE</small>
          <h2>每日猜歌 <span>↗</span></h2>
          <p>看意象，猜歌名。一次猜对赢五连包。</p>
          <b>{{ game.challengeWon ? '今日已完成' : '今天的挑战' }}</b>
        </div>
      </button>
      <button class="hall-entry entry-collection" @click="emit('enter', 'warehouse')">
        <div class="entry-symbol">◎</div>
        <div>
          <small>YOUR MUSIC COLLECTION</small>
          <h2>我的歌曲仓库 <span>↗</span></h2>
          <p>收藏歌曲卡，装备载具与助力道具。</p>
          <b>{{ ownedCount }} / 100 已收藏</b>
        </div>
      </button>
    </div>
    <div class="hall-bottom">
      <div>
        <b>歌名，就是世界的名字。</b>
        <p>从《挪威的森林》《大海》《江南》出发。</p>
      </div>
      <button @click="emit('enter', 'world')">布置微缩世界 ↗</button
      ><button @click="emit('enter', 'records')">查看闯关记录 ↗</button>
    </div>
  </section>
</template>
