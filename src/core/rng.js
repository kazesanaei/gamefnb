// Bộ sinh số ngẫu nhiên tất định (mulberry32). Trạng thái là số uint32 nằm trong object JSON
// (vd shift.rng) để lưu/khôi phục nguyên vẹn. Không dùng hàm ngẫu nhiên của trình duyệt.

// FNV-1a 32 bit trên chuỗi (theo mã UTF-16, đủ cho băm/giá trị kiểm tra).
export function hashString(str) {
  let h = 0x811c9dc5
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// Băm nhiều phần (số/chuỗi) thành một seed uint32.
export function seedFrom(...parts) {
  return hashString(parts.map(p => String(p)).join('␟'))
}

// Số thực trong [0,1); đọc/ghi holder[key].
export function nextFloat(holder, key = 'rng') {
  let a = (Number(holder[key]) >>> 0)
  a = (a + 0x6d2b79f5) >>> 0
  holder[key] = a
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Số nguyên trong [min, max] (cả hai đầu).
export function nextInt(holder, min, max, key = 'rng') {
  const lo = Math.ceil(Math.min(min, max))
  const hi = Math.floor(Math.max(min, max))
  return lo + Math.floor(nextFloat(holder, key) * (hi - lo + 1))
}

// true với xác suất p.
export function chance(holder, p, key = 'rng') {
  return nextFloat(holder, key) < p
}

// Số thực trong [min, max).
export function nextRange(holder, min, max, key = 'rng') {
  return min + nextFloat(holder, key) * (max - min)
}

export function pick(holder, arr, key = 'rng') {
  if (!arr || arr.length === 0) return undefined
  return arr[Math.floor(nextFloat(holder, key) * arr.length)]
}

// items: [{w, ...}]; phần tử có w ≤ 0 không bao giờ được chọn.
export function weightedPick(holder, items, key = 'rng') {
  if (!items || items.length === 0) return undefined
  let sum = 0
  for (const it of items) sum += Math.max(0, Number(it.w) || 0)
  if (sum <= 0) return items[0]
  let r = nextFloat(holder, key) * sum
  for (const it of items) {
    const w = Math.max(0, Number(it.w) || 0)
    if (w <= 0) continue
    if (r < w) return it
    r -= w
  }
  // sai số làm tròn: trả phần tử cuối có trọng số dương
  for (let i = items.length - 1; i >= 0; i--) if ((Number(items[i].w) || 0) > 0) return items[i]
  return items[items.length - 1]
}

// Fisher–Yates, trả mảng mới.
export function shuffle(holder, arr, key = 'rng') {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextFloat(holder, key) * (i + 1))
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp
  }
  return a
}

// Hàm rand() dùng cho nội dung (makeSpeech, makeReview…), đọc cùng trạng thái holder[key].
export function makeRand(holder, key = 'rng') {
  return () => nextFloat(holder, key)
}
