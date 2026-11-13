<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '../api'
import { attempt, currentUser, go, notify, state } from '../store'
import {
  TYPE_LABEL,
  conditionLabel,
  doneStatus,
  locationLabel,
  requestNoteLabel,
  requestNoteRequired,
  statusLabel,
} from '../types'
import ListingForm from './ListingForm.vue'

const props = defineProps<{ id: number }>()

const editing = ref(false)
const note = ref('')

const listing = computed(() => {
  void state.version
  try {
    return api.getListing(props.id)
  } catch {
    return null
  }
})

const user = computed(() => (state.userId, state.version, currentUser()))
const isOwner = computed(() => !!user.value && listing.value?.owner_id === user.value.user_id)
const canManage = computed(() => isOwner.value || user.value?.role === 'admin')

const requests = computed(() => {
  void state.version
  if (!listing.value || !canManage.value) return []
  try {
    return api.getRequestsForListing(state.userId, props.id)
  } catch {
    return []
  }
})

const myPending = computed(() => {
  void state.version
  if (!user.value) return false
  return api.getMyRequests(state.userId).some((r) => r.listing_id === props.id && r.status === 'pending')
})

const reqLabel = { pending: '待處理', accepted: '已接受', declined: '已拒絕' } as const

const requestButton = computed(() => {
  switch (listing.value?.type) {
    case 'swap':
      return '提出交換'
    case 'lost_found':
      return '這是我的物品，提出認領'
    default:
      return '我想要這本書'
  }
})

const finishButton = computed(() => {
  switch (listing.value?.type) {
    case 'swap':
      return '標記為已換出'
    case 'lost_found':
      return '標記為已解決'
    default:
      return '標記為已送出'
  }
})

function sendRequest() {
  if (attempt(() => api.createRequest(state.userId, props.id, note.value), '已送出申請，等待物主回覆')) {
    note.value = ''
  }
}
function respond(requestId: number, decision: 'accepted' | 'declined') {
  attempt(
    () => api.respondToRequest(state.userId, requestId, decision),
    decision === 'accepted' ? '已接受申請，刊登已結束' : '已拒絕申請',
  )
}
function finishListing() {
  if (!listing.value) return
  const status = doneStatus(listing.value.type)
  attempt(() => api.updateListing(state.userId, props.id, { status }), '刊登已結束')
}
function reopen() {
  attempt(() => api.updateListing(state.userId, props.id, { status: 'open' }), '刊登已重新開啟')
}
function remove() {
  if (!window.confirm('確定要刪除這筆刊登嗎？')) return
  if (attempt(() => api.deleteListing(state.userId, props.id))) {
    go('board')
    notify('已刪除刊登')
  }
}
function hide() {
  if (attempt(() => api.updateListing(state.userId, props.id, { is_hidden: true }))) {
    go('board')
    notify('已隱藏刊登')
  }
}
</script>

<template>
  <section v-if="listing" class="detail">
    <button class="link" @click="go('board')">← 回到列表</button>

    <ListingForm v-if="editing" :listing="listing" @saved="editing = false" @cancel="editing = false" />

    <template v-else>
      <div class="badges">
        <span class="badge" :class="listing.type">{{ TYPE_LABEL[listing.type] }}</span>
        <span class="badge" :class="'st-' + listing.status">{{ statusLabel(listing.type, listing.status) }}</span>
      </div>
      <img v-if="listing.image" class="detail-img" :src="listing.image" :alt="listing.title" />
      <h2>{{ listing.title }}</h2>
      <p v-if="listing.type === 'swap'" class="swap">想換到：{{ listing.want_book }}</p>
      <p class="meta">{{ listing.category }} · {{ listing.type === 'lost_found' ? '拾獲者' : '刊登者' }}：{{ listing.owner_name }}</p>
      <p v-if="listing.condition" class="desc-full">{{ conditionLabel(listing.type) }}：{{ listing.condition }}</p>

      <div class="place">
        <p v-if="listing.type === 'lost_found'" class="found">
          <strong>拾獲地點：{{ listing.found_place || '（未填寫）' }}</strong>
        </p>
        <strong>{{ locationLabel(listing.type) }}：{{ listing.location }}</strong>
        <p v-if="listing.location_note" class="meta">{{ listing.location_note }}</p>
      </div>

      <div v-if="canManage" class="row">
        <button @click="editing = true">編輯</button>
        <button v-if="listing.status === 'open'" @click="finishListing">{{ finishButton }}</button>
        <button v-else @click="reopen">重新開啟</button>
        <button class="danger" @click="remove">刪除</button>
        <button v-if="user?.role === 'admin'" @click="hide">隱藏（管理員）</button>
      </div>

      <div v-if="!isOwner" class="request-box">
        <p v-if="!user" class="hint">登入後才能提出申請。聯絡資料不會公開顯示。</p>
        <p v-else-if="user.role === 'guest'" class="hint">訪客無法提出申請，請登出後以帳號登入。</p>
        <p v-else-if="listing.status !== 'open'" class="hint">此刊登已結束，無法申請。</p>
        <p v-else-if="myPending" class="hint">你已送出申請，等待物主回覆。</p>
        <form v-else class="request-form" @submit.prevent="sendRequest">
          <label>
            {{ requestNoteLabel(listing.type) }}
            <textarea
              v-model="note"
              rows="2"
              :placeholder="requestNoteRequired(listing.type) ? '' : '例如：我想在週三中午取書'"
            ></textarea>
          </label>
          <button type="submit" class="primary">{{ requestButton }}</button>
        </form>
      </div>

      <div v-if="canManage" class="requests">
        <h3>收到的申請</h3>
        <p v-if="requests.length === 0" class="hint">目前沒有申請。</p>
        <ul>
          <li v-for="r in requests" :key="r.request_id">
            <span>{{ r.requester_name }}</span>
            <span class="badge" :class="'rq-' + r.status">{{ reqLabel[r.status] }}</span>
            <span v-if="r.note" class="note">「{{ r.note }}」</span>
            <span v-if="r.status === 'pending' && isOwner" class="row">
              <button class="primary" @click="respond(r.request_id, 'accepted')">接受</button>
              <button @click="respond(r.request_id, 'declined')">拒絕</button>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </section>
  <section v-else>
    <p class="empty">找不到這筆刊登。</p>
    <button class="link" @click="go('board')">← 回到列表</button>
  </section>
</template>
