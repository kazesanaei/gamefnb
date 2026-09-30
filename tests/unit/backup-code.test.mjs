// Mã sao lưu (M3): 'BKN1.z.' + base64url(nén LZ) + '.' + checksum; nén/giải nén đúng từng byte, sửa 1 ký tự bị phát hiện
// (báo lý do thân thiện, không ném lỗi), dán kèm khoảng trắng/chữ thừa vẫn đọc được, nhận cả mã save thô,
// cất bản cũ sang khóa riêng (không bao giờ ghi đè/xóa), nhắc sao lưu mỗi 7 ngày thật, cài đặt M3 qua migrate.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  exportCode, importCode, readCode, extractCode, backupSummary, lzCompress, lzDecompress, encodeSave, migrate,
  migrateSettings, archiveSave, listArchives, archivePrefix, backupDue, BACKUP_REMIND_MS, ARCHIVE_PREFIX, DEV_KEYS, SAVE_KEY
} from '../../src/core/save.js'
import { defaultState, defaultSettings } from '../../src/core/state.js'
import { hashString } from '../../src/core/rng.js'
import { DATA } from '../../src/data/index.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'
import { refreshMeta } from '../../src/core/meta.js'
import { makeNowInfo } from '../../src/core/clock.js'

const SALT = 'bep-khoi-nghiep:v1:muong-vang'
const DAY = 24 * 3600 * 1000

// Bộ nhớ giả có keys() (listArchives đọc được) và getItem/setItem.
function memStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    keys: () => m.keys(),
    _m: m
  }
}

// Bản lưu đã chơi vài ca thật (lịch sử, review, thư, nhiệm vụ) để mã có kích thước thật.
function playedState(shifts = 6, seed = 7) {
  const ctx = makeMetaCtx({ at: '2026-10-05T08:00', attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Bánh Mì Cô Ba — "ngon" ơi là ngon ✓'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < shifts; i++) {
    playShift(state, ctx)
    ctx.clock.t += (i % 2 ? 1 : 0.25) * DAY
    refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  }
  return state
}

// Bộ sinh số giả tất định cho dữ liệu thử nén.
function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const b64u = bytes => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const sum = s => hashString(SALT + s).toString(16).padStart(8, '0')

test('exportCode: định dạng BKN1.z.<payload>.<checksum>, nhập lại đúng nguyên state (cả chữ có dấu)', () => {
  const s = playedState()
  s.reviews.push({ day: 3, stars: 5, name: 'Cô Thu', text: 'Bánh mì giòn rụm, nước tương đậm đà, ưng lắm!' })
  const code = exportCode(s)
  assert.match(code, /^BKN1\.z\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/)
  const back = importCode(code, DATA)
  assert.deepEqual(back, JSON.parse(JSON.stringify(migrate(JSON.parse(JSON.stringify(s)), DATA))))
  assert.deepEqual(back, JSON.parse(JSON.stringify(s)), 'state đã migrate thì nhập lại y hệt')
  assert.equal(back.shopName, 'Xe Bánh Mì Cô Ba — "ngon" ơi là ngon ✓')
  assert.equal(back.reviews.at(-1).text, 'Bánh mì giòn rụm, nước tương đậm đà, ưng lắm!')
})

test('mã sao lưu được nén: ngắn hơn nhiều so với save thô', () => {
  const s = playedState(10)
  const raw = encodeSave(s).length
  const code = exportCode(s).length
  assert.ok(code < raw * 0.4, `mã ${code} ký tự, save thô ${raw}`)
})

test('lzCompress/lzDecompress: đúng từng byte (rỗng, 1 byte, chuỗi lặp chồng, chữ dài, khoảng cách xa, ngẫu nhiên)', () => {
  const cases = [
    new Uint8Array(0),
    new Uint8Array([65]),
    new Uint8Array(1000).fill(7),                                        // lặp chồng (offset 1)
    new TextEncoder().encode('ab'.repeat(3000) + 'Tiếng Việt có dấu '.repeat(50)),
    Uint8Array.from({ length: 600 }, (_, i) => (i * 131 + 7) & 255)      // chữ dài hơn 270 byte
  ]
  // đoạn lặp cách xa hơn 65.535 byte: không được dùng làm khớp
  const far = new Uint8Array(70000 + 64)
  const r0 = prng(1)
  for (let i = 0; i < far.length; i++) far[i] = Math.floor(r0() * 256)
  far.set(far.subarray(0, 64), 70000)
  cases.push(far)
  const r = prng(42)
  for (let k = 0; k < 200; k++) {
    const n = Math.floor(r() * 4000)
    const a = new Uint8Array(n)
    const alpha = 1 + Math.floor(r() * 255)
    for (let i = 0; i < n; i++) a[i] = i > 12 && r() < 0.55 ? a[i - 1 - Math.floor(r() * 12)] : Math.floor(r() * alpha)
    cases.push(a)
  }
  for (const a of cases) {
    const back = lzDecompress(lzCompress(a))
    assert.equal(Buffer.compare(Buffer.from(back), Buffer.from(a)), 0, 'lệch khi dài ' + a.length)
  }
})

test('lzDecompress: dữ liệu hỏng hoặc quá lớn → ném lỗi, không treo', () => {
  const good = lzCompress(new TextEncoder().encode('xin chào '.repeat(200)))
  assert.throws(() => lzDecompress(good.subarray(0, good.length - 3).slice(0, 5)))
  assert.throws(() => lzDecompress(new Uint8Array([0x10, 65, 0, 0])), /ma_hong/)       // độ lệch 0
  assert.throws(() => lzDecompress(new Uint8Array([0x10, 65, 9, 0])), /ma_hong/)       // lệch ra ngoài
  assert.throws(() => lzDecompress(new Uint8Array([0xf0, 255, 255])), /ma_hong/)       // độ dài cụt
  assert.throws(() => lzDecompress(good, 100), /ma_hong/)                              // vượt trần
})

test('sai 1 ký tự ở bất kỳ đâu → readCode báo sai_ma (không ném lỗi); importCode trả null', () => {
  const code = exportCode(playedState(2))
  const idx = [0, 3, 5, 7, 8, 20, Math.floor(code.length / 2), code.length - 10, code.length - 1]
  for (const i of idx) {
    const ch = code[i]
    const repl = ch === 'A' ? 'B' : ch === '0' ? '1' : ch === '.' ? '_' : 'A'
    const bad = code.slice(0, i) + repl + code.slice(i + 1)
    const r = readCode(bad, DATA)
    assert.equal(r.ok, false, 'vị trí ' + i)
    assert.ok(['sai_ma', 'khong_phai_ma'].includes(r.reason), `vị trí ${i}: ${r.reason}`)
    assert.equal(importCode(bad, DATA), null)
  }
  // thiếu đuôi (chép chưa hết)
  assert.equal(readCode(code.slice(0, -40), DATA).reason, 'sai_ma')
  assert.equal(readCode(code.slice(0, code.length / 2), DATA).reason, 'sai_ma')
})

test('readCode: lý do thân thiện cho mã rỗng, không phải mã, mã đúng checksum mà nội dung hỏng', () => {
  assert.deepEqual(readCode('', DATA), { ok: false, reason: 'rong' })
  assert.deepEqual(readCode('   \n ', DATA), { ok: false, reason: 'rong' })
  assert.deepEqual(readCode(null, DATA), { ok: false, reason: 'rong' })
  assert.deepEqual(readCode('Xin chào Dì Sáu', DATA), { ok: false, reason: 'khong_phai_ma' })
  // checksum đúng nhưng giải nén ra không phải JSON / JSON không phải object
  for (const text of ['không phải json', '[1,2,3]', '42']) {
    const payload = b64u(lzCompress(new TextEncoder().encode(text)))
    const code = `BKN1.z.${payload}.${sum('z.' + payload)}`
    assert.deepEqual(readCode(code, DATA), { ok: false, reason: 'hong' }, text)
  }
  // payload không giải nén được
  const junk = b64u(new Uint8Array([0x10, 65, 9, 0]))
  assert.equal(readCode(`BKN1.z.${junk}.${sum('z.' + junk)}`, DATA).reason, 'hong')
  // số phần lạ
  assert.equal(readCode('BKN1.y.abc.def.123', DATA).reason, 'sai_ma')
})

test('dán kèm khoảng trắng, xuống dòng, chữ thừa (nội dung file sao lưu) vẫn đọc được; lấy đoạn mã dài nhất', () => {
  const s = playedState(2)
  s.shopName = 'Xe BKN1.abc'        // tên xe có chữ giống mã: không được nhầm
  const code = exportCode(s)
  const wrapped = code.match(/.{1,60}/g).join('\n  ')
  const file = [
    'Bếp Khởi Nghiệp – mã sao lưu',
    `Xe: ${s.shopName} · Ngày ${s.day}`,
    'Cách dùng: mở game → Cài đặt → Nhập mã sao lưu.',
    '',
    wrapped,
    ''
  ].join('\n')
  assert.equal(extractCode(file), code)
  const r = readCode(file, DATA)
  assert.equal(r.ok, true)
  assert.equal(r.state.shopName, 'Xe BKN1.abc')
  assert.equal(r.code, code)
  assert.equal(extractCode('  ' + code + '.  '), code, 'bỏ dấu chấm thừa cuối câu')
  assert.equal(extractCode('không có mã'), null)
})

test('nhận cả mã save thô (encodeSave) và save v1 cũ; cài đặt M3 lấy mặc định', () => {
  const s = defaultState(11, DATA)
  s.shopName = 'Xe thô'
  const r = readCode(encodeSave(s), DATA)
  assert.equal(r.ok, true)
  assert.equal(r.state.shopName, 'Xe thô')
  // save v1 (M1): không có settings.volume/incidentFrequency, không có backup
  const v1 = { version: 1, seed: 3, shopName: 'Xe M1', day: 4, wallet: 350000, settings: { sound: false, tips: true }, recipes: { banh_mi_op_la: { cooks: 5 } } }
  const back = importCode(exportCode(v1), DATA)
  assert.equal(back.shopName, 'Xe M1')
  assert.equal(back.day, 4)
  assert.equal(back.settings.sound, false)
  assert.equal(back.settings.volume, 0.8)
  assert.equal(back.settings.incidentFrequency, 'vua')
  assert.deepEqual(back.backup, { lastAt: 0, since: 0 })
  assert.equal(back.mail.seenVersion, '0.1.0', 'save v1 vẫn nhận thư phiên bản')
})

test('backupSummary: tên xe, ngày game, Tiền quán, chặng, số công thức để xem trước', () => {
  const s = defaultState(5, DATA)
  s.shopName = 'Xe Xem Trước'
  s.day = 9
  s.wallet = 612000
  s.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 3 }
  s.reputation = 88
  s.goldSpoons = 25
  s.stats.shiftsPlayed = 8
  const info = backupSummary(importCode(exportCode(s), DATA))
  assert.deepEqual(info, { shopName: 'Xe Xem Trước', day: 9, chang: 1, wallet: 612000, reputation: 88, goldSpoons: 25, recipes: 3, shiftsPlayed: 8, inShift: false })
  assert.equal(backupSummary(null).day, 1)
})

test('cất bản lưu: khóa riêng <khóa save>.old.<ms>, không ghi đè bản đã cất, đọc lại được, bộ nhớ lỗi → loi_ghi', () => {
  const st = memStorage()
  const a = defaultState(1, DATA)
  a.shopName = 'Xe A'
  const b = defaultState(2, DATA)
  b.shopName = 'Xe B'
  st.setItem(SAVE_KEY, 'bản chính')
  st.setItem('khac', 'x')
  const r1 = archiveSave(st, a, 1790000000000)
  assert.deepEqual([r1.ok, r1.key], [true, 'bkn.save.old.1790000000000'])
  assert.equal(ARCHIVE_PREFIX, 'bkn.save.old.')
  // cùng mốc thời gian: lùi sang ms kế, không ghi đè
  const r2 = archiveSave(st, b, 1790000000000)
  assert.equal(r2.key, 'bkn.save.old.1790000000001')
  assert.equal(importCode(st.getItem(r1.key), DATA).shopName, 'Xe A')
  assert.equal(importCode(st.getItem(r2.key), DATA).shopName, 'Xe B')
  assert.equal(st.getItem(SAVE_KEY), 'bản chính', 'không đụng bản chính')
  const list = listArchives(st)
  assert.deepEqual(list.map(x => x.key), ['bkn.save.old.1790000000001', 'bkn.save.old.1790000000000'])
  assert.equal(list[0].at, 1790000000001)
  // khóa dev (?devNow) tách riêng
  assert.equal(archivePrefix({ keys: DEV_KEYS }), 'bkn.save.dev.old.')
  const r3 = archiveSave(st, a, 5, { keys: DEV_KEYS })
  assert.equal(r3.key, 'bkn.save.dev.old.5')
  assert.equal(listArchives(st).length, 2)
  assert.equal(listArchives(st, { keys: DEV_KEYS }).length, 1)
  // localStorage thật dùng length/key(i)
  const ls = { _k: ['bkn.save.old.7', 'bkn.save', 'bkn.save.old.x'], length: 3, key(i) { return this._k[i] }, getItem: k => (k === 'bkn.save.old.7' ? exportCode(a) : 'x') }
  assert.deepEqual(listArchives(ls).map(x => x.at), [7])
  // bộ nhớ đầy
  assert.deepEqual(archiveSave({ getItem: () => null, setItem() { throw new Error('QuotaExceededError') } }, a, 1), { ok: false, reason: 'loi_ghi' })
})

test('nhắc sao lưu: sau 7 ngày thật kể từ lần sao lưu gần nhất (hoặc từ lúc bắt đầu), chỉ khi đã bán ca', () => {
  const t0 = Date.parse('2026-10-01T08:00:00+07:00')
  const s = defaultState(1, DATA)
  s.backup = { lastAt: 0, since: t0 }
  assert.equal(backupDue(s, t0 + 30 * DAY), false, 'chưa bán ca nào')
  s.stats.shiftsPlayed = 1
  assert.equal(backupDue(s, t0 + 6 * DAY), false)
  assert.equal(backupDue(s, t0 + 7 * DAY), true)
  s.backup.lastAt = t0 + 6 * DAY
  assert.equal(backupDue(s, t0 + 8 * DAY), false, 'vừa sao lưu hôm qua')
  assert.equal(backupDue(s, t0 + 6 * DAY + BACKUP_REMIND_MS), true)
  s.backup = { lastAt: 0, since: 0 }
  assert.equal(backupDue(s, t0), false, 'chưa có mốc thì chưa nhắc')
  assert.equal(backupDue(null, t0), false)
})

test('cài đặt M3: âm lượng kẹp 0..1, tần suất tình huống hợp lệ (mặc định Vừa), công tắc giữ đúng kiểu', () => {
  const d = defaultSettings()
  assert.equal(d.volume, 0.8)
  assert.equal(d.incidentFrequency, 'vua')
  assert.deepEqual(migrateSettings(undefined), d)
  const m = migrateSettings({ sound: false, volume: 3, incidentFrequency: 'it', tips: 'khong', la: 1 })
  assert.equal(m.sound, false)
  assert.equal(m.volume, 1)
  assert.equal(m.incidentFrequency, 'it')
  assert.equal(m.tips, true)
  assert.equal(m.la, undefined)
  assert.equal(migrateSettings({ volume: -1 }).volume, 0)
  assert.equal(migrateSettings({ volume: 0.456 }).volume, 0.46)
  assert.equal(migrateSettings({ volume: 'abc' }).volume, 0.8)
  assert.equal(migrateSettings({ incidentFrequency: 'rat_nhieu' }).incidentFrequency, 'vua')
  // lưu/tải giữ nguyên
  const s = defaultState(3, DATA)
  s.settings.volume = 0.3
  s.settings.incidentFrequency = 'nhieu'
  s.backup = { lastAt: 123, since: 45 }
  const back = importCode(exportCode(s), DATA)
  assert.equal(back.settings.volume, 0.3)
  assert.equal(back.settings.incidentFrequency, 'nhieu')
  assert.deepEqual(back.backup, { lastAt: 123, since: 45 })
})
