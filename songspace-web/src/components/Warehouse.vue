<script setup lang="ts">
import { computed, ref } from 'vue'
import SongCard from './SongCard.vue'
import CharacterWardrobe from './CharacterWardrobe.vue'
import { catalog, game, cardFor, KIND_NAMES, ownedCount, persist, equipOutfit, type GameCard } from '@/game/save'
import { artPath, imageryFor, skillLevel } from '@/game/content'
import { availableImagery, placedCount } from '@/game/imagery'
const emit = defineEmits<{ equip: [GameCard]; decorate: [GameCard]; message: [text: string] }>()
const section = ref<'songs' | 'outfits'>('songs')
const base = import.meta.env.BASE_URL
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
  if (c.outfit && equipOutfit(c.outfit.id)) {
    section.value = 'outfits'
    emit('message', `已穿戴${c.outfit.name}，进入探索即可看到。`)
  }
  if (c.kind === 'item' || c.kind === 'vehicle' || c.kind === 'map') emit('equip', c)
  else if (c.kind === 'decoration') emit('decorate', c)
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
          我的歌曲仓库 <span>{{ ownedCount }}<small>/{{ catalog.songs.length }}</small></span>
        </h1>
        <p>拥有的歌亮起来，还没遇见的歌等你拆开。</p>
      </div>
      <label v-if="section === 'songs'" class="owned-toggle"><input type="checkbox" v-model="ownedOnly" />只看已拥有</label>
    </div>
    <div class="filter-tabs wardrobe-sections" aria-label="仓库分类">
      <button :class="{ active: section === 'songs' }" :aria-pressed="section === 'songs'" @click="section = 'songs'">歌曲收藏</button>
      <button :class="{ active: section === 'outfits' }" :aria-pressed="section === 'outfits'" @click="section = 'outfits'">人物装扮</button>
    </div>
    <template v-if="section === 'songs'">
    <div class="warehouse-tools">
      <div class="filter-tabs">
        <button
          v-for="(label, key) in {
            all: '全部',
            decoration: '装饰',
            item: '道具',
            vehicle: '载具',
            map: '地图',
            outfit: '装扮',
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
    </template>
    <CharacterWardrobe v-else @message="emit('message', $event)" />
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
        <div v-if="selected.outfit" class="outfit-card-detail"><img :src="base + selected.outfit.preview" :alt="selected.outfit.name" /><p>{{ selected.outfit.description }}</p></div>
        <div v-if="selected.art" class="imagery-detail"><img :src="artPath(selected.art)" :alt="selected.effect"/><blockquote>{{ selected.prose }}</blockquote></div>
        <p>
          {{
            selected.count
              ? selected.outfit ? `拥有 ${selected.count} 张 · 装扮已解锁，穿戴不消耗卡片` : selected.kind === 'decoration' ? `总拥有 ${selected.count} 件 · 已摆放 ${placedCount(selected.id)} 件 · 可用 ${availableImagery(selected.id)} 件 · 每件装饰值 +${imageryFor(selected.song.title).value}` : `拥有 ${selected.count} 张 · 等级 ${skillLevel(selected.count)}`
              : '未获得 · 可以通过卡包收集'
          }}
        </p>
        <button v-if="selected.count" class="lime-btn" :disabled="selected.kind === 'decoration' && availableImagery(selected.id) < 1" @click="use(selected)">
          {{
            selected.outfit ? '穿戴这件装扮' : selected.kind === 'map'
              ? '启用夜间探索主题'
              : selected.kind === 'vehicle'
                ? '装备自行车'
                : selected.kind === 'item'
                  ? '携带这件道具'
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
<style scoped>
.wardrobe-sections{display:flex;width:fit-content;margin-bottom:20px}.wardrobe-sections button{padding:11px 20px;font-size:12px}.outfit-card-detail{display:flex;gap:12px;align-items:center;margin:16px 0}.outfit-card-detail img{width:95px;height:95px;border-radius:8px}.outfit-card-detail p{font-size:12px;line-height:1.7}
</style>
