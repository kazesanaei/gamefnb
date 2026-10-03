// Hướng dẫn lần đầu (tour, bản 0.4.1): lõi thuần src/core/tour.js (đã xem, đặt lại, bật/tắt, nâng bản lưu cũ) và dữ liệu
// src/data/tours.js (đủ bước, lời ngắn, màn có thật, trang Cách chơi có hình). 0.5.0 (M5): 5 tour thẻ "Bước k/N" của các thao tác
// mới (bep_dap, bep_xoay, bep_got, bep_lac, bep_bay — chỗ 'card-<loại>'), lời tour Thớt nhắc thao tác mới.
// 0.5.1 (M5 Đợt 2): đích của mọi bước tour còn là testid / lớp móc có thật trong src/ui và css (giao diện Quầy, HUD, phố,
// phiếu chấm làm lại), bộ đích các tour Quầy / Ca bán / Phiếu chấm đúng thiết kế, lời khớp nhãn nút thật.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { migrate, encodeSave, decodeSave } from '../../src/core/save.js'
import {
  defaultTour, shouldShowTour, markSeen, isTourSeen, resetTours, setToursEnabled, toursEnabled, migrateTour, TOUR_ID_MAX
} from '../../src/core/tour.js'
import { SAVE_V2_MID_SHIFT } from '../fixtures/save-v2.mjs'
import { ICONS } from '../../src/ui/art.js'
import { COUNTER_STREAK_ROLL } from '../../src/core/order.js'
import { formatVND } from '../../src/core/money.js'
import { GESTURE_BY_TYPE } from '../../src/ui/components/step-card.js'
import { STICKY } from '../../src/ui/components/tour.js'

const T = DATA.TOURS
// M5 (0.5.0): năm thao tác mới, mỗi loại một tour trên thẻ "Bước k/N" (chỗ 'card-<loại>' của kitchen.tourSpot)
const NEW_TYPES = ['dap', 'xoay', 'got', 'lac', 'bay']
const plain = o => JSON.parse(JSON.stringify(o))
// tour người chơi quen tay chắc chắn đã đi qua ở ngày `day` (đã bán ít nhất 1 ca)
const veteranIds = day => Object.keys(T).filter(id => Number(T[id].veteranDay) > 0 && day >= T[id].veteranDay)

test('save mới có state.tour mặc định: chưa xem tour nào, tự hiện đang bật', () => {
  const s = defaultState(1, DATA)
  assert.deepEqual(s.tour, { seen: {}, disabled: false })
  assert.deepEqual(defaultTour(), { seen: {}, disabled: false })
  assert.notEqual(defaultTour(), defaultTour(), 'mỗi lần một object mới')
  assert.equal(toursEnabled(s), true)
  assert.equal(shouldShowTour(s, 'mo_dau', DATA), true)
  assert.equal(shouldShowTour(s, 'quay_order', DATA), true)
})

test('shouldShowTour: đã xem, tour chỉ chạy bằng nút "?", tour không có trong dữ liệu, id sai, tắt tự hiện', () => {
  const s = defaultState(1, DATA)
  assert.equal(shouldShowTour(s, 'ca_ban', DATA), false, 'tour tổng quan ca bán chỉ chạy bằng nút "?"')
  assert.equal(shouldShowTour(s, 'khong_co', DATA), false)
  assert.equal(shouldShowTour(s, 'khong_co'), true, 'không có data thì không lọc theo danh sách')
  assert.equal(shouldShowTour(s, '', DATA), false)
  assert.equal(shouldShowTour(s, 'x'.repeat(TOUR_ID_MAX + 1)), false)
  assert.equal(shouldShowTour(s, 12, DATA), false)
  assert.equal(shouldShowTour(null, 'mo_dau', DATA), false)
  markSeen(s, 'mo_dau')
  assert.equal(shouldShowTour(s, 'mo_dau', DATA), false)
  assert.equal(shouldShowTour(s, 'chuan_bi', DATA), true)
  setToursEnabled(s, false)
  assert.equal(toursEnabled(s), false)
  assert.equal(shouldShowTour(s, 'chuan_bi', DATA), false, 'tắt "Hướng dẫn lần đầu" thì không tự hiện')
  setToursEnabled(s, true)
  assert.equal(shouldShowTour(s, 'chuan_bi', DATA), true)
})

test('markSeen: một hoặc nhiều tour, báo có thay đổi, bỏ id sai, tự tạo state.tour nếu thiếu', () => {
  const s = defaultState(1, DATA)
  assert.equal(markSeen(s, 'chuan_bi'), true)
  assert.equal(markSeen(s, 'chuan_bi'), false, 'xem lại không đổi gì')
  assert.equal(markSeen(s, ['chuan_bi', 'su_kien_ngay', '', null]), true)
  assert.deepEqual(s.tour.seen, { chuan_bi: true, su_kien_ngay: true })
  assert.equal(isTourSeen(s, 'su_kien_ngay'), true)
  assert.equal(isTourSeen(s, 'hang_hiem'), false)
  assert.equal(markSeen(s, []), false)
  assert.equal(markSeen(null, 'mo_dau'), false)
  const old = { day: 3 }
  assert.equal(markSeen(old, 'mo_dau'), true)
  assert.deepEqual(old.tour, { seen: { mo_dau: true }, disabled: false })
})

test('resetTours: "Xem lại tất cả hướng dẫn từ đầu" xóa đã xem và bật lại tự hiện', () => {
  const s = defaultState(1, DATA)
  markSeen(s, ['mo_dau', 'chuan_bi', 'quay_order'])
  setToursEnabled(s, false)
  assert.equal(resetTours(s), 3)
  assert.deepEqual(s.tour, { seen: {}, disabled: false })
  assert.equal(shouldShowTour(s, 'mo_dau', DATA), true)
  markSeen(s, 'mo_dau')
  setToursEnabled(s, false)
  assert.equal(resetTours(s, { enable: false }), 1)
  assert.equal(s.tour.disabled, true, 'enable: false giữ nguyên công tắc')
  assert.equal(resetTours(null), 0)
})

test('migrate: bản lưu có trường tour giữ đúng tour đã xem hợp lệ, bỏ id lạ và giá trị sai, disabled là boolean', () => {
  const s = defaultState(7, DATA)
  s.shopName = 'Xe thử'
  const raw = plain(s)
  raw.tour = { seen: { mo_dau: true, chuan_bi: 'true', khong_co: true, quay_order: 1, bep_chon: true, ['x'.repeat(50)]: true }, disabled: 'true', them: 1 }
  const m = migrate(raw, DATA)
  assert.deepEqual(m.tour, { seen: { mo_dau: true, bep_chon: true }, disabled: false })
  raw.tour = { seen: [], disabled: true }
  assert.deepEqual(migrate(raw, DATA).tour, { seen: {}, disabled: true })
  raw.tour = 'hong'
  // trường tour hỏng (không phải object) coi như bản cũ: xe có tên → tour màn đặt tên đã xem
  assert.deepEqual(migrate(raw, DATA).tour, { seen: { mo_dau: true }, disabled: false })
})

test('migrate: lưu rồi tải lại giữ nguyên state.tour (save v3 giống hệt)', () => {
  const s = defaultState(9, DATA)
  s.shopName = 'Xe tròn'
  markSeen(s, ['mo_dau', 'chuan_bi', 'quay_bang_mon'])
  setToursEnabled(s, false)
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.tour, s.tour)
  assert.deepEqual(back, plain(s))
})

test('migrate bản cũ chưa có tour: người mới chưa bán ca nào thì mọi tour còn tự hiện', () => {
  const s = defaultState(3, DATA)
  const raw = plain(s)
  delete raw.tour
  assert.deepEqual(migrate(raw, DATA).tour, { seen: {}, disabled: false })
  raw.shopName = 'Xe mới đặt tên'
  assert.deepEqual(migrate(raw, DATA).tour.seen, { mo_dau: true }, 'đã đặt tên xe thì không hướng dẫn lại màn đặt tên')
})

test('migrate bản cũ chưa có tour: người đã bán ca không bị bật hướng dẫn vòng chơi chính, các màn khác vẫn hiện lần đầu', () => {
  const s = defaultState(3, DATA)
  s.shopName = 'Xe quen tay'
  s.day = 4
  s.stats.shiftsPlayed = 3
  const raw = plain(s)
  delete raw.tour
  const m = migrate(raw, DATA)
  const want = new Set(veteranIds(4))
  assert.ok(want.has('chuan_bi') && want.has('quay_order') && want.has('bep_thot') && want.has('tong_ket') && want.has('phieu_cham'))
  assert.equal(want.has('quay_qr'), false, 'chưa tới ngày có khách chuyển khoản')
  assert.deepEqual(Object.keys(m.tour.seen).sort(), [...want].sort())
  for (const id of ['quay_qr', 'cho_cong_thuc', 'viec_hom_nay', 'hop_thu', 'lua_hang', 'so_cong_thuc', 'su_kien_ngay', 'hang_hiem',
    ...NEW_TYPES.map(x => 'bep_' + x)]) {
    assert.equal(shouldShowTour(m, id, DATA), true, id + ' vẫn tự hiện lần đầu')
  }
  // qua ngày có khách chuyển khoản
  raw.day = 6
  assert.equal(migrate(raw, DATA).tour.seen.quay_qr, true)
  // không có data: chỉ chuẩn hóa, không đoán
  assert.deepEqual(migrateTour({}, { stats: { shiftsPlayed: 5 }, day: 9, shopName: 'X' }).tour, { seen: {}, disabled: false })
})

test('migrate save thật bản 0.3.0 (v2, đang dở ca ngày 8): có state.tour, tour vòng chơi chính coi như đã xem', () => {
  const m = migrate(decodeSave(SAVE_V2_MID_SHIFT), DATA)
  assert.ok(m.shift, 'ca dở vẫn giữ')
  assert.equal(m.tour.disabled, false)
  assert.deepEqual(Object.keys(m.tour.seen).sort(), veteranIds(m.day).sort())
  assert.equal(shouldShowTour(m, 'quay_order', DATA), false, 'không bật hướng dẫn giữa ca của người chơi cũ')
  assert.equal(shouldShowTour(m, 'cho_cong_thuc', DATA), true)
})

test('dữ liệu tour: 2–6 bước, tiêu đề ngắn, lời Dì Sáu tối đa 2 câu, màn có thật, không trùng id', () => {
  const SCREENS = ['title', 'prep', 'service', 'summary', 'shop', 'quests', 'mailbox', 'market', 'recipe-book']
  const SPOTS = ['idle', 'order', 'order-sheet', 'thanh_toan', 'tinh_tien', 'qr', 'receipt', 'rail', 'line', 'chon', 'thot', 'ready', 'score', 'day-event', 'stall',
    'card-dap', 'card-xoay', 'card-got', 'card-lac', 'card-bay']
  const spots = new Set()
  for (const [id, t] of Object.entries(T)) {
    assert.match(id, /^[a-z_]+$/, id)
    assert.ok(id.length <= TOUR_ID_MAX)
    assert.ok(SCREENS.includes(t.screen), `${id}: màn ${t.screen}`)
    assert.ok(typeof t.name === 'string' && t.name.length > 0, id)
    if (t.spot) {
      assert.ok(SPOTS.includes(t.spot), `${id}: spot ${t.spot}`)
      const key = t.screen + ':' + t.spot
      assert.ok(!spots.has(key), 'trùng chỗ ' + key)
      spots.add(key)
    }
    assert.ok(t.steps.length >= 2 && t.steps.length <= 6, `${id}: ${t.steps.length} bước`)
    // tour dẫn: có thật, cùng màn, có chỗ riêng, không tự dẫn chính nó
    for (const x of t.lead || []) {
      assert.ok(T[x] && x !== id, `${id}: lead ${x}`)
      assert.equal(T[x].screen, t.screen, `${id}: lead ${x} khác màn`)
      assert.ok(T[x].spot && t.spot, `${id}: lead ${x} chỉ dùng cho tour theo chỗ`)
    }
    for (const s of t.steps) {
      const targets = Array.isArray(s.target) ? s.target : [s.target]
      for (const x of targets) assert.ok(x === null || (typeof x === 'string' && x.length > 0), id)
      assert.ok(s.title.length > 0 && s.title.length <= 28, `${id}: tiêu đề "${s.title}"`)
      // câu kết thúc bằng . ! ? (dấu chấm trong "20.000đ" không tính)
      const sentences = (s.text.match(/[.!?…](\s|$)/g) || []).length
      assert.ok(sentences >= 1 && sentences <= 2, `${id}: "${s.text}" có ${sentences} câu`)
      assert.ok(s.text.length <= 170, `${id}: lời quá dài (${s.text.length})`)
      assert.ok(['auto', 'top', 'bottom'].includes(s.place), id)
    }
  }
  for (const [screen, ids] of Object.entries(DATA.TOUR_SCREENS)) {
    assert.ok(SCREENS.includes(screen), screen)
    for (const id of ids) assert.equal(T[id] && T[id].screen, screen, `${screen} → ${id}`)
  }
  // mỗi màn có tour (trừ ca bán, chạy theo khâu) đều có trong TOUR_SCREENS
  for (const [id, t] of Object.entries(T)) if (t.screen !== 'service') assert.ok((DATA.TOUR_SCREENS[t.screen] || []).includes(id), id)
})

test('trang Cách chơi: các thẻ có tiêu đề, lời và hình có thật; nhắc đủ 4 khâu, bếp, sao/tip, sự kiện, hàng hiếm, mẹo', () => {
  const H = DATA.HOW_TO_PLAY
  assert.ok(H.length >= 5 && H.length <= 8)
  for (const c of H) {
    assert.ok(c.title && c.text, c.id)
    assert.ok(c.icon === 'di_sau' || ICONS[c.icon], `hình ${c.icon}`)
  }
  const all = H.map(c => c.title + ' ' + c.text).join(' ')
  for (const w of ['Order', 'Thanh toán', 'Tính tiền', 'Làm đồ', 'Thớt', 'tip 5.000đ', '20.000đ', 'Sự kiện', 'hàng hiếm', 'Mẹo']) {
    assert.ok(all.includes(w), 'thiếu: ' + w)
  }
})

// Lời tour phải khớp luật đang chạy (đối chiếu số liệu của lõi và dữ liệu, không chép tay).
test('lời tour khớp luật: Giỏ chợ, kiên nhẫn khách, tip, dây phiếu, thao tác M5', () => {
  const B = DATA.BALANCE
  const text = (id, target) => {
    const st = T[id].steps.find(x => (Array.isArray(x.target) ? x.target : [x.target]).includes(target))
    assert.ok(st, `${id}: không có bước ${target}`)
    return st.text
  }
  // Giỏ chợ: lượt có từ chuỗi Quầy chuẩn và ngày Chợ phiên, không phải "cuối mỗi ca"
  const basket = text('hang_hiem', 'basket-luck')
  assert.ok(basket.includes(`${COUNTER_STREAK_ROLL} khách`), basket)
  assert.ok(basket.includes(DATA.DAY_EVENTS.cho_phien.name), basket)
  assert.ok(Number(DATA.DAY_EVENTS.cho_phien.effects.rareRolls) >= 1, 'ngày Chợ phiên phải cho lượt Giỏ chợ')
  assert.doesNotMatch(basket, /mỗi ca có lượt/i)
  const how = DATA.STRINGS.rare.basketHow
  assert.ok(how.includes(`${COUNTER_STREAK_ROLL} khách`) && how.includes(DATA.DAY_EVENTS.cho_phien.name), 'thẻ Giỏ chợ cùng luật với tour')
  // kiên nhẫn: khách chỉ bỏ về từ ngày leaveFromDay (khách hướng dẫn ngày 1 không bị trừ)
  for (const id of ['quay_order', 'ca_ban']) {
    const q = text(id, 'queue')
    if (/bỏ về/.test(q)) assert.ok(q.includes(`từ ngày ${B.leaveFromDay}`), `${id}: "${q}" phải nói khách bỏ về từ ngày ${B.leaveFromDay}`)
  }
  // tip: một mức khi 5 sao và hóa đơn từ tipMinBill
  const tip = text('phieu_cham', 'score-sheet-tip')
  assert.ok(tip.includes(formatVND(B.tipFiveStar)) && tip.includes(formatVND(B.tipMinBill)), tip)
  // dây phiếu tối đa ticketRailMax
  assert.ok(text('quay_phieu_thu', 'clip-ticket').includes(`${B.ticketRailMax} phiếu`))
  // Dòng món: tour dẫn là Dây phiếu (mở thẳng phiếu từ dây ở đầu màn thì vẫn được giới thiệu dây phiếu)
  assert.deepEqual([...T.bep_dong_mon.lead], ['bep_day_phieu'])
  // lời mở đầu không lặp lại lời Dì Sáu đã in trong khung
  assert.ok(!T.mo_dau.steps[0].text.includes('thuê lại'), 'bước 1 lặp lời Dì Sáu trong khung')
  // M5: bước "Trò nhỏ" của tour Thớt nhắc đủ 5 thao tác mới (tên loại hoặc tên lớp vỏ, vd "thả đá" của bay.ly)
  const tro = text('bep_thot', '.k-step.is-available').toLowerCase()
  for (const type of NEW_TYPES) {
    const M = DATA.MINIGAME_TYPES[type]
    const names = [M.name, ...Object.values(M.skins || {}).map(k => k.name)].filter(Boolean).map(n => n.toLowerCase())
    assert.ok(names.some(n => tro.includes(n) || tro.includes(n.split(' ')[0])), `Trò nhỏ chưa nhắc thao tác ${type}: "${tro}"`)
  }
  // M5: thẻ bước — trò tự xong khi đủ lượt thì lời nói "tự xong"; trò phải bấm Xong (bày/thả đá) thì lời dặn bấm Xong
  for (const type of NEW_TYPES) {
    const go = text('bep_' + type, 'step-card-go')
    const needsDone = /bấm Xong/.test(DATA.MINIGAME_TYPES[type].hint)
    assert.equal(/bấm Xong/.test(go), needsDone, `bep_${type}: "${go}" (hint: ${DATA.MINIGAME_TYPES[type].hint})`)
    if (!needsDone) assert.match(go, /tự xong/, `bep_${type}: phải nói bước tự xong khi đủ lượt`)
  }
})

test('M5 tour thẻ bước: 5 thao tác mới, chỗ card-<loại>, 2 bước (tay mẫu, nút bắt đầu), không veteranDay', () => {
  for (const type of NEW_TYPES) {
    const id = 'bep_' + type
    const t = T[id]
    assert.ok(t, `thiếu tour ${id}`)
    assert.equal(t.screen, 'service')
    assert.equal(t.spot, 'card-' + type, id)
    assert.ok(DATA.MINIGAME_TYPES[type], `${id}: loại ${type} không có trong MINIGAME_TYPES`)
    assert.ok(GESTURE_BY_TYPE[type], `${id}: thẻ bước chưa có tay mẫu cho ${type}`)
    assert.equal(t.veteranDay, undefined, `${id}: thao tác mới, người chơi cũ cũng phải xem`)
    assert.notEqual(t.auto, false, `${id}: phải tự hiện`)
    assert.ok(!t.requires && !t.lead, id)
    assert.deepEqual(t.steps.map(x => x.target), ['step-card-demo', 'step-card-go'], id)
  }
  // mọi chỗ card-<loại> đều là loại bước có thật; không có tour nào chiếm chỗ thẻ của loại cũ (thai, cha… vẫn chỉ có thẻ)
  for (const [id, t] of Object.entries(T)) {
    if (!t.spot || !t.spot.startsWith('card-')) continue
    const type = t.spot.slice(5)
    assert.ok(NEW_TYPES.includes(type), `${id}: chỗ ${t.spot}`)
    assert.equal(id, 'bep_' + type)
  }
  // người chơi cũ (đã bán nhiều ca, save chưa có tour) vẫn được xem 5 tour này lần đầu
  const s = defaultState(4, DATA)
  s.shopName = 'Xe cũ'
  s.day = 12
  s.stats.shiftsPlayed = 11
  const raw = plain(s)
  delete raw.tour
  const m = migrate(raw, DATA)
  for (const type of NEW_TYPES) assert.equal(shouldShowTour(m, 'bep_' + type, DATA), true, type)
  assert.equal(shouldShowTour(m, 'bep_thot', DATA), false)
  // tour chừa chỗ cho thanh dính khi cuộn đích vào khung: thanh chân sân khấu kiểu mới vẫn là .mg-foot, Thớt .k-toolbar, Quầy .act-bar
  const sticky = STICKY.split(',').map(x => x.trim())
  for (const sel of ['.mg-foot', '.k-toolbar', '.act-bar', '.sticky-foot', '.meta-head']) assert.ok(sticky.includes(sel), 'STICKY thiếu ' + sel)
})

// 0.5.1 (M5 Đợt 2): giao diện Quầy, HUD, phố, phiếu chấm làm lại — đích của mọi bước tour phải còn là testid / lớp móc có thật
// trong mã giao diện (src/ui) hoặc CSS, để bước tour không bị âm thầm bỏ qua vì đích biến mất.
test('đích tour còn có thật trong mã giao diện (testid / lớp móc), kể cả các tour Quầy viết lại ở 0.5.1', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs')
  const path = await import('node:path')
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
  const files = []
  const walk = d => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(js|css)$/.test(f)) files.push(p)
    }
  }
  walk(path.join(root, 'src', 'ui'))
  walk(path.join(root, 'css'))
  const text = files.map(f => readFileSync(f, 'utf8')).join('\n')
  const has = s => text.includes(s)
  for (const [id, t] of Object.entries(T)) {
    for (const s of t.steps) {
      for (const tg of [s.target, s.span].flatMap(x => (Array.isArray(x) ? x : [x])).filter(Boolean)) {
        if (/^[A-Za-z0-9_-]+$/.test(tg)) {
          // testid viết thẳng (testid: 'x'), hoặc ghép tiền tố + số / id ('quest-' + i, 'dot-' + name…)
          const pre = tg.includes('-') ? tg.slice(0, tg.lastIndexOf('-') + 1) : null
          const ok = has(`'${tg}'`) || has(`"${tg}"`) || has('`' + tg + '`') || (!!pre && (has(`'${pre}'`) || has('`' + pre)))
          assert.ok(ok, `${id}: đích ${tg} không còn trong mã giao diện`)
          continue
        }
        for (const m of tg.matchAll(/data-testid\^?="([^"]+)"/g)) assert.ok(has(m[1]), `${id}: testid ${m[1]} (trong ${tg}) không còn`)
        const plain = tg.replace(/\[[^\]]*\]/g, ' ').replace(/:not\([^)]*\)/g, ' ')
        for (const m of plain.matchAll(/\.([a-z][\w-]*)/g)) assert.ok(has(m[1]), `${id}: lớp .${m[1]} (trong ${tg}) không còn trong mã / CSS`)
      }
    }
  }
  // các tour Quầy, Ca bán, Phiếu chấm (viết lại ở 0.5.1) đúng bộ đích thiết kế (bản đồ mã M5 mục 6)
  const targets = id => T[id].steps.map(x => (Array.isArray(x.target) ? x.target.join('|') : x.target))
  assert.deepEqual(targets('ca_ban'), ['hud', 'queue', 'progress-4', 'ticket-rail', 'tab-counter'])
  assert.equal(T.ca_ban.steps[4].span, 'tab-kitchen')
  assert.deepEqual(targets('quay_order'), ['queue', 'speech-bubble', 'progress-4', '[data-testid^="menu-item-"]', 'readback', 'confirm-order'])
  assert.deepEqual(targets('quay_bang_mon'), ['qty-row', 'note-block', 'add-line'])
  assert.deepEqual(targets('quay_thanh_toan'), ['price-board', 'numpad-display', 'report-total'])
  assert.deepEqual(targets('quay_tinh_tien'), ['given-cash', 'drawer', 'tray', 'give-change'])
  assert.deepEqual(targets('quay_qr'), ['qr-status', 'qr-confirm', 'qr-reject'])
  assert.deepEqual(targets('quay_phieu_thu'), ['receipt', 'clip-ticket'])
  assert.deepEqual(targets('phieu_cham'), ['score-sheet', '.ss-tags|.ss-rows', 'score-sheet-tip|score-sheet'])
  // lời tour Quầy khớp nhãn nút thật trên màn: "Không cần thối" (give-change khi khách đưa vừa đủ), "Từ chối ảnh giả"
  assert.match(T.quay_tinh_tien.steps.find(x => x.target === 'give-change').text, /Không cần thối/)
  assert.match(T.quay_qr.steps.find(x => x.target === 'qr-reject').text, /Từ chối ảnh giả/)
  assert.ok(has("'Không cần thối'") && has("'Từ chối ảnh giả'"), 'nhãn nút Quầy đổi mà lời tour chưa đổi')
})
