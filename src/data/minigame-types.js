// Sáu cơ chế mini-game của MVP: tên và thẻ gợi ý hiện trước mỗi bước.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v)
  return Object.freeze(o)
}

export const MINIGAME_TYPES = deepFreeze({
  chon: { name: 'Chọn nguyên liệu', hint: 'Chạm để bỏ vào rổ, chạm lần nữa để lấy ra.', icon: 'ro' },
  cha: {
    name: 'Chà rửa',
    hint: 'Vuốt qua lại lên các vết bẩn.',
    hints: {
      spots: 'Vuốt qua lại lên các vết bẩn cho tới khi sạch.',
      strokes: 'Vuốt qua lại thật đều tay, đổi chiều liên tục.'
    },
    icon: 'thot'
  },
  thai: { name: 'Thái', hint: 'Kéo dao tới vạch chấm, nhấc tay để cắt.', icon: 'dao_thep' },
  cham: {
    name: 'Chạm',
    hint: 'Chạm đúng số lần theo yêu cầu.',
    hints: {
      exact: 'Chạm đúng số lần, càng gần tâm vòng tròn càng tốt.',
      min: 'Chạm thật nhanh cho đủ số lần trước khi hết giờ.',
      targets: 'Chạm từng chai cho đúng số nấc ghi trên thẻ, rồi bấm Xong.'
    },
    icon: 'nuoc_tuong'
  },
  lua: { name: 'Canh lửa', hint: 'Nhấc chảo khi kim nằm trong vùng xanh.', icon: 'chao_chong_dinh' },
  rot: { name: 'Rót', hint: 'Giữ để rót, thả tay đúng vạch.', icon: 'ly' }
})
