<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { api, NOTE_MAX, TITLE_MAX } from '../api'
import { attempt, currentUser, go, notify, state } from '../store'
import {
  FOUND_PLACE_MAX,
  GUEST_TYPES,
  IMAGE_MAX_DIM,
  IMAGE_MAX_FILE,
  LOCATIONS,
  TYPE_LABEL,
  categoriesFor,
  conditionLabel,
  locationLabel,
  type Listing,
  type ListingInput,
  type ListingType,
} from '../types'

const props = defineProps<{ listing?: Listing }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const form = reactive<ListingInput>({
  type: props.listing?.type ?? 'giveaway',
  title: props.listing?.title ?? '',
  want_book: props.listing?.want_book ?? '',
  category: props.listing?.category ?? categoriesFor('giveaway')[0] ?? '',
  condition: props.listing?.condition ?? '',
  found_place: props.listing?.found_place ?? '',
  image: props.listing?.image ?? '',
  location: props.listing?.location ?? LOCATIONS[0],
  location_note: props.listing?.location_note ?? '',
})

// When the type changes on a new listing, reset fields that depend on it.
watch(
  () => form.type,
  (type) => {
    if (props.listing) return
    form.category = categoriesFor(type)[0] ?? ''
    if (type !== 'swap') form.want_book = ''
    if (type === 'lost_found') form.condition = ''
    else form.found_place = ''
  },
)

const allTypes: ListingType[] = ['giveaway', 'swap', 'lost_found']
// Guests can only post giveaways and lost-and-found items.
const types = computed<ListingType[]>(() => (currentUser()?.role === 'guest' ? GUEST_TYPES : allTypes))

const imageError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

/** Read the picked file, downscale it so the data URL stays small, and keep it in the form. */
function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  imageError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    imageError.value = '請選擇圖片檔（JPG、PNG、GIF、WebP）'
    input.value = ''
    return
  }
  if (file.size > IMAGE_MAX_FILE) {
    imageError.value = '圖片不可超過 8 MB'
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onerror = () => (imageError.value = '無法讀取圖片')
  reader.onload = () => {
    const img = new Image()
    img.onerror = () => (imageError.value = '無法讀取圖片')
    img.onload = () => {
      const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        imageError.value = '無法處理圖片'
        return
      }
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      form.image = canvas.toDataURL('image/jpeg', 0.85)
    }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
}

function clearImage() {
  form.image = ''
  imageError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function submit() {
  if (props.listing) {
    const id = props.listing.listing_id
    const patch: Partial<ListingInput> = { ...form }
    delete patch.type
    if (attempt(() => api.updateListing(state.userId, id, patch), '已更新刊登')) emit('saved')
    return
  }
  let newId = 0
  const ok = attempt(() => {
    newId = api.createListing(state.userId, { ...form }).listing_id
  })
  if (ok) {
    go('detail', newId)
    notify('已建立刊登')
  }
}

function cancel() {
  if (props.listing) emit('cancel')
  else go('board')
}
</script>

<template>
  <form class="form" novalidate @submit.prevent="submit">
    <h2>{{ listing ? '編輯刊登' : '刊登' }}</h2>

    <label>
      類型
      <select v-model="form.type" :disabled="!!listing">
        <option v-for="t in types" :key="t" :value="t">
          {{ TYPE_LABEL[t] }}{{ t === 'giveaway' ? '（贈送書籍）' : t === 'swap' ? '（以書換書）' : '（刊登拾獲物品）' }}
        </option>
      </select>
    </label>

    <label>
      {{ form.type === 'lost_found' ? '拾獲物品名稱' : form.type === 'swap' ? '我提供的書（書名）' : '書名' }}
      （必填，最多 {{ TITLE_MAX }} 字）
      <input v-model="form.title" type="text" placeholder="例如：軟體工程 第十版" />
    </label>

    <label v-if="form.type === 'swap'">
      我想換到的書（必填）
      <input v-model="form.want_book" type="text" placeholder="例如：財務管理 同版本即可" />
    </label>

    <label>
      分類
      <select v-model="form.category">
        <option v-for="c in categoriesFor(form.type)" :key="c" :value="c">{{ c }}</option>
      </select>
    </label>

    <label v-if="form.type !== 'lost_found'">
      {{ conditionLabel(form.type) }}
      <input
        v-model="form.condition"
        type="text"
        :placeholder="form.type === 'giveaway' ? '例如：九成新、有筆記（請勿填寫電話、Email 或金額）' : '例如：九成新、有筆記'"
      />
    </label>

    <div class="field upload">
      <span>上傳圖片（選填，JPG／PNG／GIF／WebP）</span>
      <input ref="fileInput" type="file" accept="image/*" @change="onPickImage" />
      <p v-if="imageError" class="msg error" role="alert">{{ imageError }}</p>
      <div v-if="form.image" class="preview">
        <img :src="form.image" alt="圖片預覽" />
        <button type="button" @click="clearImage">移除圖片</button>
      </div>
    </div>

    <label v-if="form.type === 'lost_found'">
      拾獲地點（簡述，最多 {{ FOUND_PLACE_MAX }} 字）
      <input v-model="form.found_place" type="text" :maxlength="FOUND_PLACE_MAX" placeholder="例如：圖書館三樓自習區" />
    </label>

    <label>
      {{ locationLabel(form.type) }}
      <select v-model="form.location">
        <option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
      </select>
    </label>

    <label>
      備註（詳細位置或注意事項，最多 {{ NOTE_MAX }} 字）
      <textarea v-model="form.location_note" rows="2" placeholder="例如：一樓服務台旁書架，平日 9:00 到 17:00"></textarea>
    </label>

    <div class="row">
      <button type="submit" class="primary">{{ listing ? '儲存' : '送出刊登' }}</button>
      <button type="button" @click="cancel">取消</button>
    </div>
  </form>
</template>
