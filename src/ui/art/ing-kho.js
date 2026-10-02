// Hình nguyên liệu khô, chai lọ M5. Thuần, import trong Node được. viewBox 0 0 64 64, quy chuẩn ở kit.js.
// Cặp bẫy nước tương / nước mắm khác nhau ngay ở DÁNG chai (nhận ra ở 48px), không chỉ khác màu:
// nước tương là chai CAO cổ dài màu nâu đen, nắp đỏ, nhãn hạt đậu; nước mắm là chai THẤP bầu rộng màu hổ phách, nắp vàng, nhãn con cá.

import { INK, DETAIL, PAL, svg, ground, hilite, tone3, txt } from './kit.js'

const LABEL = PAL.giay

// Nắp chai có khía dọc.
function cap(x, y, w, h, fill, ridge) {
  const lines = []
  for (let i = 1; i < 4; i++) lines.push(`M${x + (w * i) / 4} ${y + 1.6}V${y + h - 1.6}`)
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.2" fill="${fill}"/>` +
    `<path d="${lines.join('')}" stroke="${ridge}" stroke-width="1.4"/>` +
    hilite(x + 2.6, y + h / 2, 1, h * 0.28, 0.6)
}

const nuoc_tuong = svg(
  ground(32, 58, 17, 3.2) +
  tone3({
    outline: 'M27.5 10H36.5V15.5C36.5 19.5 47 20.5 47 26.5V53C47 56.4 44.8 58 42 58H22C19.2 58 17 56.4 17 53V26.5C17 20.5 27.5 19.5 27.5 15.5Z',
    base: PAL.tuong[0], dark: PAL.tuong[1],
    shade: 'M40.6 21.4C44.6 22.8 47 24.4 47 26.5V53C47 56.4 44.8 58 42 58H38.4C40.8 57.2 41.8 55.4 41.8 53V27C41.8 24.8 41.4 22.8 40.6 21.4Z',
    detail:
      // Nhãn giấy (mép phải tối vì cong theo thân chai), ba hạt đậu nành, chữ TƯƠNG.
      `<rect x="18.6" y="28.6" width="26.8" height="23.4" rx="2" fill="${LABEL[0]}" stroke-width="${DETAIL}"/>` +
      `<path d="M41.6 29.5H44.5V51.1H41.6Z" fill="${LABEL[1]}" stroke="none"/>` +
      `<ellipse cx="26.6" cy="36.4" rx="3.4" ry="2.7" fill="#f0cf6e" stroke-width="1.4" transform="rotate(-25 26.6 36.4)"/>` +
      `<ellipse cx="32.2" cy="34.6" rx="3.4" ry="2.7" fill="#f0cf6e" stroke-width="1.4" transform="rotate(8 32.2 34.6)"/>` +
      `<ellipse cx="37.6" cy="36.6" rx="3.4" ry="2.7" fill="#f0cf6e" stroke-width="1.4" transform="rotate(28 37.6 36.6)"/>` +
      `<path d="M25.6 36.9l1.7-.9M31.4 35l1.8-.2M36.8 36.2l1.7.8" stroke="#b98a2c" stroke-width="1.1"/>` +
      txt(32, 48.6, 'TƯƠNG', 9, PAL.tuong[0], 0.76),
    shine: hilite(20.8, 25.4, 1.4, 2.6, 0.45) + `<path d="M20.4 53.4V54.6" stroke="#fff" stroke-width="2" opacity=".35"/>` +
      `<path d="M29.2 12V17" stroke="#fff" stroke-width="1.6" opacity=".45"/>`
  }) +
  cap(25.5, 2.5, 13, 8, PAL.do[0], PAL.do[1]))

const nuoc_mam = svg(
  ground(32, 58, 21, 3.4) +
  tone3({
    outline: 'M27.5 23H36.5V27C36.5 30 51 30.5 51 36.5V53C51 56.4 48.6 58 45 58H19C15.4 58 13 56.4 13 53V36.5C13 30.5 27.5 30 27.5 27Z',
    base: PAL.mam[0], dark: PAL.mam[1],
    shade: 'M44.6 31.6C48.8 32.6 51 34.2 51 36.5V53C51 56.4 48.6 58 45 58H40.8C43.8 57.3 45.6 55.6 45.6 53V37C45.6 34.8 45.3 33 44.6 31.6Z',
    detail:
      // Mực nước mắm (phần cổ chai còn trống sáng hơn), nhãn giấy có con cá và chữ MẮM.
      `<path d="M28.5 24.6H35.5V27.4H28.5Z" fill="${PAL.mam[2]}" stroke="none" opacity=".75"/>` +
      `<rect x="17" y="34.8" width="30" height="21" rx="2.4" fill="${LABEL[0]}" stroke-width="${DETAIL}"/>` +
      `<path d="M43.4 35.7H46.1V54.9H43.4Z" fill="${LABEL[1]}" stroke="none"/>` +
      `<path d="M23.4 39.2C26 36.2 31.4 35.6 35.6 37.4L40.4 35V43L35.6 40.8C31.4 42.6 26 42.2 23.4 39.2Z" fill="${PAL.xanh_nhan[0]}" stroke-width="1.5"/>` +
      `<path d="M30.6 36.6C31.6 37.6 31.6 40.6 30.6 41.6" fill="none" stroke-width="1.2"/>` +
      `<circle cx="26.6" cy="38.6" r=".9" fill="${INK}" stroke="none"/>` +
      hilite(28, 37.8, 2.2, 0.8, 0.6) +
      txt(32, 54.2, 'MẮM', 9.5, '#9c4a0c'),
    shine: hilite(18.4, 33.2, 2.6, 1.2, 0.55, -25)
  }) +
  cap(25.5, 16.5, 13, 7, '#f2c230', '#c9971a'))

export const ING_KHO = Object.freeze({ nuoc_tuong, nuoc_mam })

// Đợt 1 bổ sung hình trạng thái (bánh tráng sợi, khô mực xé, bánh mì nướng, đá viên…).
export const ING_KHO_STATES = Object.freeze({})
