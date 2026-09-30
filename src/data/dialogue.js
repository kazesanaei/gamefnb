// Lời thoại: câu gọi món tự nhiên theo vùng giọng, câu phản hồi ở quầy, lời NPC.
// Hàm thuần: mọi ngẫu nhiên lấy từ `rand()` truyền vào (trả số trong [0,1)).

import { PERSONAS, NAMES, REGULARS } from './customers.js'

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

// ---------- Từ vựng theo vùng ----------

// Cách khách gọi tên món và đơn vị đếm theo vùng giọng.
export const SPOKEN = deepFreeze({
  dishes: {
    banh_mi_op_la: {
      nam: { unit: 'ổ', names: ['ốp la', 'bánh mì ốp la', 'bánh mì trứng'] },
      bac: { unit: 'cái', names: ['bánh mì trứng', 'bánh mì ốp la'] }
    },
    tra_tac: {
      nam: { unit: 'ly', names: ['trà tắc'] },
      bac: { unit: 'cốc', names: ['trà quất'] }
    },
    banh_trang_tron: {
      nam: { unit: 'bịch', names: ['bánh tráng trộn', 'bánh tráng trộn thập cẩm'] },
      bac: { unit: 'túi', names: ['bánh tráng trộn'] }
    },
    ca_phe_sua_da: {
      nam: { unit: 'ly', names: ['cà phê sữa đá', 'cà phê sữa'] },
      bac: { unit: 'cốc', names: ['nâu đá', 'cà phê nâu đá'] }
    },
    che_buoi: {
      nam: { unit: 'ly', names: ['chè bưởi'] },
      bac: { unit: 'cốc', names: ['chè bưởi'] }
    }
  },
  notes: {
    khong_hanh: { nam: ['hổng hành', 'khỏi hành', 'không hành'], bac: ['không hành', 'không cho hành', 'không hành hoa'] },
    cay: { nam: ['cay', 'có ớt', 'thêm tương ớt'], bac: ['cay', 'có ớt', 'cho tương ớt'] },
    long_dao: { nam: ['trứng lòng đào', 'lòng đào'], bac: ['trứng lòng đào', 'rán lòng đào'] },
    chin_ky: { nam: ['trứng chín kỹ', 'chiên chín kỹ'], bac: ['trứng chín kỹ', 'rán chín kỹ'] },
    them_trung: { nam: ['thêm trứng', 'thêm một trứng'], bac: ['thêm một quả trứng', 'thêm quả trứng'] },
    it_duong: { nam: ['ít đường', 'ít ngọt'], bac: ['ít đường', 'bớt đường'] },
    nhieu_duong: { nam: ['nhiều đường', 'ngọt nhiều'], bac: ['nhiều đường', 'thêm đường'] },
    khong_da: { nam: ['khỏi đá', 'hổng đá', 'không đá'], bac: ['không đá', 'không lấy đá'] },
    khong_cay: { nam: ['hổng cay', 'khỏi cay', 'không cay'], bac: ['không cay', 'không lấy cay'] },
    cay_nhieu: { nam: ['cay nhiều', 'cay xé lưỡi'], bac: ['cay nhiều', 'thật cay'] },
    khong_rau_ram: { nam: ['hổng rau răm', 'khỏi rau răm'], bac: ['không rau răm', 'bỏ rau răm'] },
    them_trung_cut: { nam: ['thêm trứng cút'], bac: ['thêm trứng cút', 'thêm trứng chim cút'] },
    it_ngot: { nam: ['ít ngọt', 'bớt ngọt'], bac: ['ít ngọt', 'bớt ngọt'] },
    ngot_dam: { nam: ['ngọt đậm', 'ngọt nhiều'], bac: ['ngọt đậm', 'đậm sữa'] },
    it_da: { nam: ['ít đá'], bac: ['ít đá'] },
    nhieu_cot_dua: { nam: ['nhiều nước cốt dừa', 'nhiều cốt dừa'], bac: ['nhiều nước cốt dừa', 'nhiều cốt dừa'] }
  }
})

// Cặp từ đồng nghĩa Nam – Bắc (dùng cho Sổ từ vùng miền).
export const SYNONYMS = deepFreeze([
  { id: 'khong', nam: 'hổng', bac: 'không', meaning: 'Không (phủ định)' },
  { id: 'khong_hanh', nam: 'hổng hành', bac: 'không hành', meaning: 'Không cho hành lá' },
  { id: 'khong_da', nam: 'khỏi đá', bac: 'không lấy đá', meaning: 'Không bỏ đá' },
  { id: 'tra_tac', nam: 'trà tắc', bac: 'trà quất', meaning: 'Trà pha với trái tắc (quả quất)' },
  { id: 'ly', nam: 'ly', bac: 'cốc', meaning: 'Cái ly, cái cốc đựng nước' },
  { id: 'o_banh_mi', nam: 'ổ bánh mì', bac: 'cái bánh mì', meaning: 'Một chiếc bánh mì' },
  { id: 'ca_phe_sua_da', nam: 'cà phê sữa đá', bac: 'nâu đá', meaning: 'Cà phê pha sữa đặc, thêm đá' },
  { id: 'chien', nam: 'chiên', bac: 'rán', meaning: 'Làm chín trong chảo dầu' },
  { id: 'hanh_la', nam: 'hành lá', bac: 'hành hoa', meaning: 'Lá hành xanh' },
  { id: 'ngo', nam: 'ngò', bac: 'rau mùi', meaning: 'Rau thơm lá nhỏ, mùi đặc trưng' },
  { id: 'dau_phong', nam: 'đậu phộng', bac: 'lạc', meaning: 'Hạt đậu phộng, hạt lạc' },
  { id: 'lat', nam: 'lạt', bac: 'nhạt', meaning: 'Ít mặn, ít vị' },
  { id: 'nghen', nam: 'nghen', bac: 'nhé', meaning: 'Đuôi câu nhờ vả thân mật' },
  { id: 'bich', nam: 'bịch', bac: 'túi', meaning: 'Túi nilon đựng đồ ăn' },
  { id: 'hot_ga', nam: 'hột gà', bac: 'trứng gà', meaning: 'Trứng gà' },
  { id: 'muong', nam: 'muỗng', bac: 'thìa', meaning: 'Dụng cụ múc, xúc' },
  { id: 'dia', nam: 'dĩa', bac: 'đĩa', meaning: 'Đồ đựng thức ăn phẳng' },
  { id: 'trai', nam: 'trái', bac: 'quả', meaning: 'Trái cây, quả' },
  { id: 'mac', nam: 'mắc', bac: 'đắt', meaning: 'Giá cao' },
  { id: 'tien_thoi', nam: 'tiền thối', bac: 'tiền thừa', meaning: 'Tiền trả lại cho khách' },
  { id: 'heo', nam: 'thịt heo', bac: 'thịt lợn', meaning: 'Thịt heo, thịt lợn' },
  { id: 'thom', nam: 'trái thơm', bac: 'quả dứa', meaning: 'Trái thơm, quả dứa' }
])

// ---------- Tiện ích ----------

function safeRand(rand) {
  return typeof rand === 'function' ? rand : () => 0
}

function pickOne(arr, rand) {
  if (!arr || arr.length === 0) return ''
  const i = Math.floor(rand() * arr.length)
  return arr[Math.min(arr.length - 1, Math.max(0, i))]
}

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

function fmtMoney(n) {
  const v = Math.round(Number(n) || 0)
  const sign = v < 0 ? '-' : ''
  return sign + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}

function normRegion(region) {
  return region === 'bac' ? 'bac' : 'nam'
}

// Giới tính khách: ưu tiên `gender`, sau đó đoán theo tên, cuối cùng ngẫu nhiên.
function resolveGender(gender, name, rand) {
  if (gender === 'nam' || gender === 'nu') return gender
  if (typeof name === 'string' && name) {
    const base = name.trim().split(/\s+/).pop()
    if (NAMES.nu.includes(base)) return 'nu'
    if (NAMES.nam.includes(base)) return 'nam'
  }
  return rand() < 0.5 ? 'nam' : 'nu'
}

// Kiểu khách: nhận id ('hoc_sinh') hoặc object có trường id.
function personaId(persona) {
  if (typeof persona === 'string') return persona
  return persona && typeof persona.id === 'string' ? persona.id : ''
}

// Cách khách tự xưng.
function resolveSelf(pid, gender, rand) {
  const p = PERSONAS[pid]
  const list = (p && p.selfByGender && p.selfByGender[gender]) || ['em']
  return pickOne(list, rand)
}

// Cách khách gọi người bán (rỗng khi không hợp để gọi).
function callFor(self, region) {
  if (self === 'anh' || self === 'chị') return 'em'
  if (self === 'cô' || self === 'chú') return region === 'bac' ? 'cháu' : 'con'
  return ''
}

// Thay {khóa} bằng giá trị; trả null nếu thiếu giá trị nào.
function fill(template, vars) {
  let ok = true
  const out = template.replace(/\{(\w+)\}/g, (_, key) => {
    let v = vars[key]
    if (v === undefined && /^[A-Z]/.test(key)) {
      const low = vars[key.charAt(0).toLowerCase() + key.slice(1)]
      v = typeof low === 'string' ? capFirst(low) : low
    }
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) {
      ok = false
      return ''
    }
    return String(v)
  })
  return ok ? out : null
}

// Chọn một mẫu dùng được (đủ biến, hợp kiểu khách) rồi điền.
function renderFrom(templates, vars, persona, rand) {
  const usable = []
  for (const t of templates) {
    const text = typeof t === 'string' ? t : t.t
    if (typeof t === 'object' && t.p && !t.p.includes(persona)) continue
    const filled = fill(text, vars)
    if (filled) usable.push(filled)
  }
  if (usable.length === 0) return ''
  return capFirst(pickOne(usable, rand))
}

// ---------- Câu gọi món ----------

function dishWords(recipeId, region, recipes) {
  const d = SPOKEN.dishes[recipeId]
  if (d && d[region]) return d[region]
  const r = recipes && recipes[recipeId]
  const name = r && r.name ? lowerFirst(r.name) : 'món này'
  return { unit: 'phần', names: [name] }
}

function noteWord(recipeId, noteId, region, recipes, rand) {
  const n = SPOKEN.notes[noteId]
  if (n && n[region] && n[region].length) return pickOne(n[region], rand)
  const r = recipes && recipes[recipeId]
  const note = r && Array.isArray(r.notes) ? r.notes.find(x => x.id === noteId) : null
  return note && note.label ? lowerFirst(note.label) : ''
}

// Ghép ghi chú; bỏ chữ lặp với cuối tên món ("bánh mì trứng" + "trứng chín kỹ" → "bánh mì trứng chín kỹ").
function notesPhrase(recipeId, notes, region, recipes, rand, dishName = '') {
  const last = dishName.split(' ').pop()
  const words = (notes || []).map(id => noteWord(recipeId, id, region, recipes, rand)).filter(Boolean)
  if (words.length && last && words[0].startsWith(last + ' ')) words[0] = words[0].slice(last.length + 1)
  return words.join(', ')
}

// Khách quen có cách tự xưng cố định; nhận ra qua regularId hoặc tên.
function regularOf(regularId, name) {
  if (regularId && REGULARS[regularId]) return REGULARS[regularId]
  if (typeof name === 'string' && name) return Object.values(REGULARS).find(x => x.name === name) || null
  return null
}

function qtyPhrase(qty, unit, region, rand, single) {
  const q = Math.max(1, Math.floor(Number(qty) || 1))
  if (q === 1 && single) {
    if (region === 'bac' && rand() < 0.5) return unit           // "cái bánh mì trứng"
    return (rand() < 0.5 ? 'một' : '1') + ' ' + unit
  }
  return `${q} ${unit}`
}

// Gom các dòng cùng món, giữ thứ tự xuất hiện.
function groupLines(request) {
  const groups = []
  const byId = {}
  for (const line of request || []) {
    if (!line || !line.recipeId) continue
    if (!byId[line.recipeId]) {
      byId[line.recipeId] = { recipeId: line.recipeId, lines: [] }
      groups.push(byId[line.recipeId])
    }
    byId[line.recipeId].lines.push(line)
  }
  return groups
}

function groupPhrase(group, region, recipes, rand, single, allowTailNotes) {
  const words = dishWords(group.recipeId, region, recipes)
  const name = pickOne(words.names, rand)
  const unit = words.unit
  // Gộp các dòng trùng ghi chú (cộng số lượng) để câu nói không lặp.
  const merged = {}
  const lines = []
  for (const l of group.lines) {
    const key = [...(l.notes || [])].sort().join('|')
    const q = Math.max(1, Math.floor(Number(l.qty) || 1))
    if (merged[key]) merged[key].qty += q
    else { merged[key] = { recipeId: l.recipeId, qty: q, notes: l.notes || [] }; lines.push(merged[key]) }
  }
  if (lines.length === 1) {
    const line = lines[0]
    const notes = notesPhrase(group.recipeId, line.notes, region, recipes, rand, name)
    const head = `${qtyPhrase(line.qty, unit, region, rand, single)} ${name}`
    if (!notes) return head
    // "Cho cô cái bánh mì trứng, không cho hành nhé."
    if (allowTailNotes && rand() < 0.4) return `${head}, ${notes}`
    return `${head} ${notes}`
  }
  // Nhiều dòng cùng món, khác ghi chú: nói rõ từng phần.
  const total = lines.reduce((s, l) => s + l.qty, 0)
  const head = `${total} ${unit} ${name}`
  const noted = lines.filter(l => l.notes && l.notes.length)
  const hasPlain = noted.length < lines.length
  const subs = (hasPlain ? noted : lines).map(l => {
    const n = notesPhrase(group.recipeId, l.notes, region, recipes, rand)
    return n ? `${l.qty} ${unit} ${n}` : `${l.qty} ${unit} ${region === 'bac' ? 'bình thường' : 'thường'}`
  })
  const joined = subs.join(' và ')
  return hasPlain ? `${head}, trong đó ${joined}` : `${head}, ${joined}`
}

const OPENERS = {
  nam: [
    { t: 'Cho {self} {items}' }, { t: 'Bán cho {self} {items}' }, { t: 'Làm cho {self} {items}' },
    { t: 'Lấy cho {self} {items}' }, { t: '{Call} ơi, cho {self} {items}' },
    { t: 'Dạ, cho {self} {items}', p: ['hoc_sinh'] }
  ],
  bac: [
    { t: 'Cho {self} {items}' }, { t: 'Bán cho {self} {items}' }, { t: 'Lấy cho {self} {items}' },
    { t: 'Làm cho {self} {items}' }, { t: '{Call} ơi, cho {self} {items}' },
    { t: 'Dạ, cho {self} {items}', p: ['hoc_sinh'] }
  ]
}

const TAILS = {
  nam: [
    { t: ' nghen!' }, { t: ' nha!' }, { t: ' nghen {call}!' }, { t: ' nha {call}!' },
    { t: ' ạ!', p: ['hoc_sinh'] },
    { t: ', {self} hơi vội nha!', p: ['van_phong', 'cong_nhan'] },
    { t: ' nha, nhanh giùm {self} nghen!', p: ['van_phong', 'cong_nhan'] },
    { t: ' nha, làm cẩn thận giùm {self}!', p: ['kho_tinh'] },
    { t: '. Làm đúng giùm {self} nha!', p: ['kho_tinh'] }
  ],
  bac: [
    { t: ' nhé!' }, { t: ' nhé {call}!' }, { t: ' với!' }, { t: ' nhé, cảm ơn {call}!' },
    { t: ' ạ!', p: ['hoc_sinh'] }, { t: ' với ạ!', p: ['hoc_sinh'] },
    { t: ' nhé, {self} đang vội!', p: ['van_phong', 'cong_nhan'] },
    { t: ' nhé, nhanh giúp {self} với!', p: ['van_phong', 'cong_nhan'] },
    { t: ' nhé, làm cẩn thận giúp {self}!', p: ['kho_tinh'] },
    { t: '. Làm đúng giúp {self} nhé!', p: ['kho_tinh'] }
  ]
}

/**
 * Câu gọi món tự nhiên: [xưng hô] + [số lượng + món] + [ghi chú] + [đuôi câu].
 * Tham số thêm (tùy chọn): gender ('nam'|'nu'), name (đoán giới theo tên), regularId, firstVisit.
 */
export function makeSpeech({ request, persona: personaIn, region, recipes, rand, gender, name, regularId, firstVisit } = {}) {
  const r = safeRand(rand)
  const persona = personaId(personaIn)
  const reg = normRegion(region)
  const g = resolveGender(gender, name, r)
  const regular = regularOf(regularId, null)
  const self = (regular && regular.self) || resolveSelf(persona, g, r)
  const call = callFor(self, reg)
  const groups = groupLines(request)
  const single = groups.length === 1 && groups[0].lines.length === 1
  const parts = groups.map(gr => groupPhrase(gr, reg, recipes, r, single, single))
  let items
  if (parts.length === 0) items = 'một phần như mọi khi'
  else if (parts.length === 1) items = parts[0]
  else {
    const last = parts[parts.length - 1]
    const before = parts.slice(0, -1).join(', ')
    const prevHasComma = parts[parts.length - 2].includes(',')
    const conj = reg === 'bac' ? 'và' : 'với'
    items = `${before}${prevHasComma ? ',' : ''} ${conj} ${last}`
  }
  const vars = { self, call, items }
  // Chọn mở câu trước; nếu mở câu đã gọi người bán thì đuôi câu không gọi lại lần nữa.
  const openers = OPENERS[reg].filter(o => (!o.p || o.p.includes(persona)) && fill(o.t, vars))
  const op = openers.length ? pickOne(openers, r) : { t: 'Cho {self} {items}' }
  const opener = capFirst(fill(op.t, vars) || `cho ${self} ${items}`)
  const usedCall = op.t.includes('{Call}')
  const tails = TAILS[reg].filter(t => !(usedCall && t.t.includes('{call}')))
  const tail = renderFrom(tails, vars, persona, r)
  let text = opener + (tail ? lowerTail(tail) : '!')
  if (regular) {
    const pre = firstVisit ? regular.greeting : regular.returnGreeting
    if (pre) text = `${pre} ${text}`
  }
  return text
}

// renderFrom viết hoa chữ đầu; đuôi câu phải giữ nguyên chữ thường.
function lowerTail(s) {
  return /^[A-ZÀ-Ỹ]/.test(s.charAt(0)) ? lowerFirst(s) : s
}

// ---------- Câu phản hồi ở quầy ----------

// Mẫu câu theo loại; phần tử {t, p} chỉ dùng cho các kiểu khách trong p.
const LINES = {
  greet: {
    nam: ['Chào {call} nha!', 'Mở hàng rồi hả {call}?', 'Xe mới hả? Để {self} ủng hộ một bữa.', 'Sáng nay bán gì ngon vậy ta?',
      { t: 'Dạ, {self} chào ạ!', p: ['hoc_sinh'] }],
    bac: ['Chào {call} nhé!', 'Hôm nay bán sớm thế!', 'Xe mới à? Để {self} ủng hộ một hôm.', 'Sáng nay có gì ngon thế?',
      { t: 'Dạ, {self} chào ạ!', p: ['hoc_sinh'] }]
  },
  readback_ok: {
    nam: ['Đúng rồi {call}!', 'Ừa, đúng rồi đó.', 'Chuẩn luôn!', { t: 'Dạ đúng rồi ạ!', p: ['hoc_sinh'] }],
    bac: ['Đúng rồi {call}!', 'Ừ, đúng rồi đấy.', 'Chuẩn rồi!', { t: 'Dạ đúng rồi ạ!', p: ['hoc_sinh'] }]
  },
  readback_wrong: {
    nam: ['Khoan, {self} gọi {line} mà!', 'Ủa, hông phải vậy đâu, {line} chứ.', 'Sai rồi {call} ơi, nghe lại giùm {self} nha.',
      'Hông đúng rồi, ghi lại giùm {self} nghen.'],
    bac: ['Khoan, {self} gọi {line} cơ mà!', 'Không phải, {line} chứ.', 'Nhầm rồi {call} ơi, nghe lại giúp {self} nhé.',
      'Không đúng rồi, ghi lại giúp {self} nhé.']
  },
  total_too_high: {
    nam: ['Sao nhiều vậy {call}? Tính lại giùm {self} coi.', '{total} lận hả? Hình như tính lộn rồi.',
      'Ủa, sao mắc vậy ta? Tính lại đi {call}.', 'Hình như tính dư rồi đó.'],
    bac: ['Sao nhiều thế {call}? Tính lại giúp {self} nhé.', '{total} á? Hình như nhầm rồi.',
      'Sao đắt thế nhỉ? Tính lại đi {call}.', 'Hình như tính thừa rồi đấy.']
  },
  total_ok: {
    nam: ['Ờ, gửi {call} nè.', 'Nè, tiền nè.', '{total} hả, được, gửi nè.', { t: 'Dạ, {self} gửi ạ.', p: ['hoc_sinh'] }],
    bac: ['Ừ, gửi {call} này.', 'Đây, tiền đây.', '{total} à, đây nhé.', { t: 'Dạ, {self} gửi ạ.', p: ['hoc_sinh'] }]
  },
  change_short: {
    nam: ['Ủa, thối thiếu rồi {call} ơi.', 'Đếm lại coi, còn thiếu {diff} nè.', 'Hình như chưa đủ tiền thối đó.'],
    bac: ['Hình như trả thiếu tiền thừa rồi {call} ơi.', 'Còn thiếu {diff} nhé.', 'Đếm lại xem, chưa đủ đâu.']
  },
  change_over_returned: {
    nam: ['Thối dư nè {call}, {self} gửi lại nha.', 'Dư {diff} nè, cầm lại đi, buôn bán nhỏ mà.', 'Đưa dư rồi nè, lần sau đếm kỹ nha.'],
    bac: ['Trả thừa rồi này, {self} gửi lại nhé.', 'Thừa {diff} đây, cầm lại đi.', 'Đưa thừa rồi, lần sau đếm kỹ nhé.']
  },
  change_ok: {
    nam: ['Đủ rồi, cảm ơn nha.', 'Rồi, đủ rồi đó.', { t: 'Dạ đủ rồi ạ.', p: ['hoc_sinh'] }],
    bac: ['Đủ rồi, cảm ơn nhé.', 'Ừ, đủ rồi.', { t: 'Dạ đủ rồi ạ.', p: ['hoc_sinh'] }]
  },
  qr_paid: {
    nam: ['{Self} chuyển khoản rồi nha, {call} coi giùm.', 'Chuyển rồi đó, kiểm tra giùm {self} nha.'],
    bac: ['{Self} chuyển khoản rồi nhé, {call} xem giúp.', 'Chuyển rồi đấy, kiểm tra giúp {self} nhé.']
  },
  // két hết tiền lẻ: khách có / không có tiền lẻ; đồng ý chuyển khoản
  no_small_change_yes: {
    nam: ['Có nè, đưa vừa đủ luôn nha.', 'Để {self} coi… có nè, gửi {call} đủ luôn.', { t: 'Dạ có ạ, {self} gửi vừa đủ ạ.', p: ['hoc_sinh'] }],
    bac: ['Có đây, đưa vừa đủ luôn nhé.', 'Để {self} xem… có đây, gửi {call} đủ luôn.', { t: 'Dạ có ạ, {self} gửi vừa đủ ạ.', p: ['hoc_sinh'] }]
  },
  no_small_change_no: {
    nam: ['Hổng có rồi, tính sao đây?', 'Tiền lẻ hết trơn rồi {call} ơi.', { t: 'Dạ {self} hổng có tiền lẻ ạ.', p: ['hoc_sinh'] }],
    bac: ['Không có rồi, tính sao bây giờ?', 'Hết tiền lẻ mất rồi {call} ạ.', { t: 'Dạ {self} không có tiền lẻ ạ.', p: ['hoc_sinh'] }]
  },
  qr_ok: {
    nam: ['Được, để {self} quét mã.', 'Ừa, chuyển khoản cũng được.', { t: 'Dạ được ạ, {self} quét mã liền.', p: ['hoc_sinh'] }],
    bac: ['Được, để {self} quét mã.', 'Ừ, chuyển khoản cũng được.', { t: 'Dạ được ạ, {self} quét mã luôn.', p: ['hoc_sinh'] }]
  },
  thanks: {
    nam: ['Cảm ơn {call} nha!', 'Hôm sau {self} ghé nữa nghen.', 'Cảm ơn nha, chúc bán đắt hàng!', { t: 'Dạ, {self} cảm ơn ạ!', p: ['hoc_sinh'] }],
    bac: ['Cảm ơn {call} nhé!', 'Hôm sau {self} lại ghé.', 'Cảm ơn nhé, chúc đắt hàng!', { t: 'Dạ, {self} cảm ơn ạ!', p: ['hoc_sinh'] }]
  },
  wait_long: {
    nam: ['Lâu quá hà...', 'Món của {self} sắp xong chưa {call}?', 'Đói bụng quá trời luôn...', 'Còn lâu hông {call}?'],
    bac: ['Lâu thế nhỉ...', 'Sắp xong chưa {call}?', 'Đói quá rồi...', 'Còn lâu không {call}?']
  },
  receive_dish: {
    nam: ['Nhìn ngon quá ta!', 'Thơm dữ ha!', 'Được đó, để {self} thử coi.', 'Ngon mắt ghê!'],
    bac: ['Trông ngon đấy!', 'Thơm quá!', 'Được đấy, để {self} ăn thử.', 'Nhìn hấp dẫn ghê!']
  },
  complaint: {
    nam: ['Món này hông giống {self} gọi rồi.', 'Ủa, sao món vầy nè?', '{Mon} hôm nay hơi kỳ nha {call}.'],
    bac: ['Món này không đúng {self} gọi rồi.', 'Sao món lại thế này?', '{Mon} hôm nay hơi lạ đấy {call}.']
  },
  leave_angry: {
    nam: ['Thôi, lâu quá, {self} đi chỗ khác.', 'Chờ hoài hổng tới, thôi đi.', 'Trễ giờ rồi, {self} đi đây.'],
    bac: ['Thôi, lâu quá, {self} đi đây.', 'Đợi mãi chẳng tới lượt, thôi vậy.', 'Muộn giờ mất rồi, {self} đi đây.']
  }
}

export const LINE_KINDS = Object.freeze(Object.keys(LINES))

/**
 * Câu nói ngắn của khách theo tình huống.
 * vars (tùy chọn): total, diff (số đồng hoặc chuỗi), line (mô tả dòng sai), mon (tên món), self, gender, name.
 */
export function makeLine(kind, { persona: personaIn, region, rand, vars } = {}) {
  const r = safeRand(rand)
  const persona = personaId(personaIn)
  const reg = normRegion(region)
  const v = vars || {}
  const g = resolveGender(v.gender, v.name, r)
  const regular = regularOf(v.regularId, v.name)
  const self = v.self || (regular && regular.self) || resolveSelf(persona, g, r)
  const call = callFor(self, reg)
  const data = {
    self, call,
    total: v.total === undefined || v.total === null ? undefined : (typeof v.total === 'number' ? fmtMoney(v.total) : v.total),
    diff: v.diff === undefined || v.diff === null ? undefined : (typeof v.diff === 'number' ? fmtMoney(Math.abs(v.diff)) : v.diff),
    line: v.line, mon: typeof v.mon === 'string' ? lowerFirst(v.mon) : v.mon
  }
  const set = LINES[kind] || LINES.thanks
  const text = renderFrom(set[reg], data, persona, r)
  return text || (reg === 'bac' ? 'Vâng.' : 'Dạ.')
}

// ---------- Đọc lại đơn (lời người bán) ----------

// Mô tả một dòng phiếu: "2 bánh mì ốp la không hành, chín kỹ".
export function describeLine(line, recipes) {
  const r = recipes && recipes[line.recipeId]
  const name = r ? lowerFirst(r.name) : 'món'
  const q = Math.max(1, Math.floor(Number(line.qty) || 1))
  const labels = (line.notes || []).map(id => {
    const n = r && Array.isArray(r.notes) ? r.notes.find(x => x.id === id) : null
    return n ? lowerFirst(n.label) : ''
  }).filter(Boolean)
  return labels.length ? `${q} ${name} ${labels.join(', ')}` : `${q} ${name}`
}

// Câu đọc lại phiếu của người bán.
export function readbackText(lines, recipes) {
  const parts = (lines || []).map(l => describeLine(l, recipes))
  if (parts.length === 0) return 'Dạ, phiếu đang trống ạ.'
  return `${DIALOGUE.readbackPrefix} ${parts.join('; ')} ạ.`
}

// ---------- Lời thoại cố định ----------

export const DIALOGUE = deepFreeze({
  // Màn Xử lý phàn nàn: đúng 1 câu nhận lỗi.
  apologies: [
    { text: 'Dạ, em xin lỗi, lỗi ở em. Em làm lại ngay cho mình ạ.', correct: true },
    { text: 'Tại lúc nãy mình gọi không rõ nên em làm vậy thôi.', correct: false },
    { text: 'Em làm đúng công thức mà, chắc tại khẩu vị mỗi người mỗi khác.', correct: false }
  ],
  // Người bán chào khách mới tới quầy.
  greetings: [
    'Dạ chào, mình dùng gì ạ?',
    'Chào buổi sáng, mình gọi món gì ạ?',
    'Dạ mời, bánh mì nóng giòn mới ra lò nè!',
    'Mình ăn gì, uống gì ạ?'
  ],
  readbackPrefix: 'Dạ em đọc lại:',
  // Khách quen: câu nói khi quay lại.
  regularLines: {
    co_thu: [
      'Như mọi khi nha con!',
      'Bữa nay trứng chiên khéo hông đó?',
      'Cô đi chợ về, ghé ăn ổ bánh mì cho chắc bụng.'
    ],
    ban_nam: [
      'Như mọi khi nha!',
      'Hôm nay kiểm tra mệt quá, cho em ly trà tắc giải khát.',
      'Tụi bạn em khen trà tắc ở đây quá trời!'
    ]
  },
  // Dì Sáu: dẫn dắt, 4 biểu cảm (tu_hao, vui, lo, tiec).
  diSau: {
    intro: 'Dì Sáu đây! Xe này dì cho con thuê lại, ráng buôn bán đàng hoàng nghen.',
    shiftStart: [
      'Mở hàng thôi con! Nhớ đọc lại order cho khách nghe nha.',
      'Hôm nay trời đẹp, chắc đông khách à.',
      'Tiền lẻ đủ chưa con? Thiếu tiền lẻ là kẹt liền đó.'
    ],
    // câu mở ca theo sự kiện ngày (màn Chuẩn bị): không nói "trời đẹp" khi trời mưa
    dayEvent: {
      troi_mua: ['Mưa lâm râm vầy khách thưa, nhưng ai ghé cũng chịu chờ hơn đó con.', 'Trời mưa nhớ căng bạt cho khách đứng đỡ ướt nha con.'],
      nang_nong: ['Nắng vầy ai đi ngang cũng khát, pha sẵn trà tắc cho kịp nha con.', 'Trời oi quá, khách hay dặn ít đường, nghe kỹ nha con.'],
      lanh_luong: ['Bữa nay đầu tháng lãnh lương, khách vui là tip mạnh tay lắm đó.', 'Lãnh lương rồi, khách hào phóng, mình phục vụ cho chu đáo nha con.'],
      cho_phien: ['Chợ phiên đông nghẹt, ca này dài hơn, giữ sức nha con.', 'Hẻm họp chợ, khách tới liên tục, đọc lại order cho kỹ nghen.']
    },
    praise: ['Trời đất, khéo tay dữ vậy con!', 'Món này dì chấm mười điểm!', 'Làm vầy khách nhớ tới hoài.'],
    worry: ['Coi chừng lửa đó con!', 'Khách chờ lâu rồi, nhanh tay lên con.', 'Đọc kỹ phiếu trước khi làm nha.'],
    regret: ['Hơi tiếc ha, lần sau mình làm kỹ hơn.', 'Không sao, té đâu đứng dậy đó.', 'Hỏng thì làm lại, đừng giao món dở cho khách.'],
    loanOffer: 'Kẹt vốn hả con? Dì cho mượn đỡ, bán được thì trả dần.',
    tutorial: {
      order: 'Khách nói gì thì ghi y vậy vào sổ order nha con.',
      readback: 'Ghi xong bấm "Đọc lại đơn" cho khách nghe, sai còn sửa kịp.',
      total: 'Nhìn bảng giá, cộng tổng rồi báo khách. Gõ theo nghìn thôi: gõ 20 là 20.000đ.',
      change: 'Chạm ngăn két để lấy tiền thối, đếm cho đủ rồi bấm "Đưa tiền thối".',
      ticket: 'Thu tiền xong mới kẹp phiếu vào dây bếp nghen.',
      chon: 'Nhìn thẻ công thức, lấy đúng và đủ nguyên liệu. Coi chừng mấy thứ na ná nhau!',
      thot: 'Sơ chế từng thứ trên thớt, làm bước nào trước cũng được, trừ bước phải chờ.',
      serve: 'Món xong rồi, bấm "Giao cho khách" nha con.'
    }
  },
  // Anh Khoa: hướng dẫn công cụ bán hàng.
  anhKhoa: {
    intro: 'Anh là Khoa, chuyên lo máy móc, công cụ bán hàng. Cần gì cứ hỏi nha!',
    qrIntro: 'Khách quét QR xong, đợi loa hoặc thông báo báo tiền về đúng số rồi mới bấm "Đã nhận đủ" nha.',
    fakeQr: 'Ảnh chụp màn hình cũ đó em! Không có thông báo tiền về thì đừng xác nhận.',
    shiftEnd: 'Kết ca trước khi về nha, không mai lệch két là khóc đó!'
  }
})
