// Hình dụng cụ M5 (icon 64): thớt gỗ, dao thép. Thuần, import trong Node được. Quy chuẩn ở kit.js.
// Bản lớn dùng trên sân khấu nằm ở props.js (thot_lon, dao_lon).

import { INK, DETAIL, PAL, svg, ground, hilite, tone3, dots } from './kit.js'

// Thớt gỗ có tay cầm và lỗ treo, nhìn hơi chéo (thấy bề dày ở mép dưới).
const BOARD = 'M6 23C6 18.5 9 16 13.5 16H42C46.5 16 49 18.5 49 23V25.5H55C59 25.5 61 28 61 32C61 36 59 38.5 55 38.5H49V41C49 45.5 46.5 48 42 48H13.5C9 48 6 45.5 6 41Z'
const thot = svg(
  ground(33, 57.6, 26, 3.4) +
  `<g transform="rotate(-8 33 34)">` +
  `<path d="${BOARD}" fill="${PAL.go[1]}" transform="translate(0 5)"/>` +
  tone3({
    outline: BOARD, base: PAL.go[0], dark: PAL.go[1],
    shade: 'M7.6 44.6C9.4 46.8 11.4 48 13.5 48H42C46.5 48 49 45.5 49 41V38.5H55C58.6 38.5 60.6 36.4 61 33.2C59.6 35.2 57.6 35.8 55 35.8H46.2V40.4C46.2 43.4 44.6 44.8 42 44.8H13.5C11 44.8 9 44.8 7.6 44.6Z',
    detail: `<path d="M12 26C19 23.6 27 27.4 35 25.2C39 24.2 42 24.6 44.6 26M11 34C18 31.6 25.6 35.6 33.6 33.6C37 32.8 40 33 42.6 34M14 41C21 39.4 29 42.4 39.6 40.4" fill="none" stroke="${PAL.go[1]}" stroke-width="1.6" opacity=".75"/>` +
      `<circle cx="56" cy="32" r="2.6" fill="#8a5428" stroke-width="${DETAIL}"/>`,
    shine: `<path d="M10 37V24C10 21 11.6 19.6 14.6 19.6H24" fill="none" stroke="#fff" stroke-width="2.2" opacity=".5"/>`
  }) +
  `</g>`)

// Dao thép: lưỡi sáng có vát cạnh, chuôi gỗ hai đinh tán, một tia lấp lánh trên lưỡi.
const BLADE = 'M24.5 22.5H53C56.5 22.5 59.5 24 61.5 26.5C55 34 43 37.5 28 37.5H24.5Z'
const HANDLE = 'M3 27.5C3 25 5 23.5 7.5 23.5H21V35.5H7.5C5 35.5 3 34 3 31.5Z'
const dao_thep = svg(
  ground(31, 57.6, 20, 3) +
  `<g transform="rotate(-40 32 32)">` +
  tone3({
    outline: HANDLE, base: PAL.go_dam[0], dark: PAL.go_dam[1],
    shade: 'M3.4 32.4C4 34.4 5.6 35.5 7.5 35.5H21V32.4Z',
    detail: dots([[8.6, 29.4], [15, 29.4]], '#f3e3c8', 1.6),
    shine: hilite(10, 26, 5, 0.9, 0.5)
  }) +
  `<rect x="20" y="22" width="5.5" height="15" rx="1.6" fill="${PAL.thep[1]}"/>` +
  tone3({
    outline: BLADE, base: PAL.thep[0], dark: PAL.thep[1],
    shade: 'M24.5 33.4H29C42 33.4 53 30.6 61 26.9C55 34 43 37.5 28 37.5H24.5Z',
    shine: `<path d="M28 25.8H52" stroke="#fff" stroke-width="1.9" opacity=".9"/>`
  }) +
  `<path d="M50 23.4l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9Z" fill="#fff" stroke="none"/>` +
  `</g>`)

export const TOOLS = Object.freeze({ thot, dao_thep })
