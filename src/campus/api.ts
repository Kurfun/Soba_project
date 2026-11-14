import {
  FOUND_PLACE_MAX,
  GUEST_TYPES,
  IMAGE_MAX_DATA,
  LOCATIONS,
  categoriesFor,
  doneStatus,
  requestNoteRequired,
  type Listing,
  type ListingFilters,
  type ListingInput,
  type ListingRequest,
  type ListingStatus,
  type PublicUser,
  type RequestStatus,
} from './types'
import umbrellaImage from './picture/BlackUmbrella.jpg'
import studentIdImage from './picture/StudenntId.png'

/**
 * A mock backend that mimics the REST rules from the proposal:
 *   GET/POST /listings, PATCH/DELETE /listings/{id},
 *   POST /listings/{id}/requests, PATCH /requests/{id}
 * Replace the bodies with fetch() calls when a real server exists.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

interface UserRecord extends PublicUser {
  email: string // private: stored here but never returned
}

type ListingRecord = Omit<Listing, 'owner_name'>
type RequestRecord = Omit<ListingRequest, 'requester_name'>

export const TITLE_MAX = 80
export const NOTE_MAX = 200

/** Contact details must stay private, so text that looks like an email or a Taiwan phone number is rejected. */
const CONTACT_PATTERNS = [
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/, // email
  /(?<!\d)(?:\+?886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}(?!\d)/, // mobile (not inside a longer number such as an ISBN)
  /(?<!\d)\(?0[2-8]\d?\)?[-\s]\d{3,4}[-\s]?\d{3,4}(?!\d)/, // landline with area code
]

function rejectContact(label: string, text: string) {
  if (CONTACT_PATTERNS.some((re) => re.test(text))) {
    throw new ApiError(422, `${label}請勿填寫電話或 Email`)
  }
}

export class MockApi {
  private users: UserRecord[] = []
  private listings: ListingRecord[] = []
  private requests: RequestRecord[] = []
  private nextListingId = 1
  private nextRequestId = 1
  private nextUserId = 4 // 1-3 are the demo accounts; guests get 4, 5, 6, ...
  /** Demo credentials (no real backend yet). Never returned by any method. */
  private credentials: Record<string, { password: string; userId: number }> = {
    alice: { password: 'alice123', userId: 1 },
    bob: { password: 'bob123', userId: 2 },
    admin: { password: 'admin123', userId: 3 },
  }

  constructor(seed = true) {
    this.users = [
      { user_id: 1, display_name: 'Alice', role: 'student', email: 'alice@campus.example' },
      { user_id: 2, display_name: 'Bob', role: 'student', email: 'bob@campus.example' },
      { user_id: 3, display_name: 'Admin', role: 'admin', email: 'admin@campus.example' },
    ]
    if (seed) this.seed()
  }

  private seed() {
    const base = { want_book: '', condition: '', found_place: '', image: '', location_note: '' }
    const samples: Array<[number, ListingInput, ListingStatus]> = [
      [1, { ...base, type: 'giveaway', title: '軟體工程 第十版', category: '教科書', condition: '九成新，有少量螢光筆痕跡。', location: '圖書館', location_note: '一樓服務台旁書架，平日 9:00 到 17:00' }, 'open'],
      [2, { ...base, type: 'giveaway', title: '微積分課本與習題解答', category: '教科書', condition: '送給需要的同學，普通書況。', location: '商學院', location_note: '一樓大廳公佈欄旁' }, 'open'],
      [1, { ...base, type: 'swap', title: '管理學原理', want_book: '財務管理', category: '教科書', condition: '良好', location: '學生餐廳', location_note: '午休時間門口見面' }, 'open'],
      [2, { ...base, type: 'lost_found', title: '拾獲：黑色折疊雨傘', image: umbrellaImage, found_place: '圖書館三樓', category: '生活用品', location: '圖書館', location_note: '失物招領櫃台' }, 'open'],
      [1, { ...base, type: 'lost_found', title: '拾獲：學生證', image: studentIdImage, found_place: '學生餐廳', category: '證件/錢包', location: '警衛室', location_note: '' }, 'resolved'],
    ]
    for (const [owner, input, status] of samples) {
      const l = this.insertListing(owner, input)
      l.status = status
    }
  }

  // ---- helpers ----------------------------------------------------------

  private user(id: number): UserRecord {
    const u = this.users.find((x) => x.user_id === id)
    if (!u) throw new ApiError(404, '找不到使用者')
    return u
  }

  private requireUser(actorId: number | null): UserRecord {
    if (actorId === null) throw new ApiError(401, '請先登入')
    return this.user(actorId)
  }

  private findListing(id: number): ListingRecord {
    const l = this.listings.find((x) => x.listing_id === id)
    if (!l) throw new ApiError(404, '找不到刊登')
    return l
  }

  private canManage(actor: UserRecord, l: ListingRecord): boolean {
    return actor.role === 'admin' || actor.user_id === l.owner_id
  }

  private validate(input: ListingInput, keepImage = '') {
    if (input.type !== 'giveaway' && input.type !== 'swap' && input.type !== 'lost_found') {
      throw new ApiError(422, '類型不正確')
    }
    const title = (input.title ?? '').trim()
    if (!title) throw new ApiError(422, '標題不可為空白')
    if (title.length > TITLE_MAX) throw new ApiError(422, `標題不可超過 ${TITLE_MAX} 字`)
    rejectContact('標題', title)
    if (!categoriesFor(input.type).includes((input.category ?? '').trim())) {
      throw new ApiError(422, '請選擇正確的分類')
    }
    if (!(LOCATIONS as readonly string[]).includes(input.location)) {
      throw new ApiError(422, '請選擇地點')
    }
    if ((input.location_note ?? '').length > NOTE_MAX) {
      throw new ApiError(422, `地點備註不可超過 ${NOTE_MAX} 字`)
    }
    if (input.type === 'swap' && !(input.want_book ?? '').trim()) {
      throw new ApiError(422, '好書交換需要填寫「想換到的書」')
    }
    if ((input.found_place ?? '').trim().length > FOUND_PLACE_MAX) {
      throw new ApiError(422, `拾獲地點不可超過 ${FOUND_PLACE_MAX} 字`)
    }
    rejectContact('描述', input.condition ?? '')
    rejectContact('想換到的書', input.want_book ?? '')
    rejectContact('拾獲地點', input.found_place ?? '')
    rejectContact('地點備註', input.location_note ?? '')
    const image = input.image ?? ''
    if (image && image !== keepImage) {
      if (!/^data:image\/(png|jpeg|gif|webp);base64,/.test(image)) throw new ApiError(422, '圖片格式不正確')
      if (image.length > IMAGE_MAX_DATA) throw new ApiError(422, '圖片檔案過大')
    }
  }

  private insertListing(ownerId: number, input: ListingInput): ListingRecord {
    const rec: ListingRecord = {
      listing_id: this.nextListingId++,
      owner_id: ownerId,
      type: input.type,
      title: input.title.trim(),
      want_book: input.type === 'swap' ? input.want_book.trim() : '',
      category: input.category.trim(),
      condition: input.type === 'lost_found' ? '' : input.condition.trim(),
      found_place: input.type === 'lost_found' ? input.found_place.trim() : '',
      image: input.image ?? '',
      location: input.location,
      location_note: input.location_note.trim(),
      status: 'open',
      is_hidden: false,
      created_at: new Date().toISOString(),
    }
    this.listings.push(rec)
    return rec
  }

  private toListing(l: ListingRecord): Listing {
    return { ...l, owner_name: this.user(l.owner_id).display_name }
  }

  private toRequest(r: RequestRecord): ListingRequest {
    return { ...r, requester_name: this.user(r.requester_id).display_name }
  }

  // ---- users / sign-in ---------------------------------------------------

  /** POST /login: account + password. Wrong credentials give the same 401 either way. */
  login(account: string, password: string): PublicUser {
    const cred = this.credentials[account.trim().toLowerCase()]
    if (!cred || cred.password !== password) throw new ApiError(401, '帳號或密碼錯誤')
    return this.publicUser(this.user(cred.userId))
  }

  /**
   * POST /login/guest: every call creates a separate guest identity (訪客 1, 訪客 2, ...)
   * so one guest can never edit, delete or answer requests on another guest's listings.
   */
  guestLogin(): PublicUser {
    const n = this.users.filter((u) => u.role === 'guest').length + 1
    const rec: UserRecord = {
      user_id: this.nextUserId++,
      display_name: `訪客 ${n}`,
      role: 'guest',
      email: `guest${n}@campus.example`,
    }
    this.users.push(rec)
    return this.publicUser(rec)
  }

  private publicUser({ user_id, display_name, role }: UserRecord): PublicUser {
    return { user_id, display_name, role }
  }

  listUsers(): PublicUser[] {
    return this.users.map((u) => this.publicUser(u))
  }

  // ---- listings ---------------------------------------------------------

  /** GET /listings */
  getListings(filters: ListingFilters = {}): Listing[] {
    const q = (filters.q ?? '').trim().toLowerCase()
    return this.listings
      .filter((l) => !l.is_hidden)
      .filter((l) => !filters.category || l.category === filters.category)
      .filter((l) => !filters.type || l.type === filters.type)
      .filter((l) => !filters.status || l.status === filters.status)
      .filter((l) => !filters.location || l.location === filters.location)
      .filter(
        (l) =>
          !q ||
          l.title.toLowerCase().includes(q) ||
          l.want_book.toLowerCase().includes(q) ||
          l.condition.toLowerCase().includes(q) ||
          l.found_place.toLowerCase().includes(q),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.listing_id - a.listing_id)
      .map((l) => this.toListing(l))
  }

  /** GET /listings/{id} */
  getListing(id: number): Listing {
    const l = this.findListing(id)
    if (l.is_hidden) throw new ApiError(404, '找不到刊登')
    return this.toListing(l)
  }

  /** POST /listings */
  createListing(actorId: number | null, input: ListingInput): Listing {
    const actor = this.requireUser(actorId)
    this.validate(input)
    if (actor.role === 'guest' && !GUEST_TYPES.includes(input.type)) {
      throw new ApiError(403, '訪客只能刊登漂流書櫃與失物招領')
    }
    return this.toListing(this.insertListing(actor.user_id, input))
  }

  /** PATCH /listings/{id}: owner or admin only. The type cannot be changed. */
  updateListing(
    actorId: number | null,
    id: number,
    patch: Partial<Omit<ListingInput, 'type'>> & { status?: ListingStatus; is_hidden?: boolean },
  ): Listing {
    const actor = this.requireUser(actorId)
    const l = this.findListing(id)
    if (!this.canManage(actor, l)) throw new ApiError(403, '只有物主或管理員可以修改')
    const merged: ListingInput = {
      type: l.type,
      title: patch.title ?? l.title,
      want_book: patch.want_book ?? l.want_book,
      category: patch.category ?? l.category,
      condition: patch.condition ?? l.condition,
      found_place: patch.found_place ?? l.found_place,
      image: patch.image ?? l.image,
      location: patch.location ?? l.location,
      location_note: patch.location_note ?? l.location_note,
    }
    this.validate(merged, l.image)
    if (patch.status && patch.status !== 'open' && patch.status !== doneStatus(l.type)) {
      throw new ApiError(422, '狀態不正確')
    }
    if (patch.is_hidden !== undefined && actor.role !== 'admin') {
      throw new ApiError(403, '只有管理員可以隱藏刊登')
    }
    l.title = merged.title.trim()
    l.want_book = l.type === 'swap' ? merged.want_book.trim() : ''
    l.category = merged.category.trim()
    l.condition = l.type === 'lost_found' ? '' : merged.condition.trim()
    l.found_place = l.type === 'lost_found' ? merged.found_place.trim() : ''
    l.image = merged.image
    l.location = merged.location
    l.location_note = merged.location_note.trim()
    if (patch.status) l.status = patch.status
    if (patch.is_hidden !== undefined) l.is_hidden = patch.is_hidden
    return this.toListing(l)
  }

  /** DELETE /listings/{id}: owner or admin only */
  deleteListing(actorId: number | null, id: number): void {
    const actor = this.requireUser(actorId)
    const l = this.findListing(id)
    if (!this.canManage(actor, l)) throw new ApiError(403, '只有物主或管理員可以刪除')
    this.listings = this.listings.filter((x) => x.listing_id !== id)
    this.requests = this.requests.filter((r) => r.listing_id !== id)
  }

  // ---- requests ---------------------------------------------------------

  /**
   * POST /listings/{id}/requests
   * `note`: swap = the book offered in return, lost_found = item features (both required),
   * giveaway = optional message.
   */
  createRequest(actorId: number | null, listingId: number, note = ''): ListingRequest {
    const actor = this.requireUser(actorId)
    if (actor.role === 'guest') throw new ApiError(403, '訪客無法提出申請，請以帳號登入')
    const l = this.findListing(listingId)
    if (l.is_hidden) throw new ApiError(404, '找不到刊登')
    if (l.owner_id === actor.user_id) throw new ApiError(409, '不能申請自己的刊登')
    if (l.status !== 'open') throw new ApiError(409, '此刊登已不開放申請')
    const text = note.trim()
    if (requestNoteRequired(l.type) && !text) {
      throw new ApiError(422, l.type === 'swap' ? '請填寫你可以提供的書' : '請填寫物品特徵說明')
    }
    if (text.length > NOTE_MAX) throw new ApiError(422, `說明不可超過 ${NOTE_MAX} 字`)
    rejectContact('申請說明', text)
    const dup = this.requests.find(
      (r) => r.listing_id === listingId && r.requester_id === actor.user_id && r.status === 'pending',
    )
    if (dup) throw new ApiError(409, '你已經申請過這筆刊登')
    const rec: RequestRecord = {
      request_id: this.nextRequestId++,
      listing_id: listingId,
      requester_id: actor.user_id,
      note: text,
      status: 'pending' as RequestStatus,
      created_at: new Date().toISOString(),
    }
    this.requests.push(rec)
    return this.toRequest(rec)
  }

  /** Requests on one listing: only the listing owner (or admin) may see them */
  getRequestsForListing(actorId: number | null, listingId: number): ListingRequest[] {
    const actor = this.requireUser(actorId)
    const l = this.findListing(listingId)
    if (!this.canManage(actor, l)) throw new ApiError(403, '只有物主可以查看申請')
    return this.requests.filter((r) => r.listing_id === listingId).map((r) => this.toRequest(r))
  }

  /** The signed-in student's own requests, with the listing title */
  getMyRequests(actorId: number | null): Array<ListingRequest & { listing_title: string }> {
    const actor = this.requireUser(actorId)
    return this.requests
      .filter((r) => r.requester_id === actor.user_id)
      .map((r) => ({ ...this.toRequest(r), listing_title: this.findListing(r.listing_id).title }))
  }

  /** PATCH /requests/{id}: only the listing owner may accept or decline */
  respondToRequest(
    actorId: number | null,
    requestId: number,
    decision: 'accepted' | 'declined',
  ): ListingRequest {
    const actor = this.requireUser(actorId)
    const r = this.requests.find((x) => x.request_id === requestId)
    if (!r) throw new ApiError(404, '找不到申請')
    const l = this.findListing(r.listing_id)
    if (actor.user_id !== l.owner_id) throw new ApiError(403, '只有刊登物主可以回覆申請')
    if (r.status !== 'pending') throw new ApiError(409, '此申請已處理')
    r.status = decision
    if (decision === 'accepted') {
      l.status = doneStatus(l.type)
      for (const other of this.requests) {
        if (other.listing_id === l.listing_id && other.request_id !== r.request_id && other.status === 'pending') {
          other.status = 'declined'
        }
      }
    }
    return this.toRequest(r)
  }
}

export const api = new MockApi()
