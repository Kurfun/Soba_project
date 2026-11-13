<script setup lang="ts">
import { computed } from 'vue'
import { api } from '../api'
import { go, state } from '../store'

const requests = computed(() => {
  void state.version
  try {
    return api.getMyRequests(state.userId)
  } catch {
    return []
  }
})

const reqLabel = { pending: '待處理', accepted: '已接受', declined: '已拒絕' } as const
</script>

<template>
  <section>
    <h2>我的申請</h2>
    <p v-if="requests.length === 0" class="empty">你還沒有送出任何申請。</p>
    <ul class="plain">
      <li v-for="r in requests" :key="r.request_id">
        <button class="link" @click="go('detail', r.listing_id)">{{ r.listing_title }}</button>
        <span class="badge" :class="'rq-' + r.status">{{ reqLabel[r.status] }}</span>
      </li>
    </ul>
  </section>
</template>
