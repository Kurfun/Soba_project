<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CaptchaBox from '../components/CaptchaBox.vue'
import { api, ApiError } from '../campus/api'
import { go, notify, signIn } from '../campus/store'
import { roleLabel } from '../campus/types'

const router = useRouter()

const account = ref('')
const password = ref('')
const captchaInput = ref('')
const error = ref('')
const captcha = ref<InstanceType<typeof CaptchaBox> | null>(null)

// "Existing identities" are a stand-in for real accounts until a backend exists.
const identities = computed(() => api.listUsers().filter((u) => u.role !== 'guest'))
const pickedId = ref<number | ''>('')

function enter(userId: number, welcome: string) {
  signIn(userId)
  go('board')
  notify(welcome)
  router.push('/app')
}

function resetCaptcha() {
  captchaInput.value = ''
  captcha.value?.refresh()
}

function submitLogin() {
  error.value = ''
  if (!account.value.trim() || !password.value) {
    error.value = '請輸入帳號與密碼'
    return
  }
  if (!captchaInput.value.trim()) {
    error.value = '請輸入驗證碼'
    return
  }
  if (!captcha.value?.verify(captchaInput.value)) {
    error.value = '驗證碼不正確，請再試一次'
    resetCaptcha()
    return
  }
  try {
    const user = api.login(account.value, password.value)
    enter(user.user_id, `歡迎回來，${user.display_name}`)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '登入失敗，請稍後再試'
    password.value = ''
    resetCaptcha()
  }
}

function guestLogin() {
  const user = api.guestLogin()
  enter(user.user_id, '已以訪客身分登入，可刊登漂流書櫃與失物招領')
}

function pickLogin() {
  const user = identities.value.find((u) => u.user_id === pickedId.value)
  if (!user) {
    error.value = '請先選擇一個身分'
    return
  }
  enter(user.user_id, `已以 ${user.display_name} 身分登入`)
}
</script>

<template>
  <div class="landing login-page">
    <div class="app-shell">
      <header class="topbar">
        <RouterLink class="brand" to="/" aria-label="回到北大漂流書櫃封面">
          <span class="brand-mark"><span></span><span></span><span></span></span>
          <span class="brand-copy"><b>北大漂流書櫃</b><small>CAMPUS CIRCULAR</small></span>
        </RouterLink>
        <nav class="top-links" aria-label="主要導覽">
          <RouterLink to="/">← 回到封面</RouterLink>
        </nav>
      </header>

      <main class="login-main">
        <section class="login-card" aria-labelledby="login-title">
          <div class="eyebrow"><span class="eyebrow-dot"></span> SIGN IN <span class="eyebrow-line"></span> 北大校園共享計畫</div>
          <h1 id="login-title">登入</h1>
          <p class="login-lead">登入後即可刊登、申請與管理你的分享。</p>

          <p v-if="error" class="login-error" role="alert">{{ error }}</p>

          <form class="login-form" novalidate @submit.prevent="submitLogin">
            <label>
              帳號
              <input v-model="account" type="text" autocomplete="username" placeholder="請輸入帳號" />
            </label>
            <label>
              密碼
              <input v-model="password" type="password" autocomplete="current-password" placeholder="請輸入密碼" />
            </label>
            <div class="field">
              <label for="captcha-input">驗證碼（不分大小寫）</label>
              <div class="captcha-row">
                <input id="captcha-input" v-model="captchaInput" type="text" autocomplete="off" maxlength="5" placeholder="請輸入圖中文字" />
                <CaptchaBox ref="captcha" />
              </div>
            </div>
            <button type="submit" class="button button-dark login-submit">登入 <span class="arrow">↗</span></button>
            <details class="demo-accounts">
              <summary>示範帳號（尚未串接後端）</summary>
              <p>alice / alice123　·　bob / bob123　·　admin / admin123</p>
            </details>
          </form>

          <div class="login-divider"><span>或</span></div>

          <div class="alt-login">
            <div class="alt-row">
              <button type="button" class="button button-light" @click="guestLogin">訪客登入</button>
              <p>訪客可刊登「漂流書櫃」與「失物招領」；好書交換與申請功能需以帳號登入。</p>
            </div>

            <div class="alt-row pick-row">
              <label>
                現有身分（示範用，免密碼）
                <select v-model="pickedId">
                  <option value="">請選擇身分…</option>
                  <option v-for="u in identities" :key="u.user_id" :value="u.user_id">
                    {{ u.display_name }}（{{ roleLabel(u.role) }}）
                  </option>
                </select>
              </label>
              <button type="button" class="button button-light" :disabled="pickedId === ''" @click="pickLogin">以此身分登入</button>
            </div>
          </div>

          <p class="demo-note">學生自製示範專案，非學校官方網站。帳號為示範用，請勿輸入真實密碼。</p>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.login-main { display: flex; justify-content: center; padding: 48px 0 72px; }
.login-card { width: 100%; max-width: 460px; background: #fff; border: 1px solid #e9e9ed; border-radius: 8px; padding: 36px 36px 32px; box-shadow: 0 10px 30px #26324a10; }
.login-card h1 { margin: 18px 0 6px; font-size: 30px; font-weight: 600; letter-spacing: -.03em; color: #26324a; }
.login-lead { margin: 0 0 20px; font-size: 13px; color: #788092; }
.login-error { margin: 0 0 14px; padding: 10px 12px; border-left: 3px solid #c9424b; background: #fdf0f0; color: #a3303a; font-size: 13px; border-radius: 2px; }

.login-form { display: grid; gap: 14px; }
.login-form .field { display: grid; gap: 6px; }
.login-form label, .login-form .field > label { display: grid; gap: 6px; font-size: 12px; font-weight: 600; color: #54617f; }
.login-form input, .alt-row select { height: 42px; padding: 0 12px; border: 1px solid #dfe1e7; border-radius: 4px; background: #fff; font: 14px inherit; color: #26324a; }
.login-form input:focus, .alt-row select:focus { outline: 2px solid #e6a52f; outline-offset: 1px; border-color: #e6a52f; }
.captcha-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.captcha-row input { flex: 1; min-width: 150px; letter-spacing: .2em; text-transform: uppercase; }
.login-submit { width: 100%; min-height: 46px; margin-top: 4px; font-size: 14px; }
.demo-accounts { font-size: 12px; color: #788092; }
.demo-accounts summary { cursor: pointer; }
.demo-accounts p { margin: 6px 0 0; }

.login-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0 18px; color: #a3a8b5; font-size: 12px; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: #e6e7eb; }

.alt-login { display: grid; gap: 18px; }
.alt-row { display: flex; align-items: center; gap: 14px; }
.alt-row p { margin: 0; font-size: 12px; line-height: 1.7; color: #788092; }
.alt-row .button { flex-shrink: 0; min-height: 40px; }
.pick-row { align-items: flex-end; }
.pick-row label { flex: 1; display: grid; gap: 6px; font-size: 12px; font-weight: 600; color: #54617f; }
.button:disabled { opacity: .45; cursor: not-allowed; }

@media (max-width: 520px) {
  .login-card { padding: 28px 20px 24px; }
  .alt-row { flex-direction: column; align-items: stretch; }
  .pick-row { align-items: stretch; }
}
</style>
