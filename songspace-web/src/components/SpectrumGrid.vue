<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { spectrumMotion } from '@/game/visual'
const props=defineProps<{ambient?:boolean;paused?:boolean}>()
const host=ref<HTMLElement>(),canvas=ref<HTMLCanvasElement>()
let frame=0,observer:ResizeObserver|undefined,w=0,h=0,mouseX=-1000,mouseY=-1000,px=-1000,py=-1000
const events=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
const rings:{x:number;y:number;at:number}[]=[]
onMounted(()=>{
  const ctx=canvas.value!.getContext('2d')!
  function resize(){const rect=host.value!.getBoundingClientRect();w=rect.width;h=rect.height;const dpr=Math.min(devicePixelRatio,1.5);canvas.value!.width=w*dpr;canvas.value!.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
  observer=new ResizeObserver(resize);observer.observe(host.value!);resize()
  window.addEventListener('pointermove',e=>{const r=host.value!.getBoundingClientRect();mouseX=e.clientX-r.left;mouseY=e.clientY-r.top},{signal:events.signal,passive:true})
  window.addEventListener('pointerdown',e=>{const r=host.value!.getBoundingClientRect();rings.push({x:e.clientX-r.left,y:e.clientY-r.top,at:performance.now()});if(rings.length>4)rings.shift()},{signal:events.signal,passive:true})
  const draw=(now:number)=>{
    frame=requestAnimationFrame(draw);if(document.hidden)return
    const paused = reduced || props.paused || !spectrumMotion.value
    ctx.clearRect(0,0,w,h);const step=props.ambient?36:24,size=step-5,t=paused?0:now/1000
    px+=(mouseX-px)*.12;py+=(mouseY-py)*.12
    for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){
      const near=paused?0:Math.exp(-Math.hypot(x-px,y-py)/100),col=Math.floor(x/step),row=Math.floor(y/step)
      const beat=Math.sin(t*2.2-col*.31)+Math.sin(t*1.5+col*.47)*.5
      const height=(.18+(beat+1.5)/5)*h,band=Math.max(0,1-Math.abs(y-h*.65)/Math.max(1,height))
      const right=Math.max(0,(x/w-.25)/.75)
      let power=(props.ambient?.012:band*right*.32)+near*(props.ambient?.18:.7)
      if(!paused)for(const ring of rings){const age=(now-ring.at)/1000;if(age<1.4)power+=Math.max(0,1-Math.abs(Math.hypot(x-ring.x,y-ring.y)-age*240)/35)*(1-age/1.4)*.55}
      power=Math.min(.9,power);const hue=(col*5+row*2+t*14)%140+170
      ctx.fillStyle=`hsla(${hue},75%,${props.ambient?75:64}%,${power})`;ctx.beginPath();ctx.roundRect(x-size/2,y-size/2,size,size,3);ctx.fill()
      if(!props.ambient){ctx.strokeStyle='rgba(86,102,139,.045)';ctx.lineWidth=.7;ctx.stroke()}
    }
  };frame=requestAnimationFrame(draw)
})
onBeforeUnmount(()=>{cancelAnimationFrame(frame);observer?.disconnect();events.abort()})
</script>
<template><div ref="host" class="spectrum-grid" :class="{ambient}" aria-hidden="true"><canvas ref="canvas" /></div></template>
