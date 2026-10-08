<script setup lang="ts">
import { computed, ref } from 'vue'
import SongCard from './SongCard.vue'
import { catalog, game, cardFor, KIND_NAMES, ownedCount, persist, type GameCard } from '@/game/save'
const emit = defineEmits<{ equip: [GameCard]; decorate: [] }>()
const query = ref(''),
  filter = ref('all'),
  ownedOnly = ref(false),
  selected = ref<GameCard | null>(null)
const cards = computed(() =>
  catalog.songs
    .map((s) => cardFor(s))
    .filter(
      (c) =>
        (!ownedOnly.value || c.count > 0) &&
        (filter.value === 'all' || c.kind === filter.value) &&
        `${c.song.title} ${c.song.artists.map((a) => a.name).join(' ')}`.includes(query.value),
    ),
)
function use(c: GameCard) {
  if (!c.count) return
  if (c.kind === 'item' || c.kind === 'vehicle' || c.kind === 'map') emit('equip', c)
  else if (c.kind === 'decoration') emit('decorate')
  selected.value = null
  persist()
}
</script>
<template>
  <section class="warehouse-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">SONGSPACE / COLLECTION</p>
        <h1>
          我的歌曲仓库 <span>{{ ownedCount }}<small>/100</small></span>
        </h1>
        <p>拥有的歌亮起来，还没遇见的歌等你拆开。</p>
      </div>
      <label class="owned-toggle"><input type="checkbox" v-model="ownedOnly" />只看已拥有</label>
    </div>
    <div class="warehouse-tools">
      <div class="filter-tabs">
        <button
          v-for="(label, key) in {
            all: '全部',
            decoration: '装饰',
            item: '道具',
            vehicle: '载具',
            map: '地图',
          }"
          :key="key"
          :class="{ active: filter === key }"
          @click="filter = key"
        >
          {{ label }}
        </button>
      </div>
      <input
        v-model="query"
        type="search"
        placeholder="搜索歌曲 / 歌手"
        aria-label="搜索仓库歌曲"
      />
    </div>
    <div v-if="!cards.length" class="collection-empty">这里还没有歌曲，去开一包吧。</div>
    <div class="collection-grid">
      <button
        v-for="card in cards"
        :key="card.id"
        class="collection-card"
        :class="[card.rarity, { unowned: !card.count }]"
        @click="selected = card"
        :aria-label="`${card.song.title}，${card.count ? '已拥有 ' + card.count + ' 张' : '未获得'}`"
      >
        <SongCard :card="card" />
      </button>
    </div>
  </section>
  <div
    v-if="selected"
    class="card-detail-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="卡片详情"
    @click.self="selected = null"
  >
    <article class="card-detail" :class="selected.rarity">
      <button class="opening-close" aria-label="关闭卡片详情" @click="selected = null">×</button
      ><SongCard :card="selected" large />
      <div>
        <p class="eyebrow">
          {{ KIND_NAMES[selected.kind] }} ·
          {{
            selected.rarity === 'rainbow' ? '彩卡' : selected.rarity === 'gold' ? '金卡' : '普通卡'
          }}
        </p>
        <h2>{{ selected.song.title }}</h2>
        <p>{{ selected.song.artists.map((a) => a.name).join(' / ') }}</p>
        <p>{{ selected.effect }}</p>
        <p>
          {{
            selected.count
              ? `拥有 ${selected.count} 张 · 等级 ${1 + Math.floor((selected.count - 1) / 3)}`
              : '未获得 · 可以通过卡包收集'
          }}
        </p>
        <button v-if="selected.count" class="lime-btn" @click="use(selected)">
          {{
            selected.kind === 'map'
              ? '启用夜骑主题'
              : selected.kind === 'vehicle'
                ? '装备自行车'
                : selected.kind === 'item'
                  ? '装备助力道具'
                  : '去布置意象装饰'
          }}
        </button>
        <p v-if="selected.kind === 'map'">
          解锁主题灯光，可用于三张初始地图。太空地图仍为后续内容。
        </p>
        <a
          class="music-link"
          :href="selected.song.song_url"
          target="_blank"
          rel="noopener noreferrer"
          >去 QQ 音乐听 ↗</a
        >
      </div>
    </article>
  </div>
</template>
