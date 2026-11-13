<script setup lang="ts">
import { computed, ref } from 'vue'

type Section = 'all' | 'books' | 'exchange' | 'lost'
type Listing = {
  id: number
  section: Exclude<Section, 'all'>
  category: string
  title: string
  description: string
  location: string
  time: string
  tone: string
  coverLabel: string
  details: string[]
  icon: string
}

const activeSection = ref<Section>('all')
const search = ref('')
const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'all', label: '全部動態', icon: '⌕' },
  { id: 'books', label: '漂流書櫃', icon: '▤' },
  { id: 'exchange', label: '好書交換', icon: '⇄' },
  { id: 'lost', label: '失物招領', icon: '⌑' },
]

const listings: Listing[] = [
  { id: 1, section: 'books', category: '免費贈送', title: '設計的心理學', description: '陪我度過好幾堂課的好書，希望下一位也能從中找到靈感。內頁乾淨，書角有一點使用痕跡。', location: '商學院一樓', time: '12 分鐘前', tone: 'cream', coverLabel: 'THE DESIGN\nOF EVERYDAY\nTHINGS', details: ['保存良好', '設計／藝術'], icon: '↗' },
  { id: 2, section: 'exchange', category: '教科書交換', title: '統計學｜想換經濟學原理', description: '手邊有一本統計學第三版，畫線很少，想交換經濟學原理或總體經濟學。', location: '圖書館前廣場', time: '38 分鐘前', tone: 'sage', coverLabel: '統計學\nSTATISTICS', details: ['想換：經濟學', '可面交'], icon: '⇄' },
  { id: 3, section: 'lost', category: '拾獲物品', title: '拾獲｜深藍色學生證', description: '在行政大樓旁的長椅上撿到，已交給總務處服務台，失主可以帶證件前往認領。', location: '總務處服務台', time: '1 小時前', tone: 'blue', coverLabel: 'FOUND\nTODAY', details: ['拾獲地點：行政大樓', '已送至服務台'], icon: '⌑' },
  { id: 4, section: 'books', category: '免費贈送', title: '小王子｜中法雙語版', description: '搬宿舍整理出來的收藏，封面有些泛黃但內容完整。想讓它繼續陪伴新的讀者。', location: '人文學院 302', time: '2 小時前', tone: 'pink', coverLabel: 'LE PETIT\nPRINCE', details: ['保存良好', '文學／小說'], icon: '↗' },
  { id: 5, section: 'exchange', category: '教科書交換', title: '民法總則｜徵刑法概要', description: '民總上課用書，有少量重點筆記。希望交換一本刑法概要，版本不拘。', location: '法學院一樓', time: '昨天', tone: 'lavender', coverLabel: '民法總則\nCIVIL LAW', details: ['想換：刑法概要', '重點筆記'], icon: '⇄' },
  { id: 6, section: 'lost', category: '拾獲物品', title: '黑色摺疊傘一把', description: '下課後在共同科教室門口拾獲，傘柄有貼一張小小的黃色貼紙。', location: '共同科教室', time: '昨天', tone: 'yellow', coverLabel: 'FOUND\nUMBRELLA', details: ['拾獲地點：共同科', '黑色摺疊傘'], icon: '⌑' },
]

const visibleListings = computed(() => listings.filter((item) => {
  const matchesSection = activeSection.value === 'all' || item.section === activeSection.value
  const query = search.value.trim().toLowerCase()
  const matchesSearch = !query || `${item.title} ${item.description} ${item.category} ${item.location}`.toLowerCase().includes(query)
  return matchesSection && matchesSearch
}))
const featuredListings = computed(() => visibleListings.value.slice(0, 3))
const activeLabel = computed(() => sections.find((section) => section.id === activeSection.value)?.label ?? '全部動態')
</script>

<template>
  <div class="landing">
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#home" aria-label="北大漂流書櫃首頁">
        <span class="brand-mark"><span></span><span></span><span></span></span>
        <span class="brand-copy"><b>北大漂流書櫃</b><small>CAMPUS CIRCULAR</small></span>
      </a>
      <nav class="top-links" aria-label="主要導覽">
        <a href="#discover">探索刊登</a>
        <a href="#about">關於計畫</a>
      </nav>
      <RouterLink class="button button-dark top-action" to="/login">登入</RouterLink>
    </header>

    <main id="home">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-dot"></span> 北大校園共享計畫 <span class="eyebrow-line"></span> 學生自製示範專案</div>
          <h1>讓好物繼續<br /><em>流動，</em>讓善意<span class="title-period">。</span><br class="mobile-break" />在校園<span class="title-underline">循環</span></h1>
          <p>一本讀完的書、一件失而復得的物品，<br />都能成為另一段故事的開始。</p>
          <div class="hero-actions">
            <a href="#discover" class="button button-dark">開始探索 <span class="arrow">↘</span></a>
            <RouterLink class="button button-light" to="/login"><span class="plus-round">＋</span> 分享一件好物</RouterLink>
          </div>
          <div class="hero-note"><span class="note-icon">✳</span> 分享一點點，讓校園更美好</div>
        </div>
        <div class="hero-art" aria-label="以校園閱讀為主題的插畫">
          <div class="art-sun"></div>
          <div class="art-label">SHARE<br />A LITTLE<br />KINDNESS</div>
          <div class="art-leaf leaf-one">✳</div><div class="art-leaf leaf-two">✦</div>
          <div class="art-ground"></div>
          <div class="art-book book-back"><span>讓知識<br />繼續旅行</span></div>
          <div class="art-book book-front"><span>GOOD<br />THINGS<br /><i>keep</i><br />moving.</span><b>北大漂流書櫃</b></div>
          <div class="art-plant"><i></i><i></i><i></i><i></i><i></i></div>
          <div class="art-sticker">讀完了<br /><b>換你接棒 ↗</b></div>
          <div class="art-caption">A SMALL ACT, A BIGGER CIRCLE.</div>
        </div>
        <div class="hero-side-note">TAKE · SHARE · REPEAT</div>
      </section>

      <section class="stats-row" aria-label="平台介紹">
        <div class="stat-intro"><span class="stat-spark">✳</span><span>讓校園資源<br />被看見、被延續</span></div>
        <div class="stat"><b>03</b><span>共享服務</span></div>
        <div class="stat"><b>∞</b><span>循環的可能</span></div>
        <div class="stat-message">不需要的東西，<br /><strong>可能正是某人的需要。</strong></div>
      </section>

      <section id="discover" class="discover-section">
        <div class="section-heading">
          <div><div class="eyebrow section-eyebrow">CAMPUS COMMUNITY BOARD <span class="eyebrow-line"></span> 01 / 03</div><h2>校園裡，正在發生<span>的事</span></h2><p>從一本書開始，找到共享的下一站。</p></div>
          <a class="text-link" href="#listings">瀏覽全部刊登 <span>↗</span></a>
        </div>

        <div class="toolbar">
          <div class="filters" role="tablist" aria-label="篩選刊登類型">
            <button v-for="section in sections" :key="section.id" class="filter-button" :class="{ active: activeSection === section.id }" role="tab" :aria-selected="activeSection === section.id" @click="activeSection = section.id"><span class="filter-icon">{{ section.icon }}</span>{{ section.label }}<span v-if="section.id === 'all'" class="filter-count">06</span></button>
          </div>
          <label class="search-box"><span class="search-icon">⌕</span><input v-model="search" type="search" placeholder="搜尋書名、分類或地點…" /><kbd>⌘ K</kbd></label>
        </div>

        <div id="listings" class="listing-header"><span><b>{{ activeSection === 'all' ? '最新刊登' : activeLabel }}</b> <i>｜</i> 共 {{ visibleListings.length.toString().padStart(2, '0') }} 則分享</span><button class="sort-button">最新優先 <span>⌄</span></button></div>
        <div class="listing-grid">
          <article v-for="item in featuredListings" :key="item.id" class="listing-card">
            <div class="card-cover" :class="`cover-${item.tone}`" :style="{ '--cover-image': 'none' }">
              <div class="cover-wash"></div><div class="cover-type">{{ item.coverLabel.split('\n').join(' / ') }}</div><span class="category-badge"><i>{{ item.section === 'books' ? '▤' : item.section === 'exchange' ? '⇄' : '⌑' }}</i>{{ item.category }}</span><button class="bookmark" aria-label="收藏刊登">♡</button>
            </div>
            <div class="card-body"><div class="card-kicker"><span>{{ item.section === 'books' ? '漂流書櫃' : item.section === 'exchange' ? '好書交換' : '失物招領' }}</span><span class="kicker-dot">·</span><span>{{ item.time }}</span></div><h3>{{ item.title }}</h3><p>{{ item.description }}</p><div class="card-tags"><span v-for="detail in item.details" :key="detail">{{ detail }}</span></div><div class="card-footer"><span class="location"><span>⌖</span>{{ item.location }}</span><button class="card-action" :aria-label="`查看${item.title}`">{{ item.icon }}</button></div></div>
          </article>
          <div v-if="featuredListings.length === 0" class="empty-state"><span>⌕</span><b>還沒有找到相關刊登</b><p>試試其他關鍵字，或切換不同分類。</p></div>
        </div>
        <div class="view-more"><button class="button button-outline" @click="activeSection = 'all'; search = ''">探索更多校園分享 <span>↓</span></button></div>
      </section>

      <section id="about" class="join-banner"><div class="join-icon">✳</div><div><div class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h2>你也有一件，想分享的好物嗎？</h2><p>讓它繼續旅行，遇見真正需要它的人。</p></div><RouterLink class="button button-dark" to="/login">加入這場循環 <span class="arrow">↗</span></RouterLink><span class="join-decoration">SHARE<br />THE GOOD</span></section>
      <footer><a class="brand footer-brand" href="#home"><span class="brand-mark"><span></span><span></span><span></span></span><span class="brand-copy"><b>北大漂流書櫃</b><small>CAMPUS CIRCULAR</small></span></a><span class="footer-copy">讓好物繼續流動，讓善意在校園發生。</span><span class="footer-copy footer-credit">MADE WITH CARE · FOR OUR CAMPUS</span></footer>
      <p class="demo-note">學生自製示範專案，非學校官方網站；頁面上的刊登為示範內容。</p>
    </main>
  </div>
  </div>
</template>
