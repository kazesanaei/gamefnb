// Hình vẽ SVG dạng chuỗi (không ảnh ngoài, không base64). JS thuần, không dùng DOM.
// Icon dùng viewBox 0 0 64 64: màu phẳng, viền đậm, hình đơn giản dễ thương.
//
// M5 (0.5.0) — MẶT TIỀN của hệ hình (thiết kế M5 mục 1.2):
// - ICONS = bộ hình cũ (nguyên liệu, món, dụng cụ, sự kiện/meta) được THAY bằng hình mới cùng id của src/ui/art/*
//   (ing-tuoi, ing-kho, mon, tools; kiểu cel-shading viền mực). Mọi id cũ vẫn còn (sự kiện, thư, món tương lai… chưa
//   vẽ lại thì giữ hình cũ); thêm 4 biểu tượng thao tác mới (muong_khuay, dao_bao, binh_lac, khay_bay).
// - art(id, state): hình trạng thái 'id.state' (dưa leo thái lát, trứng ốp la…) nếu có, không thì icon(id).
// - prop(id) / PROP_META / PROPS: đạo cụ sân khấu lớn (viewBox riêng, KHÔNG nằm trong ICONS); thiếu thì ''.
// - LEGACY_ICONS: bộ hình cũ nguyên vẹn (Phòng mẫu so cũ/mới, test so "hình mới khác hình cũ").
// - Tệp này import THẲNG src/ui/art/{ing-tuoi,ing-kho,mon,tools,props,people,scene}.js; src/ui/art/v2.js chỉ là lớp tương
//   thích (artV2 = art, propV2 = prop) import từ tệp này, nên không có vòng import (people.js, scene.js chỉ import kit.js).
//
// M5 Đợt 2 (0.5.1) — ráp nối hình người và cảnh quầy (thiết kế M5 mục 4, bảng gói "Ráp nối"):
// - DI_SAU, ANH_KHOA, CO_HANH trả mặt tròn 64 MỚI của src/ui/art/people.js, cùng bộ khóa (xem mục "Người" bên dưới).
// - Xuất lại từ people.js: bust(persona, mood, { gender, who }) bán thân 96 × 112, head() mặt tròn 64, BUSTS, HEADS,
//   PEOPLE_META, WHO_LOOKS, DI_SAU_POSES, DI_SAU_POSE_MOOD, ANH_KHOA_BUSTS, CO_HANH_BUSTS; thêm headFace() (mặt mới, API face()).
// - FACES / face() tạm giữ bộ mặt cũ (LEGACY_FACES / legacyFace), lý do ghi ở mục "Người".
// - Xuất lại từ scene.js: scene(id), SCENE, SCENE_ICONS, SCENE_META, STAGE_ICONS, TAB_ICONS, HUD_ICONS, phoneQr; thêm
//   phoneQrSvg(variant) = điện thoại của khách có QR giả "QR GAME".
import { ING_TUOI, ING_TUOI_STATES } from './art/ing-tuoi.js'
import { ING_KHO, ING_KHO_STATES } from './art/ing-kho.js'
import { MON as MON_V2 } from './art/mon.js'
import { TOOLS as TOOLS_V2 } from './art/tools.js'
import { PROPS as PROPS_RAW, PROP_META } from './art/props.js'
import {
  bust, head, BUSTS, HEADS, PEOPLE_META, WHO_LOOKS, DI_SAU_FACES, DI_SAU_POSES, DI_SAU_POSE_MOOD,
  ANH_KHOA_FACES, ANH_KHOA_BUSTS, CO_HANH_FACES, CO_HANH_BUSTS
} from './art/people.js'
import { scene, SCENE, SCENE_ICONS, SCENE_META, STAGE_ICONS, TAB_ICONS, HUD_ICONS, phoneQr } from './art/scene.js'

const INK = '#3a2618'
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

// Khung SVG: mọi hình con kế thừa viền mực đậm.
function svg(body, vb = '0 0 64 64', extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>` +
    `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`
}

// Chữ trong hình (không viền).
// Chữ trên biển xe: luôn nằm gọn trong bề rộng maxW (biển trắng rộng 116): cỡ chữ giảm theo độ dài (13 → 9),
// tên vẫn dài hơn thì ép khít bằng textLength (không tràn ra thân xe).
function signText(x, y, s, maxW, fill) {
  const str = String(s)
  const perChar = 0.62                           // bề rộng ước lượng mỗi ký tự / cỡ chữ (chữ đậm)
  const size = Math.max(9, Math.min(13, Math.floor(maxW / (perChar * Math.max(1, str.length)))))
  const fit = str.length * perChar * size > maxW
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="800" ` +
    `text-anchor="middle" fill="${fill}" stroke="none"` +
    (fit ? ` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"` : '') + `>${escapeXml(str)}</text>`
}

function txt(x, y, s, size, fill, weight = 800) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" ` +
    `text-anchor="middle" fill="${fill}" stroke="none">${escapeXml(s)}</text>`
}

export function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const r1 = n => Math.round(n * 10) / 10

// Hình quả trứng: tâm (cx, cy), nửa rộng w, nửa cao h.
function egg(cx, cy, w, h, fill) {
  const p = [
    `M${cx} ${r1(cy - h)}`,
    `C${r1(cx + w * 0.75)} ${r1(cy - h)} ${r1(cx + w)} ${r1(cy - h * 0.1)} ${r1(cx + w)} ${r1(cy + h * 0.25)}`,
    `C${r1(cx + w)} ${r1(cy + h * 0.8)} ${r1(cx + w * 0.55)} ${r1(cy + h)} ${cx} ${r1(cy + h)}`,
    `C${r1(cx - w * 0.55)} ${r1(cy + h)} ${r1(cx - w)} ${r1(cy + h * 0.8)} ${r1(cx - w)} ${r1(cy + h * 0.25)}`,
    `C${r1(cx - w)} ${r1(cy - h * 0.1)} ${r1(cx - w * 0.75)} ${r1(cy - h)} ${cx} ${r1(cy - h)}Z`
  ].join(' ')
  return `<path d="${p}" fill="${fill}"/>`
}

// Lá tròn mép răng cưa (húng lủi).
function serratedLeaf(cx, cy, r, teeth, fill, rot = 0) {
  const pts = []
  const n = teeth * 2
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = i % 2 === 0 ? r : r * 0.84
    pts.push(`${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr * 1.15)}`)
  }
  return `<g transform="rotate(${rot} ${cx} ${cy})"><polygon points="${pts.join(' ')}" fill="${fill}"/>` +
    `<path d="M${cx} ${r1(cy - r)} V${r1(cy + r)}" stroke-width="1.5"/></g>`
}

// Chấm nhỏ không viền.
// Ngôi sao vàng nhỏ ở góc hình nguyên liệu hiếm (M4).
function rareStar(cx, cy, R = 7) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? R * 0.45 : R
    pts.push(`${r1(cx + rr * Math.cos(a))},${r1(cy + rr * Math.sin(a))}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="#ffd23f" stroke-width="1.8"/>`
}

function dots(list, fill, r = 1.4) {
  return list.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr || r}" fill="${fill}" stroke="none"/>`).join('')
}

// Cái tô / chén.
function bowl(fill, y = 36) {
  return `<path d="M8 ${y} H56 C56 ${y + 14} 46 ${y + 22} 32 ${y + 22} C18 ${y + 22} 8 ${y + 14} 8 ${y}Z" fill="${fill}"/>`
}

// ---------- Icon nguyên liệu ----------

const ING = {
  banh_mi: svg(
    `<g transform="rotate(-25 32 34)">` +
    `<path d="M6 34 C6 25 17 22 32 22 C47 22 58 25 58 34 C58 43 47 46 32 46 C17 46 6 43 6 34Z" fill="#e7a24a"/>` +
    `<path d="M16 31 l5 7 M27 29 l5 8 M38 29 l5 8 M48 31 l4 6" stroke="#fbe0a8" stroke-width="3"/></g>`),

  trung_ga: svg(egg(32, 33, 19, 25, '#d98a4e') +
    `<ellipse cx="24" cy="24" rx="3.5" ry="7" fill="#f3bb8c" stroke="none" transform="rotate(20 24 24)"/>`),

  trung_vit: svg(egg(32, 33, 22, 28, '#e3f4ee') +
    `<ellipse cx="22" cy="22" rx="3.5" ry="7" fill="#ffffff" stroke="none" transform="rotate(20 22 22)"/>` +
    dots([[38, 24], [42, 36], [30, 44], [24, 36], [40, 48]], '#a6d4c6', 1.6)),

  trung_cut: svg(
    egg(18, 40, 9, 12, '#efe2c4') + dots([[15, 36, 2], [20, 42, 1.6], [16, 46, 1.3], [22, 34, 1.2]], '#6b4a2e') +
    egg(34, 28, 9, 12, '#efe2c4') + dots([[31, 24, 1.8], [37, 30, 2], [33, 34, 1.3], [38, 22, 1.2]], '#6b4a2e') +
    egg(48, 42, 9, 12, '#efe2c4') + dots([[45, 38, 1.6], [51, 44, 2], [47, 48, 1.3], [52, 37, 1.2]], '#6b4a2e')),

  dua_leo: svg(
    `<g transform="rotate(-35 32 32)"><rect x="6" y="23" width="52" height="18" rx="9" fill="#4d9a3c"/>` +
    `<path d="M15 28 H49 M15 36 H49" stroke="#86c96a" stroke-width="2"/>` +
    dots([[20, 32], [30, 30], [40, 33], [48, 31], [25, 36]], '#2f6f25', 1.2) +
    `<circle cx="10" cy="32" r="3" fill="#d6c46a" stroke-width="1.5"/></g>`),

  hanh_la: svg(
    `<path d="M23 42 L18 8 L25 7 L29 42Z" fill="#5db347"/>` +
    `<path d="M29 42 L31 4 L38 5 L35 42Z" fill="#48a236"/>` +
    `<path d="M35 42 L44 9 L50 12 L41 42Z" fill="#5db347"/>` +
    `<rect x="21" y="40" width="22" height="14" rx="6" fill="#f5f2e6"/>` +
    `<path d="M26 54 l-2 5 M32 54 v6 M38 54 l2 5" stroke-width="2"/>`),

  hanh_tay: svg(
    `<path d="M32 9 C34 16 50 22 50 38 C50 50 42 56 32 56 C22 56 14 50 14 38 C14 22 30 16 32 9Z" fill="#dca55a"/>` +
    `<path d="M32 16 C25 26 23 44 32 56 M32 16 C39 26 41 44 32 56" stroke="#a8702e" stroke-width="2"/>` +
    `<path d="M32 9 L31 4 M27 56 l-2 4 M32 56 v5 M37 56 l2 4" stroke-width="2"/>`),

  nuoc_tuong: svg(
    `<rect x="26" y="4" width="12" height="7" rx="2" fill="#c8372d"/>` +
    `<path d="M27 11 H37 V18 C37 20 46 22 46 28 V56 C46 58 44 60 42 60 H22 C20 60 18 58 18 56 V28 C18 22 27 20 27 18Z" fill="#3a2016"/>` +
    `<rect x="18" y="31" width="28" height="17" fill="#f6ecd2"/>` + txt(32, 43.5, 'TƯƠNG', 7, '#3a2016')),

  nuoc_mam: svg(
    `<rect x="27" y="2" width="10" height="6" rx="2" fill="#f0c419"/>` +
    `<path d="M28 8 H36 V16 C36 19 42 20 42 26 V58 C42 60 40 61 38 61 H26 C24 61 22 60 22 58 V26 C22 20 28 19 28 16Z" fill="#e39a26"/>` +
    `<rect x="25" y="50" width="3" height="7" rx="1.5" fill="#f7c878" stroke="none"/>` +
    `<rect x="22" y="31" width="20" height="17" fill="#fff6dc"/>` + txt(32, 44, 'MẮM', 8, '#8a4b0f')),

  tuong_ot: svg(
    `<path d="M30 2 H34 L35 9 H29Z" fill="#3f8f2f"/>` +
    `<rect x="24" y="9" width="16" height="8" rx="2" fill="#3f8f2f"/>` +
    `<path d="M20 17 H44 V54 C44 58 40 60 36 60 H28 C24 60 20 58 20 54Z" fill="#d6362b"/>` +
    `<rect x="20" y="30" width="24" height="15" fill="#fff3e0"/>` + txt(32, 41.5, 'ỚT', 9, '#d6362b')),

  tra: svg(
    `<path d="M16 16 L20 8 H44 L48 16 V56 C48 58 46 60 44 60 H20 C18 60 16 58 16 56Z" fill="#c9a26b"/>` +
    `<path d="M16 16 H48"/>` +
    `<path d="M26 22 C36 20 44 26 42 38 C32 40 24 34 26 22Z" fill="#5aa845"/>` +
    `<path d="M28 25 L40 36" stroke-width="1.5"/>` + txt(32, 53, 'TRÀ', 9, INK)),

  tac: svg(
    `<circle cx="23" cy="40" r="13" fill="#f5a623"/>` +
    `<circle cx="42" cy="31" r="12" fill="#a8c83c"/>` +
    `<path d="M42 19 C46 11 54 11 57 13 C53 19 47 20 42 19Z" fill="#3f8f2f"/>` +
    dots([[18, 35, 2.4], [37, 26, 2.2]], '#fff4cf') + dots([[23, 27.5], [42, 19.5]], INK, 1.3)),

  chanh: svg(
    `<path d="M4 34 L9 32 C12 20 22 14 32 14 C42 14 52 20 55 32 L60 34 L55 36 C52 48 42 54 32 54 C22 54 12 48 9 36Z" fill="#7cc242"/>` +
    `<ellipse cx="24" cy="26" rx="7" ry="3" fill="#b9e38a" stroke="none" transform="rotate(-15 24 26)"/>` +
    dots([[36, 40], [44, 32], [28, 44], [40, 24]], '#5a9e2e', 1.1)),

  duong: svg(
    `<rect x="15" y="21" width="12" height="12" rx="2" fill="#ffffff"/>` +
    `<rect x="27" y="15" width="12" height="12" rx="2" fill="#ffffff" transform="rotate(10 33 21)"/>` +
    `<rect x="38" y="22" width="11" height="11" rx="2" fill="#ffffff"/>` +
    bowl('#8fc7e8', 32) + `<path d="M14 40 H50" stroke="#ffffff" stroke-width="2"/>`),

  muoi: svg(
    `<rect x="18" y="7" width="28" height="9" rx="3" fill="#3f78c8"/>` +
    `<rect x="16" y="16" width="32" height="43" rx="6" fill="#eef3f7"/>` +
    dots([[22, 51], [27, 54], [33, 52], [39, 55], [43, 50], [25, 22], [40, 23]], '#b8c4cf', 1.3) +
    `<rect x="16" y="30" width="32" height="13" fill="#ffffff"/>` + txt(32, 40, 'MUỐI', 8, '#3f78c8')),

  da: svg(
    `<rect x="9" y="29" width="22" height="22" rx="4" fill="#bfe6f7" transform="rotate(-10 20 40)"/>` +
    `<rect x="30" y="14" width="22" height="22" rx="4" fill="#d6f0fb" transform="rotate(12 41 25)"/>` +
    `<rect x="32" y="37" width="19" height="19" rx="4" fill="#a9dcf2"/>` +
    `<path d="M14 34 l4 -1 M35 19 l4 1 M36 41 l4 0" stroke="#ffffff" stroke-width="2.5"/>`),

  ly: svg(
    `<path d="M16 12 H48 L44 58 H20Z" fill="#eef6fb"/>` +
    `<path d="M13 12 H51" stroke-width="3"/>` +
    `<path d="M22 20 L24.5 50" stroke="#ffffff" stroke-width="3"/>` +
    `<path d="M18 30 H46" stroke="#c9dbe6" stroke-width="1.5"/>`),

  sua_dac: svg(
    `<rect x="14" y="14" width="36" height="42" rx="4" fill="#f2f2ee"/>` +
    `<ellipse cx="32" cy="14" rx="18" ry="5" fill="#c9ccd1"/>` +
    `<rect x="14" y="26" width="36" height="18" fill="#2f6fb5"/>` + txt(32, 38, 'SỮA ĐẶC', 7, '#ffffff')),

  sua_tuoi: svg(
    `<rect x="24" y="4" width="16" height="6" fill="#dff0ff"/>` +
    `<path d="M18 22 L24 10 H40 L46 22Z" fill="#dff0ff"/>` +
    `<rect x="18" y="22" width="28" height="38" fill="#ffffff"/>` +
    `<rect x="18" y="30" width="28" height="18" fill="#8cc1ea"/>` +
    txt(32, 38, 'SỮA', 6.5, '#1d4f8a') + txt(32, 45.5, 'TƯƠI', 6.5, '#1d4f8a')),

  banh_trang: svg(
    `<circle cx="36" cy="30" r="23" fill="#ede0bf"/>` +
    `<circle cx="30" cy="35" r="24" fill="#f7eed6"/>` +
    `<circle cx="30" cy="35" r="16" fill="none" stroke="#e2cfa3" stroke-width="1.5"/>` +
    `<circle cx="30" cy="35" r="8" fill="none" stroke="#e2cfa3" stroke-width="1.5"/>` +
    `<path d="M30 11 V59 M6 35 H54" stroke="#e8d7b0" stroke-width="1"/>`),

  banh_trang_me: svg(
    `<circle cx="32" cy="34" r="25" fill="#e0b573"/>` +
    dots([[22, 26, 4], [40, 42, 5], [36, 22, 3], [20, 44, 3]], '#c98f45') +
    [[18, 30], [26, 20], [34, 30], [44, 28], [28, 40], [38, 50], [46, 38], [22, 48], [30, 52], [48, 24], [16, 38], [40, 16]]
      .map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1" fill="#241810" stroke="none" transform="rotate(${(i * 37) % 180} ${x} ${y})"/>`).join('')),

  xoai_xanh: svg(
    `<path d="M14 40 C10 24 22 11 38 12 C52 13 58 28 52 42 C46 54 30 58 22 52 C18 49 16 46 14 40Z" fill="#7cbf45"/>` +
    `<ellipse cx="26" cy="26" rx="6" ry="3" fill="#b3de84" stroke="none" transform="rotate(-30 26 26)"/>` +
    `<path d="M38 12 L40 6"/>` +
    `<path d="M40 7 C46 1 54 3 57 6 C51 12 45 11 40 7Z" fill="#3f8f2f"/>`),

  kho_bo: svg(
    `<path d="M8 22 L30 12 L36 20 L14 32Z" fill="#a8402a"/>` +
    `<path d="M14 40 L44 26 L50 34 L20 48Z" fill="#b84a2e"/>` +
    `<path d="M26 54 L52 42 L56 50 L32 60Z" fill="#9c3a26"/>` +
    dots([[20, 22], [28, 18], [26, 38], [36, 34], [42, 32], [38, 50], [46, 48]], '#f07b2c', 1.3) +
    dots([[32, 40], [18, 26], [44, 50]], '#fff3d0', 1.1)),

  rau_ram: svg(
    `<path d="M32 61 C32 46 31 30 29 8" stroke="#9b2d5a" stroke-width="3.5"/>` +
    `<path d="M31 44 C21 42 11 36 5 27 C16 27 26 33 31 44Z" fill="#4f9a3c"/>` +
    `<path d="M32 36 C42 34 52 28 59 19 C47 19 37 25 32 36Z" fill="#4f9a3c"/>` +
    `<path d="M30 25 C22 22 16 16 12 8 C21 10 27 16 30 25Z" fill="#5aa845"/>` +
    `<path d="M30 20 C36 16 42 10 45 3 C37 5 32 11 30 20Z" fill="#5aa845"/>` +
    `<path d="M24 38 l-3 -2 M40 31 l3 -2 M22 17 l-2 -2" stroke="#7a2a4a" stroke-width="2.5"/>` +
    `<path d="M31 44 l-3 1 M32 36 l3 1" stroke="#9b2d5a" stroke-width="2"/>`),

  rau_hung_lui: svg(
    `<path d="M32 61 V14" stroke="#3f8f2f" stroke-width="3"/>` +
    serratedLeaf(20, 44, 9, 9, '#6cc04a', -30) + serratedLeaf(44, 44, 9, 9, '#6cc04a', 30) +
    serratedLeaf(21, 26, 8, 8, '#7fcf5a', -25) + serratedLeaf(43, 26, 8, 8, '#7fcf5a', 25) +
    serratedLeaf(32, 11, 7, 8, '#8fd96a', 0)),

  hanh_phi: svg(
    `<path d="M12 36 C14 26 22 20 32 20 C42 20 50 26 52 36Z" fill="#d38a36"/>` +
    [[18, 32], [24, 26], [30, 30], [36, 24], [42, 30], [28, 22], [46, 33], [22, 34], [38, 33]]
      .map(([x, y], i) => `<path d="M${x} ${y} q3 -3 6 0" stroke="${i % 2 ? '#8a4b16' : '#f1c173'}" stroke-width="2" fill="none"/>`).join('') +
    bowl('#f3ece0') + `<path d="M12 42 H52" stroke="#d6362b" stroke-width="2"/>`),

  dau_phong: svg(
    `<path d="M12 18 C7 24 9 33 15 35 C19 37 19 41 21 45 C25 53 38 52 38 43 C38 37 32 35 30 31 C28 25 26 17 20 15 C17 14 14 16 12 18Z" fill="#d9ae72"/>` +
    dots([[16, 24], [22, 28], [28, 42], [32, 46], [18, 32]], '#b78a4e', 1.2) +
    `<ellipse cx="46" cy="22" rx="7" ry="9" fill="#b9553a" transform="rotate(20 46 22)"/>` +
    `<ellipse cx="50" cy="44" rx="7" ry="9" fill="#c4603f" transform="rotate(-15 50 44)"/>` +
    dots([[44, 18, 1.8], [48, 40, 1.8]], '#e7a07c')),

  sa_te: svg(
    `<rect x="18" y="7" width="28" height="9" rx="3" fill="#8a2a1a"/>` +
    `<path d="M16 16 H48 V54 C48 58 44 60 40 60 H24 C20 60 16 58 16 54Z" fill="#d7472a"/>` +
    `<rect x="16" y="16" width="32" height="8" fill="#f08a2c"/>` +
    dots([[22, 30], [42, 28], [26, 54], [40, 55], [33, 29]], '#7d1d10', 1.4) +
    `<rect x="20" y="35" width="24" height="13" rx="2" fill="#fff4e0"/>` + txt(32, 44.5, 'SA TẾ', 7, '#b0301c')),

  ca_phe: svg(
    `<path d="M14 14 L18 6 H46 L50 14 V56 C50 58 48 60 46 60 H18 C16 60 14 58 14 56Z" fill="#6b3f24"/>` +
    `<path d="M14 14 H50"/>` +
    `<ellipse cx="32" cy="29" rx="8" ry="10" fill="#3a2016" transform="rotate(25 32 29)"/>` +
    `<path d="M28 21 C34 27 30 33 36 37" stroke="#b07d4f" stroke-width="2"/>` + txt(32, 52, 'CÀ PHÊ', 8, '#f3e3c8')),

  ca_phe_hoa_tan: svg(
    `<g transform="rotate(-15 32 32)">` +
    `<path d="M12 10 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 V56 H12Z" fill="#e04b3a"/>` +
    `<path d="M26 8 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 V54 H26Z" fill="#f2b631"/>` +
    `<path d="M40 12 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 V58 H40Z" fill="#e04b3a"/>` +
    `<path d="M15 30 h6 v5 a3 3 0 0 1 -6 0Z M29 28 h6 v5 a3 3 0 0 1 -6 0Z M43 32 h6 v5 a3 3 0 0 1 -6 0Z" fill="#ffffff" stroke-width="1.5"/>` +
    `</g>`),

  duong_phen: svg(
    `<path d="M9 40 L17 26 L30 30 L28 46 L15 50Z" fill="#f6e3a8"/>` +
    `<path d="M28 30 L40 15 L53 23 L51 38 L36 40Z" fill="#fbecc0"/>` +
    `<path d="M30 47 L38 41 L53 43 L51 57 L34 57Z" fill="#f1d78a"/>` +
    `<path d="M17 26 L22 40 L28 46 M40 15 L42 30 L51 38 M38 41 L42 50 L51 57" stroke="#ffffff" stroke-width="1.5"/>`),

  vo_buoi: svg(
    `<path d="M30 6 C38 6 40 12 44 16 C52 21 56 29 54 38 C52 47 43 52 30 52 C17 52 8 47 6 38 C4 29 8 21 16 16 C20 12 22 6 30 6Z" fill="#b5cf4a"/>` +
    `<path d="M30 6 V2" stroke-width="3"/>` +
    dots([[18, 26], [24, 34], [36, 28], [42, 38], [30, 42], [20, 40], [40, 20]], '#8fae32', 1.2) +
    `<path d="M30 60 C40 60 52 54 58 44 L52 41 C47 49 39 53 30 53Z" fill="#fbf7ea"/>` +
    `<path d="M30 60 C40 60 52 54 58 44" stroke="#6b9a2a" stroke-width="3.5"/>`),

  bot_nang: svg(
    `<path d="M16 12 C16 8 20 6 24 8 H40 C44 6 48 8 48 12 V56 C48 58 46 60 44 60 H20 C18 60 16 58 16 56Z" fill="#fbfbf7"/>` +
    `<path d="M16 15 H48" stroke-width="2"/>` +
    `<rect x="16" y="29" width="32" height="15" fill="#3f78c8"/>` + txt(32, 40.5, 'NĂNG', 9, '#ffffff') +
    dots([[26, 52, 2], [32, 50, 2.4], [38, 52, 2]], '#dfe6ef')),

  bot_mi: svg(
    `<path d="M16 12 C16 8 20 6 24 8 H40 C44 6 48 8 48 12 V56 C48 58 46 60 44 60 H20 C18 60 16 58 16 56Z" fill="#f3e2bf"/>` +
    `<path d="M16 15 H48" stroke-width="2"/>` +
    `<rect x="16" y="29" width="32" height="15" fill="#d6443a"/>` + txt(32, 40.5, 'MÌ', 9, '#ffffff') +
    `<path d="M32 58 V47" stroke="#b8862f" stroke-width="2"/>` +
    `<ellipse cx="29" cy="51" rx="2" ry="3" fill="#e0b04a" stroke-width="1"/>` +
    `<ellipse cx="35" cy="51" rx="2" ry="3" fill="#e0b04a" stroke-width="1"/>` +
    `<ellipse cx="32" cy="47" rx="2" ry="3" fill="#e0b04a" stroke-width="1"/>`),

  cot_dua: svg(
    `<rect x="26" y="4" width="12" height="7" rx="2" fill="#7a4a2a"/>` +
    `<path d="M27 11 H37 V16 C44 19 48 24 48 32 V54 C48 58 45 60 41 60 H23 C19 60 16 58 16 54 V32 C16 24 20 19 27 16Z" fill="#fdfcf6"/>` +
    `<circle cx="32" cy="40" r="10" fill="#7a4a2a"/>` +
    `<circle cx="32" cy="40" r="6" fill="#ffffff" stroke-width="1.5"/>`),

  dua_nao: svg(
    `<path d="M11 36 C13 23 22 16 32 16 C42 16 51 23 53 36Z" fill="#fbfaf4"/>` +
    [[18, 30], [24, 24], [31, 20], [38, 24], [44, 30], [28, 30], [36, 31], [22, 34], [42, 35]]
      .map(([x, y]) => `<path d="M${x} ${y} q2 -3 4 0 t4 0" stroke="#cfc8b4" stroke-width="1.5" fill="none"/>`).join('') +
    bowl('#5d8fc9') + `<path d="M12 42 H52" stroke="#ffffff" stroke-width="2"/>`),

  dau_xanh: svg(
    `<path d="M11 36 C13 25 22 19 32 19 C42 19 51 25 53 36Z" fill="#f2c94c"/>` +
    dots([[18, 32], [24, 27], [30, 24], [36, 25], [42, 28], [46, 33], [27, 32], [34, 31], [40, 34], [21, 35], [33, 35]], '#d9a92a', 2.4) +
    bowl('#9ccf8f') + `<path d="M12 42 H52" stroke="#ffffff" stroke-width="2"/>`),

  // ---------- M4: nguyên liệu hiếm (mỗi hình có ngôi sao vàng ở góc; khác hẳn hàng thường dễ nhầm về hình và màu) ----------

  // Mật ong rừng: lọ thủy tinh màu hổ phách, nắp gỗ buộc dây, nhãn tổ ong (khác đường viên trong chén, đường phèn cục)
  mat_ong_rung: svg(
    `<rect x="17" y="9" width="28" height="8" rx="2" fill="#8a5a2b"/>` +
    `<path d="M17 17 H45" stroke="#d7b98a" stroke-width="2"/>` +
    `<path d="M15 19 H47 V54 C47 58 43 60 39 60 H23 C19 60 15 58 15 54Z" fill="#e39b1d"/>` +
    `<path d="M19 24 V52" stroke="#f7d27a" stroke-width="3"/>` +
    `<path d="M15 21 C15 25 19 25 19 29" fill="none" stroke="#b86e0c" stroke-width="2"/>` +
    `<path d="M22 34 l4 -3 l4 3 v5 l-4 3 l-4 -3Z M30 34 l4 -3 l4 3 v5 l-4 3 l-4 -3Z M26 42 l4 -3 l4 3 v5 l-4 3 l-4 -3Z" fill="#fbe39a" stroke-width="1.5"/>` +
    rareStar(52, 12)),

  // Trứng gà ta: 2 quả nhỏ vỏ nâu hồng lấm tấm trong ổ rơm (khác trứng gà 1 quả cam, trứng vịt to xanh nhạt)
  trung_ga_ta: svg(
    `<path d="M6 40 C8 32 56 32 58 40 C58 54 6 54 6 40Z" fill="#d4a24c"/>` +
    egg(23, 33, 13, 17, '#c98e63') + dots([[20, 28], [25, 34], [21, 38], [27, 29]], '#8e5a37', 1.2) +
    egg(40, 31, 13, 17, '#d8a57c') + dots([[37, 26], [43, 33], [38, 36], [44, 27]], '#8e5a37', 1.2) +
    `<path d="M6 42 C18 50 46 50 58 42" fill="none" stroke="#a8772e" stroke-width="2"/>` +
    `<path d="M10 46 l6 -3 M20 49 l5 -4 M32 50 l3 -5 M42 49 l-3 -5 M52 46 l-5 -3" stroke="#f1d08a" stroke-width="2"/>` +
    rareStar(53, 11)),

  // Muối tôm Tây Ninh: túi zip muối màu cam có hình con tôm (khác hũ muối trắng nắp xanh, hũ sa tế đỏ)
  muoi_tom_tay_ninh: svg(
    `<path d="M13 15 H51 L53 58 H11Z" fill="#fff6ea"/>` +
    `<rect x="13" y="11" width="38" height="5" fill="#d7472a"/>` +
    `<path d="M12 36 H52 L53 58 H11Z" fill="#f08a2c"/>` +
    dots([[17, 42], [24, 47], [31, 42], [38, 50], [45, 43], [20, 53], [34, 55], [47, 52]], '#b9531a', 1.3) +
    `<path d="M22 26 C27 19 39 20 40 26 C41 31 35 33 31 30" fill="none" stroke="#e8662c" stroke-width="3.5"/>` +
    `<path d="M40 26 l5 -3 M40 26 l5 1" stroke="#e8662c" stroke-width="2"/>` +
    rareStar(53, 10)),

  // Khô mực Phan Thiết: con mực khô dẹt màu kem, có râu (khác khô bò miếng đỏ sẫm)
  kho_muc: svg(
    `<path d="M22 13 L11 8 L20 22Z M42 13 L53 8 L44 22Z" fill="#e2c07e"/>` +
    `<path d="M32 5 C45 11 47 25 43 37 H21 C17 25 19 11 32 5Z" fill="#f2dcac"/>` +
    `<path d="M27 16 C29 22 29 28 27 33 M37 16 C35 22 35 28 37 33" stroke="#e0bf82" stroke-width="2"/>` +
    `<path d="M23 37 C21 45 17 50 14 58 M28 37 C27 46 25 52 24 59 M32 37 V60 M36 37 C37 46 39 52 40 59 M41 37 C43 45 47 50 50 58" ` +
    `fill="none" stroke="#d9b36c" stroke-width="3"/>` +
    rareStar(53, 30)),

  // Cà phê hạt Buôn Ma Thuột: bao bố cột dây đựng hạt rang, hạt vãi ra trước (khác túi cà phê phin nâu, gói hòa tan)
  ca_phe_bmt: svg(
    `<path d="M15 18 C13 32 11 46 15 58 H49 C53 46 51 32 49 18 C41 22 23 22 15 18Z" fill="#c9a46a"/>` +
    `<path d="M21 13 C27 18 37 18 43 13 L41 20 H23Z" fill="#b18a4f"/>` +
    `<path d="M22 20 H42" stroke="#7a4a22" stroke-width="3"/>` +
    `<path d="M19 30 H45 M18 40 H46 M19 50 H45" stroke="#b08a52" stroke-width="1.5"/>` +
    [[22, 56], [31, 58], [40, 56], [27, 51], [36, 51]].map(([x, y], i) =>
      `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.5" fill="#4a2a18" transform="rotate(${(i * 35) % 90 - 30} ${x} ${y})"/>` +
      `<path d="M${x - 3} ${y} q3 -1.5 6 0" stroke="#b07d4f" stroke-width="1" fill="none"/>`).join('') +
    rareStar(53, 11))
}

// ---------- Icon món ----------

const MON = {
  mon_banh_mi_op_la: svg(
    `<path d="M9 30 C8 18 20 12 33 13 C46 14 56 19 55 28 C48 22 18 22 9 30Z" fill="#e8a24c"/>` +
    `<path d="M20 20 l3 4 M30 17 l3 4 M40 18 l3 4" stroke="#fbe0a8" stroke-width="2.5"/>` +
    `<path d="M11 34 C10 27 20 24 27 27 C33 22 46 23 51 29 C55 33 51 37 45 36 H19 C15 37 12 37 11 34Z" fill="#ffffff"/>` +
    `<circle cx="25" cy="30.5" r="4.5" fill="#f5b400"/><circle cx="41" cy="30.5" r="4.5" fill="#f5b400"/>` +
    `<path d="M10 37 H54 V41 H10Z" fill="#6bb64f"/>` +
    `<path d="M16 35 l2 -3 M34 34 l2 -3 M48 35 l1 -3" stroke="#2f8a2a" stroke-width="2"/>` +
    `<path d="M6 40 C6 48 15 53 32 53 C49 53 58 48 58 40Z" fill="#e39c45"/>`),

  mon_tra_tac: svg(
    `<rect x="31" y="2" width="5" height="30" rx="2" fill="#d6362b" transform="rotate(12 33 17)"/>` +
    `<path d="M16 14 H48 L44 58 H20Z" fill="#eef6fb"/>` +
    `<path d="M17.5 24 H46.5 L44 58 H20Z" fill="#e6a23a"/>` +
    `<rect x="21" y="27" width="9" height="9" rx="2" fill="#fbe7b8" stroke-width="1.5"/>` +
    `<rect x="31" y="29" width="8" height="8" rx="2" fill="#fbe7b8" stroke-width="1.5"/>` +
    `<path d="M26 50 a6 6 0 0 1 12 0Z" fill="#f7c948" stroke-width="2"/>` +
    `<path d="M32 50 v-5 M28 47 l4 3 l4 -3" stroke-width="1.2"/>` +
    `<path d="M13 14 H51" stroke-width="3"/>`),

  mon_banh_trang_tron: svg(
    `<path d="M10 33 C12 20 22 13 32 13 C43 13 52 20 54 33Z" fill="#f0c38a"/>` +
    `<path d="M16 28 q4 -5 8 0 t8 0 t8 0 M18 22 q4 -4 8 0 t8 0 M22 31 q5 -4 10 0 t10 0" stroke="#d9772f" stroke-width="1.6" fill="none"/>` +
    `<path d="M30 18 q3 -3 6 0 M38 27 q3 -3 6 0" stroke="#b7d95a" stroke-width="2" fill="none"/>` +
    `<ellipse cx="22" cy="24" rx="5" ry="4" fill="#ffffff" stroke-width="1.5"/><circle cx="22" cy="24" r="2" fill="#f5b400" stroke="none"/>` +
    `<ellipse cx="40" cy="20" rx="5" ry="4" fill="#ffffff" stroke-width="1.5"/><circle cx="40" cy="20" r="2" fill="#f5b400" stroke="none"/>` +
    `<path d="M28 26 l6 -2 l1 3 l-6 2Z M44 28 l6 -1 l0 3 l-6 1Z" fill="#a8402a" stroke-width="1.2"/>` +
    `<path d="M16 30 c2 -3 5 -3 6 0 M46 24 c2 -3 5 -3 6 0" stroke="#3f8f2f" stroke-width="2.5" fill="none"/>` +
    `<path d="M6 32 H58 C58 48 46 58 32 58 C18 58 6 48 6 32Z" fill="#f4f4f0"/>` +
    `<path d="M11 40 H53" stroke="#d6362b" stroke-width="2"/>`),

  mon_ca_phe_sua_da: svg(
    `<rect x="22" y="6" width="20" height="9" rx="2" fill="#b9bec6"/>` +
    `<path d="M16 18 H48 L45 58 H19Z" fill="#f1ece4"/>` +
    `<path d="M17.3 26 H46.7 L45.4 46 H18.6Z" fill="#6b3f24" stroke="none"/>` +
    `<path d="M18.6 46 H45.4 L45 58 H19Z" fill="#f2dfb8" stroke="none"/>` +
    `<rect x="22" y="28" width="8" height="8" rx="2" fill="#dff1f8" stroke-width="1.5"/>` +
    `<rect x="33" y="32" width="8" height="8" rx="2" fill="#dff1f8" stroke-width="1.5"/>` +
    `<path d="M16 18 H48 L45 58 H19Z" fill="none"/>` +
    `<path d="M13 16 H51" stroke-width="3"/>`),

  mon_che_buoi: svg(
    `<path d="M44 4 L36 30" stroke-width="3"/>` +
    `<path d="M14 20 H50 L46 58 H18Z" fill="#fbfaf4"/>` +
    `<path d="M16 33 H48 L46 58 H18Z" fill="#fff8ec" stroke="none"/>` +
    `<rect x="21" y="36" width="8" height="8" rx="2" fill="#f7dcd4" stroke-width="1.5"/>` +
    `<rect x="31" y="40" width="8" height="8" rx="2" fill="#f4ead0" stroke-width="1.5"/>` +
    `<rect x="24" y="47" width="8" height="7" rx="2" fill="#f7dcd4" stroke-width="1.5"/>` +
    `<path d="M36 50 C38 46 44 46 44 51 C44 55 36 55 36 50Z" fill="#f2c94c" stroke-width="1.5"/>` +
    `<path d="M15 21 C22 26 42 26 49 21 V28 C42 32 22 32 15 28Z" fill="#ffffff"/>` +
    `<path d="M14 20 H50 L46 58 H18Z" fill="none"/>` +
    `<ellipse cx="45" cy="4" rx="4" ry="2.5" fill="#d9dde3" transform="rotate(-70 45 4)"/>`)
}

// ---------- Icon dụng cụ, nâng cấp, giao diện ----------

const TOOLS = {
  // M4: chén sữa muối (sữa đánh bông, hạt muối rắc lên) — bước "Đánh sữa muối", "Rưới lớp sữa muối" của Cà phê muối
  sua_muoi: svg(
    bowl('#cfe3ee', 34) +
    `<path d="M12 34 C10 26 18 22 24 25 C26 18 38 18 40 24 C46 20 54 25 52 34Z" fill="#fffaf0"/>` +
    `<path d="M18 30 C22 28 26 29 28 31 M34 28 C38 26 42 27 44 30" stroke="#e8dcc3" stroke-width="2"/>` +
    `<rect x="27" y="7" width="6" height="6" rx="1" fill="#ffffff" transform="rotate(20 30 10)"/>` +
    `<rect x="38" y="11" width="5" height="5" rx="1" fill="#ffffff" transform="rotate(-15 40 13)"/>` +
    `<rect x="19" y="12" width="5" height="5" rx="1" fill="#ffffff" transform="rotate(10 21 14)"/>`),
  dao_thep: svg(
    `<path d="M8 44 L40 12 C46 8 52 10 54 14 L22 50Z" fill="#dfe5ec"/>` +
    `<path d="M14 42 L42 14" stroke="#ffffff" stroke-width="2"/>` +
    `<path d="M22 50 L14 58 C12 60 8 60 6 58 C4 56 4 52 6 50 L14 42Z" fill="#6b3f24"/>` +
    dots([[10, 54, 1.3], [13, 51, 1.3]], '#f3e3c8')),

  chao_chong_dinh: svg(
    `<ellipse cx="26" cy="36" rx="20" ry="16" fill="#3d3f45"/>` +
    `<ellipse cx="26" cy="34" rx="14" ry="10" fill="#565a63" stroke="none"/>` +
    `<path d="M44 32 L60 24 L62 28 L46 38Z" fill="#6b3f24"/>`),

  ghe_nhua: svg(
    `<rect x="12" y="18" width="40" height="8" rx="3" fill="#e0443a"/>` +
    `<path d="M15 26 L10 58 H18 L22 30 H42 L46 58 H54 L49 26Z" fill="#e0443a"/>` +
    `<path d="M22 40 H42" stroke-width="2"/>` +
    `<circle cx="32" cy="22" r="1.8" fill="#ffffff" stroke="none"/>`),

  may_tinh: svg(
    `<rect x="14" y="6" width="36" height="52" rx="5" fill="#5f6b7a"/>` +
    `<rect x="19" y="11" width="26" height="11" rx="2" fill="#cfe8c4"/>` + txt(39, 20, '0', 8, INK) +
    [0, 1, 2].map(r => [0, 1, 2].map(c =>
      `<rect x="${19 + c * 9}" y="${27 + r * 9}" width="7" height="7" rx="1.5" fill="${c === 2 && r === 2 ? '#f5a623' : '#eef1f4'}" stroke-width="1.2"/>`).join('')).join('') +
    ''),

  loa_bao_tien: svg(
    `<rect x="16" y="10" width="32" height="46" rx="8" fill="#2f3440"/>` +
    `<circle cx="32" cy="38" r="10" fill="#565d6b"/>` +
    `<circle cx="32" cy="38" r="4" fill="#2f3440" stroke-width="1.5"/>` +
    `<rect x="24" y="16" width="16" height="7" rx="2" fill="#7fd36b"/>` +
    `<path d="M52 24 q5 6 0 12 M56 20 q8 10 0 20" stroke="#f5a623" stroke-width="2.5" fill="none"/>`),

  muong_vang: svg(
    `<ellipse cx="22" cy="22" rx="12" ry="15" fill="#f5c542" transform="rotate(-40 22 22)"/>` +
    `<ellipse cx="20" cy="20" rx="5" ry="8" fill="#ffe28a" stroke="none" transform="rotate(-40 20 20)"/>` +
    `<path d="M30 32 L56 58" stroke-width="7"/><path d="M30 32 L56 58" stroke="#f5c542" stroke-width="3.5"/>`),

  thot: svg(
    `<rect x="6" y="14" width="52" height="40" rx="10" fill="#d9a066"/>` +
    `<circle cx="50" cy="22" r="3" fill="#f7e2c2"/>` +
    `<path d="M14 30 q10 -4 20 0 M18 42 q12 -4 26 0" stroke="#b67b42" stroke-width="2" fill="none"/>`),

  ro: svg(
    `<path d="M14 28 C14 12 50 12 50 28" stroke-width="4" fill="none"/>` +
    `<path d="M6 28 H58 L52 56 H12Z" fill="#d9a55a"/>` +
    `<path d="M10 36 H54 M11 44 H53 M20 28 L22 56 M32 28 V56 M44 28 L42 56" stroke="#a8702e" stroke-width="2"/>`),

  sao: svg(
    `<path d="M32 6 L39 23 L57 24 L43 36 L48 54 L32 44 L16 54 L21 36 L7 24 L25 23Z" fill="#f5c542"/>`)
}

// ---------- M2: icon cho hiện vật, sự kiện ngày, Hộp thư, Rương, điểm danh, món Chặng 2 (bóng mờ); M4: 8 sự kiện ngày mới ----------
const META = {
  phieu_cho_som: svg(
    `<path d="M6 18 H58 V28 C54 28 52 30 52 32 C52 34 54 36 58 36 V46 H6 V36 C10 36 12 34 12 32 C12 30 10 28 6 28Z" fill="#f5c542"/>` +
    `<path d="M20 20 V44" stroke="#c98d1d" stroke-width="2" stroke-dasharray="3 3"/>` +
    txt(38, 37, '−20%', 13, '#8e3320', 900)),
  bat_che_mua: svg(
    `<path d="M6 30 L16 14 H48 L58 30Z" fill="#3f78c8"/>` +
    `<path d="M16 14 L22 30 M32 14 V30 M48 14 L42 30" stroke="#2a5a9e" stroke-width="2"/>` +
    `<path d="M10 30 V52 M54 30 V52" stroke-width="3"/>` +
    `<path d="M20 40 l-2 5 M32 38 l-2 5 M44 40 l-2 5" stroke="#8ccff0" stroke-width="2.5"/>`),
  troi_mua: svg(
    `<path d="M16 38 C8 38 6 28 14 26 C14 16 26 12 32 20 C36 12 50 14 50 24 C58 24 58 38 50 38Z" fill="#c9d3de"/>` +
    `<path d="M20 44 l-3 8 M32 44 l-3 8 M44 44 l-3 8" stroke="#3f78c8" stroke-width="3"/>`),
  nang_nong: svg(
    `<circle cx="32" cy="32" r="13" fill="#f5b400"/>` +
    `<path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58 M13 13 L19 19 M45 45 L51 51 M13 51 L19 45 M45 19 L51 13" stroke="#e0701c" stroke-width="3.5"/>`),
  lanh_luong: svg(
    `<rect x="8" y="18" width="48" height="32" rx="4" fill="#b3dca6"/>` +
    `<circle cx="32" cy="34" r="9" fill="#e9f5e3"/>` + txt(32, 38.5, 'đ', 13, '#39732f', 900) +
    `<circle cx="48" cy="48" r="8" fill="#f5c542"/>`),
  cho_phien: svg(
    `<path d="M6 22 L12 10 H52 L58 22Z" fill="#d6362b"/>` +
    `<path d="M16 10 L14 22 M24 10 L23 22 M32 10 V22 M40 10 L41 22 M48 10 L50 22" stroke="#ffffff" stroke-width="2.5"/>` +
    `<rect x="10" y="22" width="44" height="30" fill="#f7e3bd"/>` +
    `<circle cx="22" cy="40" r="6" fill="#f5a623"/><circle cx="34" cy="42" r="5" fill="#7cc242"/><circle cx="44" cy="39" r="5" fill="#d6362b"/>`),
  // ---------- M4: tám sự kiện ngày mới ----------
  // Hội thi "Xe đẩy sạch, ngon": cúp vàng có ngôi sao
  hoi_thi_xe_sach: svg(
    `<path d="M20 14 H12 C12 25 16 29 23 29 M44 14 H52 C52 25 48 29 41 29" fill="none" stroke-width="3.5"/>` +
    `<path d="M19 9 H45 V23 C45 33 39 40 32 40 C25 40 19 33 19 23Z" fill="#f5c542"/>` +
    `<rect x="28" y="40" width="8" height="8" fill="#e0a82e"/>` +
    `<rect x="17" y="48" width="30" height="9" rx="2" fill="#6b3f24"/>` +
    `<path d="M32 15 L34.6 20.4 L40.4 21 L36 25 L37.3 30.8 L32 27.8 L26.7 30.8 L28 25 L23.6 21 L29.4 20.4Z" fill="#fff4c2" stroke-width="1.5"/>`),
  // Văn phòng đặt 3 ly trà tắc: phiếu đặt hàng và ly trà "×3"
  don_van_phong: svg(
    `<rect x="7" y="11" width="30" height="44" rx="4" fill="#ffffff"/>` +
    `<rect x="14" y="6" width="16" height="9" rx="2" fill="#b9bec6"/>` +
    `<path d="M13 25 H31 M13 33 H28 M13 41 H25" stroke="#9aa3ad" stroke-width="2.5"/>` +
    `<path d="M36 26 H57 L54 58 H39Z" fill="#e6a23a"/>` +
    `<path d="M34 26 H59" stroke-width="3"/>` +
    txt(46.5, 47, '×3', 12, '#ffffff', 900)),
  // Đại lý trà tài trợ bảng hiệu: bảng hiệu có lá trà
  tai_tro_dai_ly: svg(
    `<path d="M15 40 V58 M49 40 V58" stroke-width="4"/>` +
    `<rect x="6" y="9" width="52" height="33" rx="4" fill="#3f9a52"/>` +
    `<rect x="11" y="14" width="42" height="23" rx="3" fill="#e9f5e3" stroke-width="1.5"/>` +
    `<path d="M20 33 C20 23 30 18 42 18 C42 28 33 35 20 33Z" fill="#6bb64f"/>` +
    `<path d="M20 33 L37 22" stroke-width="1.5"/>`),
  // Tắc lên giá: trái tắc và mũi tên đi lên
  tat_gia: svg(
    `<circle cx="25" cy="39" r="16" fill="#f5a623"/>` +
    `<path d="M25 23 C23 17 27 12 32 12 C30 17 30 21 25 23Z" fill="#6bb64f" stroke-width="2"/>` +
    `<circle cx="20" cy="34" r="3.5" fill="#ffd27a" stroke="none"/>` +
    `<path d="M49 46 V15 M40 24 L49 13 L58 24" stroke="#d6362b" stroke-width="5" fill="none"/>`),
  // Tiền điện nước tăng: tia điện và giọt nước
  tien_dien_nuoc: svg(
    `<path d="M27 5 L10 34 H24 L18 59 L41 26 H29 L35 5Z" fill="#f5c542"/>` +
    `<path d="M48 26 C48 26 38 40 38 46 C38 52 42 57 48 57 C54 57 58 52 58 46 C58 40 48 26 48 26Z" fill="#5aa9e6"/>` +
    `<path d="M43 46 C43 50 45 53 48 53" stroke="#ffffff" stroke-width="2" fill="none"/>`),
  // Cúp điện theo lịch: bóng đèn tắt có gạch chéo
  cup_dien: svg(
    `<path d="M32 7 C20 7 14 16 14 25 C14 33 20 37 22 42 H42 C44 37 50 33 50 25 C50 16 44 7 32 7Z" fill="#dfe3e8"/>` +
    `<rect x="23" y="42" width="18" height="9" rx="2" fill="#9aa3ad"/>` +
    `<path d="M24 46.5 H40" stroke-width="1.5"/>` +
    `<path d="M27 56 H37" stroke-width="3.5"/>` +
    `<path d="M10 54 L54 10" stroke="#d6362b" stroke-width="5"/>`),
  // Trật tự đô thị nhắc giữ vỉa hè: cọc giao thông trên mép vỉa hè
  trat_tu_do_thi: svg(
    `<rect x="4" y="52" width="56" height="8" rx="2" fill="#c9cdd3"/>` +
    `<path d="M14 52 V60 M26 52 V60 M38 52 V60 M50 52 V60" stroke-width="2"/>` +
    `<path d="M32 6 L44 48 H20Z" fill="#f08a24"/>` +
    `<path d="M27.4 26 H36.6 L39 34.5 H25Z" fill="#ffffff" stroke="none"/>` +
    `<rect x="14" y="46" width="36" height="6" rx="2" fill="#f08a24"/>`),
  // Kiểm tra vệ sinh an toàn thực phẩm: bảng kiểm có dấu tích và kính lúp
  kiem_tra_attp: svg(
    `<rect x="7" y="10" width="34" height="46" rx="4" fill="#ffffff"/>` +
    `<rect x="15" y="6" width="18" height="8" rx="2" fill="#b9bec6"/>` +
    `<path d="M13 26 L17 30 L24 22 M13 40 L17 44 L24 36" stroke="#3f9a52" stroke-width="3" fill="none"/>` +
    `<path d="M28 27 H35 M28 41 H35" stroke="#9aa3ad" stroke-width="2.5"/>` +
    `<path d="M51 47 L58 54" stroke-width="6"/>` +
    `<circle cx="45" cy="40" r="10" fill="#cfe8f5"/>` +
    `<path d="M40 37 C41 34 44 33 46 33" stroke="#ffffff" stroke-width="2" fill="none"/>`),
  thu: svg(
    `<rect x="8" y="16" width="48" height="34" rx="4" fill="#fff8e6"/>` +
    `<path d="M9 18 L32 36 L55 18" fill="none"/>` +
    `<circle cx="48" cy="18" r="7" fill="#d6362b"/>`),
  ruong: svg(
    `<path d="M10 28 C10 16 20 12 32 12 C44 12 54 16 54 28Z" fill="#c8813b"/>` +
    `<rect x="10" y="28" width="44" height="26" rx="3" fill="#b0692a"/>` +
    `<path d="M10 28 H54 M22 13 V54 M42 13 V54" stroke-width="2.5"/>` +
    `<rect x="27" y="24" width="10" height="12" rx="2" fill="#f5c542"/>`),
  lich: svg(
    `<rect x="8" y="12" width="48" height="44" rx="5" fill="#ffffff"/>` +
    `<rect x="8" y="12" width="48" height="12" rx="5" fill="#d6362b"/>` +
    `<path d="M20 8 V16 M44 8 V16" stroke-width="3.5"/>` +
    `<path d="M22 40 L29 47 L43 32" stroke="#3f9a52" stroke-width="4" fill="none"/>`),
  phan_trang: svg(
    `<rect x="12" y="24" width="40" height="14" rx="3" fill="#f7f3ea" transform="rotate(-20 32 31)"/>` +
    `<rect x="12" y="24" width="10" height="14" rx="3" fill="#e5dcc8" transform="rotate(-20 32 31)"/>` +
    `<path d="M14 50 q8 -6 18 0 t18 0" stroke="#9ad0e8" stroke-width="3" fill="none"/>`),
  danh_hieu: svg(
    `<path d="M22 6 L32 26 L42 6Z" fill="#3f78c8"/>` +
    `<circle cx="32" cy="38" r="16" fill="#f5c542"/>` +
    `<path d="M32 28 L35 35 L42 35.5 L36.5 40 L38.5 47 L32 43 L25.5 47 L27.5 40 L22 35.5 L29 35Z" fill="#fff4c2" stroke-width="1.5"/>`),
  mon_goi_cuon: svg(
    `<ellipse cx="32" cy="50" rx="26" ry="7" fill="#f4f4f0"/>` +
    `<rect x="10" y="22" width="30" height="16" rx="8" fill="#f3efe4" transform="rotate(-18 25 30)"/>` +
    `<rect x="24" y="28" width="30" height="16" rx="8" fill="#f3efe4" transform="rotate(-18 39 36)"/>` +
    `<path d="M18 30 l4 -2 M32 37 l5 -2" stroke="#f08a7a" stroke-width="3"/>`),
  mon_bun_thit_nuong: svg(
    `<path d="M6 30 H58 C58 46 46 56 32 56 C18 56 6 46 6 30Z" fill="#f4f4f0"/>` +
    `<path d="M12 30 q5 -6 10 0 t10 0 t10 0 t10 0" stroke="#e8e1cf" stroke-width="3" fill="none"/>` +
    `<rect x="18" y="18" width="12" height="9" rx="3" fill="#a8402a"/><rect x="33" y="16" width="12" height="9" rx="3" fill="#b84a2e"/>`),
  mon_che_ba_mau: svg(
    `<path d="M16 8 H48 L44 58 H20Z" fill="#eef6fb"/>` +
    `<path d="M18.5 40 H45.5 L44 58 H20Z" fill="#dca55a"/>` +
    `<path d="M17.5 28 H46.5 L45.5 40 H18.5Z" fill="#e0584a"/>` +
    `<path d="M17 18 H47 L46.5 28 H17.5Z" fill="#7cc242"/>`)
}

// Hình dự phòng khi thiếu icon.
const FALLBACK_ICON = svg(
  `<circle cx="32" cy="32" r="24" fill="#eeeae2"/>` + txt(32, 42, '?', 28, INK))

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

// Bộ hình cũ (trước M5), giữ nguyên để so cũ/mới; game dùng ICONS bên dưới.
export const LEGACY_ICONS = deepFreeze({ ...ING, ...MON, ...TOOLS, ...META, fallback: FALLBACK_ICON })

// Bộ hình mới M5 (viewBox 64): nguyên liệu tươi, đồ khô/chai lọ, món, dụng cụ và biểu tượng thao tác.
export const ICONS_V2 = deepFreeze({ ...ING_TUOI, ...ING_KHO, ...MON_V2, ...TOOLS_V2 })
// Hình trạng thái 'id.trạng_thái' (viewBox 64), không nằm trong ICONS.
export const STATES = deepFreeze({ ...ING_TUOI_STATES, ...ING_KHO_STATES })
// Đạo cụ sân khấu lớn (viewBox riêng, mốc tọa độ ở PROP_META).
export const PROPS = deepFreeze({ ...PROPS_RAW })
export { PROP_META }

// Hình mới đè lên hình cũ cùng id; id chỉ có ở bộ cũ (sự kiện, thư, món tương lai…) giữ hình cũ.
export const ICONS = deepFreeze({ ...ING, ...MON, ...TOOLS, ...META, ...ICONS_V2, fallback: FALLBACK_ICON })

/** SVG của icon theo id (nhận cả id món không kèm tiền tố mon_); không có thì trả hình dự phòng. */
export function icon(id) {
  if (typeof id === 'string') {
    if (has(ICONS, id)) return ICONS[id]
    if (has(ICONS, 'mon_' + id)) return ICONS['mon_' + id]
  }
  return FALLBACK_ICON
}

/** Hình của id ở trạng thái state (vd art('dua_leo', 'lat')); trạng thái chưa vẽ hoặc không truyền thì icon(id). */
export function art(id, state) {
  if (typeof id === 'string' && state != null && has(STATES, `${id}.${state}`)) return STATES[`${id}.${state}`]
  return icon(id)
}

/** SVG đạo cụ sân khấu lớn; '' nếu không có (bên gọi tự dự phòng bằng CSS hoặc icon). */
export function prop(id) {
  return typeof id === 'string' && has(PROPS, id) ? PROPS[id] : ''
}

/** Hình của bộ cũ (Phòng mẫu so cũ/mới); không có thì hình dự phòng. */
export function legacyIcon(id) {
  if (typeof id === 'string') {
    if (has(LEGACY_ICONS, id)) return LEGACY_ICONS[id]
    if (has(LEGACY_ICONS, 'mon_' + id)) return LEGACY_ICONS['mon_' + id]
  }
  return FALLBACK_ICON
}

// ---------- Người: mặt và bán thân ----------
//
// M5 Đợt 2 (0.5.1, ráp nối): hình người mới vẽ ở src/ui/art/people.js (cel-shading viền mực như bộ hình 0.5.0).
// - DI_SAU, ANH_KHOA, CO_HANH: mặt tròn 64 MỚI (DI_SAU_FACES, ANH_KHOA_FACES, CO_HANH_FACES của people.js), cùng bộ khóa
//   như trước (Dì Sáu: tu_hao, vui, lo, tiec; Anh Khoa: vui, huong_dan; Cô Hạnh: vui) nên chỗ dùng không phải sửa.
//   Dì Sáu có thêm 4 tư thế bán thân DI_SAU_POSES (ngon_cai, vo_tay, lau_mo_hoi, che_mat; tâm trạng ở DI_SAU_POSE_MOOD).
// - Khách: bust(persona, mood, { gender, who }) là bán thân 96 × 112 (quầy, dải phố, phiếu chấm, tình huống); who = id khách
//   quen / khách lạ / người bán (WHO_LOOKS) cho dáng riêng. head(…) là mặt tròn 64 cùng dáng; headFace(persona, mood,
//   gender) là mặt mới với đúng API của face().
// - FACES / face(persona, mood, gender): TẠM giữ bộ mặt cũ (LEGACY_FACES / legacyFace). Lý do: bustSvg của
//   src/ui/components/order-bubble.js (hình dự phòng khi không dựng được bán thân mới) lồng face() vào khung 64 × 88 và test
//   m5-order-ui giới hạn hình đó 6.000 byte, mà mặt mới nặng tới 5,4 KB. Khi order-bubble.js lồng legacyFace() thì đổi hai
//   dòng "FACES = …" và "face = …" bên dưới sang HEADS và headFace (cùng bộ khóa 6 kiểu × 4 tâm trạng, cùng API).

export const MOODS = Object.freeze(['vui', 'binh_thuong', 'buc', 'gian'])

// Mặt cũ (trước 0.5.1): vai áo, tai, đầu tròn bán kính 20, tóc, mắt, miệng, phụ kiện; 6 kiểu khách × 4 tâm trạng.
function eyes(mood) {
  const dot = (x) => `<circle cx="${x}" cy="35" r="2.4" fill="${INK}" stroke="none"/>`
  switch (mood) {
    case 'vui': return `<path d="M22 36 Q25 32 28 36 M36 36 Q39 32 42 36" fill="none"/>`
    case 'buc': return dot(25) + dot(39) + `<path d="M21 29 L28 31 M43 29 L36 31" fill="none"/>`
    case 'gian': return dot(25) + dot(39) + `<path d="M20 27 L29 32 M44 27 L35 32" stroke-width="3" fill="none"/>`
    default: return dot(25) + dot(39)
  }
}

function mouth(mood) {
  switch (mood) {
    case 'vui': return `<path d="M25 43 Q32 51 39 43Z" fill="#b8423a"/>`
    case 'buc': return `<path d="M27 46 L37 45" fill="none"/>`
    case 'gian': return `<path d="M26 48 Q32 42 38 48" fill="none"/>`
    default: return `<path d="M27 45 Q32 48 37 45" fill="none"/>`
  }
}

function moodExtras(mood) {
  switch (mood) {
    case 'vui': return `<ellipse cx="20" cy="41" rx="3.5" ry="2" fill="#f4a3a0" stroke="none"/><ellipse cx="44" cy="41" rx="3.5" ry="2" fill="#f4a3a0" stroke="none"/>`
    case 'gian': return `<ellipse cx="20" cy="41" rx="4" ry="2.4" fill="#ef7b6e" stroke="none"/><ellipse cx="44" cy="41" rx="4" ry="2.4" fill="#ef7b6e" stroke="none"/>` +
      `<path d="M50 12 l3 3 M56 12 l-3 3 M50 18 l3 -3 M56 18 l-3 -3" stroke="#d6362b" stroke-width="2"/>`
    case 'buc': return `<path d="M48 16 q3 -3 6 0" stroke="#7b8794" stroke-width="2" fill="none"/>`
    default: return ''
  }
}

// Ghép khuôn mặt: vai áo → tai → đầu → tóc → mắt, miệng → phụ kiện.
function faceSvg({ skin, shirt, hairBack = '', hair = '', neckwear = '', accessory = '', mood }) {
  return svg(
    `<path d="M8 64 C8 54 19 50 32 50 C45 50 56 54 56 64Z" fill="${shirt}"/>` + neckwear +
    hairBack +
    `<circle cx="12.5" cy="37" r="4" fill="${skin}"/><circle cx="51.5" cy="37" r="4" fill="${skin}"/>` +
    `<circle cx="32" cy="34" r="20" fill="${skin}"/>` +
    hair + eyes(mood) + mouth(mood) + moodExtras(mood) + accessory)
}

const PERSONA_LOOKS = {
  hoc_sinh: {
    skin: '#f7cfa8', shirt: '#ffffff',
    hair: `<path d="M12 33 C11 19 21 11 32 11 C44 11 53 19 52 33 C49 26 45 22 40 21 C36 25 28 26 22 23 C18 26 14 29 12 33Z" fill="#2b2220"/>`,
    neckwear: `<path d="M26 51 L32 60 L38 51Z" fill="#d6362b"/>`
  },
  cong_nhan: {
    skin: '#dca57a', shirt: '#3f6fb0',
    hair: `<path d="M11 30 C11 16 20 9 32 9 C44 9 53 16 53 30Z" fill="#f2c230"/>` +
      `<rect x="8" y="27" width="48" height="5" rx="2.5" fill="#e0a91c"/><path d="M32 10 V27" stroke-width="2"/>`,
    neckwear: `<path d="M12 58 H52" stroke="#f5e663" stroke-width="3"/>`
  },
  co_chu: {
    skin: '#efc29a', shirt: '#8a5fb0',
    hairBack: `<circle cx="32" cy="11" r="6" fill="#b9b4ae"/>`,
    hair: `<path d="M12 34 C10 20 20 12 32 12 C44 12 54 20 52 34 C50 26 46 20 38 19 C30 22 20 22 14 28 C13 30 12 32 12 34Z" fill="#b9b4ae"/>`,
    accessory: `<circle cx="25" cy="35" r="5.5" fill="none" stroke-width="2"/><circle cx="39" cy="35" r="5.5" fill="none" stroke-width="2"/><path d="M30.5 35 H33.5" stroke-width="2"/>`
  },
  // chú (cô chú, giới tính nam): tóc muối tiêu cắt ngắn, ria mép, kính
  co_chu_nam: {
    skin: '#e8b88f', shirt: '#5f7f9f',
    hair: `<path d="M12 31 C11 17 21 11 32 11 C43 11 53 17 52 31 C49 24 44 20 38 19 C31 21 22 20 16 24 C14 26 13 28 12 31Z" fill="#9e9a94"/>`,
    accessory: `<circle cx="25" cy="35" r="5.5" fill="none" stroke-width="2"/><circle cx="39" cy="35" r="5.5" fill="none" stroke-width="2"/><path d="M30.5 35 H33.5" stroke-width="2"/>` +
      `<path d="M26 42 Q32 39 38 42 Q32 43 26 42Z" fill="#7d7872" stroke-width="1.2"/>`
  },
  van_phong: {
    skin: '#f5c9a0', shirt: '#ffffff',
    hair: `<path d="M12 31 C12 16 22 10 34 11 C46 12 53 20 52 31 C46 22 34 18 24 20 C18 22 14 26 12 31Z" fill="#4a3426"/>`,
    neckwear: `<path d="M24 50 L32 55 L40 50" fill="none" stroke-width="2"/><path d="M30 55 L34 55 L35.5 61 L32 64 L28.5 61Z" fill="#2f5fb3"/>`
  },
  kho_tinh: {
    skin: '#f1c49b', shirt: '#a33b3b',
    hair: `<path d="M12 32 C10 16 22 9 34 10 C46 11 54 18 52 30 C48 20 38 17 28 19 C20 21 15 25 12 32Z" fill="#1f1a18"/>`,
    accessory: `<rect x="17" y="15" width="12" height="6" rx="3" fill="#222428"/><rect x="35" y="15" width="12" height="6" rx="3" fill="#222428"/><path d="M29 18 H35" stroke-width="2"/>`
  }
}

function buildFaces() {
  const out = {}
  for (const [persona, look] of Object.entries(PERSONA_LOOKS)) {
    out[persona] = {}
    for (const mood of MOODS) out[persona][mood] = faceSvg({ ...look, mood })
  }
  return out
}

/** Bộ mặt cũ: LEGACY_FACES[kiểu][tâm trạng] (viewBox 64), giữ cho hình dự phòng và so cũ/mới. */
export const LEGACY_FACES = deepFreeze(buildFaces())

/** Mặt cũ theo kiểu khách và tâm trạng (gender 'nam' cho kiểu cô chú → mặt chú); thiếu thì mặt học sinh bình thường. */
export function legacyFace(persona, mood, gender = null) {
  const key = persona === 'co_chu' && gender === 'nam' ? 'co_chu_nam' : persona
  const set = typeof key === 'string' && has(LEGACY_FACES, key) ? LEGACY_FACES[key] : LEGACY_FACES.hoc_sinh
  return typeof mood === 'string' && has(set, mood) ? set[mood] : set.binh_thuong
}

/**
 * Mặt MỚI (mặt tròn 64 cắt từ hình bán thân của people.js) với đúng API của face(): kiểu lạ → học sinh, tâm trạng ngoài
 * MOODS → bình thường, cô chú + 'nam' → chú. opts (tùy chọn) như head(): { who, skin, hair, hat, color, acc… }.
 */
export function headFace(persona, mood, gender = null, opts = null) {
  const o = { ...(opts && typeof opts === 'object' ? opts : {}) }
  if (gender) o.gender = gender
  return head(persona, MOODS.includes(mood) ? mood : 'binh_thuong', o)
}

/** FACES[kiểu][tâm trạng] và face(persona, mood, gender): mặt khách (tạm là bộ cũ, xem ghi chú đầu mục). */
export const FACES = LEGACY_FACES
export const face = legacyFace

// Dì Sáu (khăn rằn trắng đen, áo bà ba nâu đỏ, tạp dề), Anh Khoa (nón lưỡi trai xanh, áo thun xanh lá), Cô Hạnh (tóc búi,
// áo dài xanh nhạt, kính tròn): mặt tròn 64 mới.
export const DI_SAU = DI_SAU_FACES
export const ANH_KHOA = ANH_KHOA_FACES
export const CO_HANH = CO_HANH_FACES

export { bust, head, BUSTS, HEADS, PEOPLE_META, WHO_LOOKS, DI_SAU_POSES, DI_SAU_POSE_MOOD, ANH_KHOA_BUSTS, CO_HANH_BUSTS }

// ---------- Tiền và QR (cách điệu, không giống thật) ----------

const BILL_COLORS = {
  5000: ['#c7b8e6', '#5e4796'],
  10000: ['#e3c797', '#7d5626'],
  20000: ['#9fcdf0', '#2a679e'],
  50000: ['#f3b3cc', '#9c3963'],
  100000: ['#b3dca6', '#39732f'],
  200000: ['#f2bf98', '#9c4f24'],
  500000: ['#95dbe0', '#1f7a83']
}

function fmtDots(n) {
  return String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Tờ tiền cách điệu: chữ "TIỀN GAME" và mệnh giá; khổ 120×64 (khác tỉ lệ tiền thật). */
export function billSvg(value) {
  const v = Math.round(Number(value) || 0)
  const [light, dark] = BILL_COLORS[v] || ['#e6e2da', '#5b5b5b']
  const label = fmtDots(v)
  const short = v >= 1000 ? `${Math.round(v / 1000)}K` : label
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 64">` +
    `<rect x="2" y="2" width="116" height="60" rx="7" fill="${light}" stroke="${dark}" stroke-width="2.5"/>` +
    `<rect x="8" y="8" width="104" height="48" rx="4" fill="none" stroke="${dark}" stroke-width="1" stroke-dasharray="3 2"/>` +
    `<circle cx="30" cy="34" r="15" fill="#ffffff" fill-opacity="0.55" stroke="${dark}" stroke-width="1.5"/>` +
    `<ellipse cx="26" cy="30" rx="5" ry="6.5" fill="${dark}" transform="rotate(-40 26 30)"/>` +
    `<path d="M29 34 L38 43" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>` +
    `<text x="81" y="21" font-family="${FONT}" font-size="9" font-weight="800" text-anchor="middle" fill="${dark}">TIỀN GAME</text>` +
    `<text x="81" y="44" font-family="${FONT}" font-size="${label.length > 6 ? 13 : label.length > 5 ? 15 : 17}" font-weight="900" text-anchor="middle" fill="${dark}">${label}</text>` +
    `<text x="14" y="17" font-family="${FONT}" font-size="7" font-weight="800" fill="${dark}">${short}</text>` +
    `<text x="106" y="55" font-family="${FONT}" font-size="7" font-weight="800" text-anchor="end" fill="${dark}">${short}</text>` +
    `</svg>`
}

/** Hoa văn giống QR nhưng không giải mã được (không có 3 ô định vị), kèm chữ "QR GAME". */
export function fakeQrSvg(variant = 0) {
  const n = 21
  const cell = 3.6
  const x0 = 12.2
  const y0 = 10
  let s = (2654435761 * (Number(variant) + 7)) >>> 0
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  // Ba góc là hình tròn trang trí (không phải ô định vị vuông chuẩn).
  const inCorner = (i, j) => (i < 7 && j < 7) || (i >= n - 7 && j < 7) || (i < 7 && j >= n - 7)
  const inCenter = (i, j) => i >= 8 && i <= 12 && j >= 8 && j <= 12
  let d = ''
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (inCorner(i, j) || inCenter(i, j)) continue
      if (next() < 0.47) d += `M${r1(x0 + i * cell)} ${r1(y0 + j * cell)}h${cell}v${cell}h-${cell}Z`
    }
  }
  const corner = (i, j) => {
    const cx = r1(x0 + (i + 3.5) * cell)
    const cy = r1(y0 + (j + 3.5) * cell)
    return `<circle cx="${cx}" cy="${cy}" r="11" fill="#ffffff" stroke="#2a2a2a" stroke-width="3"/>` +
      `<path d="M${cx - 5} ${cy} L${cx} ${cy - 5} L${cx + 5} ${cy} L${cx} ${cy + 5}Z" fill="#d6362b"/>`
  }
  const c = r1(x0 + 10.5 * cell)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 118">` +
    `<rect x="2" y="2" width="96" height="114" rx="8" fill="#ffffff" stroke="#2a2a2a" stroke-width="2.5"/>` +
    `<path d="${d}" fill="#2a2a2a"/>` +
    corner(0, 0) + corner(n - 7, 0) + corner(0, n - 7) +
    `<circle cx="${c}" cy="${r1(y0 + 10.5 * cell)}" r="8" fill="#f5c542" stroke="#2a2a2a" stroke-width="2"/>` +
    `<text x="${c}" y="${r1(y0 + 10.5 * cell + 3.5)}" font-family="${FONT}" font-size="9" font-weight="900" text-anchor="middle" fill="#2a2a2a">₫</text>` +
    `<text x="50" y="106" font-family="${FONT}" font-size="12" font-weight="900" text-anchor="middle" fill="#d6362b">QR GAME</text>` +
    `</svg>`
}

// ---------- Cảnh quầy (M5 Đợt 2: src/ui/art/scene.js) ----------
// Hình cảnh lớn có viewBox riêng (SCENE_META: mặt trước xe đẩy, mái bạt, điện thoại, máy tính tiền, màn LED, két, máy in
// phiếu, kẹp phiếu, hũ tip) và biểu tượng 64 (SCENE_ICONS: xu tip, HUD, 4 khâu, 2 tab); scene(id) trả '' nếu không có.

export { scene, SCENE, SCENE_ICONS, SCENE_META, STAGE_ICONS, TAB_ICONS, HUD_ICONS, phoneQr }

/** Điện thoại của khách giơ mã QR giả (fakeQrSvg(variant), có chữ "QR GAME") trong màn hình; viewBox SCENE_META.dien_thoai. */
export function phoneQrSvg(variant = 0) {
  return phoneQr(fakeQrSvg(variant))
}

// ---------- Xe đẩy đầu hẻm ----------

// Dù xe: 8 múi xen kẽ màu chính / màu phụ; pattern 'soc' (sọc kẹo) xen 3 màu.
function umbrella(color, alt = '#ffffff', pattern = null) {
  const cx = 120
  const top = 12
  const left = 18
  const right = 222
  const base = 62
  const segs = 8
  const cycle = pattern === 'soc' ? [color, alt, '#e0584a', alt] : [color, alt]
  let wedges = ''
  for (let k = 0; k < segs; k++) {
    const a = left + ((right - left) * k) / segs
    const b = left + ((right - left) * (k + 1)) / segs
    const fill = cycle[k % cycle.length]
    wedges += `<path d="M${cx} ${top} L${r1(a)} ${base} Q${r1((a + b) / 2)} ${base + 8} ${r1(b)} ${base}Z" fill="${fill}"/>`
  }
  return wedges + `<circle cx="${cx}" cy="${top}" r="4" fill="${INK}"/>`
}

// Đồ trang trí biển xe: viền "Khai Trương" (khung vàng) hoặc bảng đèn (dãy bóng đèn).
function signDecor(kind) {
  if (kind === 'vien') return `<rect x="58" y="100" width="124" height="36" rx="7" fill="none" stroke="#f2b632" stroke-width="4"/>` +
    `<circle cx="60" cy="102" r="3" fill="#d6362b" stroke="none"/><circle cx="180" cy="102" r="3" fill="#d6362b" stroke="none"/>`
  if (kind === 'den') {
    let dots = ''
    for (let i = 0; i < 8; i++) dots += `<circle cx="${68 + i * 15}" cy="101" r="3" fill="${i % 2 ? '#ffe28a' : '#fff6d0'}" stroke-width="1.2"/>`
    return dots
  }
  return ''
}

// Chậu hoa đặt cạnh xe (đồ trang trí).
function potDecor() {
  return `<path d="M6 128 H32 L29 146 H9Z" fill="#c8813b"/>` +
    `<path d="M19 128 V112" stroke="#3f8f2f" stroke-width="2.5"/>` +
    `<circle cx="19" cy="108" r="6" fill="#f5c542"/><circle cx="11" cy="116" r="5" fill="#ffffff"/><circle cx="27" cy="116" r="5" fill="#ffffff"/>`
}

/**
 * Xe đẩy đầu hẻm có dù che; `name` hiện trên biển xe.
 * Tùy chọn M2 (Góc Muỗng Vàng, quà sự kiện): umbrellaColor, umbrellaAlt (màu múi phụ), pattern ('soc'),
 * sign ('vien' | 'den'), decor ('chau_hoa').
 */
export function cartSvg({ name = '', umbrellaColor = '#d6362b', umbrellaAlt = '#ffffff', pattern = null, sign = null, decor = null } = {}) {
  const raw = String(name || 'Bếp Khởi Nghiệp').trim() || 'Bếp Khởi Nghiệp'
  const label = raw.length > 22 ? raw.slice(0, 21) + '…' : raw
  return svg(
    `<rect x="117" y="56" width="6" height="40" fill="#8a8f99"/>` +
    umbrella(umbrellaColor, umbrellaAlt, pattern) +
    `<rect x="46" y="62" width="72" height="26" rx="3" fill="#dff3fb"/>` +
    `<path d="M54 80 C54 74 64 73 72 73 C80 73 84 75 84 80 C84 84 78 85 69 85 C60 85 54 84 54 80Z" fill="#e7a24a" stroke-width="2"/>` +
    `<path d="M80 78 C80 72 90 71 98 71 C106 71 110 73 110 78 C110 82 104 83 95 83 C86 83 80 82 80 78Z" fill="#e7a24a" stroke-width="2"/>` +
    `<path d="M50 66 H114" stroke="#ffffff" stroke-width="2"/>` +
    `<rect x="148" y="60" width="26" height="28" rx="4" fill="#f0a93c"/>` +
    `<rect x="152" y="54" width="18" height="7" rx="2" fill="#d6362b"/>` +
    `<path d="M178 88 L180 72 H192 L194 88Z" fill="#eef6fb" stroke-width="2"/>` +
    `<rect x="34" y="88" width="172" height="10" rx="3" fill="#ece6da"/>` +
    `<rect x="40" y="98" width="160" height="42" rx="6" fill="#2f7fc1"/>` +
    `<rect x="62" y="104" width="116" height="28" rx="5" fill="#fff8e6"/>` +
    signDecor(sign) +
    signText(120, 123, label, 106, '#b8342a') +
    `<path d="M200 104 L230 90" stroke-width="5"/>` +
    `<circle cx="72" cy="146" r="14" fill="#3a3a3a"/><circle cx="72" cy="146" r="5" fill="#c9ccd1"/>` +
    `<circle cx="168" cy="146" r="14" fill="#3a3a3a"/><circle cx="168" cy="146" r="5" fill="#c9ccd1"/>` +
    (decor === 'chau_hoa' ? potDecor() : ''),
    '0 0 240 164')
}

export const CART = cartSvg()
