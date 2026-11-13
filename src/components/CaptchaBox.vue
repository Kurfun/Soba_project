<script setup lang="ts">
import { computed, ref } from 'vue'

// Letters and digits that are hard to confuse (no 0/O, 1/I/l).
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LENGTH = 5

function makeCode(): string {
  let out = ''
  for (let i = 0; i < LENGTH; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)]
  return out
}

const code = ref(makeCode())

/** Per-character look: slight rotation and vertical offset, plus a few noise lines. */
const glyphs = computed(() =>
  code.value.split('').map((ch, i) => ({
    ch,
    x: 14 + i * 24,
    y: 30 + Math.round((Math.random() - 0.5) * 8),
    rot: Math.round((Math.random() - 0.5) * 36),
  })),
)
const lines = computed(() => {
  void code.value
  return Array.from({ length: 4 }, () => ({
    x1: Math.random() * 140,
    y1: Math.random() * 44,
    x2: Math.random() * 140,
    y2: Math.random() * 44,
  }))
})

function refresh() {
  code.value = makeCode()
}

/** Case-insensitive comparison. A real backend should do this check server-side. */
function verify(input: string): boolean {
  return input.trim().toUpperCase() === code.value
}

defineExpose({ refresh, verify })
</script>

<template>
  <div class="captcha">
    <svg viewBox="0 0 140 44" width="140" height="44" role="img" :aria-label="'驗證碼圖片'">
      <rect width="140" height="44" rx="6" fill="#eef1f8" />
      <line v-for="(l, i) in lines" :key="'l' + i" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" stroke="#9aa6c8" stroke-width="1.2" />
      <text
        v-for="(g, i) in glyphs"
        :key="i"
        :x="g.x"
        :y="g.y"
        :transform="`rotate(${g.rot} ${g.x} ${g.y})`"
        font-size="26"
        font-weight="700"
        font-family="Georgia, serif"
        fill="#293b86"
      >
        {{ g.ch }}
      </text>
    </svg>
    <button type="button" class="captcha-refresh" @click="refresh">換一張</button>
  </div>
</template>

<style scoped>
.captcha { display: flex; align-items: center; gap: 10px; }
.captcha svg { border: 1px solid #d8dce8; border-radius: 6px; user-select: none; }
.captcha-refresh { border: 0; background: none; color: #354b88; font-size: 12px; cursor: pointer; padding: 4px; }
.captcha-refresh:hover { text-decoration: underline; }
</style>
