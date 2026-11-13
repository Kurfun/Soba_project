<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from './api'
import { state, go, currentUser, signIn, signOut } from './store'
import { roleLabel } from './types'
import ListingBoard from './components/ListingBoard.vue'
import ListingDetail from './components/ListingDetail.vue'
import ListingForm from './components/ListingForm.vue'
import MyRequests from './components/MyRequests.vue'

const router = useRouter()
// Demo accounts, plus the current guest (other guests' identities are not listed).
const users = computed(() => (state.userId, api.listUsers().filter((u) => u.role !== 'guest' || u.user_id === state.userId)))
const user = computed(() => (state.userId, currentUser()))
const isGuest = computed(() => user.value?.role === 'guest')

const crumb = computed(
  () => ({ board: '刊登列表', new: '我要刊登', mine: '我的申請', detail: '刊登詳情' })[state.view],
)

/** Demo helper: switch identity without signing out (no backend yet). */
function onUserChange(e: Event) {
  signIn(Number((e.target as HTMLSelectElement).value))
  go('board')
}

function logout() {
  signOut()
  router.push('/login')
}
</script>

<template>
  <div class="campus">
    <div class="utility">
      <div class="wrap">
        <span>
          <a class="back" href="/" @click.prevent="router.push('/')">← 返回封面</a>
          ｜學生自製示範專案，非學校官方網站
        </span>
        <label class="signin">
          目前身分：
          <select :value="state.userId ?? ''" aria-label="切換身分（示範用）" @change="onUserChange">
            <option v-for="u in users" :key="u.user_id" :value="u.user_id">
              {{ u.display_name }}（{{ roleLabel(u.role) }}）
            </option>
          </select>
          <button type="button" @click="logout">登出</button>
        </label>
      </div>
    </div>

    <header class="banner">
      <div class="wrap">
        <div class="brand" @click="go('board')">
          <span class="brand-mark" aria-hidden="true">書</span>
          <div>
            <h1>北大漂流書櫃</h1>
            <p>贈書．換書．失物招領</p>
          </div>
        </div>
      </div>
    </header>

    <nav class="mainnav" aria-label="主選單">
      <div class="wrap">
        <button :class="{ active: state.view === 'board' || state.view === 'detail' }" @click="go('board')">刊登列表</button>
        <button v-if="user" :class="{ active: state.view === 'new' }" @click="go('new')">我要刊登</button>
        <button v-if="user && !isGuest" :class="{ active: state.view === 'mine' }" @click="go('mine')">我的申請</button>
      </div>
    </nav>

    <div class="wrap crumbs">
      <a @click="go('board')">首頁</a> › <span>{{ crumb }}</span>
    </div>

    <main class="wrap">
      <p v-if="isGuest" class="msg ok">你目前以訪客身分瀏覽，可刊登漂流書櫃與失物招領；好書交換與申請功能需以帳號登入。</p>
      <p v-if="state.message" class="msg" :class="state.messageKind" role="status">{{ state.message }}</p>
      <ListingBoard v-if="state.view === 'board'" />
      <ListingForm v-else-if="state.view === 'new'" />
      <ListingDetail v-else-if="state.view === 'detail' && state.selectedId !== null" :id="state.selectedId" />
      <MyRequests v-else-if="state.view === 'mine'" />
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p>北大漂流書櫃｜學生自製示範專案，資料存在記憶體中，重新整理頁面會還原為範例資料。</p>
        <p>本站不處理金流與訊息，請於校內地點面交，並勿公開電話或 Email。</p>
      </div>
    </footer>
  </div>
</template>
