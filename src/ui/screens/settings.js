// Màn Cài đặt (M3): âm thanh + âm lượng, rung, 2 công tắc Hỗ trợ, Mẹo nghề, giảm chuyển động, tần suất tình huống
// trong ca; sao lưu (chép mã, tải file, nhập mã có xem trước, bản đã cất); cài game; phiên bản, Giới thiệu;
// "Chơi lại từ đầu" (xác nhận 2 bước, bản cũ được CẤT sang khóa riêng, không bao giờ xóa).
// Mở từ màn Chuẩn bị (nút open-settings, thẻ nhắc sao lưu). params: { focus: 'backup' } cuộn tới mục Sao lưu.
// M5 Đợt 3 (gói M-E, bản 0.5.2): các nhóm là thẻ giấy có biểu tượng to (loa phường, phao cứu sinh, biển chỉ đường, cờ sự
// kiện, sổ, két sắt, điện thoại, xe đẩy), công tắc kiểu game (rãnh gỗ, núm tròn; vẫn là checkbox role=switch thật), thanh
// âm lượng rãnh gỗ, hộp sao lưu / nhập mã / giới thiệu / chơi lại có hình. Giới thiệu thêm ghi công font Baloo 2 (Ek Type,
// SIL Open Font License 1.1, tệp fonts/OFL.txt). Không đổi luật, tiền, điểm; giữ mọi testid, role, aria và export.
// Biểu tượng SETTINGS_ART vẽ ở đây theo quy chuẩn mục 6.1 (viền mực, ba tông, bóng đất; không gradient / url( / filter).
// Import trong Node an toàn: chỉ hằng chuỗi SVG thuần ở cấp module, không chạm DOM.
import { h, svgBox } from '../dom.js'
import { DI_SAU, DI_SAU_POSES } from '../art.js'
import { SCENE_ICONS } from '../art/scene.js'
import { metaArt } from '../art/meta.js'
import { INK, PAL, svg, ground, hilite, tone3, ball, r1, deepFreeze } from '../art/kit.js'
import { formatVND } from '../format.js'
import { screenHead, cartArt, cartOptions } from '../components/meta-ui.js'
import { exportCode, readCode, backupSummary, listArchives, countBrokenArchives } from '../../core/save.js'
import { defaultState, INCIDENT_FREQUENCIES } from '../../core/state.js'
import { refreshMeta } from '../../core/meta.js'
import { toursEnabled, setToursEnabled } from '../../core/tour.js'

// Biểu tượng bánh răng (nút Cài đặt ở màn Chuẩn bị).
export const GEAR_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.4h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" transform="translate(-1 0)"/></svg>'

// ---------- Biểu tượng nhóm (viewBox 0 0 64 64) ----------

// Chữ nhật bo góc thành đường path (cho tone3).
function rrD(x, y, w, hh, r) {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + hh - r}Q${x + w} ${y + hh} ${x + w - r} ${y + hh}` +
    `H${x + r}Q${x} ${y + hh} ${x} ${y + hh - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
}
// Vành khuyên (annulus) từ góc a0 tới a1 (độ, 0 = phải, chiều kim đồng hồ).
function ringSector(cx, cy, R, r, a0, a1) {
  const P = (rad, a) => [r1(cx + rad * Math.cos(a * Math.PI / 180)), r1(cy + rad * Math.sin(a * Math.PI / 180))]
  const [x0, y0] = P(R, a0), [x1, y1] = P(R, a1), [x2, y2] = P(r, a1), [x3, y3] = P(r, a0)
  const big = a1 - a0 > 180 ? 1 : 0
  return `M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z`
}
// Nét viền mực + lõi màu (sóng âm, tay cầm, mũi tên).
const inked = (d, color, w = 2.6) => `<path d="${d}" fill="none" stroke-width="${r1(w + 3.2)}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`
const GO = ['#43a63d', '#2c8429', '#8edb6a']

// Loa phường (Âm thanh và rung): loa kèn thép miệng đỏ trên chân, sóng âm vàng.
const LOA = svg(ground(30, 58, 20, 3) +
  inked('M14 40V55', PAL.thep[1], 2.6) + `<path d="M7 55.5H21" stroke-width="3"/>` +
  tone3({ outline: rrD(6, 22, 15, 18, 3), base: '#8c99a8', dark: '#6b7787', shade: 'M17 22H18C20 22 21 23 21 25V37C21 39 20 40 18 40H17Z' }) +
  tone3({
    outline: 'M20 26L41 11.5C43 10.2 45.4 11 45.4 13.4V48.6C45.4 51 43 51.8 41 50.5L20 36Z', base: PAL.thep[0], dark: PAL.thep[1],
    shade: 'M20 32.5H45.4V48.6C45.4 51 43 51.8 41 50.5L20 36Z', shine: hilite(29, 22.5, 7, 1.8, 0.6, -34)
  }) +
  `<ellipse cx="44.6" cy="31" rx="6.6" ry="19.6" fill="${PAL.do[0]}"/>` +
  `<ellipse cx="45.4" cy="31" rx="3.4" ry="13.6" fill="#7a2016" stroke-width="2"/>` + hilite(41.8, 19, 1.4, 4, 0.55) +
  inked('M53.4 23.5Q57 31 53.4 38.5', PAL.sao[0], 2.6) + inked('M57.6 17Q63 31 57.6 45', PAL.sao[0], 2.6))

// Phao cứu sinh (Hỗ trợ): vòng trắng 4 múi đỏ, mảng tối dưới-phải, dây buộc.
const PHAO_RING = 'M10 30A22 22 0 1 0 54 30A22 22 0 1 0 10 30ZM21.5 30A10.5 10.5 0 1 1 42.5 30A10.5 10.5 0 1 1 21.5 30Z'
const PHAO = svg(ground(32, 58, 19, 3) +
  `<path d="${PHAO_RING}" fill="#fffaf0" fill-rule="evenodd" stroke="none"/>` +
  [-22.5, 67.5, 157.5, 247.5].map(a => `<path d="${ringSector(32, 30, 22, 10.5, a, a + 45)}" fill="${PAL.do[0]}" stroke="none"/>`).join('') +
  `<path d="${ringSector(32, 30, 22, 16.5, -15, 165)}" fill="${INK}" opacity=".16" stroke="none"/>` +
  [22.5, 112.5, 202.5, 292.5].map(a => {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180)
    return `<path d="M${r1(32 + 19.5 * c)} ${r1(30 + 19.5 * s)}L${r1(32 + 24.5 * c)} ${r1(30 + 24.5 * s)}" stroke="${PAL.rom[1]}" stroke-width="3.4"/>`
  }).join('') +
  `<path d="${PHAO_RING}" fill="none" fill-rule="evenodd"/>` + hilite(19.5, 18, 5.4, 2.2, 0.6, -42))

// Biển chỉ đường bằng gỗ (Hiển thị và hướng dẫn): cột gỗ, hai tấm biển mũi tên ngược chiều, khóm cỏ.
const BIEN = svg(ground(32, 58, 17, 3) +
  tone3({ outline: 'M29 7H35V57H29Z', base: PAL.go_dam[0], dark: PAL.go_dam[1], shade: 'M32.6 7H35V57H32.6Z' }) +
  tone3({
    outline: 'M9 12H44L52 20L44 28H9Z', base: PAL.go[0], dark: PAL.go[1], shade: 'M9 24.4H47.6L44 28H9Z',
    shine: hilite(17, 15.6, 6, 1.4, 0.6), detail: `<path d="M14 20H23M26.5 20H38" stroke="${PAL.go_dam[1]}" stroke-width="2"/>`
  }) +
  tone3({
    outline: 'M55 32H20L12 40L20 48H55Z', base: PAL.tra[0], dark: PAL.tra[1], shade: 'M55 44.4H16.4L20 48H55Z',
    shine: hilite(27, 35.6, 6, 1.4, 0.55), detail: `<path d="M24 40H36M39.5 40H50" stroke="${PAL.go_dam[1]}" stroke-width="2"/>`
  }) +
  `<circle cx="32" cy="20" r="1.8" fill="#c9ccd1" stroke-width="1.6"/><circle cx="32" cy="40" r="1.8" fill="#c9ccd1" stroke-width="1.6"/>` +
  `<path d="M22 58C23 53 26 52 28 55C29 51 32 51 33 55C35 52 39 53 40 58Z" fill="${PAL.la[0]}" stroke-width="2.2"/>`)

// Két sắt (Sao lưu): thân xanh rêu, cửa, núm số vàng, tay nắm, bản lề, chân.
const KET = svg(ground(32, 58.4, 22, 3) +
  `<rect x="13" y="50" width="8" height="7" rx="2" fill="#3d4250" stroke-width="2.2"/><rect x="43" y="50" width="8" height="7" rx="2" fill="#3d4250" stroke-width="2.2"/>` +
  tone3({
    outline: rrD(8, 9, 48, 43, 6), base: '#4f8f86', dark: '#356b63', shade: 'M49 9.4C52 10 56 12 56 15V46C56 49 53 52 50 52H14C40 50 49 44 49 9.4Z',
    shine: hilite(16, 14, 6, 1.8, 0.5, -10)
  }) +
  `<rect x="13" y="14.5" width="37" height="32.5" rx="3.5" fill="#6aa99f" stroke-width="2.2"/>` +
  `<path d="M16 17.5H31" stroke="#fff" stroke-width="2" opacity=".5"/>` +
  `<rect x="9.6" y="19" width="5" height="7" rx="1.6" fill="#c9ccd1" stroke-width="1.8"/><rect x="9.6" y="35" width="5" height="7" rx="1.6" fill="#c9ccd1" stroke-width="1.8"/>` +
  ball(27.5, 31, 8.6, 8.6, PAL.sao, { sw: 2.4 }) + `<circle cx="27.5" cy="31" r="3.4" fill="${PAL.mam[1]}" stroke-width="1.8"/>` +
  `<path d="M27.5 22.4V24.6M36.1 31H33.9M27.5 39.6V37.4M18.9 31H21.1" stroke-width="1.8"/>` +
  inked('M42 24V38', PAL.thep[0], 2.6) + `<circle cx="42" cy="24" r="2.6" fill="${PAL.thep[0]}" stroke-width="1.8"/><circle cx="42" cy="38" r="2.6" fill="${PAL.thep[0]}" stroke-width="1.8"/>`)

// Điện thoại có huy hiệu mũi tên tải xuống (Cài game).
const DIEN_THOAI = svg(ground(30, 58.4, 17, 3) +
  tone3({ outline: rrD(15, 4, 30, 52, 6.5), base: '#3d4250', dark: '#262a33', shade: 'M40 4.6C43 5.4 45 7.4 45 10.5V49.5C45 53 42.4 56 39 56H33C38 54 40 50 40 4.6Z' }) +
  `<rect x="18.6" y="9.6" width="22.8" height="38" rx="2.6" fill="#d9f2fc" stroke-width="2"/>` +
  `<path d="M21.5 13L27 26" stroke="#fff" stroke-width="2.4" opacity=".8"/>` +
  `<rect x="22" y="14" width="7.4" height="7.4" rx="2" fill="${PAL.do[0]}" stroke-width="1.6"/><rect x="31" y="14" width="7.4" height="7.4" rx="2" fill="${PAL.sao[0]}" stroke-width="1.6"/>` +
  `<rect x="22" y="23.6" width="7.4" height="7.4" rx="2" fill="${PAL.xanh_nhan[0]}" stroke-width="1.6"/><rect x="31" y="23.6" width="7.4" height="7.4" rx="2" fill="${PAL.la[0]}" stroke-width="1.6"/>` +
  `<path d="M26 51.8H34" stroke="#8c99a8" stroke-width="2.2"/>` +
  ball(45.5, 43, 11.4, 11.4, GO, { sw: 2.8 }) + inked('M45.5 36.4V49M40.4 44.2L45.5 49.3L50.6 44.2', '#fff', 2.8))

/** Biểu tượng nhóm của màn Cài đặt (id → SVG 64), dùng lại được ở bảng xem hình. */
export const SETTINGS_ART = deepFreeze({ loa: LOA, phao: PHAO, bien_chi_duong: BIEN, ket_sat: KET, dien_thoai: DIEN_THOAI })

const INCIDENT_LABELS = Object.freeze({ nhieu: 'Nhiều', vua: 'Vừa', it: 'Ít' })
// M4: một cài đặt cho cả sự kiện ngày và tình huống trong ca ("Tần suất sự kiện")
const INCIDENT_HINTS = Object.freeze({
  nhieu: 'Sự kiện dày: phần lớn các ca có tình huống, có ca gặp 2 lần.',
  vua: 'Mặc định: đa số ngày có sự kiện, hơn nửa số ca có tình huống.',
  it: 'Ít tình huống hơn, và chỉ gồm sự kiện, tình huống vui (không có khoản phạt).'
})

// Câu báo lỗi thân thiện khi đọc mã sao lưu.
export const CODE_ERRORS = Object.freeze({
  rong: 'Chưa có mã. Hãy dán mã sao lưu (bắt đầu bằng BKN1) hoặc chọn file sao lưu.',
  khong_phai_ma: 'Đây không phải mã sao lưu của Bếp Khởi Nghiệp. Mã đúng bắt đầu bằng BKN1.',
  sai_ma: 'Mã bị sai hoặc thiếu ký tự, có thể do chép chưa hết. Hãy chép lại toàn bộ mã rồi thử lại.',
  hong: 'Mã không đọc được. Hãy tạo mã mới ở máy cũ rồi thử lại.'
})

const REPLACE_ERRORS = Object.freeze({
  loi_cat: 'Không cất được bản hiện tại (bộ nhớ trình duyệt có thể đã đầy) nên chưa thay bản lưu. Hãy tải file sao lưu trước.',
  loi_ghi: 'Không ghi được bản lưu mới. Bản hiện tại vẫn giữ nguyên.',
  tab_khac: 'Game đang mở ở tab khác. Hãy chơi ở một tab thôi nhé.'
})

const pad2 = n => String(n).padStart(2, '0')

/** 'dd/mm/yyyy HH:mm' theo giờ của máy. */
export function formatTime(ms) {
  const d = new Date(Number(ms) || 0)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// Tên file không dấu, không ký tự lạ: 'Xe Bánh Mì Cô Ba' → 'xe-banh-mi-co-ba'.
export function slugify(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
}

function randomSeed() {
  try {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0] >>> 0
  } catch {
    return Math.floor(Math.random() * 0xffffffff) >>> 0
  }
}

// Mốc sao lưu `at` (ms) của state: lastAt = at. Dùng cho bản trong mã (mã mang sẵn mốc này).
function withBackupMark(state, at) {
  return { ...state, backup: { ...(state.backup || {}), lastAt: at, since: (state.backup && state.backup.since) || at } }
}

// Ghi mốc "đã sao lưu" vào bản đang chơi — CHỈ khi mã đã thật sự được cất (chép vào bộ nhớ tạm thành công, người chơi
// tự chép từ ô mã, hoặc đã tải file). Chép thất bại (vd chơi qua http trong mạng Wi-Fi: trình duyệt không cho chép tự
// động) thì không ghi, thẻ nhắc sao lưu vẫn còn.
function markBackup(app, at) {
  const s = app.state
  if (!s || (s.backup && s.backup.lastAt >= at)) return
  s.backup = withBackupMark(s, at).backup
  app.saveNow()
}

// Nội dung file sao lưu: vài dòng hướng dẫn + mã (nhập lại được cả file lẫn đoạn dán).
export function backupFileText(app, code) {
  const info = backupSummary(app.state)
  return [
    'Bếp Khởi Nghiệp – mã sao lưu',
    `Xe: ${info.shopName || 'chưa đặt tên'} · Ngày ${info.day} · Tiền quán ${formatVND(info.wallet)}`,
    `Lưu lúc: ${formatTime(app.now())} · Phiên bản ${app.version}`,
    'Cách dùng: mở game → Cài đặt → Nhập mã sao lưu → Chọn file sao lưu (hoặc dán mã bên dưới).',
    '',
    code,
    ''
  ].join('\n')
}

/** Chép mã sao lưu: bộ nhớ tạm + hộp thoại hiện mã để chép tay. Chỉ ghi mốc "đã sao lưu" khi chép được thật. */
export async function copyBackup(app) {
  const at = app.now()
  const code = exportCode(withBackupMark(app.state, at))
  let copied = false
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(code)
      copied = true
    }
  } catch { copied = false }
  if (copied) markBackup(app, at)
  app.sound(copied ? 'coin' : 'click')
  return app.modal({
    title: 'Mã sao lưu', testid: 'backup-code-modal', className: 'backup-modal set-modal', icon: KET,
    render: close => {
      const area = h('textarea', {
        class: 'input backup-text', testid: 'backup-code', readonly: 'readonly', rows: '5', spellcheck: 'false',
        'aria-label': 'Mã sao lưu', onfocus: e => e.target.select(),
        // người chơi tự chép (menu chép của máy) → mã đã được cất
        oncopy: () => { markBackup(app, at); setStatus(true, true) }
      })
      area.value = code
      const status = h('p', { class: 'backup-status', testid: 'backup-copy-status', role: 'status', dataset: { copied: 'false' } })
      function setStatus(ok, manual = false) {
        status.textContent = ok
          ? (manual ? 'Đã chép mã. Dán vào ghi chú, tin nhắn hoặc email để cất.' : 'Đã chép mã vào bộ nhớ tạm. Dán vào ghi chú, tin nhắn hoặc email để cất.')
          : 'Chưa chép tự động được. Chạm vào ô trên, chọn hết rồi chép mã (hoặc dùng "Tải file sao lưu"). Chép xong game mới ghi nhận đã sao lưu.'
        status.classList.toggle('is-ok', ok)
        status.dataset.copied = ok ? 'true' : 'false'
      }
      setStatus(copied)
      const again = () => {
        area.focus()
        area.select()
        let ok = false
        try { ok = document.execCommand('copy') } catch { ok = false }
        if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(() => { markBackup(app, at); setStatus(true) }).catch(() => setStatus(false))
          return
        }
        if (ok) markBackup(app, at)
        setStatus(ok)
      }
      return h('div', { class: 'backup-body' },
        h('p', { class: 'small' }, `Mã dài ${code.length.toLocaleString('vi-VN')} ký tự, chứa toàn bộ tiến trình. Nhập mã này ở máy khác (Cài đặt → Nhập mã sao lưu) để chơi tiếp.`),
        area, status,
        h('div', { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', type: 'button', testid: 'backup-copy-again', onclick: again }, 'Chép lại'),
          h('button', { class: 'btn btn-primary', type: 'button', testid: 'backup-done', onclick: () => close(true) }, 'Xong')))
    }
  })
}

/** Tải file sao lưu (.txt) qua Blob. Ghi mốc "đã sao lưu" khi trình duyệt nhận lệnh tải. */
export function downloadBackup(app) {
  const at = app.now()
  const code = exportCode(withBackupMark(app.state, at))
  const info = backupSummary(app.state)
  const d = new Date(app.now())
  const name = `bep-khoi-nghiep-${slugify(info.shopName) || 'xe'}-ngay-${info.day}-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}.txt`
  try {
    const blob = new Blob([backupFileText(app, code)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = h('a', { href: url, download: name, hidden: true })
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    markBackup(app, at)
    app.sound('coin')
    app.toast(`Đã tải file ${name}`, { kind: 'good', testid: 'backup-download-toast' })
    return true
  } catch {
    app.toast('Trình duyệt không cho tải file. Hãy dùng "Chép mã sao lưu".', { kind: 'bad' })
    return false
  }
}

// Bảng xem trước: bản trong mã (và bản hiện tại để so).
function previewTable(app, next, cur) {
  const S = app.data.STRINGS
  const a = backupSummary(next)
  const b = cur && cur.shopName ? backupSummary(cur) : null
  const chang = n => (S.chang && S.chang[n]) || `Chặng ${n}`
  const rows = [
    ['Tên xe', a.shopName || 'Chưa đặt tên', b && (b.shopName || 'Chưa đặt tên')],
    ['Ngày game', `Ngày ${a.day}`, b && `Ngày ${b.day}`],
    ['Tiền quán', formatVND(a.wallet), b && formatVND(b.wallet)],
    ['Chặng', chang(a.chang), b && chang(b.chang)],
    ['Công thức', `${a.recipes} món`, b && `${b.recipes} món`],
    ['Danh tiếng', String(a.reputation), b && String(b.reputation)],
    ['Muỗng Vàng', String(a.goldSpoons), b && String(b.goldSpoons)]
  ]
  return h('div', {
    class: 'backup-preview', testid: 'backup-preview',
    dataset: { shop: a.shopName, day: a.day, wallet: a.wallet, chang: a.chang, recipes: a.recipes }
  },
  h('table', { class: 'backup-table' },
    h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Bản trong mã'), b ? h('th', null, 'Bản hiện tại') : null)),
    h('tbody', null, rows.map(([label, x, y]) => h('tr', null, h('th', { scope: 'row' }, label), h('td', null, x), b ? h('td', null, y) : null)))),
  a.inShift ? h('p', { class: 'small' }, 'Bản này có ca đang bán dở: vào game sẽ bán tiếp ca đó.') : null)
}

// Cảnh báo mã tạo từ bản game mới hơn (readCode trả warn 'ban_moi_hon'): phần bản này chưa có sẽ mất khi dùng mã.
function newerWarning(parsed) {
  const lost = parsed.lost || { recipes: [], upgrades: [] }
  const parts = []
  if (lost.recipes.length) parts.push(`${lost.recipes.length} món`)
  if (lost.upgrades.length) parts.push(`${lost.upgrades.length} nâng cấp`)
  const what = parts.length ? `có ${parts.join(' và ')} mà bản game này chưa có, dùng ở đây sẽ mất các phần đó` : 'dùng ở đây có thể mất phần mới'
  return h('p', { class: 'backup-error backup-newer', testid: 'backup-newer', role: 'alert' },
    `Mã này tạo từ bản game mới hơn: ${what}. Hãy cập nhật game trước (mở game khi có mạng, bấm "Tải lại" khi có bản mới) rồi nhập lại.`)
}

// Thay bản lưu bằng next (bản hiện tại được cất trước), cập nhật meta, về màn mở đầu.
function applyNewState(app, next, message) {
  const s = next
  if (!s.backup || !s.backup.since) s.backup = { lastAt: (s.backup && s.backup.lastAt) || 0, since: app.now() }
  const r = app.replaceState(s)
  if (!r.ok) {
    app.sound('error')
    app.toast(REPLACE_ERRORS[r.reason] || REPLACE_ERRORS.loi_ghi, { kind: 'bad', duration: 4000, testid: 'replace-error' })
    return false
  }
  try {
    const res = refreshMeta(app.state, app.nowInfo(), app.ctx)
    app.session.pendingMail = (res.newMail || []).slice()
    app.session.pendingEventAuto = (res.eventQuestsAuto || []).slice()
  } catch (err) { console.error(err) }
  app.saveNow()
  app.sound('chest')
  app.toast(message, { kind: 'good', duration: 3000, testid: 'replace-done' })
  app.go('title')
  return true
}

/**
 * Hộp thoại nhập mã sao lưu: dán mã hoặc chọn file → Xem trước (tên xe, ngày game, Tiền quán, chặng, số công thức)
 * → "Dùng bản này" mới ghi đè (bản hiện tại được cất sang khóa riêng). opts: { code, title } (khôi phục bản đã cất).
 * Trả Promise<boolean> (đã thay bản lưu hay chưa).
 */
export function openImport(app, opts = {}) {
  return app.modal({
    title: opts.title || 'Nhập mã sao lưu', testid: 'backup-import-modal', className: 'backup-modal set-modal', icon: KET,
    render: close => {
      let parsed = null
      const input = h('textarea', {
        class: 'input backup-text', testid: 'backup-input', rows: '4', spellcheck: 'false', autocomplete: 'off',
        autocapitalize: 'off', placeholder: 'Dán mã sao lưu bắt đầu bằng BKN1…', 'aria-label': 'Mã sao lưu',
        oninput: () => { parsed = null; paint() }
      })
      if (opts.code) input.value = opts.code
      const err = h('p', { class: 'backup-error', testid: 'backup-error', role: 'alert', hidden: true })
      const previewHost = h('div', { class: 'backup-preview-host' })
      const file = h('input', {
        type: 'file', accept: '.txt,.json,text/plain,application/json', testid: 'backup-file', hidden: true,
        onchange: async e => {
          const f = e.target.files && e.target.files[0]
          if (!f) return
          try { input.value = await f.text() } catch { input.value = '' }
          e.target.value = ''
          check()
        }
      })
      const checkBtn = h('button', { class: 'btn btn-secondary', type: 'button', testid: 'backup-check', onclick: () => check() }, 'Xem trước')
      const pickBtn = h('button', { class: 'btn btn-ghost', type: 'button', testid: 'backup-file-pick', onclick: () => file.click() }, 'Chọn file sao lưu')
      const confirmBtn = h('button', {
        class: 'btn btn-primary', type: 'button', testid: 'backup-confirm', hidden: true,
        onclick: () => {
          if (!parsed) return
          confirmBtn.disabled = true
          const ok = applyNewState(app, parsed.state, `Đã nhập bản lưu: ${parsed.state.shopName || 'xe chưa đặt tên'}, ngày ${parsed.state.day}.`)
          if (ok) close(true)
          else confirmBtn.disabled = false
        }
      }, 'Dùng bản này')
      const cancelBtn = h('button', { class: 'btn btn-ghost', type: 'button', testid: 'backup-cancel', onclick: () => close(false) }, 'Thôi')
      // đã xem trước: thu gọn ô dán mã để nút xác nhận vừa màn hình nhỏ; bấm để dán mã khác
      const changeBtn = h('button', {
        class: 'btn btn-ghost', type: 'button', testid: 'backup-change', hidden: true,
        onclick: () => { parsed = null; paint(); input.focus() }
      }, 'Nhập mã khác')
      const intro = h('p', { class: 'small' }, 'Dán mã sao lưu (chép từ máy khác) hoặc chọn file sao lưu đã tải về.')
      const note = h('p', { class: 'small backup-note', hidden: true },
        app.state && app.state.shopName ? 'Bản hiện tại sẽ được cất vào máy này (không bị xóa) trước khi thay.' : 'Bản lưu trong mã sẽ được dùng trên máy này.')

      function paint() {
        previewHost.textContent = ''
        confirmBtn.hidden = !parsed
        note.hidden = !parsed
        checkBtn.hidden = !!parsed
        pickBtn.hidden = !!parsed
        input.hidden = !!parsed
        intro.hidden = !!parsed
        changeBtn.hidden = !parsed
        // mã từ bản game mới hơn: cảnh báo phần sẽ mất, nút xác nhận hỏi lại rõ ràng
        const newer = !!(parsed && parsed.warn === 'ban_moi_hon')
        confirmBtn.textContent = newer ? 'Vẫn dùng bản này' : 'Dùng bản này'
        confirmBtn.classList.toggle('btn-danger', newer)
        confirmBtn.classList.toggle('btn-primary', !newer)
        if (parsed) {
          if (newer) previewHost.appendChild(newerWarning(parsed))
          previewHost.appendChild(previewTable(app, parsed.state, app.state))
        }
      }
      function check() {
        const r = readCode(input.value, app.data)
        if (!r.ok) {
          parsed = null
          err.textContent = CODE_ERRORS[r.reason] || CODE_ERRORS.sai_ma
          err.hidden = false
          app.sound('nudge')
          paint()
          return
        }
        err.hidden = true
        parsed = r
        app.sound('click')
        paint()
      }
      paint()
      if (opts.code) setTimeout(check, 0)
      return h('div', { class: 'backup-body' },
        intro, input, file, err, previewHost, note,
        h('div', { class: 'backup-row' }, pickBtn, checkBtn, changeBtn),
        h('div', { class: 'modal-actions' }, cancelBtn, confirmBtn))
    }
  })
}

/** "Chơi lại từ đầu": xác nhận 2 bước; bản hiện tại được cất sang khóa riêng (không xóa). */
export async function resetGame(app) {
  const info = backupSummary(app.state)
  const step1 = await app.modal({
    title: 'Chơi lại từ đầu?', icon: DI_SAU_POSES.lau_mo_hoi || DI_SAU.lo, testid: 'reset-step1', className: 'reset-modal set-modal',
    text: `Bắt đầu lại từ ngày 1 với xe mới. Bản hiện tại (${info.shopName || 'xe chưa đặt tên'}, ngày ${info.day}, Tiền quán ${formatVND(info.wallet)}) ` +
      'sẽ được cất vào máy này, không bị xóa, khôi phục được ở mục "Bản lưu đã cất".',
    actions: [{ label: 'Thôi', value: false, kind: 'ghost', testid: 'reset-cancel' }, { label: 'Tiếp tục', value: true, kind: 'danger', testid: 'reset-next' }]
  })
  if (!step1) return false
  const step2 = await app.modal({
    title: 'Xác nhận lần cuối', testid: 'reset-step2', icon: KET, className: 'reset-modal set-modal is-last',
    text: 'Nên chép mã sao lưu trước khi chơi lại. Bấm "Chơi lại từ đầu" để bắt đầu ngày 1 với Tiền quán ban đầu.',
    actions: [{ label: 'Thôi', value: false, kind: 'ghost', testid: 'reset-cancel' }, { label: 'Chơi lại từ đầu', value: true, kind: 'danger', testid: 'reset-confirm' }]
  })
  if (!step2) return false
  const next = defaultState(randomSeed(), app.data)
  next.settings = { ...next.settings, ...app.state.settings }
  // hướng dẫn lần đầu: ván mới hướng dẫn lại từ đầu, giữ lựa chọn bật/tắt tự hiện
  setToursEnabled(next, toursEnabled(app.state))
  next.backup = { lastAt: 0, since: app.now() }
  return applyNewState(app, next, 'Đã cất bản cũ. Bắt đầu lại từ ngày 1, chúc đắt hàng!')
}

/**
 * Hộp Giới thiệu: xe đẩy + tên game + phiên bản, ba lời ghi chú hư cấu (giữ chữ "hư cấu", "số liệu minh họa",
 * "không liên quan tới thương hiệu"), lưu trên máy, và mục Ghi công (font Baloo 2 của Ek Type, giấy phép SIL Open Font
 * License 1.1, tệp fonts/OFL.txt; hình, âm, lời thoại tự làm).
 */
export function openAbout(app) {
  const cart = app.state && app.data ? cartArt(cartOptions(app.state, app.data)) : ''
  return app.modal({
    title: 'Giới thiệu', testid: 'about-modal', dismissible: true, className: 'about-modal set-modal',
    render: close => h('div', { class: 'about-body' },
      h('div', { class: 'about-hero' },
        cart ? svgBox(cart, 'about-cart') : null,
        h('div', { class: 'about-hero-text' },
          h('b', { class: 'about-name' }, 'Bếp Khởi Nghiệp'),
          h('span', { class: 'about-ver' }, `Phiên bản ${app.version}`))),
      h('div', { class: 'about-paper' },
        h('p', null, 'Bếp Khởi Nghiệp là game hư cấu về chuyện mở xe đẩy bán đồ ăn sáng: ghi order, tính tiền, thối tiền và nấu từng món.'),
        h('p', null, 'Mọi nhân vật, tên quán đều là hư cấu. Giá bán, giá vốn, tiền thưởng và con số trong Mẹo nghề chỉ là số liệu minh họa, không phản ánh giá thị trường.'),
        h('p', null, 'Game không liên quan tới thương hiệu, cửa hàng hay doanh nghiệp nào.'),
        h('p', null, 'Tiến trình lưu ngay trên máy này, không cần tài khoản và không gửi dữ liệu đi đâu.')),
      h('section', { class: 'about-credit', testid: 'about-credit' },
        h('h3', { class: 'about-credit-title' }, 'Ghi công'),
        h('p', { class: 'about-font', testid: 'about-font' },
          h('b', { class: 'about-font-name' }, 'Baloo 2'),
          ' (bản ExtraBold 800) là font chữ tiêu đề và số tiền, của Ek Type: © 2019 The Baloo 2 Project Authors (github.com/EkType/Baloo2).'),
        h('p', null, 'Font dùng theo giấy phép SIL Open Font License, phiên bản 1.1. Toàn văn giấy phép ở tệp fonts/OFL.txt đi kèm game. Hai tệp font trong game là bản cắt bớt ký tự, không bán riêng.'),
        h('p', null, 'Hình vẽ, âm thanh và lời thoại trong game do nhóm làm game tự làm.')),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn btn-primary', type: 'button', testid: 'about-close', onclick: () => close(true) }, 'Đóng')))
  })
}

// ---------- Màn Cài đặt ----------
export default {
  mount(root, app, params = {}) {
    const el = h('section', { class: 'meta-screen settings-screen', testid: 'screen-settings' })
    root.appendChild(el)
    let destroyed = false
    const offs = []

    const set = (key, value) => {
      app.state.settings[key] = value
      app.applySettings()
      app.saveNow()
    }

    // Công tắc bật/tắt có mô tả ảnh hưởng (checkbox thật role=switch, vẽ thành rãnh gỗ + núm tròn bằng CSS).
    function switchRow(key, label, desc) {
      const s = app.state.settings
      return h('label', { class: 'set-row set-switch' },
        h('span', { class: 'set-text' }, h('b', null, label), desc ? h('small', null, desc) : null),
        h('input', {
          type: 'checkbox', class: 'switch', role: 'switch', checked: !!s[key], testid: 'setting-' + key,
          onchange: e => {
            set(key, e.target.checked)
            if (key === 'sound' && e.target.checked) app.sound('ding')
            else app.sound('click')
            if (key === 'vibrate' && e.target.checked) app.vibrate(30)
            if (key === 'sound') render()     // bật/tắt ô âm lượng theo công tắc
          }
        }))
    }

    // 0.4.1: bật/tắt tự hiện hướng dẫn lần đầu (state.tour.disabled, không nằm trong settings)
    function tourRow() {
      return h('label', { class: 'set-row set-switch' },
        h('span', { class: 'set-text' }, h('b', null, 'Hướng dẫn lần đầu'),
          h('small', null, 'Lần đầu con tới một màn hay một khâu, Dì Sáu chỉ từng chỗ; trong ca, khách đang chờ cũng tạm dừng. Tắt thì không tự hiện nữa, vẫn xem lại được bằng nút "?".')),
        h('input', {
          type: 'checkbox', class: 'switch', role: 'switch', checked: toursEnabled(app.state), testid: 'setting-tour',
          onchange: e => {
            setToursEnabled(app.state, e.target.checked)
            app.saveNow()
            app.sound('click')
          }
        }))
    }

    // Âm lượng: rãnh gỗ, phần đã chọn màu kẹo (biến --v), núm tròn; số % Baloo cạnh nhãn.
    function volumeRow() {
      const s = app.state.settings
      const pct = v => Math.round((Number(v) || 0) * 100)
      const out = h('output', { class: 'set-value', testid: 'setting-volume-value' }, pct(s.volume ?? 0.8) + '%')
      const range = h('input', {
        type: 'range', class: 'set-range', min: '0', max: '100', step: '10', testid: 'setting-volume',
        'aria-label': 'Âm lượng', disabled: s.sound === false,
        oninput: e => { out.textContent = e.target.value + '%'; e.target.style.setProperty('--v', e.target.value + '%') },
        onchange: e => { set('volume', Number(e.target.value) / 100); app.sound('coin') }
      })
      range.value = String(pct(s.volume ?? 0.8))
      range.style.setProperty('--v', range.value + '%')
      return h('div', { class: 'set-row set-volume' },
        h('span', { class: 'set-text' }, h('b', null, 'Âm lượng'), h('small', null, 'Âm thanh tổng hợp ngay trong game, không cần tải file.')),
        out, range)
    }

    function incidentRow() {
      const cur = app.state.settings.incidentFrequency || 'vua'
      return h('div', { class: 'set-row set-seg-row' },
        h('span', { class: 'set-text' }, h('b', null, 'Tần suất sự kiện'),
          h('small', null, 'Sự kiện ngày và tình huống giữa hai khách: sự kiện có phạt luôn có cách an toàn, vài sự kiện chỉ là chi phí nhỏ được báo trước. ' +
            INCIDENT_HINTS[cur] + ' Đổi mức chỉ áp cho ngày chưa báo trước, sự kiện đã báo giữ nguyên.')),
        h('div', { class: 'set-seg', role: 'radiogroup', 'aria-label': 'Tần suất sự kiện' },
          INCIDENT_FREQUENCIES.map(id => h('button', {
            class: ['btn', 'btn-small', 'set-seg-btn', id === cur ? 'is-on' : ''], type: 'button', role: 'radio',
            'aria-checked': String(id === cur), testid: 'setting-incident-' + id,
            onclick: () => { if (id !== cur) { set('incidentFrequency', id); app.sound('click'); render() } }
          }, INCIDENT_LABELS[id]))))
    }

    // Thẻ giấy một nhóm: biểu tượng to + tiêu đề Baloo (+ dòng phụ), rồi các hàng.
    function section(title, testid, art, ...children) {
      return h('section', { class: 'card set-card', testid },
        h('div', { class: 'set-head' },
          art ? svgBox(art, 'set-ico') : null,
          h('h2', { class: 'card-title set-title' }, title)),
        children)
    }

    function backupSection() {
      const bk = app.state.backup || {}
      const archives = app.storage ? listArchives(app.storage, { keys: app.saveKeys }) : []
      const broken = app.storage ? countBrokenArchives(app.storage, { keys: app.saveKeys }) : 0
      const items = []
      for (const a of archives.slice(0, 20)) {
        const r = readCode(a.code, app.data)
        if (!r.ok) continue
        const info = backupSummary(r.state)
        items.push(h('li', { class: 'archive-item', testid: 'archive-' + a.at },
          h('span', { class: 'archive-text' },
            h('b', null, info.shopName || 'Xe chưa đặt tên'),
            h('small', null, `Ngày ${info.day} · ${formatVND(info.wallet)} · cất lúc ${formatTime(a.at)}`)),
          h('button', {
            class: 'btn btn-ghost btn-small', type: 'button', testid: 'archive-restore-' + a.at,
            onclick: () => { app.sound('click'); openImport(app, { code: a.code, title: 'Khôi phục bản đã cất' }) }
          }, 'Khôi phục')))
      }
      return section('Sao lưu', 'settings-backup', KET,
        h('p', { class: 'small' }, 'Mã sao lưu chứa toàn bộ tiến trình. Dùng để chuyển sang máy khác, hoặc phòng khi trình duyệt tự dọn dữ liệu.'),
        h('p', { class: ['small', 'set-last', bk.lastAt ? 'is-ok' : 'is-warn'], testid: 'backup-last' },
          h('span', { class: 'set-last-mark', 'aria-hidden': 'true' }, bk.lastAt ? '✓' : '!'),
          h('span', null, bk.lastAt ? `Lần sao lưu gần nhất: ${formatTime(bk.lastAt)}` : 'Chưa sao lưu lần nào.')),
        h('div', { class: 'set-actions set-backup-actions' },
          h('button', { class: 'btn btn-primary', type: 'button', testid: 'backup-copy', onclick: () => copyBackup(app).then(() => { if (!destroyed) render() }) }, 'Chép mã sao lưu'),
          h('button', { class: 'btn btn-secondary', type: 'button', testid: 'backup-download', onclick: () => { downloadBackup(app); render() } }, 'Tải file sao lưu'),
          h('button', { class: 'btn btn-ghost', type: 'button', testid: 'backup-import', onclick: () => { app.sound('click'); openImport(app) } }, 'Nhập mã sao lưu')),
        items.length ? h('details', { class: 'archive-box', testid: 'archive-list' },
          h('summary', null, `Bản lưu đã cất (${items.length})`),
          h('p', { class: 'small muted' }, 'Bản cũ được cất lại mỗi khi nhập mã hoặc chơi lại từ đầu. Khôi phục một bản thì bản đang chơi cũng được cất.'),
          h('ul', { class: 'archive-items' }, items)) : null,
        broken ? h('p', { class: 'small muted', testid: 'broken-archives' },
          `Có ${broken} bản lưu không đọc được (hỏng hoặc của bản game khác) đã được cất lại trong máy, không bị xóa.`) : null)
    }

    function installSection() {
      const mode = app.installMode()
      const pwa = app.pwa || {}
      const status = pwa.offlineReady ? 'Đã sẵn sàng chơi khi không có mạng.' : 'Mở game khi có mạng một lần là lần sau chơi được cả khi mất mạng.'
      let body
      if (mode === 'installed') {
        body = h('p', { class: 'small set-installed', testid: 'install-state' }, 'Game đã được cài trên máy này. Mở từ màn hình chính để chơi toàn màn hình.')
      } else {
        body = h('button', {
          class: 'btn btn-secondary btn-wide', type: 'button', testid: 'install-app',
          onclick: async () => {
            app.sound('click')
            if (mode === 'prompt') {
              const r = await app.promptInstall()
              if (r === 'accepted') app.toast('Đã cài game vào máy.', { kind: 'good' })
              if (!destroyed) render()
              return
            }
            app.modal({
              title: 'Cài game', testid: 'install-hint', dismissible: true, icon: DIEN_THOAI, className: 'install-modal set-modal',
              text: mode === 'ios'
                ? 'Trên iPhone/iPad: mở game bằng Safari, bấm nút Chia sẻ (ô vuông có mũi tên lên) rồi chọn "Thêm vào Màn hình chính".'
                : 'Mở menu của trình duyệt (dấu ba chấm) rồi chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".',
              actions: [{ label: 'Đã hiểu', value: true, testid: 'install-hint-ok' }]
            })
          }
        }, 'Cài game')
      }
      return section('Cài game', 'settings-install', DIEN_THOAI,
        h('p', { class: 'small' }, 'Cài vào màn hình chính để mở nhanh như ứng dụng, chơi toàn màn hình và ít bị trình duyệt dọn dữ liệu.'),
        body,
        h('p', { class: ['small', 'muted', 'set-offline', pwa.offlineReady ? 'is-ok' : ''], testid: 'offline-state' }, status))
    }

    // Lối sang Sổ tay nghề (thẻ Mẹo nghề đã mở) và Sổ công thức: hai ô có hình to.
    function bookLink(testid, art, label, sub, go) {
      return h('button', { class: 'btn btn-ghost set-book', type: 'button', testid, onclick: () => { app.sound('click'); app.go(go) } },
        svgBox(metaArt(art), 'set-book-ico'),
        h('span', { class: 'set-book-text' }, h('b', null, label), h('small', null, sub)))
    }

    function render() {
      if (destroyed) return
      const scrollTop = root.scrollTop
      el.textContent = ''
      el.appendChild(screenHead(app, { title: 'Cài đặt', sub: 'Âm thanh, hỗ trợ, sao lưu và cài game', backLabel: '‹ Chuẩn bị' }))
      el.appendChild(h('div', { class: 'meta-body settings-body' },
        section('Âm thanh và rung', 'settings-sound', LOA,
          switchRow('sound', 'Âm thanh', 'Dao thái, dầu xèo, rót nước, chuông ra món, tiền vào két.'),
          volumeRow(),
          switchRow('vibrate', 'Rung', 'Rung nhẹ khi thái chuẩn, khi món hỏng, khi khách sắp hết kiên nhẫn.')),
        section('Hỗ trợ', 'settings-assist', PHAO,
          switchRow('assistCash', 'Hỗ trợ tính tiền', 'Hiện sẵn tổng tiền và tiền thối. Khi bật: chuỗi "Quầy chuẩn" và việc ở Quầy không được đếm, không ghi kỷ lục.'),
          switchRow('assistMotion', 'Hỗ trợ thao tác', 'Vùng mục tiêu rộng hơn, thời gian dài hơn, ô cần lấy nhấp nháy. Khi bật: món không đạt "Không tì vết" và tối đa hạng Ngon.')),
        section('Hiển thị và hướng dẫn', 'settings-play', BIEN,
          switchRow('reducedMotion', 'Giảm chuyển động', 'Bớt hiệu ứng rung lắc, nhấp nháy, trượt.'),
          tourRow(),
          switchRow('tips', 'Mẹo nghề', 'Thẻ mẹo vận hành quán, hiện ngắn trong ca, không dừng game. Tắt thì thẻ mới không nổi lên nhưng vẫn được ghi vào Sổ tay nghề.')),
        section('Sự kiện', 'settings-events', metaArt('su_kien'), incidentRow()),
        // M3 nội dung: lối sang Sổ tay nghề (thẻ Mẹo nghề đã mở) và Sổ công thức
        h('div', { class: 'set-books' },
          bookLink('settings-open-notebook', 'so_tay_nghe', 'Sổ tay nghề', 'Thẻ Mẹo nghề', 'notebook'),
          bookLink('settings-open-recipe-book', 'so_cong_thuc', 'Sổ công thức', 'Cách làm món', 'recipe-book')),
        backupSection(),
        installSection(),
        section('Thông tin', 'settings-info', SCENE_ICONS.tab_quay,
          h('p', { class: 'small set-version', testid: 'app-version' }, `Bếp Khởi Nghiệp · phiên bản ${app.version}`),
          h('div', { class: 'set-actions set-info-actions' },
            h('button', { class: 'btn btn-ghost', type: 'button', testid: 'open-about', onclick: () => { app.sound('click'); openAbout(app) } }, 'Giới thiệu'),
            h('button', { class: 'btn btn-danger', type: 'button', testid: 'reset-game', onclick: () => { app.sound('nudge'); resetGame(app) } }, 'Chơi lại từ đầu')))))
      root.scrollTop = scrollTop
    }

    render()
    offs.push(app.onPwaChange(() => render()))
    if (params.focus === 'backup') {
      const target = el.querySelector('[data-testid="settings-backup"]')
      if (target) setTimeout(() => { if (!destroyed) target.scrollIntoView({ block: 'start' }) }, 0)
    }
    return {
      unmount() {
        destroyed = true
        for (const off of offs) off()
      }
    }
  }
}
