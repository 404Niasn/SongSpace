<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowRight } from '@phosphor-icons/vue'
import { restoreGame, startGame } from '@/game/cloud'

const router = useRouter()
const name = ref(''), gameId = ref(''), busy = ref(false), error = ref('')
const action = ref<'start' | 'restore'>('start')
async function submit(mode: 'start' | 'restore') {
  if (busy.value) return
  action.value = mode
  error.value = ''
  if (mode === 'start' && (name.value.trim().length < 2 || name.value.trim().length > 16)) { error.value = '昵称请输入 2-16 个字。'; return }
  if (mode === 'restore' && !gameId.value.trim()) { error.value = '请输入已有的账号 ID。'; return }
  busy.value = true
  try {
    if (mode === 'start') await startGame(name.value)
    else await restoreGame(gameId.value)
    await router.replace('/')
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'offline'
    error.value = reason === 'session' ? '没有找到这个账号 ID，请检查输入。'
      : reason === 'invalid-name' ? '昵称请输入 2-16 个字。'
      : reason === 'api-outdated' ? '服务器尚未更新注册功能，请稍后重试。'
      : reason === 'invalid-registration' ? '注册数据未通过校验，请刷新页面后重试。'
      : reason === 'invalid-id' ? '账号 ID 格式不正确，请检查输入。'
      : reason === 'offline' ? '暂时连接不上服务器，请稍后重试。'
      : reason === 'conflict' ? '存档有新版本，请先处理当前存档。' : reason
  } finally { busy.value = false }
}
</script>

<template>
  <main class="login-page">
    <header class="login-brand"><img class="login-logo" src="/brand/songspace-logo.webp" alt="歌境 Logo" width="44" height="44" /><b>歌境<small>SONGSPACE</small></b></header>
    <section class="login-layout">
      <div class="login-intro">
        <div class="login-art" aria-hidden="true"><img src="/art/imagery/garden.svg" alt="" /></div>
        <h1>让喜欢的歌，<br />成为你的世界。</h1>
      </div>
      <section class="login-form" aria-labelledby="login-title">
        <h2 id="login-title">欢迎来到歌境</h2>
        <p>取个昵称，系统会为你分配账号 ID。</p>
        <p class="register-rewards">注册礼包：500 音符 · 单抽包 ×3 · 三连包 ×1 · 载具包 ×1</p>
        <form @submit.prevent="submit('start')">
          <label for="register-name">昵称</label>
          <input id="register-name" v-model="name" @input="error = ''" maxlength="16" autocomplete="nickname" placeholder="给自己起个名字" :disabled="busy" aria-describedby="register-help" />
          <p id="register-help" class="login-hint">2–16 个字，可以重名。账号 ID 由系统自动生成。</p>
          <p v-if="error && action === 'start'" class="login-error" role="alert">{{ error }}</p>
          <button class="login-primary" :disabled="busy">{{ busy && action === 'start' ? '正在注册…' : '注册并进入' }}<PhArrowRight :size="19" /></button>
        </form>
        <form class="existing-account" @submit.prevent="submit('restore')">
          <h3>已有账号</h3>
          <label for="game-id">账号 ID</label>
          <input id="game-id" v-model="gameId" maxlength="80" autocomplete="off" spellcheck="false" placeholder="输入已有的账号 ID" :disabled="busy" />
          <p v-if="error && action === 'restore'" class="login-error" role="alert">{{ error }}</p>
          <button class="login-primary login-secondary" :disabled="busy">{{ busy && action === 'restore' ? '正在登录…' : '登录' }}<PhArrowRight :size="19" /></button>
        </form>
        <p class="login-hint">记住 ID，请勿分享。</p>
      </section>
    </section>
    <footer>SONGSPACE / 收藏音乐，走进它的世界。</footer>
  </main>
</template>

<style scoped>
.login-page { --surface:#fff; --ink:#34443b; --muted:#64746b; --line:#dce3df; --accent:#456b56; min-height:100dvh; background:#f7f9f7; color:var(--ink); display:flex; flex-direction:column; padding:30px clamp(24px,6vw,88px); }
.login-brand { display:flex; align-items:center; gap:12px; color:var(--accent); }
.login-logo { display:block; width:44px; height:44px; object-fit:contain; flex-shrink:0; }
.login-brand b { font-size:20px; font-weight:600; }.login-brand small { display:block; font-size:9px; letter-spacing:2px; margin-top:3px; }
.login-layout { width:min(100%,960px); margin:auto; display:grid; grid-template-columns:1fr 390px; gap:80px; align-items:center; padding:20px 0; }
.login-intro h1 { font-size:clamp(28px,3.2vw,40px); line-height:1.45; font-weight:550; letter-spacing:-1px; }.login-intro>p { color:var(--muted); font-size:14px; margin-top:15px; line-height:1.8; }
.login-art { width:230px; height:200px; margin:0 0 26px; }.login-art img { width:100%; height:100%; object-fit:contain; }
.login-form { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:26px; box-shadow:0 12px 50px #344e3c06; }
.login-form h2 { font-size:24px; font-weight:600; }.login-form>p { color:var(--muted); font-size:13px; line-height:1.7; margin-top:10px; }
.login-form .register-rewards { padding:10px 12px; border:1px solid var(--line); border-radius:8px; color:var(--accent); font-size:12px; }
.existing-account { border-top:1px solid var(--line); margin-top:20px; padding-top:18px; }.existing-account h3 { font-size:15px; font-weight:550; }.existing-account .login-primary { margin-top:16px; }
.login-form label { display:block; font-size:13px; font-weight:550; margin:16px 0 9px; }
.login-form input { width:100%; min-width:0; min-height:46px; background:var(--surface); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:12px; font-size:14px; }.login-form input::placeholder { color:var(--muted); }.login-form input:focus { outline:2px solid var(--accent); outline-offset:2px; }
.login-form .login-hint { color:var(--muted); font-size:12px; line-height:1.7; margin:10px 0 14px; }
.login-primary { display:flex; align-items:center; justify-content:center; gap:18px; width:100%; min-height:46px; padding:12px; border-radius:8px; background:var(--accent); color:#fff; font-size:14px; font-weight:550; white-space:nowrap; }
.login-secondary { background:transparent; border:1px solid var(--accent); color:var(--accent); }
.login-form .login-error { font-size:13px; color:#a23535; line-height:1.7; margin:14px 0; }
.login-page footer { text-align:center; font-size:10px; color:var(--muted); letter-spacing:1px; padding:12px 0; }
@media(max-width:760px) { .login-page { padding:22px; }.login-layout { grid-template-columns:1fr; width:min(100%,390px); gap:28px; padding:32px 0; }.login-intro { text-align:center; }.login-art { display:none; }.login-intro h1 { font-size:26px; }.login-intro h1 br { display:none; }.login-intro>p { font-size:12px; margin-top:8px; }.login-form { padding:26px; } }
@media(prefers-color-scheme:dark) { .login-page { --surface:#202a24; --ink:#e2ebe4; --muted:#a9b8ae; --line:#48564d; --accent:#b7d2bd; background:#18211b; }.login-primary { background:#b7d2bd; color:#233c2c; }.login-secondary { background:transparent; color:var(--accent); }.login-form .login-error { color:#ffb7b0; } }
</style>
