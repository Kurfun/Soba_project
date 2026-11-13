export type Role = 'student' | 'admin' | 'guest'
/** giveaway = 漂流書櫃, swap = 好書交換, lost_found = 失物招領 (found items) */
export type ListingType = 'giveaway' | 'swap' | 'lost_found'
export type ListingStatus = 'open' | 'closed' | 'resolved'
export type RequestStatus = 'pending' | 'accepted' | 'declined'

/** Public user info: never includes email or other private contact details. */
export interface PublicUser {
  user_id: number
  display_name: string
  role: Role
}

export interface Listing {
  listing_id: number
  owner_id: number
  owner_name: string
  type: ListingType
  title: string // giveaway: the book; swap: the book offered; lost_found: the item
  want_book: string // swap only: the book the owner wants in return
  category: string
  condition: string // giveaway: 描述 (free-text description); swap: 書況; lost_found: unused
  found_place: string // lost_found only: short note on where the item was found (拾獲地點)
  image: string // uploaded picture as a data URL; empty string = no picture
  location: string // handoff place (giveaway/swap) or custody unit (lost_found)
  location_note: string // detailed address or notes; never private contact details
  status: ListingStatus
  is_hidden: boolean
  created_at: string
}

export interface ListingRequest {
  request_id: number
  listing_id: number
  requester_id: number
  requester_name: string
  note: string // swap: the book offered in return; lost_found: item features; giveaway: optional
  status: RequestStatus
  created_at: string
}

export interface ListingInput {
  type: ListingType
  title: string
  want_book: string
  category: string
  condition: string
  found_place: string
  image: string
  location: string
  location_note: string
}

export interface ListingFilters {
  q?: string
  category?: string
  type?: ListingType | ''
  status?: ListingStatus | ''
  location?: string
}

export const FOUND_PLACE_MAX = 50
export const IMAGE_MAX_DIM = 1024 // longest side after client-side downscale
export const IMAGE_MAX_FILE = 8 * 1024 * 1024 // reject picked files larger than 8 MB
export const IMAGE_MAX_DATA = 1_500_000 // max length of the stored data URL

export const LOCATIONS = ['警衛室', '圖書館', '商學院', '學生餐廳', '其他'] as const
export const BOOK_CATEGORIES = ['教科書', '課外書籍', '考試用書', '其他書籍']
export const LOST_CATEGORIES = ['證件/錢包', '電子產品', '生活用品', '服飾', '其他']

export const TYPE_LABEL: Record<ListingType, string> = {
  giveaway: '漂流書櫃',
  swap: '好書交換',
  lost_found: '失物招領',
}

/** Guests may only post giveaways and lost-and-found items. */
export const GUEST_TYPES: ListingType[] = ['giveaway', 'lost_found']

export function roleLabel(role: Role): string {
  return role === 'admin' ? '管理員' : role === 'guest' ? '訪客' : '學生'
}

export function categoriesFor(type: ListingType): string[] {
  return type === 'lost_found' ? LOST_CATEGORIES : BOOK_CATEGORIES
}

/** Giveaway/swap have a handoff place; lost-and-found items are kept by a unit. */
export function locationLabel(type: ListingType): string {
  return type === 'lost_found' ? '保管單位' : '交付地點'
}

/** giveaway calls the field 描述; swap calls it 書況; lost_found has none. */
export function conditionLabel(type: ListingType): string {
  return type === 'giveaway' ? '描述' : '書況'
}

/** The status a listing moves to when it is finished. */
export function doneStatus(type: ListingType): ListingStatus {
  return type === 'lost_found' ? 'resolved' : 'closed'
}

export function statusLabel(type: ListingType, status: ListingStatus): string {
  if (status === 'open') return '開啟'
  if (type === 'giveaway' && status === 'closed') return '已送出'
  if (type === 'swap' && status === 'closed') return '已換出'
  if (status === 'resolved') return '已解決'
  return '已關閉'
}

export function requestNoteLabel(type: ListingType): string {
  if (type === 'swap') return '我可以提供的書（必填）'
  if (type === 'lost_found') return '物品特徵說明，用來證明是你的（必填）'
  return '想對物主說的話（選填）'
}

export function requestNoteRequired(type: ListingType): boolean {
  return type !== 'giveaway'
}
