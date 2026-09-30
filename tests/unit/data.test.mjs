// Kiểm tra toàn vẹn dữ liệu game (src/data) và hình (src/ui/art.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { DATA } from '../../src/data/index.js'
import { SPOKEN, SYNONYMS, LINE_KINDS } from '../../src/data/dialogue.js'
import { REVIEWS } from '../../src/data/reviews.js'
import { ICONS, icon, FACES, DI_SAU, ANH_KHOA, MOODS, billSvg, fakeQrSvg, CART, cartSvg } from '../../src/ui/art.js'

const { BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, MINIGAME_TYPES, PERSONAS, REGULARS, NAMES,
  DIALOGUE, makeSpeech, makeLine, makeReview, TIPS, UPGRADES, STRINGS } = DATA

const STEP_TYPES = ['chon', 'cha', 'thai', 'cham', 'lua', 'rot']
const ROLES = ['chinh', 'phu', 'tuy_chon']

// Sinh số ngẫu nhiên có hạt giống (mulberry32) cho test lặp lại được.
function makeRand(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ingIds = r => r.ingredients.map(i => i.id)
const realCost = r => r.ingredients.filter(i => i.role !== 'tuy_chon')
  .reduce((s, i) => s + INGREDIENTS[i.id].cost * (i.qty || 1), 0)

test('DATA gom đủ các khóa của hợp đồng', () => {
  for (const k of ['BALANCE', 'INGREDIENTS', 'RECIPES', 'METHOD_LABELS', 'MINIGAME_TYPES', 'PERSONAS', 'REGULARS',
    'NAMES', 'DIALOGUE', 'makeSpeech', 'makeLine', 'makeReview', 'TIPS', 'UPGRADES', 'STRINGS']) {
    assert.ok(k in DATA, `thiếu ${k}`)
  }
  assert.equal(typeof makeSpeech, 'function')
  assert.equal(typeof makeLine, 'function')
  assert.equal(typeof makeReview, 'function')
})

test('dữ liệu được đóng băng sâu', () => {
  assert.ok(Object.isFrozen(DATA))
  assert.ok(Object.isFrozen(RECIPES.banh_mi_op_la.steps[4].params.zone))
  assert.ok(Object.isFrozen(RECIPES.tra_tac.notes[0].patch.nem_duong))
  assert.ok(Object.isFrozen(INGREDIENTS.trung_ga))
  assert.ok(Object.isFrozen(PERSONAS.hoc_sinh.address))
  assert.ok(Object.isFrozen(TIPS[0]))
  assert.ok(Object.isFrozen(ICONS))
  assert.throws(() => { 'use strict'; RECIPES.tra_tac.price = 1 })
})

test('BALANCE khớp hợp đồng', () => {
  assert.equal(BALANCE.startWallet, 200000)
  assert.equal(BALANCE.fixedCostPerShift, 20000)
  assert.deepEqual([...BALANCE.stageFlow], ['order', 'thanh_toan', 'tinh_tien', 'lam_do'])
  assert.equal(BALANCE.stageLabels.lam_do, 'Làm đồ')
  assert.equal(BALANCE.customersPerShift(1), 4)
  assert.equal(BALANCE.customersPerShift(3), 5)
  assert.equal(BALANCE.customersPerShift(99), 8)
  assert.equal(BALANCE.gradeThresholds[0][1], 'tuyet_hao')
  assert.deepEqual([...BALANCE.masteryLevels], [0, 5, 15])
})

// M4 (sửa có chủ ý): 5 món MVP + 4 công thức hiếm (source 'hiem', thiết kế mục C.3).
test('đủ 9 món: 5 món MVP + 4 công thức hiếm', () => {
  assert.deepEqual(Object.keys(RECIPES).sort(),
    ['banh_mi_op_la', 'banh_mi_trung_ga_ta', 'banh_trang_tron', 'banh_trang_tron_tay_ninh', 'ca_phe_muoi', 'ca_phe_sua_da',
      'che_buoi', 'tra_tac', 'tra_tac_mat_ong'])
  assert.deepEqual(Object.values(RECIPES).filter(r => r.source === 'hiem').map(r => r.id).sort(),
    ['banh_mi_trung_ga_ta', 'banh_trang_tron_tay_ninh', 'ca_phe_muoi', 'tra_tac_mat_ong'])
})

for (const [rid, r] of Object.entries(RECIPES)) {
  test(`công thức ${rid}: lược đồ hợp lệ`, () => {
    assert.equal(r.id, rid)
    assert.ok(r.name && r.desc && r.icon)
    assert.ok(Number.isInteger(r.difficulty) && r.difficulty >= 1 && r.difficulty <= 5)
    // M4 (sửa có chủ ý): thêm nguồn 'hiem' (công thức hiếm)
    assert.ok(['default', 'shop', 'event', 'hiem'].includes(r.source))
    if (r.source === 'shop') assert.ok(Number.isInteger(r.shopPrice) && r.shopPrice > 0, 'món shop cần shopPrice')
    if (r.source === 'event') assert.ok(typeof r.eventId === 'string' && r.eventId, 'món sự kiện cần eventId')
    else assert.equal(r.eventId, null)
    if (r.source === 'hiem') {
      // món nền có thật, không phải món hiếm; requires gồm món nền; rare {nguyên liệu hiếm có trong món: số phần}
      assert.ok(RECIPES[r.baseRecipe] && RECIPES[r.baseRecipe].source !== 'hiem', 'món hiếm cần baseRecipe')
      assert.ok(Array.isArray(r.requires) && r.requires.includes(r.baseRecipe))
      assert.ok(r.rare && Object.keys(r.rare).length >= 1)
      for (const [id, n] of Object.entries(r.rare)) {
        assert.ok(INGREDIENTS[id] && INGREDIENTS[id].rare, `${id} phải là nguyên liệu hiếm`)
        assert.ok(ingIds(r).includes(id), `${rid}: nguyên liệu hiếm ${id} phải có trong món`)
        assert.ok(Number.isInteger(n) && n >= 1)
      }
      assert.equal(r.icon, RECIPES[r.baseRecipe].icon, 'món hiếm dùng hình của món nền')
      assert.ok(r.price >= 15000, 'món hiếm từ 15.000đ')
    } else {
      assert.ok(!r.ingredients.some(i => INGREDIENTS[i.id].rare), `${rid}: món thường không dùng nguyên liệu hiếm`)
    }

    // Giá: số nguyên, bội 5.000đ, lớn hơn giá vốn thật
    assert.ok(Number.isInteger(r.price))
    assert.equal(r.price % 5000, 0)
    const cost = realCost(r)
    assert.ok(r.price > cost, `giá ${r.price} phải > giá vốn ${cost}`)
    assert.equal(r.cost, cost, 'cost tham khảo phải khớp tổng giá vốn nguyên liệu')

    // Nguyên liệu
    const ids = ingIds(r)
    assert.equal(new Set(ids).size, ids.length, 'nguyên liệu trùng')
    for (const i of r.ingredients) {
      assert.ok(INGREDIENTS[i.id], `nguyên liệu ${i.id} không tồn tại`)
      assert.ok(ROLES.includes(i.role))
      if (i.qty !== undefined) assert.ok(Number.isInteger(i.qty) && i.qty >= 1)
    }
    assert.ok(r.ingredients.some(i => i.role === 'chinh'))
    for (const d of r.decoys) {
      assert.ok(INGREDIENTS[d], `bẫy ${d} không tồn tại`)
      assert.ok(!ids.includes(d), `bẫy ${d} không được là nguyên liệu đúng`)
    }
    assert.ok([9, 12].includes(r.shelf.length), 'kệ 9 hoặc 12 ô')
    assert.equal(new Set(r.shelf).size, r.shelf.length, 'kệ có ô trùng')
    for (const s of r.shelf) assert.ok(INGREDIENTS[s], `ô kệ ${s} không tồn tại`)
    for (const id of ids) assert.ok(r.shelf.includes(id), `kệ thiếu nguyên liệu ${id}`)
    for (const d of r.decoys) assert.ok(r.shelf.includes(d), `kệ thiếu bẫy ${d}`)

    // Bước
    const stepIds = r.steps.map(s => s.id)
    assert.equal(new Set(stepIds).size, stepIds.length, 'id bước trùng')
    assert.equal(r.steps[0].type, 'chon', 'bước đầu phải là chon')
    assert.equal(r.steps.filter(s => s.type === 'chon').length, 1)
    for (const s of r.steps) {
      assert.ok(STEP_TYPES.includes(s.type), `type ${s.type} không hợp lệ`)
      assert.ok(s.label, 'bước thiếu nhãn')
      assert.ok(s.par > 0 && [1, 2, 3].includes(s.w))
      if (s.ing !== undefined) assert.ok(ids.includes(s.ing), `bước ${s.id}: ing ${s.ing} không thuộc món`)
      for (const a of s.after || []) {
        assert.ok(stepIds.includes(a), `bước ${s.id}: after ${a} không tồn tại`)
        assert.notEqual(a, 'chon')
      }
      if (s.method) {
        assert.ok(s.method.options.includes(s.method.correct))
        for (const m of s.method.options) assert.ok(METHOD_LABELS[m], `thiếu METHOD_LABELS.${m}`)
      }
      if (s.retryCost !== undefined) assert.ok(Number.isInteger(s.retryCost) && s.retryCost > 0)
      if (s.type !== 'chon') assert.ok(s.params && typeof s.params === 'object', `bước ${s.id} thiếu params`)
      if (s.type === 'cham') {
        assert.ok(['exact', 'min', 'targets'].includes(s.params.mode))
        if (s.params.mode === 'exact') assert.ok(Number.isInteger(s.params.n) && s.params.n > 0)
        if (s.params.mode === 'min') assert.ok(s.params.N > 0 && s.params.T > 0)
        if (s.params.mode === 'targets') {
          for (const t of Object.keys(s.params.targets)) assert.ok(ids.includes(t), `targets ${t} không thuộc món`)
        }
      }
      if (s.type === 'lua' || s.type === 'rot') {
        const [a, b] = s.params.zone
        assert.ok(a >= 0 && a < b && b <= 1, `vùng ${s.id} sai`)
      }
      if (s.type === 'lua') assert.ok(s.params.period > 0)
      if (s.type === 'thai') assert.ok(Number.isInteger(s.params.cuts) && s.params.cuts > 0)
      if (s.type === 'cha') assert.ok(s.params.spots > 0 || s.params.strokes > 0)
    }

    // after không tạo vòng
    const graph = Object.fromEntries(r.steps.map(s => [s.id, s.after || []]))
    const state = {}
    const visit = id => {
      if (state[id] === 1) throw new Error(`vòng phụ thuộc tại ${id}`)
      if (state[id] === 2) return
      state[id] = 1
      for (const n of graph[id]) visit(n)
      state[id] = 2
    }
    for (const id of stepIds) visit(id)

    // Ghi chú
    const noteIds = r.notes.map(n => n.id)
    assert.equal(new Set(noteIds).size, noteIds.length, 'ghi chú trùng')
    for (const n of r.notes) {
      assert.ok(n.label)
      for (const x of n.removes || []) assert.ok(ids.includes(x), `removes ${x} không thuộc món`)
      for (const x of n.adds || []) {
        assert.ok(ids.includes(x), `adds ${x} không thuộc món`)
        assert.equal(r.ingredients.find(i => i.id === x).role, 'tuy_chon')
      }
      if (n.surcharge !== undefined) assert.ok(Number.isInteger(n.surcharge) && n.surcharge % 5000 === 0)
      for (const [sid, p] of Object.entries(n.patch || {})) {
        const step = r.steps.find(s => s.id === sid)
        assert.ok(step, `patch trỏ bước ${sid} không tồn tại`)
        for (const k of Object.keys(p)) assert.ok(k in step.params, `patch ${sid}.${k} không có trong params`)
        if (p.targets) {
          const allowed = ids.filter(i => !(n.removes || []).includes(i))
          for (const t of Object.keys(p.targets)) assert.ok(allowed.includes(t), `patch targets ${t} không hợp lệ`)
        }
      }
    }
    // Bước bị ghi chú loại nguyên liệu không được là tiền đề `after` của bước khác (tránh kẹt)
    for (const n of r.notes) {
      const removedSteps = r.steps.filter(s => s.ing && (n.removes || []).includes(s.ing)).map(s => s.id)
      for (const s of r.steps) for (const a of s.after || []) {
        assert.ok(!removedSteps.includes(a) || removedSteps.includes(s.id), `${n.id} làm kẹt bước ${s.id}`)
      }
    }
  })
}

test('giá vốn khoảng như thiết kế', () => {
  assert.equal(realCost(RECIPES.banh_mi_op_la), 9000)
  assert.equal(realCost(RECIPES.tra_tac), 3000)
  assert.equal(realCost(RECIPES.banh_trang_tron), 8000)
  assert.equal(realCost(RECIPES.ca_phe_sua_da), 5000)
  assert.equal(realCost(RECIPES.che_buoi), 5000)
  // M4: công thức hiếm (giá vốn gồm giá quy đổi của nguyên liệu hiếm, bảng C.3)
  assert.equal(realCost(RECIPES.tra_tac_mat_ong), 6000)
  assert.equal(realCost(RECIPES.banh_mi_trung_ga_ta), 11000)
  assert.equal(realCost(RECIPES.banh_trang_tron_tay_ninh), 12000)
  assert.equal(realCost(RECIPES.ca_phe_muoi), 6000)
})

// M4 (thiết kế mục C.2, C.3): 5 nguyên liệu hiếm, giá/par/lãi của 4 công thức hiếm, quy tắc "món ngang giá trị".
test('nguyên liệu hiếm: ★, quê, giá quy đổi, hàng thường dễ nhầm có thật và khác hình', () => {
  const rare = Object.entries(INGREDIENTS).filter(([, g]) => g.rare).map(([id]) => id).sort()
  assert.deepEqual(rare, ['ca_phe_bmt', 'kho_muc', 'mat_ong_rung', 'muoi_tom_tay_ninh', 'trung_ga_ta'])
  const want = { mat_ong_rung: [2, 3300], trung_ga_ta: [1, 3500], muoi_tom_tay_ninh: [1, 1500], kho_muc: [2, 4100], ca_phe_bmt: [2, 3700] }
  for (const id of rare) {
    const g = INGREDIENTS[id]
    assert.deepEqual([g.star, g.cost], want[id], id)
    assert.ok(g.origin && Number.isInteger(g.portion) && g.portion >= 1, id)
    assert.ok(Array.isArray(g.traps) && g.traps.length >= 1, id)
    for (const t of g.traps) {
      assert.ok(INGREDIENTS[t] && !INGREDIENTS[t].rare, `${id}: bẫy ${t}`)
      assert.notEqual(ICONS[g.icon], ICONS[INGREDIENTS[t].icon], `${id} trùng hình ${t}`)
    }
    assert.ok(ICONS[g.icon].includes('#ffd23f'), `${id}: hình có ngôi sao vàng`)
  }
  assert.equal(INGREDIENTS.trung_ga_ta.portion, 2)
})

test('công thức hiếm: giá, lãi, tổng par theo bảng C.3; lãi/giây nấu ≤ 550đ (món ngang giá trị)', () => {
  const par = r => r.steps.reduce((s, st) => s + st.par, 0)
  const table = {
    tra_tac_mat_ong: [15000, 6000, 19], banh_mi_trung_ga_ta: [25000, 11000, 26],
    banh_trang_tron_tay_ninh: [25000, 12000, 34], ca_phe_muoi: [20000, 6000, 26]
  }
  for (const [id, [price, cost, p]] of Object.entries(table)) {
    const r = RECIPES[id]
    assert.deepEqual([r.price, r.cost, par(r)], [price, cost, p], id)
    assert.ok((price - cost) / p <= 550, `${id}: ${Math.round((price - cost) / p)}đ/giây`)
  }
})

test('nguyên liệu: tên, giá vốn, icon hợp lệ; cặp bẫy tồn tại', () => {
  for (const [id, ing] of Object.entries(INGREDIENTS)) {
    assert.ok(ing.name, `${id} thiếu tên`)
    assert.ok(Number.isInteger(ing.cost) && ing.cost > 0, `${id} giá vốn sai`)
    assert.ok(ICONS[ing.icon], `thiếu icon ${ing.icon}`)
    if (ing.trapOf) assert.ok(INGREDIENTS[ing.trapOf], `${id}.trapOf sai`)
  }
})

test('mọi icon được dùng đều có trong ICONS', () => {
  for (const r of Object.values(RECIPES)) assert.ok(ICONS[r.icon], `thiếu icon món ${r.icon}`)
  for (const u of Object.values(UPGRADES)) assert.ok(ICONS[u.icon], `thiếu icon nâng cấp ${u.icon}`)
  for (const m of Object.values(MINIGAME_TYPES)) assert.ok(ICONS[m.icon], `thiếu icon mini-game ${m.icon}`)
  // hình riêng của bước (vd chén sữa muối của Cà phê muối)
  for (const r of Object.values(RECIPES)) for (const st of r.steps || []) if (st.icon) assert.ok(ICONS[st.icon], `thiếu icon bước ${r.id}/${st.id}: ${st.icon}`)
})

test('art: SVG hợp lệ, không ảnh ngoài, không base64', () => {
  const all = [...Object.values(ICONS)]
  for (const p of Object.values(FACES)) for (const m of MOODS) all.push(p[m])
  all.push(...Object.values(DI_SAU), ...Object.values(ANH_KHOA), CART, fakeQrSvg())
  for (const v of [5000, 10000, 20000, 50000, 100000, 200000, 500000]) all.push(billSvg(v))
  for (const s of all) {
    assert.equal(typeof s, 'string')
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'))
    assert.ok(!/base64|<image|href=|url\(/i.test(s), 'không dùng ảnh ngoài')
    assert.ok(!/undefined|NaN|null/.test(s), 'SVG có giá trị lỗi')
    // Thẻ mở/đóng cân bằng (đếm thô)
    const open = (s.match(/<(svg|g|text)\b/g) || []).length
    const close = (s.match(/<\/(svg|g|text)>/g) || []).length
    assert.equal(open, close)
  }
  for (const [id, s] of Object.entries(ICONS)) assert.ok(s.includes('viewBox="0 0 64 64"'), `icon ${id} sai viewBox`)
  assert.equal(Object.keys(DI_SAU).sort().join(), 'lo,tiec,tu_hao,vui')
  for (const p of Object.keys(PERSONAS)) for (const m of ['vui', 'binh_thuong', 'buc', 'gian']) assert.ok(FACES[p][m])
  assert.ok(Object.keys(ANH_KHOA).length >= 1)
})

test('art: icon() có hình dự phòng; tiền và QR đúng quy định', () => {
  assert.equal(icon('trung_ga'), ICONS.trung_ga)
  assert.equal(icon('tra_tac'), ICONS.mon_tra_tac)
  assert.equal(icon('khong_co_that'), ICONS.fallback)
  assert.equal(icon(undefined), ICONS.fallback)
  const colors = new Set()
  for (const v of [5000, 10000, 20000, 50000, 100000, 200000, 500000]) {
    const s = billSvg(v)
    assert.ok(s.includes('TIỀN GAME'))
    assert.ok(s.includes(v.toLocaleString('de-DE')), `thiếu mệnh giá ${v}`)
    assert.ok(!/Ngân hàng|Nhà nước|NHNN/i.test(s))
    colors.add(s.match(/fill="(#[0-9a-f]{6})"/)[1])
  }
  assert.equal(colors.size, 7, 'mỗi mệnh giá một màu')
  const qr = fakeQrSvg()
  assert.ok(qr.includes('QR GAME'))
  assert.ok(cartSvg({ name: '<Xe & "Tôi">' }).includes('&lt;Xe &amp; &quot;Tôi&quot;&gt;'))
})

test('cặp bẫy phân biệt được bằng hình hoặc màu', () => {
  for (const [id, ing] of Object.entries(INGREDIENTS)) {
    if (!ing.trapOf) continue
    assert.notEqual(ICONS[ing.icon], ICONS[INGREDIENTS[ing.trapOf].icon], `${id} trùng hình ${ing.trapOf}`)
  }
  assert.ok(ICONS.nuoc_tuong.includes('TƯƠNG') && ICONS.nuoc_mam.includes('MẮM'))
})

test('METHOD_LABELS, MINIGAME_TYPES đầy đủ', () => {
  for (const t of STEP_TYPES) assert.ok(MINIGAME_TYPES[t]?.name && MINIGAME_TYPES[t]?.hint, `thiếu ${t}`)
  for (const v of Object.values(METHOD_LABELS)) assert.ok(v)
})

test('PERSONAS, REGULARS, NAMES', () => {
  assert.deepEqual(Object.keys(PERSONAS).sort(), ['co_chu', 'cong_nhan', 'hoc_sinh', 'kho_tinh', 'van_phong'])
  assert.equal(PERSONAS.van_phong.fromDay, 4)
  assert.equal(PERSONAS.kho_tinh.fromDay, 5)
  assert.equal(PERSONAS.kho_tinh.strict, true)
  assert.equal(Object.values(PERSONAS).reduce((s, p) => s + p.weight, 0), 100)
  assert.equal(REGULARS.co_thu.name, 'Cô Thu')
  assert.equal(REGULARS.co_thu.persona, 'co_chu')
  assert.equal(REGULARS.co_thu.favorite.recipeId, 'banh_mi_op_la')
  assert.equal(REGULARS.ban_nam.name, 'Bạn Nam')
  assert.equal(REGULARS.ban_nam.favorite.recipeId, 'tra_tac')
  for (const r of Object.values(REGULARS)) assert.ok(PERSONAS[r.persona] && RECIPES[r.favorite.recipeId])
  assert.ok(NAMES.nam.length >= 10 && NAMES.nu.length >= 10)
})

// Sinh đơn ngẫu nhiên: 1–3 món, qty 1–3, ghi chú theo nhóm, có tách dòng cùng món.
function randomRequest(rand) {
  const ids = Object.keys(RECIPES)
  const pickNotes = r => {
    const out = []
    const groups = new Set()
    for (const n of r.notes) {
      if (rand() < 0.35 && !(n.group && groups.has(n.group))) {
        out.push(n.id)
        if (n.group) groups.add(n.group)
      }
    }
    return out
  }
  const lines = []
  const count = 1 + Math.floor(rand() * 3)
  for (let i = 0; i < count; i++) {
    const r = RECIPES[ids[Math.floor(rand() * ids.length)]]
    lines.push({ recipeId: r.id, qty: 1 + Math.floor(rand() * 3), notes: pickNotes(r) })
    if (rand() < 0.3) {
      // tách dòng: cùng món, ghi chú khác
      let notes = pickNotes(r)
      if (notes.join() === lines[lines.length - 1].notes.join()) notes = notes.length ? [] : [r.notes[0].id]
      lines.push({ recipeId: r.id, qty: 1 + Math.floor(rand() * 2), notes })
    }
  }
  return lines
}

test('makeSpeech: 500 đơn ngẫu nhiên đều sạch và nhắc đủ món, ghi chú', () => {
  const rand = makeRand(20261120)
  const personas = Object.keys(PERSONAS)
  for (let k = 0; k < 500; k++) {
    const request = randomRequest(rand)
    const persona = personas[k % personas.length]
    const region = rand() < 0.7 ? 'nam' : 'bac'
    const s = makeSpeech({ request, persona, region, recipes: RECIPES, rand })
    assert.equal(typeof s, 'string')
    assert.ok(s.length > 5)
    assert.ok(!/undefined|null|NaN|\{|\}/.test(s), `câu lỗi: ${s}`)
    assert.ok(!/\s{2,}|\s[,.!]|,,/.test(s), `khoảng trắng/dấu câu lỗi: ${s}`)
    assert.match(s, /^[A-ZÀ-ỸĐ]/u, `chưa viết hoa đầu câu: ${s}`)
    assert.match(s, /[.!?]$/, `thiếu dấu câu cuối: ${s}`)
    const low = s.toLowerCase()
    for (const line of request) {
      const names = SPOKEN.dishes[line.recipeId][region].names
      assert.ok(names.some(n => low.includes(n)), `thiếu tên món ${line.recipeId}: ${s}`)
      for (const nid of line.notes) {
        const words = SPOKEN.notes[nid][region]
        assert.ok(words.some(w => low.includes(w) || low.includes(w.replace(/^trứng /, ''))), `thiếu ghi chú ${nid}: ${s}`)
      }
    }
  }
})

test('makeSpeech: tách dòng cùng món nói rõ từng phần', () => {
  const rand = () => 0.1
  const s = makeSpeech({
    request: [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }, { recipeId: 'banh_mi_op_la', qty: 1, notes: ['khong_hanh'] }],
    persona: 'hoc_sinh', region: 'nam', recipes: RECIPES, rand
  })
  assert.match(s, /2 ổ .*1 ổ hổng hành/)
  const b = makeSpeech({
    request: [{ recipeId: 'tra_tac', qty: 1, notes: ['it_duong'] }, { recipeId: 'tra_tac', qty: 1, notes: ['nhieu_duong'] }],
    persona: 'co_chu', region: 'bac', recipes: RECIPES, rand, gender: 'nu'
  })
  assert.match(b, /cô 2 cốc trà quất, 1 cốc (ít|bớt) đường và 1 cốc/)
})

test('makeSpeech: giọng Bắc dùng từ Bắc; khách quen có câu chào', () => {
  const rand = makeRand(7)
  for (let i = 0; i < 30; i++) {
    const s = makeSpeech({ request: [{ recipeId: 'ca_phe_sua_da', qty: 2, notes: [] }], persona: 'van_phong', region: 'bac', recipes: RECIPES, rand })
    assert.ok(/nâu đá/.test(s) && /cốc/.test(s) && !/nghen/.test(s), s)
  }
  const r = makeSpeech({ request: [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }], persona: 'co_chu', region: 'nam',
    recipes: RECIPES, rand, regularId: 'co_thu', gender: 'nu' })
  assert.ok(r.startsWith(REGULARS.co_thu.returnGreeting) && /cô/.test(r), r)
  for (let i = 0; i < 20; i++) {
    const n = makeSpeech({ request: [{ recipeId: 'tra_tac', qty: 1, notes: [] }], persona: 'hoc_sinh', region: 'nam',
      recipes: RECIPES, rand, regularId: 'ban_nam', firstVisit: true })
    assert.match(n, /cho em /, n)
    assert.ok(!/trứng trứng/.test(makeSpeech({ request: [{ recipeId: 'banh_mi_op_la', qty: 1, notes: ['chin_ky'] }],
      persona: 'van_phong', region: i % 2 ? 'nam' : 'bac', recipes: RECIPES, rand })))
  }
})

test('makeSpeech/makeLine nhận persona là id hoặc object (như lõi truyền vào)', () => {
  const rand = makeRand(3)
  const request = [{ recipeId: 'banh_mi_op_la', qty: 1, notes: [] }]
  for (let i = 0; i < 20; i++) {
    const s = makeSpeech({ request, persona: { ...PERSONAS.co_chu, id: 'co_chu' }, region: 'nam', recipes: RECIPES, rand, gender: 'nu' })
    assert.match(s, /cô/, s)
    const l = makeLine('thanks', { persona: { ...PERSONAS.cong_nhan, id: 'cong_nhan' }, region: 'nam', rand, vars: { gender: 'nam' } })
    const words = l.toLowerCase().split(/[^\p{L}]+/u)
    assert.ok(!words.some(w => ['con', 'cô', 'chú'].includes(w)), l)
  }
})

test('SYNONYMS có ít nhất 15 cặp Nam – Bắc', () => {
  assert.ok(SYNONYMS.length >= 15)
  for (const p of SYNONYMS) assert.ok(p.nam && p.bac && p.nam !== p.bac && p.meaning)
})

test('makeLine: mọi loại câu không rỗng, không lỗi biến', () => {
  const kinds = ['readback_ok', 'readback_wrong', 'total_too_high', 'total_ok', 'change_short', 'change_over_returned',
    'thanks', 'wait_long', 'receive_dish', 'leave_angry', 'greet']
  for (const k of kinds) assert.ok(LINE_KINDS.includes(k), `thiếu loại ${k}`)
  const rand = makeRand(99)
  for (const k of LINE_KINDS) {
    for (const persona of Object.keys(PERSONAS)) {
      for (const region of ['nam', 'bac']) {
        for (let i = 0; i < 20; i++) {
          const withVars = i % 2 === 0
          const vars = withVars ? { total: 35000, diff: -5000, line: '1 trà tắc ít đường', mon: 'Trà tắc' } : undefined
          const s = makeLine(k, { persona, region, rand, vars })
          assert.ok(typeof s === 'string' && s.trim().length > 0, `${k} rỗng`)
          assert.ok(!/undefined|null|NaN|\{|\}/.test(s), `${k}: ${s}`)
          assert.match(s, /^[A-ZÀ-ỸĐ0-9]/u, `${k}: ${s}`)
        }
      }
    }
  }
  assert.ok(makeLine('khong_co', {}).length > 0)
})

test('makeReview: theo mã lỗi và theo sao, không rỗng, chèn đúng tên', () => {
  let count = Object.values(REVIEWS.byError).reduce((s, a) => s + a.length, 0) +
    Object.values(REVIEWS.byStars).reduce((s, a) => s + a.length, 0)
  assert.ok(count >= 30, `chỉ có ${count} câu review`)
  const codes = ['thieu_nguyen_lieu', 'sai_ghi_chu', 'bay_nguyen_lieu', 'chay', 'song', 'chua_so_che', 'cho_lau',
    'sai_mon', 'thoi_thieu', 'bao_du', 'khong_ti_vet', 'ngon', 'hoan_hao', 'trai_ghi_chu', 'bay', 'thieu_phu',
    'thieu_chinh', 'thua', 'thieu_mon', 'sai_cach', 'tran', 'bo_qua', 'cho_goi_mon', 'hong', 'ma_la']
  const rand = makeRand(5)
  for (const code of codes) {
    for (let i = 0; i < 20; i++) {
      for (const ingredientName of ['Dưa leo', undefined]) {
        const s = makeReview({ stars: 1 + (i % 5), errors: [code], dishName: 'Bánh mì ốp la', ingredientName, rand })
        assert.ok(s && s.length > 5, code)
        assert.ok(!/undefined|null|NaN|\{|\}/.test(s), `${code}: ${s}`)
        assert.match(s, /^[A-ZÀ-ỸĐ]/u, s)
      }
    }
  }
  for (let st = 1; st <= 5; st++) assert.ok(makeReview({ stars: st, errors: [], rand }).length > 5)
  assert.ok(makeReview({}).length > 5)
  const withIng = makeReview({ stars: 2, errors: [{ code: 'thieu_phu' }], dishName: 'Trà tắc', ingredientName: 'Đá', rand: () => 0 })
  assert.ok(/đá/i.test(withIng), withIng)
})

// M4 (sửa có chủ ý): thêm 4 thẻ Soi tiền, Chờ tiền về, Kiểm hàng, Giữ lối đi (20 → 24).
test('TIPS: 24 thẻ, id duy nhất, tối đa 2 câu', () => {
  assert.equal(TIPS.length, 24)
  assert.equal(new Set(TIPS.map(t => t.id)).size, 24)
  for (const t of TIPS) {
    assert.ok(['quay', 'bep', 'kho', 'phuc_vu'].includes(t.group))
    assert.ok(t.title && t.text && t.trigger)
    const sentences = t.text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ỸĐ])/u).filter(Boolean)
    assert.ok(sentences.length <= 2, `thẻ ${t.id} quá 2 câu`)
    if (/\d+\s*[–-]\s*\d+%|\d+%/.test(t.text)) assert.ok(t.text.includes('số liệu minh họa'), `${t.id} thiếu ghi chú số liệu`)
  }
  for (const trig of ['first_readback', 'readback_caught', 'change_wrong', 'fake_qr', 'thieu_nguyen_lieu', 'chua_rua',
    'cho_lau', 'complaint', 'shift_end', 'tien_gia', 'cho_tien_ve', 'kiem_hang', 'lan_chiem']) {
    assert.ok(TIPS.some(t => t.trigger === trig), `thiếu trigger ${trig}`)
  }
})

test('UPGRADES khớp thiết kế', () => {
  const u = UPGRADES
  assert.deepEqual([u.dao_thep.price, u.dao_thep.fromDay, u.dao_thep.effect.thaiMul], [150000, 2, 1.2])
  assert.deepEqual([u.chao_chong_dinh.price, u.chao_chong_dinh.fromDay, u.chao_chong_dinh.effect.luaMul], [200000, 3, 1.15])
  assert.deepEqual([u.ghe_nhua.price, u.ghe_nhua.fromDay, u.ghe_nhua.effect.queuePatienceMul], [180000, 3, 1.2])
  assert.deepEqual([u.may_tinh.name, u.may_tinh.price, u.may_tinh.fromDay, u.may_tinh.effect.autoTotal], ['Máy tính cầm tay', 150000, 7, true])
  assert.deepEqual([u.loa_bao_tien.price, u.loa_bao_tien.fromDay, u.loa_bao_tien.effect.qrAutoConfirm, u.loa_bao_tien.effect.blockFakeQr], [150000, 5, true, true])
  for (const [id, x] of Object.entries(u)) {
    assert.equal(x.id, id)
    assert.ok(x.name && x.desc && x.effect && Number.isInteger(x.price) && x.price % 5000 === 0)
  }
})

test('DIALOGUE: 3 câu xin lỗi, đúng 1 câu đúng', () => {
  assert.equal(DIALOGUE.apologies.length, 3)
  assert.equal(DIALOGUE.apologies.filter(a => a.correct).length, 1)
  assert.ok(DIALOGUE.greetings.length > 0)
  for (const id of Object.keys(REGULARS)) assert.ok(DIALOGUE.regularLines[id]?.length > 0)
})

test('STRINGS có nhãn 4 khâu, nút, tên hạng', () => {
  assert.deepEqual(STRINGS.stages, BALANCE.stageLabels)
  assert.deepEqual(STRINGS.grades, BALANCE.gradeLabels)
  assert.ok(STRINGS.buttons.openShift && STRINGS.buttons.confirmOrder && STRINGS.buttons.finishDish)
})

test('mọi chuỗi trong dữ liệu đều không rỗng', () => {
  const walk = (v, path) => {
    if (typeof v === 'string') assert.ok(v.trim().length > 0, `chuỗi rỗng tại ${path}`)
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`)
  }
  walk(DATA, 'DATA')
  walk(SPOKEN, 'SPOKEN')
  walk(SYNONYMS, 'SYNONYMS')
})
