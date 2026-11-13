<script setup lang="ts">
import { computed, reactive } from 'vue'
import { api } from '../api'
import { state, go } from '../store'
import {
  BOOK_CATEGORIES,
  LOCATIONS,
  LOST_CATEGORIES,
  TYPE_LABEL,
  conditionLabel,
  locationLabel,
  statusLabel,
  type ListingType,
} from '../types'

const filters = reactive<{ q: string; category: string; type: ListingType | ''; status: string; location: string }>({
  q: '',
  category: '',
  type: '',
  status: '',
  location: '',
})

const tabs: Array<{ value: ListingType | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'giveaway', label: TYPE_LABEL.giveaway },
  { value: 'swap', label: TYPE_LABEL.swap },
  { value: 'lost_found', label: TYPE_LABEL.lost_found },
]

const categories = computed(() => {
  if (filters.type === 'lost_found') return LOST_CATEGORIES
  if (filters.type) return BOOK_CATEGORIES
  return [...BOOK_CATEGORIES, ...LOST_CATEGORIES.filter((c) => !BOOK_CATEGORIES.includes(c))]
})

function pick(type: ListingType | '') {
  filters.type = type
  filters.category = ''
}

const listings = computed(() =>
  (state.version, api.getListings({ ...filters, status: filters.status as '' | 'open' | 'closed' | 'resolved' })),
)
</script>

<template>
  <section>
    <div class="tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.value"
        role="tab"
        :aria-selected="filters.type === t.value"
        :class="{ active: filters.type === t.value }"
        @click="pick(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="filters">
      <input v-model="filters.q" type="search" placeholder="搜尋書名、想換的書、描述或拾獲地點…" aria-label="搜尋" />
      <select v-model="filters.category" aria-label="分類">
        <option value="">全部分類</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filters.location" aria-label="地點">
        <option value="">全部地點</option>
        <option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
      </select>
      <select v-model="filters.status" aria-label="狀態">
        <option value="">全部狀態</option>
        <option value="open">開啟中</option>
        <option value="closed">已送出／已換出</option>
        <option value="resolved">已解決</option>
      </select>
    </div>

    <p v-if="listings.length === 0" class="empty">沒有符合條件的刊登。</p>

    <ul class="cards">
      <li v-for="l in listings" :key="l.listing_id" class="card" :class="l.type" @click="go('detail', l.listing_id)">
        <div class="thumb">
          <img v-if="l.image" :src="l.image" :alt="l.title" loading="lazy" />
          <span v-else class="no-img">無圖片</span>
        </div>
        <div class="badges">
          <span class="badge" :class="l.type">{{ TYPE_LABEL[l.type] }}</span>
          <span class="badge" :class="'st-' + l.status">{{ statusLabel(l.type, l.status) }}</span>
        </div>
        <h3>{{ l.title }}</h3>
        <p v-if="l.type === 'swap'" class="swap">想換：{{ l.want_book }}</p>
        <p v-if="l.type === 'lost_found' && l.found_place" class="desc">拾獲地點：{{ l.found_place }}</p>
        <p v-else-if="l.condition" class="desc">{{ conditionLabel(l.type) }}：{{ l.condition }}</p>
        <p class="meta">{{ l.category }} · {{ locationLabel(l.type) }}：{{ l.location }}</p>
        <p class="meta">{{ l.owner_name }}</p>
      </li>
    </ul>
  </section>
</template>
