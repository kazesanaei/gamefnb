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
  // skins: "lớp vỏ" theo bước (bước khai báo `skin` trong recipes.js): cùng cơ chế nhưng hình, nhãn, lời nhắc hợp món.
  //   act: chữ nút; over: nhãn vạch quá lửa; sub: dòng hướng dẫn trên sân khấu; overTip: lời nhắc khi quá (bị "cháy");
  //   sound: âm lúc bắt đầu (chảo: dầu "xèo"; phin, nồi: không xèo).
  lua: {
    name: 'Canh lửa', hint: 'Nhấc chảo khi kim nằm trong vùng xanh.', icon: 'chao_chong_dinh',
    skins: {
      chao: { act: 'Nhấc', over: 'Cháy', sub: 'Nhấc khi kim nằm trong vùng xanh.', overTip: 'bị cháy rồi, nhấc sớm chút nha con.', sound: 'sizzle' },
      phin: {
        name: 'Canh phin', hint: 'Cà phê nhỏ giọt dần, bấm "Nhấc phin" khi kim nằm trong vùng xanh.', icon: 'ca_phe',
        act: 'Nhấc phin', over: 'Quá đặc', sub: 'Nhấc phin khi kim nằm trong vùng xanh.',
        overTip: 'để lâu quá nên cà phê đắng gắt, nhấc phin sớm chút nha con.', sound: null
      },
      noi: {
        name: 'Canh nồi', hint: 'Bột luộc trong dần, bấm "Vớt ra" khi kim nằm trong vùng xanh.', icon: 'bot_nang',
        act: 'Vớt ra', over: 'Nhũn', sub: 'Vớt ra khi kim nằm trong vùng xanh.',
        overTip: 'luộc lâu quá nên bị nhũn, vớt sớm chút nha con.', sound: null
      }
    }
  },
  rot: {
    name: 'Rót', hint: 'Giữ để rót, thả tay đúng vạch.', icon: 'ly',
    skins: {
      ly: { act: 'Giữ để rót', actMore: 'Giữ để rót bù', actResume: 'Giữ để rót tiếp', count: 'Lần rót', sub: 'Giữ để rót, thả tay đúng vạch.' },
      to: {
        name: 'Rưới', hint: 'Giữ để rưới lên món, thả tay khi tới vạch xanh.',
        act: 'Giữ để rưới', actMore: 'Giữ để rưới thêm', actResume: 'Giữ để rưới tiếp', count: 'Lần rưới', sub: 'Giữ để rưới, thả tay đúng vạch.'
      }
    }
  }
})
