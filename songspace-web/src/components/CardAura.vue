<script setup lang="ts">
withDefaults(defineProps<{ rarity?: string }>(), { rarity: 'normal' })
// Fixed positions and timings keep the effect light and repeatable.
const points = [
  [-7, 18, .2, 5.8], [103, 28, 1.4, 6.6], [14, -5, 2.1, 5.4],
  [83, 104, .8, 6.1], [-9, 74, 3.1, 6.8], [107, 65, 1.9, 5.7],
  [62, -8, 3.8, 7.2], [29, 107, 2.6, 6.3],
]
</script>
<template>
  <span class="card-aura" :class="rarity" aria-hidden="true">
    <span class="aura-bloom" />
    <i v-for="(point, i) in points" :key="i" :style="{
      left: point[0] + '%', top: point[1] + '%',
      animationDelay: '-' + point[2] + 's', animationDuration: point[3] + 's',
    }" />
  </span>
</template>
<style scoped>
.card-aura{--light:155,194,212;position:absolute;inset:0;pointer-events:none;z-index:-1;border-radius:11px;overflow:visible}
.card-aura.gold{--light:230,187,71}.card-aura.rainbow{--light:172,160,224}
.aura-bloom{position:absolute;inset:-3px;border-radius:13px;box-shadow:0 0 14px rgba(var(--light),.48),0 0 34px rgba(var(--light),.28),0 0 62px rgba(var(--light),.13);background:rgba(var(--light),.07);animation:card-breathe 5s ease-in-out infinite}
i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgb(var(--light));box-shadow:0 0 3px #fff,0 0 7px rgba(var(--light),.95),0 0 13px rgba(var(--light),.5);animation:card-mote 6s ease-in-out infinite;opacity:0}
i:nth-of-type(3n){width:2px;height:2px}
@keyframes card-breathe{0%,100%{opacity:.72}50%{opacity:1}}
@keyframes card-mote{0%,100%{opacity:0;transform:translate3d(0,12px,0) scale(.5)}25%{opacity:.9}65%{opacity:.6}85%{opacity:0;transform:translate3d(5px,-20px,0) scale(1)}}
@media(prefers-reduced-motion:reduce){i{animation:none;opacity:.45}.aura-bloom{animation:none;box-shadow:0 0 16px rgba(var(--light),.4),0 0 32px rgba(var(--light),.2)}}
</style>
