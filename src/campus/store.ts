import { reactive } from 'vue'
import { api, ApiError } from './api'

export type View = 'board' | 'new' | 'detail' | 'mine'

/** Tiny shared state: who is "signed in", which screen is shown, and a refresh counter. */
const SESSION_KEY = 'campus-swap-user'

/** Restore the signed-in user after a page refresh (the mock data itself resets). */
function loadSession(): number | null {
  try {
    const id = Number(sessionStorage.getItem(SESSION_KEY))
    return api.listUsers().some((u) => u.user_id === id) ? id : null
  } catch {
    return null
  }
}

export const state = reactive({
  userId: loadSession(),
  view: 'board' as View,
  selectedId: null as number | null,
  version: 0,
  message: '' as string,
  messageKind: 'error' as 'error' | 'ok',
})

/** Mark a user as signed in (and remember it for this browser tab). */
export function signIn(userId: number) {
  state.userId = userId
  try {
    sessionStorage.setItem(SESSION_KEY, String(userId))
  } catch {
    /* storage unavailable: the session just won't survive a refresh */
  }
}

export function signOut() {
  state.userId = null
  go('board')
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function refresh() {
  state.version++
}

export function go(view: View, selectedId: number | null = null) {
  state.view = view
  state.selectedId = selectedId
  state.message = ''
}

export function notify(message: string, kind: 'error' | 'ok' = 'ok') {
  state.message = message
  state.messageKind = kind
}

/** Run an API action; show its error message instead of throwing. Returns true on success. */
export function attempt(action: () => void, okMessage = ''): boolean {
  try {
    action()
    if (okMessage) notify(okMessage, 'ok')
    refresh()
    return true
  } catch (e) {
    notify(e instanceof ApiError ? e.message : '發生未知錯誤', 'error')
    return false
  }
}

export function currentUser() {
  return api.listUsers().find((u) => u.user_id === state.userId) ?? null
}
