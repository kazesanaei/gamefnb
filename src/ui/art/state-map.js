// Bảng ánh xạ BƯỚC → HÌNH TRẠNG THÁI của nguyên liệu (M5 Đợt 1, thiết kế mục 1.8 bước 5): làm xong một bước trên Thớt thì
// hình nguyên liệu đổi sang hình đã sơ chế (dưa leo rửa sạch, thái lát; trứng ốp la; xoài đã gọt…). Thuần dữ liệu và hàm
// thuần (test Node), không vẽ gì: bên gọi lấy hình bằng art(ing, state) của src/ui/art.js (thiếu hình thì art tự lùi về
// hình gốc). Không import art.js để mặt tiền art.js sau này import được tệp này mà không vòng import.
//
// Mỗi mục của STEP_STATE (khóa = id bước trong recipes.js):
// - state: trạng thái khi bước đã xong (mọi hạng).
// - method: true → trạng thái theo cách sơ chế người chơi đã chọn (METHOD_STATE; 'de_nguyen' giữ hình gốc).
// - ing: nguyên liệu nhận hình (mặc định là ing của bước) — vd 'ao_bot', 'luoc' có ing bột năng nhưng hình đổi trên cùi bưởi.
// - active: trạng thái lúc bước đang làm (vd trứng nứt khi đang đập).
// - byTag: trạng thái theo nhãn lỗi của lõi (tag 'song' = lửa còn non, 'chay' = quá lửa); bad: trạng thái khi Hỏng mà
//   không có nhãn; notes: ghi chú của phiếu đổi trạng thái (lòng đào, chín kỹ); keepOn: nhãn lỗi giữ nguyên hình trước.

function freeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') freeze(v)
  return Object.freeze(o)
}

// Cách sơ chế → trạng thái hình (trùng METHOD_STATE của minigames/thai.js); 'de_nguyen' (để nguyên) không đổi hình.
export const METHOD_STATE = freeze({
  thai_lat: 'lat', thai_soi: 'soi', bao: 'bao', hat_luu: 'hat_luu', cat_soi: 'soi', cat_vuong: 'vuong', de_nguyen: null
})

export const STEP_STATE = freeze({
  // sơ chế đồ tươi
  rua_dua: { state: 'sach' },
  thai_dua: { method: true },
  thai_xoai: { method: true },
  thai_cui: { method: true },
  cat_banh_trang: { method: true },
  got_xoai: { state: 'got' },
  got_vo: { state: 'got' },
  boc_trung_cut: { state: 'boc' },
  thai_tac: { state: 'bo_doi' },
  vat_tac: { state: 'vat' },
  // trứng: đập (đang đập: nứt) → ốp la sống → chiên (đúng lửa: ốp la; lòng đào / chín kỹ theo ghi chú; non: còn sống; cháy)
  dap_trung: { state: 'op_la_song', active: 'nut' },
  chien_trung: {
    state: 'op_la', bad: 'op_la_chay', byTag: { chay: 'op_la_chay', song: 'op_la_song' },
    notes: { long_dao: 'long_dao', chin_ky: 'chin_ky' }
  },
  // chè bưởi: hai bước có ing bột năng nhưng hình đổi trên cùi bưởi
  ao_bot: { ing: 'vo_buoi', state: 'ao_bot' },
  luoc: { ing: 'vo_buoi', state: 'chin', keepOn: ['song'] },
  // đồ khô
  xe_kho_muc: { state: 'xe' },
  nuong_banh_mi: { state: 'nuong' },
  them_da: { state: 'vien' }
})

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k)

/** Trạng thái hình của một cách sơ chế (undefined nếu không biết cách này, null nếu cách đó giữ hình gốc). */
export function methodState(method) {
  return own(METHOD_STATE, method) ? METHOD_STATE[method] : undefined
}

/**
 * stepState(step, result, { notes }) → { ing, state } | null — hình của nguyên liệu SAU KHI bước đã xong.
 * step: bước trên Thớt ({ id, ing, method }); result: kết quả lõi lưu ở cook.steps[id] ({ score, grade, method, tag, auto }).
 * notes: id ghi chú của phiếu (vd ['long_dao']). Bước không có trong bảng, chưa xong, hay cách sơ chế giữ hình gốc → null.
 * Điểm Hỏng (< 50) chỉ đổi hình khi mục có byTag / bad (trứng cháy, trứng còn sống); còn lại vẫn là hình đã sơ chế.
 */
export function stepState(step, result, { notes = [] } = {}) {
  if (!step || !result) return null
  const def = STEP_STATE[step.id]
  const ing = (def && def.ing) || step.ing || null
  if (!def || !ing) return null
  const tag = result.tag || null
  if (tag && Array.isArray(def.keepOn) && def.keepOn.includes(tag)) return null
  let state = def.state || null
  if (def.method) {
    const m = result.method || (step.method && step.method.correct) || null
    const s = methodState(m)
    state = s === undefined ? null : s
  }
  const score = Number(result.score)
  const bad = Number.isFinite(score) && score < 50
  if (def.byTag && tag && own(def.byTag, tag)) state = def.byTag[tag]
  else if (bad && def.bad) state = def.bad
  else if (def.notes) {
    for (const n of notes || []) if (own(def.notes, n)) { state = def.notes[n]; break }
  }
  return state ? { ing, state } : null
}

/** Hình của nguyên liệu lúc bước ĐANG làm (vd trứng nứt khi đập); không có → null. */
export function activeState(step) {
  const def = step && STEP_STATE[step.id]
  if (!def || !def.active) return null
  const ing = def.ing || step.ing
  return ing ? { ing, state: def.active } : null
}

/**
 * boardStates(board, results, { notes, activeId }) → { [ing]: state } — hình hiện tại của từng nguyên liệu trên Thớt.
 * Duyệt bước theo thứ tự công thức (bước sau trong công thức là bước sơ chế kỹ hơn, nên đè bước trước — kể cả khi bước trước
 * được làm lại sau): bước đã xong (results[id]) áp stepState; bước đang làm (activeId, chưa xong) áp activeState.
 */
export function boardStates(board, results, { notes = [], activeId = null } = {}) {
  const out = {}
  for (const s of Array.isArray(board) ? board : []) {
    if (!s || !s.id) continue
    const r = results && results[s.id]
    const hit = r ? stepState(s, r, { notes }) : (s.id === activeId ? activeState(s) : null)
    if (hit) out[hit.ing] = hit.state
  }
  return out
}

/** Các cặp 'ing.state' mà bảng có thể sinh ra cho một bước (để test đối chiếu với bộ hình). */
export function statesOfStep(step) {
  const def = step && STEP_STATE[step.id]
  if (!def) return []
  const ing = def.ing || step.ing
  if (!ing) return []
  const list = []
  if (def.state) list.push(def.state)
  if (def.method) for (const m of (step.method && step.method.options) || []) { const s = methodState(m); if (s) list.push(s) }
  if (def.active) list.push(def.active)
  if (def.bad) list.push(def.bad)
  for (const v of Object.values(def.byTag || {})) list.push(v)
  for (const v of Object.values(def.notes || {})) list.push(v)
  return [...new Set(list)].map(s => ing + '.' + s)
}
