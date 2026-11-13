import { describe, expect, it, beforeEach } from 'vitest'
import { ApiError, MockApi } from './api'
import type { ListingInput } from './types'

const ALICE = 1
const BOB = 2
const ADMIN = 3

const book: ListingInput = {
  type: 'giveaway',
  title: '二手教科書',
  want_book: '',
  category: '教科書',
  condition: '九成新',
  found_place: '',
  image: '',
  location: '圖書館',
  location_note: '一樓服務台旁',
}

const swap: ListingInput = { ...book, type: 'swap', title: '管理學原理', want_book: '財務管理' }
const found: ListingInput = {
  ...book,
  type: 'lost_found',
  title: '拾獲：學生證',
  category: '證件/錢包',
  condition: '',
  found_place: '圖書館三樓',
  location: '警衛室',
  location_note: '',
}

function statusOf(fn: () => unknown): number | undefined {
  try {
    fn()
  } catch (e) {
    return e instanceof ApiError ? e.status : undefined
  }
  return undefined
}

describe('listings', () => {
  let api: MockApi
  beforeEach(() => {
    api = new MockApi(false)
  })

  it('T1: a new listing is saved and displayed with status open', () => {
    const created = api.createListing(ALICE, book)
    expect(created.status).toBe('open')
    expect(api.getListings().map((l) => l.listing_id)).toContain(created.listing_id)
    const detail = api.getListing(created.listing_id)
    expect(detail.title).toBe('二手教科書')
    expect(detail.location).toBe('圖書館')
  })

  it('T2: only the owner (or admin) can update; others get 403', () => {
    const l = api.createListing(ALICE, book)
    expect(api.updateListing(ALICE, l.listing_id, { title: '新標題' }).title).toBe('新標題')
    expect(statusOf(() => api.updateListing(BOB, l.listing_id, { title: '偷改' }))).toBe(403)
    expect(statusOf(() => api.deleteListing(BOB, l.listing_id))).toBe(403)
    expect(api.updateListing(ADMIN, l.listing_id, { status: 'closed' }).status).toBe('closed')
  })

  it('T3: empty or blank title is rejected (422) and nothing is saved', () => {
    expect(statusOf(() => api.createListing(ALICE, { ...book, title: '' }))).toBe(422)
    expect(statusOf(() => api.createListing(ALICE, { ...book, title: '   ' }))).toBe(422)
    expect(api.getListings()).toHaveLength(0)
  })

  it('T4: search and filters (type, category, location) return only matches', () => {
    api.createListing(ALICE, book)
    api.createListing(BOB, swap)
    api.createListing(BOB, found)
    expect(api.getListings({ q: '教科書' })).toHaveLength(1)
    expect(api.getListings({ q: '財務' })[0]?.title).toBe('管理學原理') // matches the wanted book
    expect(api.getListings({ type: 'lost_found' })).toHaveLength(1)
    expect(api.getListings({ category: '證件/錢包' })).toHaveLength(1)
    expect(api.getListings({ location: '圖書館' })).toHaveLength(2)
  })

  it('T8: guests cannot create listings (401)', () => {
    expect(statusOf(() => api.createListing(null, book))).toBe(401)
  })

  it('swap requires the wanted book', () => {
    expect(statusOf(() => api.createListing(ALICE, { ...swap, want_book: ' ' }))).toBe(422)
    expect(api.createListing(ALICE, swap).want_book).toBe('財務管理')
  })

  it('location must be one of the allowed options', () => {
    expect(statusOf(() => api.createListing(ALICE, { ...book, location: '火星' }))).toBe(422)
    expect(statusOf(() => api.createListing(ALICE, { ...book, location: '' }))).toBe(422)
  })

  it('category must match the listing type', () => {
    expect(statusOf(() => api.createListing(ALICE, { ...book, category: '證件/錢包' }))).toBe(422)
    expect(statusOf(() => api.createListing(ALICE, { ...found, category: '教科書' }))).toBe(422)
  })

  it('the type cannot be changed by editing', () => {
    const l = api.createListing(ALICE, book)
    api.updateListing(ALICE, l.listing_id, { title: '改名' })
    expect(api.getListing(l.listing_id).type).toBe('giveaway')
  })

  it('hidden listings are excluded from search', () => {
    const l = api.createListing(ALICE, book)
    expect(statusOf(() => api.updateListing(ALICE, l.listing_id, { is_hidden: true }))).toBe(403)
    api.updateListing(ADMIN, l.listing_id, { is_hidden: true })
    expect(api.getListings()).toHaveLength(0)
  })
})

describe('pictures and found place', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgo='
  let api: MockApi
  beforeEach(() => {
    api = new MockApi(false)
  })

  it('an uploaded picture is saved and returned with the listing', () => {
    const l = api.createListing(ALICE, { ...book, image: PNG })
    expect(api.getListing(l.listing_id).image).toBe(PNG)
  })

  it('a non-image or oversized picture is rejected (422)', () => {
    expect(statusOf(() => api.createListing(ALICE, { ...book, image: 'data:text/html;base64,AAAA' }))).toBe(422)
    expect(statusOf(() => api.createListing(ALICE, { ...book, image: 'http://x.example/a.png' }))).toBe(422)
    expect(statusOf(() => api.createListing(ALICE, { ...book, image: PNG + 'A'.repeat(1_600_000) }))).toBe(422)
  })

  it('the picture can be replaced or removed by the owner', () => {
    const l = api.createListing(ALICE, { ...book, image: PNG })
    expect(api.updateListing(ALICE, l.listing_id, { image: '' }).image).toBe('')
  })

  it('lost_found keeps found_place; other types drop it', () => {
    expect(api.createListing(ALICE, found).found_place).toBe('圖書館三樓')
    expect(api.createListing(ALICE, { ...book, found_place: '亂填' }).found_place).toBe('')
    expect(statusOf(() => api.createListing(ALICE, { ...found, found_place: 'x'.repeat(51) }))).toBe(422)
  })

  it('search matches the found place and the description (condition)', () => {
    api.createListing(ALICE, found)
    api.createListing(BOB, book)
    expect(api.getListings({ q: '三樓' })).toHaveLength(1)
    expect(api.getListings({ q: '九成新' })).toHaveLength(1)
  })
})

describe('sign-in and guests', () => {
  let api: MockApi
  let guest = 0
  beforeEach(() => {
    api = new MockApi(false)
    guest = api.guestLogin().user_id
  })

  it('account + password sign-in returns only public fields', () => {
    const u = api.login('Alice', 'alice123')
    expect(u).toEqual({ user_id: ALICE, display_name: 'Alice', role: 'student' })
    expect(JSON.stringify(u)).not.toMatch(/email|password|@campus/i)
  })

  it('wrong account or password is rejected with 401', () => {
    expect(statusOf(() => api.login('alice', 'wrong'))).toBe(401)
    expect(statusOf(() => api.login('nobody', 'alice123'))).toBe(401)
    expect(statusOf(() => api.login('', ''))).toBe(401)
  })

  it('guest sign-in gives the guest role', () => {
    expect(api.guestLogin().role).toBe('guest')
    expect(api.listUsers().map((u) => u.role)).toContain('guest')
  })

  it('guests can post giveaways and lost-and-found items', () => {
    expect(api.createListing(guest, book).status).toBe('open')
    expect(api.createListing(guest, found).type).toBe('lost_found')
  })

  it('guests cannot post swaps (403)', () => {
    expect(statusOf(() => api.createListing(guest, swap))).toBe(403)
    expect(api.getListings()).toHaveLength(0)
  })

  it('guests cannot send requests (403)', () => {
    const l = api.createListing(ALICE, book)
    expect(statusOf(() => api.createRequest(guest, l.listing_id))).toBe(403)
  })

  it('guests cannot edit other people\'s listings (403)', () => {
    const l = api.createListing(ALICE, book)
    expect(statusOf(() => api.updateListing(guest, l.listing_id, { title: '偷改' }))).toBe(403)
  })
})

describe('requests', () => {
  let api: MockApi
  beforeEach(() => {
    api = new MockApi(false)
  })

  it('T5: giveaway: owner accepts a request; the listing becomes closed', () => {
    const l = api.createListing(ALICE, book)
    const r = api.createRequest(BOB, l.listing_id)
    expect(r.status).toBe('pending')
    expect(api.respondToRequest(ALICE, r.request_id, 'accepted').status).toBe('accepted')
    expect(api.getListing(l.listing_id).status).toBe('closed')
  })

  it('swap: the requester must say which book they offer; owner sees it', () => {
    const l = api.createListing(ALICE, swap)
    expect(statusOf(() => api.createRequest(BOB, l.listing_id))).toBe(422)
    const r = api.createRequest(BOB, l.listing_id, '財務管理 第五版')
    expect(api.getRequestsForListing(ALICE, l.listing_id)[0]?.note).toBe('財務管理 第五版')
    api.respondToRequest(ALICE, r.request_id, 'accepted')
    expect(api.getListing(l.listing_id).status).toBe('closed')
  })

  it('lost_found: a claim needs feature details; accepting resolves the listing', () => {
    const l = api.createListing(ALICE, found)
    expect(statusOf(() => api.createRequest(BOB, l.listing_id, '  '))).toBe(422)
    const r = api.createRequest(BOB, l.listing_id, '學號 B1234，貼有貓咪貼紙')
    api.respondToRequest(ALICE, r.request_id, 'accepted')
    expect(api.getListing(l.listing_id).status).toBe('resolved')
  })

  it('accepting declines the other pending requests', () => {
    const l = api.createListing(ALICE, book)
    const r1 = api.createRequest(BOB, l.listing_id)
    const r2 = api.createRequest(ADMIN, l.listing_id)
    api.respondToRequest(ALICE, r1.request_id, 'accepted')
    const states = api.getRequestsForListing(ALICE, l.listing_id)
    expect(states.find((r) => r.request_id === r2.request_id)?.status).toBe('declined')
  })

  it('T6: owner cannot request own listing; duplicates are rejected', () => {
    const l = api.createListing(ALICE, book)
    expect(statusOf(() => api.createRequest(ALICE, l.listing_id))).toBe(409)
    api.createRequest(BOB, l.listing_id)
    expect(statusOf(() => api.createRequest(BOB, l.listing_id))).toBe(409)
  })

  it('only the listing owner can accept or decline', () => {
    const l = api.createListing(ALICE, book)
    const r = api.createRequest(BOB, l.listing_id)
    expect(statusOf(() => api.respondToRequest(BOB, r.request_id, 'accepted'))).toBe(403)
    expect(statusOf(() => api.getRequestsForListing(BOB, l.listing_id))).toBe(403)
  })

  it('T7: responses never expose private contact fields', () => {
    const l = api.createListing(ALICE, book)
    const r = api.createRequest(BOB, l.listing_id)
    const dump = JSON.stringify([api.getListings(), api.getRequestsForListing(ALICE, l.listing_id), r, api.listUsers()])
    expect(dump).not.toMatch(/email|phone|password|@campus/i)
  })
})

describe('guests are separate identities', () => {
  let api: MockApi
  beforeEach(() => {
    api = new MockApi(false)
  })

  it('each guest sign-in creates a new identity', () => {
    const a = api.guestLogin()
    const b = api.guestLogin()
    expect(a.user_id).not.toBe(b.user_id)
    expect(a.display_name).not.toBe(b.display_name)
  })

  it('one guest cannot edit or delete another guest\'s listing (403)', () => {
    const a = api.guestLogin().user_id
    const b = api.guestLogin().user_id
    const l = api.createListing(a, book)
    expect(statusOf(() => api.updateListing(b, l.listing_id, { title: '偷改' }))).toBe(403)
    expect(statusOf(() => api.deleteListing(b, l.listing_id))).toBe(403)
    expect(api.updateListing(a, l.listing_id, { title: '自己改' }).title).toBe('自己改')
  })

  it('one guest cannot answer requests on another guest\'s listing (403)', () => {
    const a = api.guestLogin().user_id
    const b = api.guestLogin().user_id
    const l = api.createListing(a, book)
    const r = api.createRequest(BOB, l.listing_id)
    expect(statusOf(() => api.respondToRequest(b, r.request_id, 'accepted'))).toBe(403)
    expect(statusOf(() => api.getRequestsForListing(b, l.listing_id))).toBe(403)
    expect(api.respondToRequest(a, r.request_id, 'accepted').status).toBe('accepted')
  })
})

describe('contact details are rejected', () => {
  let api: MockApi
  beforeEach(() => {
    api = new MockApi(false)
  })

  it('phone numbers and emails are rejected in every free-text field (422)', () => {
    for (const bad of ['0912-345-678', '0912345678', '+886 912 345 678', '02-2345-6789', 'me@example.com']) {
      expect(statusOf(() => api.createListing(ALICE, { ...book, title: `書 ${bad}` }))).toBe(422)
      expect(statusOf(() => api.createListing(ALICE, { ...book, condition: bad }))).toBe(422)
      expect(statusOf(() => api.createListing(ALICE, { ...book, location_note: `找我 ${bad}` }))).toBe(422)
      expect(statusOf(() => api.createListing(ALICE, { ...swap, want_book: bad }))).toBe(422)
      expect(statusOf(() => api.createListing(ALICE, { ...found, found_place: bad }))).toBe(422)
    }
    expect(api.getListings()).toHaveLength(0)
  })

  it('a request note with a phone number is rejected (422)', () => {
    const l = api.createListing(ALICE, swap)
    expect(statusOf(() => api.createRequest(BOB, l.listing_id, '我的電話 0912-345-678'))).toBe(422)
  })

  it('ISBNs, dates and times are not mistaken for phone numbers', () => {
    const ok = api.createListing(ALICE, {
      ...book,
      title: '設計心理學 ISBN 9780912345678 與 9789864342761',
      condition: '2024-11-13 購入，第 3 版',
      location_note: '平日 9:00 到 17:00，一樓服務台旁',
    })
    expect(ok.status).toBe('open')
  })
})
