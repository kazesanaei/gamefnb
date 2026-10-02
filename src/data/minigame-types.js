// Cơ chế mini-game: tên và thẻ gợi ý hiện trước mỗi bước. Sáu cơ chế của MVP + năm thao tác M5 (0.5.0, thiết kế mục 1.6):
// đập trứng (dap), khuấy (xoay), gọt (got), lắc (lac), bày (bay).

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
  },
  // ---------- M5: năm thao tác mới ----------
  // icon tạm (ICONS chưa có hình riêng của thao tác): xoay 'sua_muoi' → muong_khuay, got 'dao_thep' → dao_bao,
  // lac 'ly' → binh_lac, bay 'ro' → khay_bay (đổi lại khi bộ hình dụng cụ M5 vào ICONS).
  // Lớp vỏ: sub là dòng hướng dẫn trên sân khấu, count là chữ của bộ đếm, act là chữ nút (nếu có).
  dap: {
    name: 'Đập trứng',
    hint: 'Chạm quả trứng khi kim nằm trong vùng xanh cho trứng nứt, rồi vuốt xuống để tách vào chảo.',
    sub: 'Chạm trứng khi kim vào vùng xanh, rồi vuốt xuống.',
    count: 'Trứng',
    icon: 'trung_ga'
  },
  xoay: {
    name: 'Khuấy', hint: 'Vẽ vòng tròn quanh lòng tô cho đủ số vòng, quay vừa tay kẻo văng ra ngoài.', icon: 'sua_muoi',
    skins: {
      to: {
        name: 'Trộn đều', hint: 'Vẽ vòng tròn trong tô để trộn đều, quay vừa tay kẻo văng ra ngoài.',
        sub: 'Vẽ vòng quanh tô cho đủ số vòng.', count: 'Vòng'
      },
      ly: {
        name: 'Khuấy ly', hint: 'Vẽ vòng tròn trong ly cho sữa và cà phê hòa đều, quay vừa tay thôi.',
        sub: 'Vẽ vòng quanh ly cho đủ số vòng.', count: 'Vòng'
      },
      chen: {
        name: 'Đánh bông', hint: 'Vẽ vòng thật nhanh trong chén cho sữa bông lên, nhanh quá thì văng ra đó.',
        sub: 'Vẽ vòng nhanh tay cho đủ số vòng.', count: 'Vòng', icon: 'sua_muoi'
      }
    }
  },
  got: {
    name: 'Gọt vỏ',
    hint: 'Vuốt thẳng từ trên xuống theo từng dải vỏ cho tới khi hết vỏ.',
    sub: 'Vuốt thẳng từ trên xuống theo từng dải vỏ.',
    count: 'Dải',
    icon: 'dao_thep'
  },
  lac: {
    name: 'Lắc', hint: 'Kéo lên kéo xuống thật đều tay cho đủ số lượt.', icon: 'ly',
    skins: {
      binh: {
        name: 'Lắc bình', hint: 'Kéo bình lên xuống thật đều tay cho đủ số lượt lắc.',
        sub: 'Kéo bình lên xuống cho đủ lượt.', count: 'Lượt lắc'
      },
      ro: {
        name: 'Lắc rổ', hint: 'Kéo rổ lên xuống đều tay cho bột năng áo đều từng miếng.',
        sub: 'Kéo rổ lên xuống cho đủ lượt.', count: 'Lượt lắc', icon: 'bot_nang'
      }
    }
  },
  bay: {
    name: 'Bày', hint: 'Kéo từng món thả vào giữa đích cho đủ số, rồi bấm Xong.', icon: 'ro',
    skins: {
      ly: {
        name: 'Thả đá', hint: 'Kéo từng viên đá thả vào giữa ly cho đủ số, rồi bấm Xong.',
        sub: 'Kéo đá thả vào ly, đủ số thì bấm Xong.', count: 'Đá', icon: 'da'
      }
    }
  }
})
