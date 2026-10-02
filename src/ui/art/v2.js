// Gộp bộ hình mẫu M5 (Đợt 0) để trang mẫu và các thành phần mới dùng thử; game chính vẫn dùng ICONS cũ của ../art.js.
// ICONS_V2: id → SVG viewBox 64 (nguyên liệu, món, dụng cụ). STATES_V2: 'id.trạng_thái' → SVG viewBox 64.
// PROPS / PROP_META: đạo cụ sân khấu lớn với viewBox riêng.
// artV2(id, state): ưu tiên hình trạng thái → hình mới → icon cũ (luôn có hình, kể cả hình dự phòng "?").
// propV2(id): SVG đạo cụ, '' nếu không có (bên gọi tự dự phòng).
// Ghi chú Đợt 1: mặt tiền src/ui/art.js nên import thẳng các tệp art/* (không import tệp này) để tránh vòng import.

import { icon } from '../art.js'
import { deepFreeze } from './kit.js'
import { ING_TUOI, ING_TUOI_STATES } from './ing-tuoi.js'
import { ING_KHO, ING_KHO_STATES } from './ing-kho.js'
import { MON } from './mon.js'
import { TOOLS } from './tools.js'
import { PROPS as PROPS_RAW, PROP_META as META_RAW } from './props.js'

export const ICONS_V2 = deepFreeze({ ...ING_TUOI, ...ING_KHO, ...MON, ...TOOLS })
export const STATES_V2 = deepFreeze({ ...ING_TUOI_STATES, ...ING_KHO_STATES })
export const PROPS = deepFreeze({ ...PROPS_RAW })
export const PROP_META = META_RAW

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

/** SVG của id ở trạng thái state (nếu có); không có thì hình mới; không có nữa thì icon cũ (nhận cả id món không kèm mon_). */
export function artV2(id, state) {
  if (typeof id === 'string') {
    if (state != null && has(STATES_V2, `${id}.${state}`)) return STATES_V2[`${id}.${state}`]
    if (has(ICONS_V2, id)) return ICONS_V2[id]
    if (has(ICONS_V2, 'mon_' + id)) return ICONS_V2['mon_' + id]
  }
  return icon(id)
}

/** SVG đạo cụ lớn; '' nếu không có. */
export function propV2(id) {
  return typeof id === 'string' && has(PROPS, id) ? PROPS[id] : ''
}
