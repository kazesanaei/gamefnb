// Lớp tương thích của bộ hình M5 (Đợt 0 dùng thử ở Phòng mẫu và các thành phần mới).
// Từ 0.5.0, mặt tiền src/ui/art.js đã gộp bộ hình mới vào ICONS và có art(id, state), prop(id), PROP_META; tệp này chỉ
// đặt lại tên cũ cho mã đang dùng (plugin mini-game, step-card, menu-board, dish-reveal, Phòng mẫu):
// - ICONS_V2: id → SVG viewBox 64 của bộ hình mới (nguyên liệu, món, dụng cụ).
// - STATES_V2: 'id.trạng_thái' → SVG viewBox 64.
// - PROPS / PROP_META: đạo cụ sân khấu lớn với viewBox riêng.
// - artV2(id, state) = art(id, state): hình trạng thái → hình mới → icon cũ (luôn có hình, kể cả hình dự phòng "?").
// - propV2(id) = prop(id): SVG đạo cụ, '' nếu không có (bên gọi tự dự phòng).
// Chỉ import ../art.js (mặt tiền import thẳng các tệp art/*, không import tệp này) nên không có vòng import.
// Mã mới nên import thẳng từ src/ui/art.js.

import { ICONS_V2, STATES, PROPS, PROP_META, art, prop } from '../art.js'

export { ICONS_V2, PROPS, PROP_META }
export const STATES_V2 = STATES

/** SVG của id ở trạng thái state (nếu có); không có thì hình mới; không có nữa thì icon cũ (nhận cả id món không kèm mon_). */
export const artV2 = art

/** SVG đạo cụ lớn; '' nếu không có. */
export const propV2 = prop
