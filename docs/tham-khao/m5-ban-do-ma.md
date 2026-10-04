# Bản đồ giao diện trong ca của "Bếp Khởi Nghiệp", chuẩn bị làm lại theo kiểu game giả lập nấu ăn

Tôi chỉ đọc mã, không sửa tệp nào. Gốc repo là `/home/user/gamefnb/`. Trong báo cáo, `tệp:dòng` viết rút gọn theo bảng dưới.

| Viết tắt | Đường dẫn tuyệt đối |
|---|---|
| `service.js` | /home/user/gamefnb/src/ui/screens/service.js |
| `counter.js` | /home/user/gamefnb/src/ui/screens/counter.js |
| `kitchen.js` | /home/user/gamefnb/src/ui/screens/kitchen.js |
| `summary.js` | /home/user/gamefnb/src/ui/screens/summary.js |
| `tasting.js`, `market.js` | /home/user/gamefnb/src/ui/screens/{tasting,market}.js (dùng lại bếp và plugin `chon`) |
| `hud.js` … `modal.js`, `tour.js`, `help.js` | /home/user/gamefnb/src/ui/components/*.js |
| `_util.js`, `index.js(mg)`, `chon.js`, `cha.js`, `thai.js`, `cham.js`, `lua.js`, `rot.js` | /home/user/gamefnb/src/ui/minigames/*.js |
| `art.js`, `dom.js`, `app.js`, `audio.js`, `input.js`, `loop.js` | /home/user/gamefnb/src/ui/*.js |
| `base.css`, `game.css`, `kitchen.css`, `meta.css`, `tour.css` | /home/user/gamefnb/css/*.css |
| `tours.js`, `recipes.js`, `ingredients.js`, `minigame-types.js`, `rare.js`, `customers.js`, `balance.js` | /home/user/gamefnb/src/data/*.js |
| `helpers.mjs`, `tour.e2e`, `iphone-overlays.e2e`, `fix-leftovers.e2e`, `hanh-trinh.mjs` | /home/user/gamefnb/tests/e2e/* |
| unit tests | /home/user/gamefnb/tests/unit/* |

---

## 1. Cây màn hình và luồng trong ca

### 1.0 Khung màn Ca bán: `service.js:34-653`

```
section.service-screen [screen-service, data-t]           service.js:53  (game.css:133 flex cột, overflow hidden)
├─ header.hud [hud]                                        hud.js:14      (game.css:134-154)
├─ section.street                                          service.js:46  (game.css:156-181)
│   ├─ div.queue [queue] → .q-cust [queue-<id>] ×≤3        service.js:129-150
│   └─ div.waiting [waiting] → .w-cust [waiting-<id>]      service.js:151-163
├─ div.progress4 [progress-4, data-stage, data-customer]   progress4.js:16 (game.css:183-197)
├─ section.ticket-rail [ticket-rail]                       ticket-rail.js:24 (game.css:199-224)
├─ div.panels                                              (game.css:226-227: .panel absolute, cuộn dọc)
│   ├─ section.panel.panel-counter [panel-counter] → mountCounter   service.js:47,72
│   └─ section.panel.panel-kitchen [panel-kitchen] → import('./kitchen.js') nạp lười   service.js:48,76-86
├─ nav.tabbar → button.tab [tab-counter] / [tab-kitchen] (+ span.dot [dot-*])   service.js:49-51,107-124
└─ div.sheet-host (phiếu chấm, bottom: 64px + safe-bottom)  service.js:52 (game.css:240)
```

- **Vòng lặp:** `loop.js:12-35` gọi `advance()` rồi `screen.update(dt)` mỗi khung hình. `service.update` nằm ở `service.js:623-643`: vẽ lại HUD, phố, thanh 4 khâu, dây phiếu, tab, quầy, bếp, rồi kiểm tra phàn nàn, tình huống, tour, kết ca. Thời gian ca chỉ chạy khi `router.name==='service' && !modalBlocking()` (`src/main.js:128`).
- **HUD** (`hud.js:8-39`): ngày, giờ, "Tiền quán", sao trung bình và nút "?" (`help.js:10`). Chỉ có chữ, cao khoảng 46px cộng safe-top.
- **Hàng khách** (`service.js:129-174`): mỗi khách có vòng kiên nhẫn SVG `createRing(62,5)` (`patience.js:23`) bọc mặt 48px (`game.css:163-165`). Ở màn ≤760px còn 52/40px (`game.css:477-478`). Khách chờ món có vòng 42px, mặt 30px (`game.css:178-180`). Nhãn `q-tag` "Ở quầy / Đơn đặt trước / Khách lạ", huy hiệu ★ khách lạ. Khách đang ở quầy chỉ phóng `scale(1.06)` (`game.css:171`), không có hoạt ảnh bước vào hay rời đi.
- **Thanh 4 khâu** (`progress4.js:8-38`): `ol.p4-list > li.p4-step[data-step]` gồm chấm `.p4-dot` 14px (chữ số có `font-size:0`) và nhãn 13–14px. Lớp `.done/.current`.
- **Dây phiếu** (`ticket-rail.js:21-85`): `button.rail-ticket[rail-ticket-<id>, data-status, data-wait]`, rộng 150px, cao tối đa 92px (`game.css:205-213`). Phiếu chỉ có chữ "1 × Tên món", ghi chú đỏ, không có icon món. Viền đổi xanh, vàng, đỏ và nhấp nháy `blink` (`game.css:209-214`). Chạm phiếu sẽ phát `ui.ticket.select` và mở tab Bếp (`service.js:43`).
- **Tab Quầy/Bếp:** nút chữ "Quầy · n", cao 48px, chấm đỏ (`game.css:230-236`).
- **Phiếu chấm** (`renderScoreSheet` ở `service.js:681-722`; hàng đợi `198-226`): mở khi có `customer.rated`, trượt lên trong 0,22 giây, hiện `SHEET_MS=2000` (`service.js:30`) rồi tắt. Phiếu toàn chữ: tên, chuỗi sao `starString` "★★★★☆", lưới `ul.ss-rows` 5 hàng Đạt/Sai (`game.css:250-254`), nhãn lỗi `.err-tag--quay/--bep`, dòng tip, khách lạ, review. Phiếu không có hình. Âm `ding` (≥4 sao) hoặc `click`.
- **Hộp tình huống** (`service.js:427-485`) và **phàn nàn** (`498-549`) dùng `app.modal`. Hình minh họa 64px (52px khi màn ≤760px), các lựa chọn là `.choice` chữ (`meta.css:563-608`, `game.css:66-72`).

### 1.1 Panel Quầy: `mountCounter` (`counter.js:28-719`)

Mỗi khi `stateSig` đổi, toàn bộ panel được vẽ lại (`counter.js:65-106`). Trạng thái tạm (bảng đang mở, số đang gõ, 2 bóng thoại) giữ trong `ui`.

```
div.counter [counter-panel, data-stage]                  counter.js:29 (game.css:265, 470)
├─ (quầy trống) div.counter-idle [counter-idle]: mặt Dì Sáu 64px + chữ + [go-kitchen]   counter.js:144-155
├─ div.cust-wrap                                         counter.js:157-186
│   ├─ .cust-card: .cust-face 52px + tên + "Khách quen" + kiểu khách   (game.css:269-272)
│   ├─ .bubble.speech-bubble [speech-bubble, data-request]   (chỉ khâu Order)
│   ├─ .request-icons [request-icons] (ngày ≤2): icon 26px ×qty    counter.js:172-175
│   ├─ .bubble.talk [seller-line|customer-line] ×≤2 (lời Bạn/khách)
│   └─ .tutor [tutor-hint] (ngày 1, mặt 28px)
└─ div.stage.stage-<order|pay|cash>  (một khâu mỗi lúc)
```

**Khâu Order** (`renderOrder` ở `counter.js:190-268`):
- Tiêu đề chữ "Sổ order" (`h3.stage-title`).
- `div.menu-grid` lưới 2 cột (`game.css:287-295`). Thẻ `button.menu-item [menu-item-<id>]` cao tối thiểu 64px, gồm icon `.dish-icon` 48px (40px khi rộng ≤370), tên, giá. Món hiếm có lớp `is-rare`/`is-out`, `data-left`, `span.menu-rare [rare-left-<id>]` "★ còn n".
- `div.draft-card > ol.draft [draft] > li.draft-line[data-index]`. Mỗi dòng có `button.draft-main [order-line-i]` (chữ "1 ×", tên, ghi chú đỏ) và `button.draft-del [order-line-remove-i]` "✕". Phiếu kẻ dòng giấy (`game.css:297-308`), không có icon món.
- `ul.caught-list [caught-list]` (lỗi khách chỉ ra khi đọc lại).
- Thanh dính đáy `div.action-row.act-bar`: `[readback]` "Đọc lại đơn" và `[confirm-order]` "Chốt order" (`counter.js:245-266`, `game.css:464-469`).
- **Bảng chọn số lượng và ghi chú** (`renderSheet` ở `counter.js:287-347`) gắn qua portal vào `app.overlay` (`counter.js:40`, `110-120`):
  `div.sheet-layer > div.sheet [order-sheet, role=dialog]`
  - `.sheet-head`: icon 48px, tên, giá/phần, `[sheet-close]` "✕".
  - `.sheet-body` (cuộn): `.qty-row [qty-row]` với `[qty-minus] [qty-value] [qty-plus]` (nút tròn 48px), `.note-block [note-block] > .note-chips > button.note-chip [note-chip-<id>, aria-pressed]`.
  - `.sheet-actions`: `[remove-line]` (khi sửa dòng) và `[add-line]` "Thêm vào phiếu".
  - CSS ở `game.css:315-344`, hoạt ảnh `slideUp`/`fadeIn`; lớp `.is-steady` tắt hiệu ứng khi vẽ lại.
- **Đọc lại** (`doReadback` ở `counter.js:270-285`): bóng thoại và âm `error`+rung 40 hoặc `ding`. **Chốt** (`counter.js:253-265`): âm `click`.

**Khâu Thanh toán** (`renderPayment` ở `counter.js:355-372`): tiêu đề "Báo tổng tiền".
- `div.pay-top` 2 cột (1 cột khi rộng ≤370) gồm `div.price-board [price-board]` (bảng xanh viền gỗ, `game.css:348-352`) và `div.draft-summary` (chữ).
- `[assist-total]` khi bật hỗ trợ tính tiền.
- Numpad (`numpad.js:10-44`): `.numpad-top` chứa `[numpad-display, data-amount]` và `[report-total]`. `.numpad-grid` 3×4 gồm `[numpad-0..9|clear|back]` cao 44px, cùng dòng gợi ý (`game.css:356-369`).
- `doReport` (`374-392`): âm `coin`/`error`, rung tay `shake` trên màn số (`dom.js:88-94`, `base.css:175-176`).

**Khâu Tính tiền** (`renderCashier` ở `counter.js:416-424`):
- **Tiền mặt** (`renderCash` ở `431-470`):
  - `div.cash-top` gồm nắp két `.lid` (`renderGivenCash` ở `cash-drawer.js:41-52`, tờ tiền 64×34) và `.cash-facts` (Tổng `[amount-due]`, Khách đưa, `[change-hint, data-amount]`, `[change-over]`).
  - Khay `div.tray [tray, data-amount]` (`cash-drawer.js:25-38`): tờ 70×40, `[tray-<b>]`, `.fly-in`/`.just-added`, hoạt ảnh `flyIn` (`game.css:386-390`), `[tray-empty]`.
  - Két `div.drawer [drawer]`, lưới 4 cột × 7 ngăn `[drawer-<b>, data-count]`, tờ rộng tối đa 72px (`cash-drawer.js:8-22`, `game.css:391-401`).
  - `.no-change [no-change]` mở modal `[no-change-modal]` (`497-535`).
  - Thanh dính `.act-bar > [give-change, data-exact]`.
  - Âm khi lấy tờ: `coin`. Âm khi thối đúng: `cash`.
- **QR** (`renderQr` ở `537-564`): `.qr-row` gồm `.qr-stand` (QR 110×130) và `.qr-info` (`[amount-due]`, `.phone-shot` chỉ là chữ "Đã chuyển khoản", `[qr-status, data-arrived]`). Thanh `.act-bar` gồm `[qr-reject]` và `[qr-confirm, data-ready]`.
- **Phiếu thu** (`renderReceipt` ở `587-619`): `div.receipt [receipt, data-total]` gồm `.receipt-head` (tên xe + span "Phiếu thu #001"), `ul.receipt-lines`, `.receipt-row` (`[receipt-adjust]`, `[receipt-rounding]`). Mép răng cưa vẽ bằng CSS (`game.css:417-428`). Thanh `.act-bar` có `[rail-full]` và `[clip-ticket]` "Kẹp phiếu bếp" (`doClip` ở `621-635`: âm `paper` + toast).
- Ngày 1: hướng dẫn phát sáng `.glow` trên nút kế tiếp (`counter.js:639-683`, `base.css:177-178`).

### 1.2 Panel Bếp: `mountKitchen` (`kitchen.js:116-1052`)

```
section.kitchen [kitchen] (.is-tasting khi nấu thử)          kitchen.js:127 (kitchen.css:19-28)
├─ div.k-main[data-view = rail|chon|thot|off]               kitchen.js:119,228
├─ div.k-flash-host (nhãn kết quả bước)                      kitchen.js:126 (kitchen.css:238-246)
└─ div.k-layer (sân khấu mini-game TRONG panel, data-kind=stage)   kitchen.js:124
+ div.k-layer.k-scope.k-pop [kitchen-pop] gắn vào app.overlay (bảng chọn cách, hỏi lại, xác nhận, công bố món)  kitchen.js:125-129
```

Ba chế độ (`mode()` ở `kitchen.js:196-203`):

**a) Danh sách phiếu (rail)** (`renderRail` ở `kitchen.js:286-317`):
- `.k-rail-head` chữ "Dây phiếu n/3".
- `.k-last [dish-result, data-grade, data-q]`: mặt Dì Sáu 44px + "Tên: Hạng · q%" + bóng thoại (`366-374`).
- `.k-resume`: "Đang làm: …", `[abandon-dish]`, `[cook-resume]`.
- `.k-tickets > article.k-ticket [ticket-<id>, data-status, data-wait, role=button]` (`ticketCard` ở `319-364`): kẹp phiếu vẽ bằng `::before`, viền màu chờ, `k-blink`.
  - `.k-ticket-head`: số phiếu, tên khách, tag "Làm lại", chấm chờ.
  - `.k-line` (`.is-done/.is-cooking`): icon `.k-line-icon` 36px, tên + ghi chú, trạng thái chữ, nút `[cook-line-i]` "Làm món này/Làm tiếp" (chỉ khi phiếu `.is-open`).
  - `[serve-ticket, data-ticket-id]` "Giao cho khách" khi đủ món (`.is-ready`).
- Ngày 1 có thêm `.k-disau [disau-line]`.
- CSS ở `kitchen.css:72-113`.

**b) Chọn nguyên liệu** (`renderChon` ở `kitchen.js:377-421`):
- `.k-board-head` (`boardHeader` ở `446-455`): `[kitchen-back]` "‹ Phiếu", icon món 30px, "#001 · Tên ×n", chấm chờ.
- Thẻ công thức `aside.k-card [recipe-card]` (`recipeCard` ở `247-283`): ghi chú đỏ và `ul.k-card-ings`. Mỗi nguyên liệu có icon 20px và chữ, kể cả "(chạm 1 lần)", "· kho còn n" `[card-left-<id>]`. Phần các bước bị ẩn ở chế độ chọn (`kitchen.css:337`).
- `.k-chon-wrap > .mg-stage` chạy plugin `chon` (mục 4).
- Kết quả: `onChonResult` (`423-442`) gọi `flash("Chọn nguyên liệu: grade")`.

**c) Thớt sơ chế** (`renderBoard` ở `kitchen.js:457-496`):
- `boardHeader` và `recipeCard(compact)`: `details` "Thẻ công thức: nguyên liệu, n bước".
- `.k-thot` (nền gỗ CSS, `kitchen.css:146-149`) chứa tiêu đề chữ "Thớt sơ chế", `[disau-line]` gọn, `.k-ready [board-ready]` (chip icon 20px + "✓") và `div.k-board [board]` lưới 2 cột.
  - Mỗi ô `div.k-ing[data-ing]` (`ingTile` ở `498-513`): `.k-ing-top` (icon 36px + tên) và `.k-steps`. Lớp trạng thái `.is-washed/.is-cut/.is-cooked` chỉ đổi `filter` hoặc kẻ sọc lên icon (`kitchen.css:162-165`).
  - Mỗi bước `button.k-step [board-step-<id>, data-step-id, data-type]` (`stepButton` ở `515-540`): `.k-step-label` (có "🔒 ") và `.k-step-st` chữ "Chạm để làm / Chọn cách rồi làm / Sau: … / Tốt · 85". Lớp `.is-available/.is-locked/.is-done/.grade-*/.is-critical/.has-method`.
- Thanh dính `.k-toolbar`: "Còn n lượt làm lại", `[abandon-dish]`, `[finish-dish]` "Ra món" (`kitchen.css:181-184`).
- **Bảng chọn trước bước** (`openSheet` ở `587-616`) ở lớp `k-pop`: `div.k-sheet [step-sheet]` gồm `[method-<id>]` (nút chữ "Thái lát/Thái sợi/Bào"), `[step-start]` "Tự tay làm", `[auto-step]`, `[retry-step]`, `[sheet-close]` "Để sau".
- **Bước chí mạng hỏng** (`criticalPrompt` ở `723-738`): `[critical-prompt]` với mặt 64px và các nút `[retry-step] [abandon-dish] [prompt-close]`.
- **Sân khấu bước** (`startStep` ở `657-706`):
  - `div.k-stage-wrap[data-type]` gồm `.k-stage-bar` (tên món, cách sơ chế, ghi chú) và `.mg-stage`.
  - Thẻ gợi ý `.k-hint [step-hint]` (chữ 22/17px trên nền trắng 96%) hiện `HINT_MS=800` (`kitchen.js:18`, chạm để bỏ qua). Thẻ ẩn sau `HINT_HIDE_AFTER_COOKS=3` lần nấu.
- **Kết quả bước** (`onStepResult` ở `708-720`): đóng lớp, `flash()` nhãn pill `.k-flash [step-result, data-score]` trôi lên trong 1,6 giây (`922-927`, `kitchen.css:239-246`). Âm `ding/error/click`, rung 80 hoặc 15.
- **Ra món** (`onFinish` ở `762-793`): có `confirmBox` nếu còn bước chưa làm (`[confirm-ok]`). Sau đó `showReveal` (`795-818`): `div.k-reveal [dish-reveal, data-grade, data-q]` (hình món 132px, hạng 26px, %, "Không tì vết", lên cấp, Dì Sáu), hoạt ảnh `k-pop`+`k-zoom`, tự đóng sau `REVEAL_MS=1200` (`kitchen.js:19`). Âm `bell/error`.
- **Giao món** (`onServe` ở `843-855`): âm `bell`, phát `kitchen.served`. Lõi phát `customer.rated` và phiếu chấm hiện ở `sheet-host`.

### 1.3 Tổng kết (`summary.js`)

Màn cuộn dọc gồm các thẻ `.card` toàn chữ:
- `.sum-head-row` có "?" dính đầu màn (`summary.js:43`, `tour.css:28-33`).
- Dì Sáu 64px, sổ lãi lỗ `table.ledger` (`[summary-profit]`), tình huống `[summary-incident]`, chốt két `[summary-drawer-diff]`, lỗi, sao `[summary-stars]`, thạo món (icon 26px), review `[summary-reviews]`, nút `.sticky-foot [next-day]`.
- Không có hoạt ảnh. Test đơn vị còn import `incidentLines` từ `summary.js`.

---

## 2. art.js: hình vẽ hiện có

**Cách vẽ.**
- Mọi hình là chuỗi SVG, không dùng DOM, không có ảnh ngoài.
- Hàm khung `svg()` (`art.js:13-16`) bọc nội dung trong `<g stroke="#3a2618" stroke-width="2.5" round>`. Phong cách màu phẳng, viền mực nâu đậm, dễ thương.
- Icon dùng `viewBox 0 0 64 64` (test bắt buộc). Hình ghép từ path, ellipse, rect.
- Hàm phụ: `egg` 44, `serratedLeaf` 56, `rareStar` 70 (sao vàng góc cho hàng hiếm), `dots` 80, `bowl` 85, `txt/signText` 21-34.
- Nhiều icon có **chữ bên trong** cỡ 6,5–9 đơn vị: TƯƠNG, MẮM, ỚT, TRÀ, MUỐI, SỮA ĐẶC, SỮA TƯƠI, SA TẾ, CÀ PHÊ, NĂNG, MÌ. Khi hiển thị 24–40px, chữ này chỉ còn khoảng 3–5px, không đọc được.

**Hàm và hằng xuất ra.**

| Tên | Dòng | Ghi chú |
|---|---|---|
| `escapeXml` | 36 | |
| `ICONS` (deepFreeze) | 611 | 80 icon = ING 42 + MON 8 + TOOLS 10 + META 19 + `fallback` |
| `icon(id)` | 614-620 | Nhận cả id món không có tiền tố `mon_`. Không có hình thì trả "?" |
| `MOODS` | 624 | `vui, binh_thuong, buc, gian` |
| `FACES` | 721 | 6 bộ × 4 tâm trạng |
| `face(persona,mood,gender)` | 724-728 | |
| `DI_SAU` | 739-744 | `tu_hao, vui, lo, tiec` |
| `ANH_KHOA` | 753-761 | `vui, huong_dan` |
| `CO_HANH` | 764-771 | `vui` |
| `billSvg(v)` | 790-806 | viewBox 120×64, 7 màu, chữ "TIỀN GAME" |
| `fakeQrSvg()` | 809-841 | viewBox 100×118, chữ "QR GAME" |
| `cartSvg({...})` | 888-911 | viewBox 240×164 |
| `CART` | 913 | |

**Khuôn mặt** (`faceSvg` ở `666-673`): chỉ có vai và đầu tròn bán kính 20, không có thân. Có 6 bộ `hoc_sinh, cong_nhan, co_chu, co_chu_nam, van_phong, kho_tinh`. Chỉ kiểu `co_chu` có biến thể theo giới tính.

**Đối chiếu dữ liệu và hình** (tôi đã chạy node để đếm):

| Nhóm | ĐÃ có hình | CHƯA có hình / ghi chú |
|---|---|---|
| Nguyên liệu (`ingredients.js`) | Đủ 42/42: 37 thường + 5 hiếm có ★ (`mat_ong_rung, trung_ga_ta, muoi_tom_tay_ninh, kho_muc, ca_phe_bmt`) | Mỗi nguyên liệu chỉ có **1 trạng thái**. Chưa có hình "đã sơ chế": dưa leo thái lát/sợi, trứng đập vỡ, trứng ốp la lòng đào/chín kỹ, tắc bổ đôi, xoài gọt/thái sợi, trứng cút bóc, bánh tráng cắt sợi, cùi bưởi hạt lựu/áo bột, khô mực xé, nước cốt dừa rưới… |
| Món (`recipes.js`, 9 món) | 5 hình: `mon_banh_mi_op_la, mon_tra_tac, mon_banh_trang_tron, mon_ca_phe_sua_da, mon_che_buoi` | 4 món hiếm **dùng chung hình món nền**: `tra_tac_mat_ong→mon_tra_tac`, `banh_mi_trung_ga_ta→mon_banh_mi_op_la`, `banh_trang_tron_tay_ninh→mon_banh_trang_tron`, `ca_phe_muoi→mon_ca_phe_sua_da`. Có 3 icon món tương lai không có công thức: `mon_goi_cuon, mon_bun_thit_nuong, mon_che_ba_mau`. Chưa có món đã bày đĩa, đóng ly có nắp, túi mang đi |
| Dụng cụ (TOOLS) | `sua_muoi, dao_thep, chao_chong_dinh, ghe_nhua, may_tinh, loa_bao_tien, muong_vang, thot, ro, sao` | Đây chỉ là icon. **Cảnh mini-game vẽ bằng CSS**: chảo/nồi/phin (`kitchen.css:413-415, 450-460`), ly/tô (`484-493`), thớt (`376`), dao là thanh 4px (`396-397`), kệ, rổ. Chưa có SVG cho muỗng, đũa khuấy, tay người chơi, vòi nước, bếp lửa |
| Khách (`customers.js`) | 5 kiểu khách × 4 tâm trạng (+ `co_chu_nam`) | Chưa có thân người hay toàn thân. Khách quen (Cô Thu, Bạn Nam), 5 khách lạ (`rare.js:196-217`), 3 người bán (`rare.js:173-192`) đều dùng lại mặt theo kiểu khách. Chưa có tâm trạng `lo/tiec/tu_hao` cho khách |
| NPC | Dì Sáu 4 tâm trạng, Anh Khoa 2, Cô Hạnh 1 | |
| Tiền, QR | 7 tờ tiền, QR giả | Chưa có điện thoại của khách (QR chỉ là chữ `.phone-shot`), ngăn kéo két, máy in phiếu |
| Cảnh nền | `cartSvg` chỉ dùng ở màn mở đầu và Chuẩn bị | Dải phố chỉ là gradient CSS (`game.css:158`). Chưa có nền quầy, bếp, bàn bếp |
| Sự kiện, meta | Đủ (12 sự kiện ngày, thư, rương, lịch…) | |

**Kích thước:**
- `art.js` = **53.607 byte** (913 dòng). Tổng chuỗi `ICONS` = 51.590 byte, trung bình 645 B/icon. Nhỏ nhất là `sao` 251 B, lớn nhất là `banh_trang_me` 1.645 B. `CART` = 1.973 B.
- Nếu vẽ 2–3 trạng thái cho 42 nguyên liệu, hình riêng cho món hiếm, cảnh nền và dụng cụ, `art.js` ước lên khoảng 150–250 KB. Nên tách thành nhiều tệp (`art-ing.js`, `art-scene.js`…); mỗi tệp mới phải thêm vào PRECACHE (xem mục 7).

---

## 3. Hoạt ảnh, hiệu ứng, âm thanh, rung đang có

**@keyframes (20 cái).**

| Tệp:dòng | Tên | Dùng cho |
|---|---|---|
| base.css:175 | `shake` | màn số báo tổng sai (`flash(el,'shake')`) |
| base.css:177 | `glow` | nút kế tiếp ngày 1 (`.glow`) |
| game.css:214 | `blink` | phiếu đỏ trên dây |
| game.css:323-324 | `slideUp`, `fadeIn` | bảng chọn món |
| game.css:389 | `flyIn` | tờ tiền vào khay |
| kitchen.css:457 | `k-drip` | giọt phin |
| kitchen.css:500 | `k-blink` | phiếu bếp đỏ, chấm chờ |
| kitchen.css:501 | `k-hint` | ô kệ cần lấy (quá giờ, hỗ trợ) |
| kitchen.css:502 | `k-up` | `.k-sheet` trượt lên |
| kitchen.css:503-504 | `k-pop`, `k-zoom` | công bố món |
| kitchen.css:505 | `k-float` | `.k-flash` |
| kitchen.css:507 | `k-pop-lbl` | `.mg-pop` ("Chuẩn!", "Đẹp!") |
| kitchen.css:508, 510 | `k-drop`, `k-drop-in` | vệt trứng, món vào rổ |
| kitchen.css:511 | `k-sparkle` | vết bẩn sạch |
| kitchen.css:512 | `k-press` | chai, nút chạm nhanh |
| kitchen.css:513 | `k-steam` | khói chảo |
| kitchen.css:514 | `k-wipe` | "Tràn rồi! Lau bàn…" |

**Transition chính:**
- Toast trượt và mờ 0,2 giây (`game.css:9-16`), modal 0,18–0,2 giây (`game.css:36-55`), phiếu chấm 0,22 giây (`game.css:241-247`).
- Vòng kiên nhẫn đổi `stroke-dashoffset` (`game.css:173`), `.btn:active` (`base.css:112-115`).
- `.mg-bar-fill` (`kitchen.css:293`), `rot-bottle` nghiêng (`480-481`), `rot-stream` (`482-483`), `lua-food` đổi màu bằng `filter` (`461-465`), `cha-food` (`363-366`), tour hole và bong bóng (`tour.css:46,51`).

**Hoạt ảnh bằng JS:**
- Chỉ có cập nhật thuộc tính trong `frameLoop` (`_util.js:150-172`): kim lửa, mực rót, thanh thời gian, vị trí dao.
- Thớt lắc dùng `--dx` (`cha.js:439`). Lớp `is-pop` khởi động lại bằng `void offsetWidth` (`cham.js:123,160`).
- Không có hệ hạt, không canvas, không Web Animations API.

**Âm thanh:** `audio.js:7` có `SOUND_NAMES` gồm 12 âm tổng hợp WebAudio: `click, coin, cash, ding, bell, chop, sizzle, pour, error, nudge, chest, paper`. Âm được dựng từ `tone`/`noise` (`audio.js:16-73`). Trong ca, chúng được gọi như sau:

| Lúc | Âm | Chỗ gọi |
|---|---|---|
| Khách tới | `bell` | `service.js:231` |
| Kiên nhẫn thấp, khách bỏ về, sự kiện nhắc | `nudge` | `service.js:193, 238, 364` |
| Tiền chuyển khoản về | `coin` | `service.js:242` |
| Phiếu chấm | `ding` / `click` | `service.js:207` |
| Tình huống | `nudge`; khi chọn: `coin` / `paper` | `service.js:428, 463` |
| Phàn nàn | `error` | `service.js:515` |
| Đổi tab | `click` | `service.js:100` |
| Quầy: chạm món | `click` | `counter.js:204` |
| Quầy: thêm dòng | `paper` | `counter.js:312` |
| Quầy: đọc lại | `ding` / `error` | `counter.js:278-281` |
| Quầy: báo tổng | `coin` / `error` | `counter.js:376-386` |
| Quầy: lấy tờ tiền | `coin` | `counter.js:454` |
| Quầy: thối đúng | `cash` | `counter.js:478` |
| Quầy: QR đúng | `cash` | `counter.js:568` |
| Quầy: kẹp phiếu | `paper` | `counter.js:631` |
| Bếp: mở dòng | `paper` | `kitchen.js:564` |
| Bếp: kết quả bước | `ding` / `error` / `click` | `kitchen.js:714` |
| Bếp: công bố món | `bell` / `error` | `kitchen.js:814` |
| Bếp: giao món | `bell` | `kitchen.js:851` |
| Mini-game | bảng `feedback` | `_util.js:191-194` |

Bảng `feedback` của mini-game: `tap→click`, `cut→chop+rung15`, `chop`, `hit→click+15`, `good→ding+15`, `bad/spill→error+80`, `done→bell`, `sizzle`, `pour`. `lua.js:54` gọi `sizzle` theo lớp vỏ của bước.

**Rung:** `app.vibrate` (`app.js:140-148`) bỏ qua khi tắt `settings.vibrate` hoặc trang chưa được chạm lần nào (`userActivation`). Trong ca, rung được gọi ở:
- `service.js:192` (30ms), `429` (20ms).
- `counter.js:279, 381` (40ms), `483` (60ms), `570` (80ms).
- `kitchen.js:715, 815` (80 hoặc 15ms).
- `feedback` (15 hoặc 80ms).

**Giảm chuyển động:**
- Theo hệ điều hành: `@media (prefers-reduced-motion)` (`base.css:181-184`, `kitchen.css:575-577`).
- Theo cài đặt trong game: `settings.reducedMotion` (`src/core/state.js:134`; công tắc ở `settings.js:523`). `app.applySettings` gắn lớp `reduce-motion` lên `<html>` (`app.js:155-158`), áp luật ở `base.css:185-188`.
- Bếp tự kiểm `reduced()` (`kitchen.js:185-186`) và gắn `.is-reduced` (`kitchen.js:1005-1007`, `kitchen.css:578-583`; phiếu đỏ dùng viền nét đứt thay cho nhấp nháy). Nhãn flash hiện 1,2 thay vì 1,6 giây (`kitchen.js:926`).
- **Lưu ý:** luật CSS chỉ ép `animation-duration` và `transition-duration`. Hoạt ảnh JS (rAF, WAAPI, hạt) mới thêm phải tự kiểm `reduced()`. Các mốc giờ JS (`SHEET_MS`, `REVEAL_MS`) không đổi khi giảm chuyển động.

---

## 4. API plugin mini-game và các chỗ có thể chèn hiệu ứng

**Hợp đồng plugin** (`index.js(mg):1-61`):
- `MINIGAMES = {chon, cha, thai, cham, lua, rot}` ở `index.js(mg):10`. Mỗi tệp export `default { type, mount(stage, step, ctx) }`.
- `mount` trả `{ result: Promise<{score 0–100, details}|null>, destroy(), snapshot?(), hold?(on) }`. `snapshot` và `hold` hiện chỉ có ở `chon.js:174-180`. Khi `destroy()` được gọi, `result` nhận `null`.
- `playStep(stage, step, ctx)` (`index.js(mg):36-61`) dọn sân khấu, đặt `class='mg-stage'`, `data-type`, `data-testid="minigame-stage"`, chặn menu, chọn chữ, kéo, rồi gọi mount.
- `hintFor` (14) và `skinFor` (27) lấy chữ và icon từ `minigame-types.js` (lớp vỏ `lua: chao|phin|noi`, `rot: ly|to`).
- Test `tests/unit/minigame-ui-contract.test.mjs:17-48` kiểm hợp đồng này.

**ctx truyền vào** (`pluginCtx` ở `kitchen.js:641-654`):
- `app, recipe, data, notes, qty, zoneMul, assist, untimed, guide, slowBurn, rand`.
- Bước Chọn có thêm `shelf, basketHint, stockLeft, initial, onChange` (`kitchen.js:401-413`). Màn Gánh hàng quê truyền thêm `missingText`.

**Tiện ích dùng chung** (`_util.js`):
- `stepLimitSec` 11 (2,5 × par).
- `createClock` 123 (dừng khi ẩn tab, có `hold`), `frameLoop` 150, `settleOnce` 175.
- `feedback(ctx, kind)` 188-198: **chỗ tập trung âm thanh và rung, chèn hiệu ứng hình hợp nhất ở đây.**
- `buildFrame` 201-223: dựng `.mg-head` (icon 40px, tiêu đề, `.mg-sub`, `[mg-time]`), `.mg-area`, `.mg-foot`. **Có thể thêm một lớp `fx` ở đây.**
- `ingIcon` 227, `popLabel(host,text,x,y,cls)` 240-245 (nhãn nổi 0,7 giây).

**Cách chấm điểm.** Mỗi plugin gọi hàm thuần trong `src/core/minigame-scoring.js`: `scoreChon`, `scoreCha`, `scoreThai`/`thaiCutScore`, `scoreChamExact/Min/Targets`, `scoreLua`, `scoreRot`. Sau đó `kitchen.onStepResult` gọi `submitStep(...)` và nhận `{score, grade, methodWrong}` (`kitchen.js:708-720`). Bảng `details` của từng plugin:

| Plugin | details | Chỗ chèn hiệu ứng ngay trong plugin |
|---|---|---|
| chon | `{picked, mistakes, tapMistakes, overtime, elapsed}` | `toggle` `chon.js:93-112` (món bay vào rổ), `lock` khi thiếu nguyên liệu chính `121-131`, `finish` `158-165` |
| cha | `{spots|reversals, strokes, elapsed}` | vết sạch `cha.js:249-251` (`is-clean`), `updateSpots/updateStrokes` `216-235`, `endSoon` `274-278` |
| thai | `{cuts, extra, elapsed, guides}` | `cutAt` `thai.js:87-105` (`popLabel` "Chuẩn!", `feedback('cut')`, `.thai-cut`) |
| cham | `{mode, taps, n|N|counts, distances…}` | exact: `cham.js:62-68` (splat + popLabel); jar: `79-87`; min: `120-125`; targets: `153-160` |
| lua | `{value, zone, shown, elapsed}` | vòng lặp `lua.js:56-67` (`is-hot`, `data-state`), `finish` `69-79` (`is-burnt/is-lifted`) |
| rot | `{level, pours, zone, shown, elapsed}` | `start/stop` `rot.js:57-79`, `spill` `106-117`, `finish` `119-126` |

**Sân khấu nhận kích thước thế nào.** Không có tham số kích thước nào được truyền vào; plugin tự đo DOM:
- `.mg-stage` nằm trong `.k-stage-wrap` của `.k-layer[data-kind=stage]` (absolute, phủ panel Bếp: `kitchen.css:187-192, 212, 280-290`).
- Bếp chỉ dựng plugin khi panel đang hiện (`ui.visible` ở `kitchen.js:1045-1050`) và sau thẻ gợi ý (`go()` ở `678-690`).
- `thai.js:52-57` đo khung thớt lúc mount.
- `cha.js:138-152` tính `room()` theo chỗ còn lại, có `ResizeObserver` (`213-214`); `fitSpotsBox` ở `cha.js:60` có test riêng.
- Bốn plugin còn lại dùng cỡ CSS cố định cộng media query (`kitchen.css:517-572`).
- `kitchen.revealTargets` (`861-879`) tự cuộn sao cho `.cha-spot, .cham-bottle` nằm trên `.mg-foot`.

**Các điểm móc hiệu ứng ngoài plugin:**
- **Bus:** `app.bus.on(type)`, hỗ trợ `'*'` (`src/core/bus.js`). Các sự kiện lõi phát:
  - Quầy: `customer.arrived`, `customer.lost`, `counter.begin`, `order.readback`, `order.confirmed`, `total.reported`, `payment.received{method,amount}`, `change.given{correct,optimal,diff}`, `qr.arrived`, `qr.confirmed`, `ticket.clipped`.
  - Bếp: `cook.started`, `step.done{type,score,grade,auto}`, `dish.done{q,grade,flawless}`, `dish.served`, `customer.rated{stars,…}`, `rare.used`.
  - Giao diện: `kitchen.served` (`kitchen.js:853`), `ui.tab`, `ui.ticket.select`.
  - Chỗ phát nằm trong `src/core/order.js`, `kitchen.js`, `shift.js`, `customer.js`.
- **Kết quả bước:** `onStepResult` (`kitchen.js:708-720`) và `flash()` (`922-927`); `onChonResult` (`423-442`). Lưu ý `closeLayer()` chạy **ngay** khi có kết quả, nên muốn ăn mừng trên sân khấu thì phải hoãn đóng lớp hoặc phát hiệu ứng trong plugin trước `out.settle`.
- **Ra món:** `onFinish` → `showReveal` (`kitchen.js:762-818`). Đây là điểm quan trọng nhất cho màn "công bố món, chấm sao" kiểu game nấu ăn.
- **Giao món:** `onServe` (`kitchen.js:843-855`).
- **Phiếu chấm:** `customer.rated` → `showNextSheet` (`service.js:200-226`).
- **Nhận tiền:** `doReport` (`counter.js:374-392`), lấy tờ `onTake` (`453-455`, lớp `just-added`), `doGiveChange` (`472-494`), `doConfirmQr` (`566-576`), `qr.arrived` (`service.js:242`).
- **Quầy:** ghi dòng `submit` (`counter.js:307-318`), đọc lại (`270-285`), chốt (`253-265`), kẹp phiếu `doClip` (`621-635`).
- **Hàng khách:** khách tới hoặc rời (`service.js:229-241`), kiên nhẫn thấp (`189-194`).

---

## 5. Ràng buộc bố cục

**Khung:**
- `.app-frame` rộng tối đa 480px, cao `100vh`/`100dvh` (`base.css:62-73`). Với trình duyệt chưa hiểu dvh, `app.js:448-461` đo `innerHeight` vào `--app-h` (`.is-fit-h` ở `base.css:75`).
- Dải giờ giả và dải cảnh báo lưu đẩy `.screen` và `.overlay-root` xuống qua `--bar-dev`/`--bar-save` (`base.css:198-201`).

**Vùng an toàn:**
- `--safe-top/--safe-bottom = env(...)` (`base.css:31-32`). E2E ghi đè biến này để mô phỏng iPhone.
- Các chỗ dùng: HUD `padding-top: 6px+safe-top`, `min-height: 46px+safe-top` (`game.css:136`); `.toast-stack top: 50px+safe-top` (`game.css:6`, ngầm giả định HUD cao khoảng 50px); `.tabbar padding-bottom: 6px+safe-bottom` (`230`); `.sheet-host bottom: 64px+safe-bottom` (`240`, giả định tabbar cao 61px); `.sheet-actions` (`343`); `.modal-layer` (`38`); `.k-sheet` (`kitchen.css:202`); `.k-pop` (`197-198`); `.tour-layer` (`tour.css:40`); `.tasting-screen` (`meta.css:258`).

**Ngân sách chiều cao ca bán** (từ CSS):
- HUD khoảng 46, phố 102 (84 khi ≤760px), thanh 4 khâu khoảng 35, dây phiếu 64–104 (56 khi ≤760px), tabbar khoảng 61.
- Panel còn lại khoảng 500–540px ở 390×844 và khoảng **270–320px ở 360×600**. Ghi chú trong mã: "panel Bếp ở màn thấp chỉ cao ~200px" (`kitchen.js:122`), "~300px" (`kitchen.css:535`).

**Lớp phủ và portal:**
- `createPortal(host)` (`dom.js:75-85`): bảng chọn món (`counter.js:40`) và `k-pop` của bếp (`kitchen.js:125-129`) gắn vào `app.overlay`, vì iOS cắt phần tử nằm trong vùng cuộn.
- Thứ tự z-index: `.overlay-root` 50 (`base.css:85-87`); trong đó `.k-layer` 20, `.sheet-layer` 30, `.toast-stack` 60, `.modal-layer` 70, `.tour-layer` 80, `.tab-lock` 90. `.sheet-host` 40 nằm trong màn ca.
- Toast bị giới hạn chiều cao theo vị trí thanh 4 khâu (`service.js:63-70`, `toast.js:44-50`).

**Hàng nút dính đáy:**
- `.act-bar` (`game.css:464-472`; `counter.revealAboveBar` ở `135-142` dựa vào lớp này).
- `.k-toolbar` (`kitchen.css:181`).
- `.mg-foot`: dính trong sân khấu (`kitchen.css:286-288`) và trong bước Chọn (`302, 305`).
- `.sheet-actions` (`game.css:343`), `.modal-actions:last-child` (`game.css:50-54`), `.sticky-foot` (`127-130`).
- Bộ tour có danh sách `STICKY = '.act-bar, .sticky-foot, .k-toolbar, .meta-head, .mg-foot, .prep-toprow, .sum-head-row'` (`tour.js:91`).

**Media query:**
- Theo chiều cao: ≤900 (kệ 12 ô, `kitchen.css:325-335`), ≤760 (`game.css:475-484`, `kitchen.css:525-534`, `meta.css:597-608`), ≤740 (`kitchen.css:517-520`), ≤700 (`kitchen.css:539-572`), ≤600 (modal, `game.css:57-60`).
- Theo chiều rộng: ≤380 và ≤340 (HUD, `game.css:147-154`), ≤370 (`453-461`), ≤360 (`kitchen.css:585-591`), ≤380 (tiêu đề bếp, `kitchen.css:120`).

**Khung nhìn e2e đang kiểm:** 320×568, 375×553, 390×664 (`iphone-overlays.e2e:41`), 360×600, 360×640, 360×740, 390×844.

---

## 6. data-testid và bộ chọn mà e2e và tour phụ thuộc (các màn trong ca)

Ký hiệu: ⚠ = gắn với cấu trúc DOM, lớp CSS hoặc chữ trên nút, rủi ro cao khi đổi giao diện.

**Màn Ca bán chung:**
- testid: `screen-service` (đọc `data-t`), `hud`, `hud-day` (chữ "Ngày 1"), `hud-wallet`, `help-button`, `queue`, `progress-4` (`data-stage`, `data-customer`), `ticket-rail`, `rail-ticket-<id>` (`data-status`, chữ tên món), `panel-counter`, `panel-kitchen` (`isVisible`), `tab-counter`, `tab-kitchen`, `kitchen`, `score-sheet` (`data-customer-id`, `data-stars`), `score-sheet-tip` (`data-tip`, chữ), `tip-card`, `day-event-toast`.
- ⚠ Bộ chọn lớp:
  - `.hud [data-testid="help-button"]`, `'.hud'` (`tour.e2e:227, 587`).
  - `.tabbar` (đo vị trí trong `fix-leftovers` và `iphone-overlays`).
  - `.toast-stack`, `.toast-title` (`review-m3-ux:36`, `tour.e2e:482`).
  - `.overlay-root .sheet-layer` (`iphone-overlays:190`).
  - `.tour-layer`, `.overlay-root > .tour-layer`.
  - `.modal-layer.hide [incident-modal]` (`helpers.mjs:190`).
  - `.screen, .panel, .k-main` (CSS mô phỏng iOS, `iphone-overlays:43`).
- Tình huống và phàn nàn: `incident-modal`, ⚠ `[incident-modal] .incident` đọc `data-incident`, ⚠ `.incident-choice`, ⚠ `[data-safe="true"]`, `incident-choice-<id>` (chữ), `incident-text`, `incident-result` (`data-choice`), `incident-effects` (⚠ `.incident-fx[data-fx]`, chữ), `incident-ok`, `complaint-modal`, `complaint-apology-0`, `complaint-remake`, `complaint-refund`.

**Quầy:**
- Khung và Order: `counter-panel` (`data-stage`), `speech-bubble` (`data-request`), `tutor-hint` (chữ), `menu-item-<id>` (`data-left`), `rare-left-<id>` (chữ "★ còn N"), `order-sheet`, `note-chip-<id>` (`aria-pressed`), `qty-plus`, `qty-minus`, ⚠ `qty-value` (`:text-is("2")`), `add-line`, `remove-line`, `sheet-close`, `order-line-<i>`, `order-line-remove-0`, `readback`, `confirm-order` (`:not([disabled])`), `caught-list`.
- Thanh toán: `numpad-<d>`, `numpad-display` (`data-amount`), `report-total`, `price-board`.
- Tính tiền: `given-cash`, `tray`, `change-hint` (cả ba đọc `data-amount`), `drawer-<b>` (`data-count`), `drawer`, ⚠ `give-change` (chữ "Không cần thối"), ⚠ `tray-empty` (chữ "Không cần thối tiền"), `change-over` (chữ), `no-change-modal`, `no-change-<o>`.
- QR và phiếu thu: `qr-status` (`data-arrived`), `qr-confirm`, `qr-reject`, `receipt`, ⚠ **`[receipt] .receipt-head span`**, `clip-ticket`.
  - `helpers.mjs:275` lấy số phiếu bằng `.split(' ').pop()` trên chữ "Phiếu thu #001". Đây là phần phụ thuộc mong manh nhất.

**Bếp:**
- Dây phiếu và dòng món: `ticket-<id>` (`data-wait`, chữ), `cook-line-<i>`, `cook-resume`, `serve-ticket` (`data-ticket-id`), `dish-result`, `kitchen-back`, ⚠ `.k-main[data-view="rail|thot"]`.
- Bước Chọn: `recipe-card` (chữ "×n (chạm 1 lần)"), `minigame-stage` (`data-type`), `shelf-<id>` (⚠ `.is-picked`, `data-ing`, `aria-pressed`), `shelf-qty-<id>`, `shelf-left-<id>` (chữ "còn N"), `chon-basket` (⚠ `.chon-in`), `chon-count` (⚠ chữ "Trong rổ: 3"), `chon-done`, ⚠ `.chon-msg` (chữ "Còn thiếu nguyên liệu chính"), ⚠ `.chon-cell`, `.chon-cell.is-hint`, ⚠ `.mg-chon .mg-foot`.
- Thớt: `board`, `board-step-<id>` (⚠ `.is-available`, `.is-done`, `data-step-id`, ⚠ con `.k-step-st` cần chứa chữ "85"), ⚠ `.k-step.is-available`, `step-sheet`, `method-<id>`, `step-start`, `auto-step`, `step-hint` (`tap`), `retry-step`, `critical-prompt`, `prompt-close`, `abandon-dish`, `finish-dish`, `confirm-ok`, `confirm-cancel`.
- Công bố món và kết quả: `dish-reveal` (⚠ con `.k-bubble` chứa lời góp ý; ⚠ `.closest('.k-layer')`), `step-result`, ⚠ `.k-layer` (`waitForSelector('.k-layer',{state:'hidden'})` lấy phần tử **đầu tiên** trùng, tức lớp sân khấu trong bếp).
- Mini-game:
  - `cha-area`, `cha-spot-<i>` (`data-clean`, ⚠ `.cha-spot`).
  - `thai-board`, `thai-guide-<i>` (`data-x` đo **từ mép trái sân khấu**), ⚠ `.thai-food`.
  - `cham-target` (`data-n`), `cham-pan`, `cham-pad` (`data-n`), `cham-bottle-<id>` (`data-target`, ⚠ `.cham-bottle`), `cham-done`.
  - `lua-zone` (`data-a/b`), `lua-needle` (`data-v`), `lua-lift`.
  - `rot-zone` (`data-a/b`), `rot-level` (`data-v`), `rot-pour`, `rot-done`.
  - ⚠ `.mg-foot`, `.mg-head`, `.mg-sub`, `.k-stage-wrap` (đo bố cục trong `fix-leftovers.e2e:110-130, 548-620` và `iphone-overlays.e2e:537-544`).

**Đích tour trong ca** (`tours.js:73-195`). `tour.e2e` duyệt đủ các bước và so khớp tiêu đề (`tour.e2e:238-239, 453-456, 677-680`):

| Tour | Đích |
|---|---|
| `ca_ban` | `hud`, `queue`, `progress-4`, `ticket-rail`, `tab-counter`+`tab-kitchen` |
| `quay_order` | `queue`, `speech-bubble`, `progress-4`, `[data-testid^="menu-item-"]`, `readback`, `confirm-order` |
| `quay_bang_mon` | `qty-row`, `note-block`, `add-line` |
| `quay_thanh_toan` | `price-board`, `numpad-display`, `report-total` |
| `quay_tinh_tien` | `given-cash`, `drawer`, `tray`, `give-change` |
| `quay_qr` | `qr-status`, `qr-confirm`, `qr-reject` |
| `quay_phieu_thu` | `receipt`, `clip-ticket` |
| `bep_day_phieu` | `ticket-rail`, ⚠ `['.k-ticket:not(.is-open)','.k-ticket']` |
| `bep_dong_mon` | ⚠ `['.k-ticket.is-open .k-line:not(.is-done)','.k-ticket.is-open']`, `[data-testid^="cook-line-"]` |
| `bep_chon` | `recipe-card`, ⚠ `.chon-shelf`, `chon-basket`, `chon-done` |
| `bep_thot` | `board`, ⚠ `['.k-step.is-available','[data-testid^="board-step-"]']`, ⚠ `['.k-step.has-method:not(.is-done)','.k-step.has-method']`, `finish-dish`, `abandon-dish` |
| `bep_ra_mon` | `['dish-result','.k-ticket.is-ready']`, `serve-ticket` |
| `phieu_cham` | `score-sheet`, ⚠ `['.ss-tags','.ss-rows']`, `['score-sheet-tip','score-sheet']` |

Ràng buộc kèm theo:
- **Chỗ (spot) của tour** do mã giao diện tính, không phải dữ liệu: `counter.tourSpot` (`counter.js:695-706`; `order-sheet` cần `ui.sheet && sheetPortal.node()`), `kitchen.tourSpot`/`busy` (`kitchen.js:954-970`), `service.tourSpot` (`570-577`). Danh sách SPOTS hợp lệ được kiểm trong `tour.test.mjs:145`.
- `sheetSettled` (`service.js:658-664`) yêu cầu phiếu chấm có opacity ≥0,9 và **không có animation nào đang chạy trên chính nút đó**. `tour.e2e:434-454` kiểm opacity ≥0,9 lúc tour gắn vào.
- Vùng sáng của tour phải ôm đúng phần nhìn thấy của đích, sai lệch ≤1,5px (`tour.e2e:99-121`).

**Ràng buộc chung của e2e:**
- `measure()` trong `iphone-overlays.e2e:86-115` kiểm `elementFromPoint` ở tâm và 4 mép mỗi nút, nút phải nằm trọn khung nhìn trên `safe-bottom`.
- `hanh-trinh.mjs:265-297` báo lỗi khi chữ hiển thị nhỏ hơn 13px, vùng chạm của `button, a, [role=button], summary` nhỏ hơn 44px, hoặc có chữ "undefined/NaN/{biến}".
- `review-m3-ux.e2e:30-43`: chồng toast không được chạm thanh `progress-4`. `review-m3-ux.e2e:100-104`: mọi `.chon-cell` phải nằm trên `chon-done`.
- Các testid trùng tên giữa nhiều nơi: `abandon-dish` ×3, `sheet-close` ×2, `retry-step` ×2, `confirm-ok/cancel` (modal và hộp dự phòng), `amount-due` ×2, `cham-target` (vừa là tâm chảo vừa là nút lọ). Test phân biệt bằng phần tử cha, ví dụ `[critical-prompt] [abandon-dish]`.

---

## 7. Unit test có thể bị ảnh hưởng

| Test | Ràng buộc |
|---|---|
| `tests/unit/data.test.mjs:250-266` | Mọi `ingredient.icon`, `recipe.icon`, `upgrade.icon`, `MINIGAME_TYPES.icon`, `step.icon` phải có trong `ICONS` |
| `data.test.mjs:268-287` | Mọi icon, mặt, tiền, QR, xe: chuỗi bắt đầu `<svg` kết thúc `</svg>`. **Cấm `url(`, `href=`, `<image`, `base64`** (nghĩa là không dùng được `fill="url(#grad)"`, `<use href>`, filter id). Cấm chữ `undefined/NaN/null`. Số thẻ mở/đóng `svg/g/text` phải cân bằng. **Mọi ICONS phải có `viewBox="0 0 64 64"`**. `DI_SAU` đúng 4 khóa, mỗi kiểu khách đủ 4 tâm trạng |
| `data.test.mjs:289-314` | `icon()` có hình dự phòng. Tiền có "TIỀN GAME", mệnh giá, 7 màu khác nhau. QR có "QR GAME". Cặp bẫy phải khác hình; `nuoc_tuong` chứa "TƯƠNG", `nuoc_mam` chứa "MẮM" |
| `tests/unit/banned-words.test.mjs:11-14, 54-63` | Quét **toàn bộ** `src/`, `css/`, `index.html`, `sw.js`, kể cả comment. Cấm `cooking mama`, `momo`, `zalopay`, `vnpay`, `vietqr`, `napas`, `grab`, `shopeefood`, `baemin`… Không được ghi "Cooking Mama" trong comment hay tên lớp. `INTERNAL_WORDS` (`par`, `toast`, `chip`, `MV`) cấm trong chuỗi hiển thị của `strings.js, dialogue.js, tours.js, rare.js…` |
| `tests/unit/pwa.test.mjs:125-175` | `PRECACHE` của `/home/user/gamefnb/sw.js:18-127` phải khớp **đúng** cây thư mục `src/**/*.js`, `css/*.css`, `icons/*` (thiếu hay thừa đều hỏng). Mọi import tương đối phải nằm trong PRECACHE. `VERSION` (`sw.js:14`) = `package.json` = `APP_VERSION` (`app.js:17`). Thêm hay đổi tên tệp thì sửa PRECACHE và tăng phiên bản ở cả 3 nơi |
| `tests/unit/audio.test.mjs:137-162` | Mọi lời gọi `sound('x')` dạng chuỗi viết thẳng và bảng `feedback` phải có trong `SOUND_NAMES`. Bắt buộc giao diện còn gọi `chop, sizzle, pour, chest, cash, nudge, bell, ding`. Âm mới phải thêm vào `SOUND_NAMES` và `RECIPES` (`audio.js:7, 77-138`) |
| `tests/unit/tour.test.mjs:143-182` | Mỗi tour 2–6 bước, tiêu đề ≤28 ký tự, lời ≤2 câu và ≤170 ký tự, `spot` thuộc danh sách cố định, `lead` hợp lệ |
| `tour.test.mjs:184-196` | `HOW_TO_PLAY.icon` phải có trong `ICONS` (hoặc `di_sau`) |
| `tour.test.mjs:198-240` | Lời tour khớp luật: phải có "3 phiếu", "5.000đ", "20.000đ", "từ ngày 4"… |
| `tests/unit/minigame-ui-contract.test.mjs` | Hợp đồng plugin. Import **trong Node** cả `kitchen.js`, `minigames/*`, nên không được chạm `document/window/matchMedia` lúc import. Hằng xuất ra được kiểm: `waitLevel`, `waitRatio`, `moodForGrade`, `dishComment`, `doneness`, `layoutSpots`… |
| `tests/unit/cha-fit.test.mjs` | `fitSpotsBox`, `spotLayout`, `rubSpots`, `fitStrokesHeight`, các hằng `PAD_W/PAD_H/SPOT_HIT/MIN_SCALE/STROKE_MIN_H` (`cha.js:14-27`). Đổi hình thớt chà phải giữ đúng thuật toán này |
| `tests/unit/m4-events.test.mjs`, `tour.test.mjs` | import `ICONS` |
| `tests/unit/review-m4-round2.test.mjs:28-29` | import `dayEffectLines` (prep.js) và `incidentLines` (summary.js) |
| `review-m3-fixes.test.mjs:295` | Nhãn lớp vỏ phin, nồi, tô trong `minigame-types.js` |

---

## 8. Điểm yếu thị giác hiện nay và đề xuất thay bằng hình, cảnh, hoạt ảnh

**Quầy (gọi món, chốt order, thu tiền):**
1. **Không có cảnh quầy.** Khách là đầu 48px (40px ở màn thấp) trong dải gradient (`game.css:156-166`), rồi lặp lại lần nữa thành `cust-card` 52px kèm chữ ở panel (`counter.js:160-165`). Đề xuất: cảnh quầy xe đẩy (dùng lại `cartSvg` hoặc vẽ quầy mới), khách bán thân 96–140px đứng trước quầy, có hoạt ảnh đi vào, đứng chờ (nhún), rời đi vui hoặc giận. Vòng kiên nhẫn chuyển thành thanh hoặc biểu tượng cảm xúc trên đầu.
2. **Bóng thoại chữ dài.** Icon yêu cầu chỉ 26px và chỉ hiện ngày 1–2 (`counter.js:172-175`). Đề xuất: bóng thoại có hình món to và huy hiệu ghi chú bằng hình (ví dụ ớt gạch chéo), chữ chỉ là phụ.
3. **Bảng món là "ô vuông có chữ".** Thẻ 64px, icon 48px, tên, giá (`counter.js:194-208`, `game.css:287-295`). Đề xuất: bảng menu dạng biển gỗ hoặc bảng đen, thẻ món với hình 80–96px, giá trên tem tròn, món hiếm có viền vàng lấp lánh. Chạm thì món "nảy" và bay vào phiếu.
4. **Phiếu order là danh sách chữ, không icon** (`counter.js:211-230`). Đề xuất: phiếu giấy có icon món 32–40px mỗi dòng, ghi chú dạng tem đỏ. Hoạt ảnh "viết" khi thêm dòng, "đóng dấu ĐÃ CHỐT" khi chốt order.
5. **Bảng số lượng và ghi chú:** chip chữ (`counter.js:335-340`). Đề xuất: món lớn ở giữa, nút −/+ to, nhân bản icon theo số phần, chip ghi chú có hình nhỏ.
6. **Thanh toán:** bảng giá chữ và phiếu tóm tắt chữ (`counter.js:394-412`). Đề xuất: máy tính tiền hoặc POS cách điệu, màn số LED đã có sẵn (`game.css:360-364`), phím bấm nổi khối có âm thanh.
7. **Tính tiền:** tờ tiền đã có hình (điểm mạnh) nhưng nhỏ (64×34 và 70×40). Két chỉ là lưới nâu. Đề xuất: két mở ngăn kéo, tờ tiền kéo hoặc bay từ két vào khay, "keng" khi đủ, tiền khách đặt trên quầy. QR nên vẽ điện thoại thay ô chữ `.phone-shot`.
8. **Phiếu thu và "Kẹp phiếu bếp":** không có chuyển động. Đề xuất: phiếu in ra từ máy, bay lên dây phiếu.
9. **Thanh 4 khâu:** chấm 14px với chữ 13–14px. Đề xuất: 4 icon khâu (sổ, máy tính, két, chảo) với thanh nối và hiệu ứng "check".
10. **Dây phiếu trên cùng:** thẻ chữ 150px, không icon (`ticket-rail.js:40-56`). Đề xuất: phiếu giấy kẹp trên dây có icon món to, đồng hồ chờ dạng vòng.
11. **Tab Quầy/Bếp:** nút chữ "Quầy · n" (`service.js:115-117`). Đề xuất: icon xe đẩy và chảo, huy hiệu số.
12. **Phiếu chấm:** 100% chữ, sao là ký tự, hiện 2 giây (`service.js:681-722`). Đề xuất: thẻ "chấm điểm" có mặt khách, sao bật từng ngôi kèm âm, 5 hàng thành icon tick/xẹt, tip là đồng xu bay vào HUD.
13. **Tình huống, phàn nàn:** modal chữ, hình 64px. Có thể giữ nhưng nên tăng minh họa.

**Bếp:**
1. **Dây phiếu trong Bếp lặp lại dây phiếu trên** bằng thẻ chữ, icon 36px (`kitchen.js:319-364`). Đề xuất: gộp thành dây phiếu lớn có hình, hoặc khu "món chờ làm" dạng khay.
2. **Thẻ công thức:** danh sách chữ với icon 20px (`kitchen.js:250-283`, `kitchen.css:129-131`). Đề xuất: thẻ công thức kiểu "recipe card" với hàng icon nguyên liệu 32–40px và huy hiệu ×n.
3. **Kệ Chọn:** icon chỉ 40px (28px hoặc 24px khi kệ 12 ô ở màn ≤900px) và nhãn chữ (`chon.js:58-70`, `kitchen.css:313-338`). Các icon có chữ bên trong (TƯƠNG, MẮM…) trở nên không đọc được. Đề xuất: kệ gỗ nhiều tầng, nguyên liệu to 56–72px không cần khung ô, chạm thì nguyên liệu bay vào rổ (dùng `k-drop-in` có sẵn). Rổ vẽ bằng SVG.
4. **Thớt sơ chế là chỗ "ô có chữ" nặng nhất.** Lưới thẻ trắng với nút chữ "Chạm để làm / Sau: … / 🔒" (`kitchen.js:498-540`). Đề xuất: thớt gỗ lớn với nguyên liệu 64–80px bày lên. Mỗi bước là huy hiệu hành động (dao, vòi nước, chảo, chai, ly), khóa là xích, xong thì thay bằng **hình đã sơ chế**. Cần vẽ hình theo trạng thái; hiện chỉ có `filter` CSS (`kitchen.css:162-165`).
5. **Bảng chọn cách sơ chế:** nút chữ (`kitchen.js:600-602`). Đề xuất: 3 thẻ hình minh họa lát, sợi, hạt lựu.
6. **Thẻ gợi ý trước bước:** chữ trên nền trắng (`kitchen.css:216-222`). Đề xuất: hình bàn tay minh họa động tác (vuốt, giữ, chạm) có hoạt ảnh lặp, kiểu thẻ hướng dẫn của game nấu ăn.
7. **Mini-game là cảnh CSS đơn sơ:**
   - **Thái:** nguyên liệu là thanh bo màu 84px, icon thật chỉ 40px ở góc, dao là vạch 4px (`thai.js:39-45`, `kitchen.css:376-398`). Nên vẽ nguyên liệu to, cắt rời từng lát, dao SVG.
   - **Chà:** icon 200px và vết radial. Thêm bọt, nước, lấp lánh.
   - **Đập trứng:** chảo radial và vệt vàng. Thêm trứng nứt, lòng trắng loang, xèo.
   - **Chạm nhanh:** chỉ là nút tròn "Chạm!" (`cham.js:106-107`). Nên thành cảnh vắt tắc hoặc lăn bột có hình biến đổi.
   - **Nêm:** thẻ chai chữ "Cần n nấc" (`cham.js:146-151`). Nên thành chai nghiêng rắc hạt hoặc giọt bay vào món.
   - **Canh lửa:** thước kim là UI thuần, món đổi màu bằng `filter`. Nên thêm lửa bếp, khói, dầu bắn, mặt món đổi theo độ chín.
   - **Rót:** dòng chảy là thanh 8px, ly CSS. Nên có chất lỏng gợn sóng, đá trong ly, bọt.
8. **Kết quả bước:** pill chữ "Tên: Tốt 85" (`kitchen.js:922-927`). Đề xuất: chữ lớn "Hoàn hảo!/Tốt!/Đạt/Hỏng" có sao và hạt, màu theo hạng.
9. **Ra món:** hộp trắng, hình 132px, 1,2 giây (`kitchen.js:795-818`). Đây là chỗ đáng đầu tư nhất: món bày đĩa giữa màn, ánh sáng xoay phía sau, hạng chữ to bật vào, sao 1–5 rơi xuống, Dì Sáu tạo dáng, jingle riêng theo hạng (thêm âm `fanfare`, `sparkle`).
10. **Giao cho khách:** chỉ là nút. Đề xuất: món trượt hoặc bay lên đầu khách ở dải phố, khách đổi mặt vui, rồi tới phiếu chấm.
11. **CSS chưa có kiểu cho hạng `duoc` và `kem`** ở `.k-reveal` (`kitchen.css:232-234`).

---

## Rủi ro khi làm lại

1. **E2E gắn với lớp CSS và cấu trúc DOM** (mục 6, các dòng ⚠):
   - Các lớp đang bị kiểm: `.k-layer`, `.k-main[data-view]`, `.k-step(.is-available/.is-done/.has-method)`, `.k-step-st` (chữ "85"), `.k-ticket(.is-open/.is-ready)`, `.k-line`, `.chon-cell`, `.chon-in`, `.chon-msg`, `.chon-shelf`, `.mg-foot/.mg-head/.mg-sub`, `.mg-chon .mg-foot`, `.cha-spot`, `.thai-food`, `.cham-bottle`, `.k-stage-wrap`, `.tabbar`, `.toast-stack`, `.hud`, `.ss-tags/.ss-rows`, `.incident`, `.incident-choice`, `.incident-fx`, `.receipt-head span`, `.modal-layer.hide`, `.overlay-root .sheet-layer`, `.screen/.panel/.k-main`.
   - Chữ bị so khớp: "Trong rổ: n", "Không cần thối", "Không cần thối tiền", "Còn thiếu nguyên liệu chính", "★ còn N", "còn N", "Phiếu thu #001", "Ngày 1", "×n (chạm 1 lần)".
   - Đổi tên lớp hay cấu trúc thì phải sửa test, hoặc giữ lớp cũ làm "lớp móc".
2. **`data-*` dùng để đo** phải giữ nguyên ngữ nghĩa:
   - `thai-guide[data-x]` tính từ mép trái **sân khấu**; `lua-needle`/`rot-level[data-v]`; `lua-zone`/`rot-zone[data-a/b]`; `cha-spot[data-clean]`.
   - `data-amount`, `data-count`, `data-request`, `data-stage`, `data-customer`, `data-stars`, `data-tip`, `data-grade`, `data-q`, `data-score`, `data-step-id`, `data-ticket-id`, `data-t`.
3. **Kiểm tra trúng vùng chạm** (`elementFromPoint` ở tâm và 4 mép mỗi nút): mọi lớp VFX, hạt, ánh sáng phải `pointer-events:none` và không phủ lên nút. Lớp mới đè lên vùng chạm sẽ làm hỏng `iphone-overlays.e2e` và `fix-leftovers.e2e`.
4. **Ngân sách chiều cao màn thấp** (panel khoảng 270–320px ở 360×600, khung 320×568 và 375×553): phóng to icon hay cảnh sẽ chiếm chỗ của kệ, chai Nêm, thớt chà. Test kiểm mọi ô kệ, chai, vết chà nằm trên thanh chân và trên tabbar. `cha.js` có thuật toán vừa khung đã có test riêng. Các giả định cố định: `.toast-stack top 50px+safe` (HUD cao khoảng 50), `.sheet-host bottom 64px+safe` (tabbar cao khoảng 61), giới hạn toast theo `progress-4`.
5. **Chuẩn chữ và vùng chạm:** chữ ≥13px (chữ tour ≥14px), vùng chạm ≥44px, không có "undefined/NaN". Chữ nằm trong SVG không bị kiểm (bộ duyệt bỏ qua chữ trong `svg`).
6. **Ràng buộc SVG của test dữ liệu:** không dùng `url(#…)` (gradient, pattern, filter trong SVG), `href`, `<use>`, `<image>`. Icon bắt buộc `viewBox 0 0 64 64`. Gradient và đổ bóng phải làm bằng CSS hoặc tô phẳng nhiều lớp, hoặc phải sửa test có chủ đích. Cặp bẫy phải khác hình.
7. **Từ cấm "cooking mama" bị quét cả comment** trong `src/` và `css/` (cùng `grab`, `momo`, `vietqr`…). Tài liệu tham khảo chỉ được ghi trong `docs/`.
8. **PWA:** mỗi tệp JS hay CSS mới phải thêm vào `sw.js` PRECACHE (khớp tuyệt đối) và tăng `VERSION` ở `sw.js:14`, `package.json`, `app.js:17`.
9. **Nhập trong Node:** `art.js`, `kitchen.js`, `minigames/*`, `summary.js`, `prep.js` được test import trực tiếp. Module hiệu ứng mới mà các tệp này import không được chạm DOM ở cấp module.
10. **Âm thanh:** tên âm phải nằm trong `SOUND_NAMES` và lời gọi phải giữ dạng chuỗi viết thẳng `sound('…')` để test quét được. Phải giữ đủ 8 âm bắt buộc.
11. **Thời gian và tour:**
    - `SHEET_MS` 2000, `REVEAL_MS` 1200, `HINT_MS` 800, `TAP_GUARD_MS` 1000, nấu thử gọi `onDone` sau `REVEAL_MS+150`. E2E chờ `dish-reveal` biến mất tối đa 5 giây; kết ca chờ phiếu chấm tắt.
    - Hoạt ảnh lặp vô hạn trên chính `.score-sheet` sẽ làm `sheetSettled` không bao giờ đúng, tour phiếu chấm không hiện.
    - Phiếu chấm phải đạt opacity ≥0,9.
    - Lớp phủ mới trong bếp phải gọi `markLayer()` (`kitchen.js:153-162`) để không dính click ma.
    - Tour chỉ hiện khi bếp không `busy()`; lớp mới phải cập nhật `ui.layerKind`.
12. **Giảm chuyển động:** hoạt ảnh JS mới phải tự kiểm `reduced()` hoặc lớp `.reduce-motion`; luật CSS hiện tại không tác động tới chúng.
13. **Hiệu năng:** `service.update` chạy mỗi khung hình. `renderStreet` và quầy dựa vào chữ ký trạng thái để tránh vẽ lại; quầy vẽ lại toàn bộ panel bằng `innerHTML` SVG mỗi khi trạng thái đổi. Cảnh SVG lớn hoặc hạt dày sẽ nặng trên máy yếu. Mọi hiệu ứng phải tự dọn khi `unmount`/`destroy`.
14. **Dùng lại ở nơi khác:** màn Nấu thử (`tasting.js:121`, `meta.css:258-279`) dùng `mountKitchen`; Gánh hàng quê (`market.js:132`, `meta.css:679`) dùng plugin `chon`. Đổi bếp hay `chon` sẽ đổi cả hai màn này.
15. **Logic chấm điểm không được đổi:** hàm chấm, vùng mục tiêu, `zoneMul` và giới hạn thời gian nằm ở lõi. Giao diện mới chỉ đổi phần hình.

## Những gì nên tái sử dụng

- **Toàn bộ lõi** (`src/core/*`), dữ liệu công thức và bước (`recipes.js`, có `skin`, `method`, `after`, `critical`), các hàm chấm mini-game: giữ nguyên.
- **Hợp đồng plugin và tiện ích:** `playStep`/`MINIGAMES`/`hintFor`/`skinFor` (`index.js(mg)`); `createClock`, `frameLoop`, `settleOnce`, `feedback`, `buildFrame`, `popLabel`, `ingIcon` (`_util.js`); `bindPointer`/`guardStage` (`input.js`). Mở rộng `feedback` và `buildFrame` thành cổng VFX chung là cách ít đụng nhất.
- **Hạ tầng lớp phủ:** `createPortal` (`dom.js`), `app.overlay`, modal host (hàng đợi, khối thời gian ca), toaster (giới hạn chiều cao, giữ thẻ mẹo), `k-pop` với `k-scope`.
- **Bộ tour:** `resolveTarget`, `bringIntoView`, `STICKY`, mô hình spot và lead. Chỉ cần giữ hoặc cập nhật các đích.
- **Bus sự kiện miền** (`step.done`, `dish.done`, `customer.rated`, `payment.received`, `change.given`, `ticket.clipped`, `qr.arrived`, `customer.arrived/lost`): móc VFX vào đây mà không sửa lõi.
- **art.js:** phong cách màu phẳng viền mực và các hàm phụ (`svg`, `egg`, `bowl`, `dots`, `rareStar`); hệ mặt theo tâm trạng (`faceSvg` ghép lớp, dễ thêm thân người); `billSvg` (7 màu đã đạt chuẩn); `cartSvg` (có thể làm nền dải phố); 80 icon hiện có làm điểm xuất phát cho hình to và hình theo trạng thái.
- **audio.js:** bộ tổng hợp `tone`/`noise` và 12 âm. Thêm âm mới chỉ cần thêm một mục vào `RECIPES` và `SOUND_NAMES`.
- **Thuật toán bố cục đã có test:** `cha.js` (`fitSpotsBox`, `spotLayout`, `rubSpots`), `thaiGuides`, `nearestUncut`, `revealTargets`, `revealStage`/`revealAboveBar`, và quy ước thanh dính `.act-bar`/`.k-toolbar`/`.mg-foot`. Giữ các quy ước này để không làm vỡ các kiểm tra iPhone và màn thấp.
- **Quy ước testid và `data-*`:** giữ nguyên tên trên phần tử tương đương trong giao diện mới để phần lớn e2e và tour chạy tiếp.

---

## 9. Màn ngoài ca (Đợt 3, bản 0.5.2; gói S3 lập ở bước 0)

Mục này liệt kê những gì e2e (`tests/e2e/*.mjs`, kể cả `helpers.mjs` và `hanh-trinh.mjs`), dữ liệu tour (`src/data/tours.js`: `target`, `span`, `requires`) và lớp phủ tour (`src/ui/components/tour.js`) đang bám vào ở các màn ngoài ca. Gói nào làm lại một màn thì giữ nguyên các mục dưới đây trên phần tử tương đương, hoặc sửa test có chủ ý và ghi rõ lý do.

Ký hiệu: ⚠ = test hoặc tour bám vào lớp CSS, cấu trúc DOM, thẻ HTML hoặc chữ hiển thị (đổi giao diện dễ làm hỏng). Chỉ ghi `testid` = test chỉ tìm, chạm hoặc chờ phần tử. Viết `x-*` nghĩa là testid có hậu tố động (id món, id việc…).

### 9.1 CSS sau bước 0: tệp nào chứa gì, thứ tự gắn

Bước 0 chỉ chuyển chỗ: 3360 luật của bản trước và bản sau trùng nhau từng luật (bộ chọn, khai báo, `@media`), không mất luật nào, không thêm luật nào. Thứ tự gắn trong `index.html`:

`… mg-mix.css → meta.css → prep.css → shop.css → quests.css → mail.css → book.css → summary.css → market.css → settings.css → tour.css → theme.css → fx.css → counter.css → cashier.css → receipt.css → sheet.css`

| Tệp | Nội dung | Ghi chú |
|---|---|---|
| `css/meta.css` | Phần **dùng chung**: luật chữ 14px của các màn, viên tiền / Muỗng Vàng (`.pill*`), chấm đỏ (`.red-dot`), thanh tiến độ (`.pbar*`), phần thưởng (`.rw-chip*`), `.rewind-note`, `.badge-lock/.badge-event`, `.ev-assist, .ev-grace-note`, `.chain-prog/.quest-prog`, `.chain-num/.quest-num`, khung màn M2 (`.meta-screen`, `.meta-head`, `.meta-back`, `.meta-title*`, `.meta-body`, `.meta-section`, `.meta-hint`, `.seg-tab*`), màn hẹp chung (`.seg-tab`, `.meta-title` ở ≤ 370px), `.rare-star` | ⚠ `.ev-assist, .ev-grace-note` phải **đứng trước** `.meta-hint`: dòng ân hạn ở màn Sự kiện có cả hai lớp (`p.meta-hint.ev-grace-note`, testid `event-grace-chain`) và đang lấy màu của `.meta-hint` |
| `css/prep.css` | Màn Chuẩn bị: đầu màn, lưới lối vào (`.nav-*`, `.icon-tile`), thẻ sự kiện có thời hạn (`.event-card*`), sự kiện ngày + Phiếu Chợ Sớm (`.day-event-card`, `.day-ev-*`, `.day-choice*`, `.coupon-*`), thẻ chuỗi "Dì Sáu dặn" (`.chain-*`), thẻ Lên chặng / Giấc mơ (`.dream-*`, `.stage-card`), **màn Lên chặng** (`.stage-*`, `.cond*`, `.goal-recipes`, `.records`), thẻ Hôm nay (`.prep-today`, `.prep-dish*`), `.tip-card`, gánh hàng quê và kho hàng hiếm (`.stall-*`, `.rare-stock*`, `.rare-frag*`, `.basket-*`, `.pbar-luck`) | `.day-event-card`/`.day-ev-*` còn dùng ở Tổng kết (thẻ "Báo trước", `is-tomorrow`); thẻ chuỗi còn hiện ở Việc hôm nay và Sự kiện |
| `css/shop.css` | Chợ Công Thức (`.shop-*`, `.knife*`, `.teaser*`, `.up-*`, `.spoon-*`, `.cart-view`, `.parasol*`, `.deco-*`, `.bag-*`) và Nấu thử (`.tasting-*`, `.kitchen.is-tasting …`) | |
| `css/quests.css` | Việc hôm nay (`.quest-*`, `.chest-*`), bảng điểm danh (`.checkin-modal`, `.ck-*`), màn Sự kiện (`.ev-*`, `.ex-*`); màn hẹp: `.ck-slot`, `.ex-grid` | |
| `css/mail.css` | Hộp thư (`.mail-*`) | `.meta-screen > .mail-bar` nằm ở meta.css |
| `css/book.css` | Sổ tay nghề (`.nb-*`), Sổ công thức, chi tiết món, Sổ từ vùng miền (`.book-*`, `.dialect-*`) | Luật `.book-detail-body small, .incident small, .sum-incident small` giữ ở đây (dùng chung cho hộp tình huống trong ca và Tổng kết) |
| `css/summary.css` | Tổng kết: `.summary-screen .stat-label`, tiến độ meta (`.sum-meta*`, `.sum-quests`, `.sq-num`), tình huống / sổ ghi nợ / tiền sự kiện (`.sum-incident*`, `.sum-event-notes`, `.sum-debt`) | Phần còn lại của màn Tổng kết (sổ lãi lỗ `.ledger`, `.sum-head-row`…) vẫn ở `css/game.css` |
| `css/market.css` | Gánh hàng quê / Lựa hàng (`.market-*`) | Kệ `chon` dùng chung với bếp (`css/mg-prep.css`); thẻ Mẹo ở kết quả Lựa hàng dùng lớp `.incident-tip` (kiểu nằm ở sheet.css) |
| `css/sheet.css` (đầu tệp) | Kiểu nền hộp tình huống trong ca (`.incident*`, `.safe-badge`, `.choice-hint`, `@media (max-height: 760px)`) chuyển từ meta.css | Đặt ở đầu tệp nên các luật kiểu game của gói Q-E bên dưới vẫn đè như cũ |

Quy tắc cho các gói Đợt 3:

- Mỗi gói chỉ sửa tệp CSS của mình. Muốn đè kiểu ở tệp khác thì tăng độ ưu tiên (thêm lớp màn, ví dụ `.prep-screen .x`), đừng dựa vào thứ tự gắn.
- Thêm lớp mới thì đặt tiền tố riêng của màn để không trùng lớp màn khác (lớp kiểu game dùng tiền tố `g-` của `theme.css`).
- Thêm hay đổi tên tệp CSS thì sửa `index.html`, `PRECACHE` của `sw.js` và tăng phiên bản. `tests/unit/pwa.test.mjs` kiểm `index.html` gắn đủ mọi `css/*.css` và thứ tự (base đầu tiên; meta, settings, tour trước theme; theme → fx → counter; sheet.css cuối).

Cách kiểm bước 0:

1. **So điểm ảnh.** Chụp 70 trạng thái của 12 luồng (Mở đầu, Điểm danh, Chuẩn bị ngày 1 và ngày 7 có sự kiện ngày, Phiếu Chợ Sớm, gánh hàng và kho hiếm, Chợ Công Thức 3 tab, Nấu thử, Việc hôm nay, Hộp thư, Sự kiện 20/11, Sổ công thức kèm chi tiết và Sổ từ, Sổ tay nghề, Cài đặt, Hướng dẫn và Cách chơi, Lên chặng, Tổng kết, Gánh hàng, Lựa hàng, hộp tình huống) ở 390×844 và 360×600. Mỗi màn chụp cả các trang cuộn. Lúc chụp cố định `Math.random`, đồng hồ, tắt service worker, cho hoạt ảnh chạy xong. Kết quả: mọi ảnh sau giống hệt từng điểm ảnh với một lần chụp trước. Riêng thanh thời gian của Lựa hàng do JS chạy theo giờ, nên che thanh này rồi so thì giống hệt.
2. **So computed style.** Đã so mọi thuộc tính của mọi phần tử (cả `::before`, `::after`, `::marker`) trong 70 trạng thái: không khác chỗ nào, trừ `transform` của thanh thời gian Lựa hàng.
3. **Soát tĩnh.** Dò mọi cặp luật bị đổi thứ tự có cùng độ ưu tiên, cùng thuộc tính (tính cả thuộc tính viết tắt) và khác giá trị. Với mỗi cặp, xét hai bộ chọn có thể khớp cùng một phần tử hay không: lớp đứng chung trong chuỗi `class` của mã nguồn hoặc trong DOM đã chụp, lớp lồng nhau trong DOM đã chụp, quan hệ `import` giữa các tệp tạo lớp. Kết quả:
   - Có đúng 1 cặp xung đột thật: `.ev-grace-note` với `.meta-hint`, đã sửa bằng cách giữ khối đó ở meta.css.
   - Còn 46 cặp giữa khối tình huống và các lớp gắn lúc chạy trên phần tử khác: `co-fit-tiny` và `co-has-tutor` trên panel Quầy, `cs-bill-under` trên tờ tiền của két, `g-pill--go/--bad` trên bộ đếm Lắc. Các cặp này không thể rơi vào cùng một phần tử.
   - Các cặp còn lại hoặc có lớp không bao giờ đứng chung một phần tử, hoặc thuộc luật chết (lớp không còn dùng trong game: `nav-sub`, `tasting-dish`, `settings-btn`, `g-chalk*`…).

### 9.2 Bảng màn

| Màn (tên route) | Tệp, hàm | Thành phần dùng chung | CSS |
|---|---|---|---|
| Mở đầu (`title`) | `screens/title.js`, `default.mount(root, app)`; export `DEFAULT_SHOP_NAME` | `meta-ui.cartOptions`, `settings.openImport` | `game.css` (`.title-*`), `theme.css` |
| Chuẩn bị (`prep`) | `screens/prep.js`, `default.mount(root, app)`; export `dayEffectLines`, `dayEventWarnLine`, `choiceCostText`, `forecastCustomers`, `forecastDetail`, `prepTalk`, `isFirstVisit` (Tổng kết và unit test dùng) | `meta-ui` (`spoonPill`, `progressBar`, `redDot`, `rewindNote`, `durationText`, `reasonText`), `chain-card.chainCard`, `checkin-popup.openCheckin`, `help.helpButton`, hình `GEAR_SVG`/`NOTEBOOK_SVG`/`RECIPE_BOOK_SVG`, `event.phaseText`, `market.starText`; `app.updateSlot()` | `prep.css`, `game.css` (`.prep-head`, `.stat`, `.sticky-foot`…), `settings.css` (nhắc sao lưu, "Có bản mới") |
| Điểm danh (hộp nổi) | `components/checkin-popup.js`, `openCheckin(app, { auto, onClaim })`: tự mở lần đầu trong ngày ở màn Chuẩn bị, hoặc mở từ ô `open-checkin` | `app.modal` | `quests.css` |
| Chợ Công Thức (`shop`) | `screens/shop.js`, `default.mount(root, app, params)` | `meta-ui.screenHead`, `spoonPill`, `cartView`, `DEFAULT_UMBRELLA` | `shop.css` |
| Nấu thử (`tasting`) | `screens/tasting.js`, `default.mount(root, app, params)` → `kitchen.mountKitchen` | `meta-ui.reasonText` | `shop.css` + toàn bộ CSS bếp |
| Việc hôm nay (`quests`) | `screens/quests.js`, `default.mount(root, app)` | `screenHead`, `rewardChips`, `rewardLine`, `progressBar`, `rewindNote`, `chainCard` | `quests.css` |
| Hộp thư (`mailbox`) | `screens/mailbox.js`, `default.mount(root, app)` | `screenHead`, `rewardChips`, `rewardLine`, `rewindNote` | `mail.css` |
| Sự kiện (`event`) | `screens/event.js`, `default.mount(root, app, { eventId })`; export `phaseText` | `screenHead`, `rewardChips`, `progressBar`, `rewindNote`, `chainCard` (`stepTestid: 'event-chain-step'`) | `quests.css` |
| Lên chặng (`stage-up`) | `screens/stage-up.js`, `default.mount(root, app)`; lối vào là thẻ `dream-card` / `stage-up-card` và hộp mời ở màn Chuẩn bị | `screenHead`, `progressBar`, `cartView` | `prep.css` |
| Sổ công thức (`recipe-book`) | `screens/recipe-book.js`, `default.mount(root, app, params)`; export `RECIPE_BOOK_SVG` | `screenHead`, `progressBar` | `book.css` |
| Sổ tay nghề (`notebook`) | `screens/notebook.js`, `default.mount(root, app, params)`; export `NOTEBOOK_SVG` | `screenHead`, `rewardChips`, `rewardLine`, `progressBar` | `book.css` |
| Cài đặt (`settings`) | `screens/settings.js`, `default.mount`; export `GEAR_SVG`, `CODE_ERRORS`, `formatTime`, `slugify`, `backupFileText`, `copyBackup`, `downloadBackup`, `openImport`, `resetGame`, `openAbout` | `screenHead` | `settings.css` |
| Hướng dẫn (hộp nổi) | `components/help.js`: `helpButton(app)`, `openHelp(app)`, `howToPlay(app)` | `app.tour` | `tour.css` |
| Tổng kết (`summary`) | `screens/summary.js`, `default.mount(root, app, { summary })`; export `incidentLines` | `progressBar`, `chainTitle`, các hàm của prep.js, `helpButton` | `summary.css`, `game.css` (sổ lãi lỗ, `.sum-head-row`), `prep.css` (thẻ báo trước) |
| Gánh hàng / Lựa hàng (`market`) | `screens/market.js`, `default.mount(root, app, params)`; export `starText` | `screenHead`, `reasonText`, `rewindNote`, plugin kệ `chon` | `market.css`, `mg-prep.css` |

Unit test import thẳng mã giao diện ngoài ca nên không được chạm DOM ở cấp module: `review-m4-round2.test.mjs` (`dayEffectLines` của prep.js, `incidentLines` của summary.js), `ui-rewards.test.mjs` (`mergeRewards` của chain-card.js, `rewardLine` của meta-ui.js), `tour.test.mjs` (`STICKY` phải có `.sticky-foot`, `.meta-head`).

### 9.3 Bộ chọn, chữ và `data-*` mà test và tour bám vào, theo màn

**Chung cho mọi màn con (meta-ui `screenHead`):**
- `meta-back` (gần như mọi e2e có vào màn con; `stability` bấm 20 vòng trong trang).
- `help-button` nằm trong `.meta-head`: ⚠ `tour.e2e:321` dùng `.meta-head [help-button]`; `tour.e2e:636-638` đo nút "?" ở `.meta-head` trúng chạm khi cuộn tới đáy, và `meta-back` nằm dưới vùng an toàn trên 47px.
- ⚠ `tour.js STICKY` = `.act-bar, .sticky-foot, .k-toolbar, .meta-head, .mg-foot, .prep-toprow, .sum-head-row, .co-pad-actions`. Đầu màn và nút dính đáy phải giữ các lớp này để tour chừa chỗ.
- ⚠ `#screen[data-screen]` (`stability:128`).

**Mở đầu:**
- testid: `screen-title` (pwa-backup), `shop-name-input` (helpers `startNewGame`, hầu hết e2e; tour `mo_dau` `requires`), `start-button` (helpers `enterPrep`, hầu hết e2e), `title-import` (pwa-backup, save-safety), `title-talk`, `title-tip`.
- ⚠ Lớp `.title-shop` phải chứa **đúng** tên xe (`page.textContent('.title-shop')` so bằng: pwa-backup:126, 184, 361; save-safety:171; subpath:131).
- Tour `mo_dau`: `title-talk`, `shop-name-input`, `title-import`, `start-button`.

**Điểm danh:**
- testid: `checkin-popup`, `checkin-claim`, `checkin-close`.
- ⚠ Chữ trên `checkin-claim` chứa "Ngày 1" (checkin-quests:52). Nút bị khóa (`disabled`) khi không nhận được (checkin-quests, m2-meta).
- `checkin-slot-<i>` có `data-claimed` (`true`/`false`).
- ⚠ `checkin-note`: chữ chứa "lùi"; thuộc tính **`class` phải đúng bằng `'ck-note is-warn'`** (checkin-quests:104).
- helpers `claimCheckinIfShown`: chờ `checkin-popup` tối đa 1,5–3 giây, bấm `checkin-claim`, chờ `checkin-popup` rời DOM.
- `tour.e2e:200-205`: tour màn Chuẩn bị không được chồng lên bảng điểm danh.
- e2e phủ: checkin-quests, m2-meta, m2-ui (soát 360×740), stability (mở/đóng 20 vòng), tour, iphone-overlays, pwa-backup, review-m3-ux, save-safety, subpath, m4-rare, event-2011 (qua helpers).

**Chuẩn bị:**
- Đầu màn: `screen-prep`.
  - ⚠ `prep-day` chữ "Ngày N" (one-shift:64, pwa-backup:372, subpath:134).
  - `prep-stats` (tour), `prep-wallet` (`data-amount`), `prep-rating`, `prep-spoons` (`data-amount`, review-m2:65).
  - ⚠ `tour.e2e:627-630`: `.prep-screen [help-button]` trúng chạm khi cuộn tới đáy ở 375×553 với vùng an toàn 47/34; `.prep-toprow .prep-shop` vẫn hiện.
- Lưới lối vào `prep-nav`, 7 ô: `open-shop`, `open-quests`, `open-checkin`, `open-mail`, `open-recipe-book`, `open-notebook`, `open-settings`.
  - Mỗi ô có `data-dot` (incident-notebook:106 đòi ô nào cũng có).
  - Chấm đỏ có testid `<ô>-dot`.
  - Giá trị `data-dot` đang bị kiểm: `open-notebook` = `'1'` (incident-notebook:108); `open-checkin` = `'0'` (checkin-quests:59, 98; m2-meta:65); `open-quests` ≥ 1 (checkin-quests:152).
  - ⚠ `incident-notebook:263` dùng `.icon-grid .icon-tile`: đủ 7 ô, 4 ô đầu cùng một hàng ở 360×740.
  - ⚠ Tour `chuan_bi` khoanh vùng sáng là một dải từ `open-shop` tới `open-mail`, và một dải từ `open-recipe-book` tới `open-settings` (dùng `span`). Đổi bố cục lưới thì mỗi dải vẫn phải liền thành một khối hình chữ nhật.
- Thẻ sự kiện có thời hạn: `event-card` có `data-event-id`, `data-phase` (`sap_dien_ra`/`dang_dien_ra`/`an_han`), `data-dot`.
  - ⚠ Chữ: "Đang diễn ra", "Sắp diễn ra", "Tri ân 20/11", "Mở sau 2 ngày" (event-2011:63, 159-162); "chờ nhận" (review-m2:141).
  - Kèm `event-card-dot`, `event-pending`, `open-event`.
- Sự kiện ngày: `day-event-card` có `data-event`, `data-kind`.
  - ⚠ Chữ "Có lựa chọn" (m4-tip-events-attp:32).
  - `day-event-choice-<id>` có `aria-pressed` (m2-ui, iphone-overlays, m4-tip-events-attp). Tour `su_kien_ngay` dùng bộ chọn `[data-testid^="day-event-choice-"]`.
  - ⚠ `day-event-warn` chữ "Ngày N đã bị nhắc nhở".
  - `day-choice-toast`.
- Phiếu Chợ Sớm: `coupon-card`, `use-coupon` (`aria-pressed`, m2-ui).
- Gánh hàng quê và kho hàng hiếm (m4-rare, iphone-overlays):
  - `stall-card` có `data-state` (`open`/`pending`/`done`/`locked`/`early`) và `data-stall`.
  - ⚠ Chữ trong `stall-card`: "Xe ba gác trưa · Chú Tư", "Xe ba gác trưa 11:00–13:30 · đang mở", "Chợ sớm 05:00–09:00", "Gánh đặc sản tối 17:30–21:00", "Hôm nay đã ghé".
  - `stall-title`, `open-market`.
  - `rare-stock-card`: ⚠ tour `hang_hiem` nhắm `[data-testid="rare-stock-card"] .rare-stock`.
  - `rare-stock-<nguyên liệu>` (`data-n`), `rare-fragments-<món>` (`data-status`, `data-n`), `rare-taste-<món>`.
  - `basket-luck` (`data-pity`, `data-sure`, `data-frag-sure`, `data-all`; tour).
- Thẻ Hôm nay:
  - `prep-forecast`, `prep-incident-bonus` (`data-kind`).
  - ⚠ `prep-debts` chữ "Sổ ghi nợ: Cô Thu|Bạn Nam 20.000đ" (incident-notebook:181).
  - `prep-dish-<món>`: ⚠ chữ "Tri ân 20/11 · 2026" (event-2011:132).
  - `rare-left-<món>`: ⚠ chữ "★ còn N phần" (m4-rare).
- Khác:
  - `prep-talk`, `prep-tip`, `prep-tip-notebook`.
  - Thẻ chuỗi `chain-card` (tour) hoặc `chain-card-<id>`; `chain-claim-<chuỗi>[-<bước>]` (review-m2, event-2011, m2-meta, hanh-trinh); `chain-assist-<id>`.
  - `dream-card` hoặc `stage-up-card` (`role=button`; m2-ui:188 cuộn tới rồi chạm).
  - `loan-info`, `take-loan`, `backup-reminder` (pwa-backup).
  - `update-ready`: ⚠ chữ "Có bản mới". Kèm `update-reload` (pwa-backup).
  - `rewind-note`: ⚠ chữ "lùi" (checkin-quests:97).
  - `mail-toast`, `event-auto-toast`; hộp mời lên chặng `stage-up-modal`, `stage-up-open`, `stage-up-later` (hanh-trinh, m4-rare, m4-tip-events-attp).
  - `open-shift`: ⚠ nằm trong `.sticky-foot`, luôn nằm trọn khung nhìn ở 360×740 dù cuộn tới đâu (incident-notebook `openShiftVisible`); hầu hết e2e bấm nút này.
- Tour `chuan_bi`: `prep-stats`, `open-shop`→`open-mail`, `open-recipe-book`→`open-settings`, `chain-card`, `help-button`, `open-shift`.
- Tour `su_kien_ngay`: `day-event-card`, `[data-testid^="day-event-choice-"]`.
- Tour `hang_hiem`: `stall-card`, `rare-stock-card`, `basket-luck`.

**Chợ Công Thức:**
- testid: `screen-shop`; `shop-tab-recipes|upgrades|spoons` (m2-ui duyệt cả 3 tab; tour khoanh từ `shop-tab-recipes` tới `shop-tab-spoons`); khu `shop-<tab>`.
- `shop-item-<món>`: ⚠ có lớp `.is-owned` khi đã mua (shop:71, m2-meta:153, hanh-trinh). ⚠ Tour nhắm `[data-testid^="shop-item-"]:not(.is-owned) .shop-facts`.
- `shop-buy-<món>` (`data-price`, `disabled`).
- `shop-trial-<món>`: ⚠ tour nhắm `button[data-testid^="shop-trial-"]`, nên phần tử phải là thẻ `button`. Bị khóa sau khi đã nấu thử (m2-ui).
- `shop-trial-note-<món>`, `shop-teaser-<món>`, `shop-bought`, `shop-event-<món>`.
- `upgrade-<id>`: ⚠ có `.is-owned` (shop:82, iphone-overlays:334). Kèm `upgrade-buy-<id>` (`disabled`).
- Dù và đồ trang trí: `parasol-card-<id>`, `parasol-<id>`, `parasol-preview-<id>`, `parasol-previewing`, `deco-<id>`, `deco-use-<id>`.
- Túi đồ: `bag`, `bag-basket`, `bag-rare-<id>`.
- `cart-view` có `data-umbrella` (shop:92).
- Hộp xác nhận: `confirm-ok`, `confirm-cancel`.
- e2e phủ: shop, m2-meta, m2-ui, iphone-overlays, stability, tour, hanh-trinh.

**Nấu thử:**
- testid: `screen-tasting`; `tasting-label` ⚠ chữ "Nấu thử" (m2-ui:93); `tasting-result` (`data-grade`); `tasting-back`, `tasting-buy`, `tasting-retry`, `tasting-exit`, `tasting-unlocked`, `tasting-not-yet`; `panel-kitchen`.
- ⚠ Không được có `kitchen-back` và `abandon-dish` (m2-ui kiểm là không có).
- Bếp bên trong dùng chung bộ giải của helpers (`minigame-stage[data-type="chon"]`, `shelf-*`, `chon-done`, `board`, `playBoard`, `finish-dish`).
- e2e phủ: m2-ui, m4-rare (mở món hiếm), shop.

**Việc hôm nay:**
- `screen-quests`.
- `quest-<i>` có `data-id`, `data-target`, `data-progress` (checkin-quests); tour nhắm `quest-0`.
- `quest-claim-<i>`: ⚠ chữ "Đã nhận" (checkin-quests:164); `disabled`. Tour chọn lần lượt `[data-testid^="quest-claim-"]:not([disabled])`, `quest-claim-0`, rồi `[data-testid^="quest-claim-"]`.
- `quest-reroll-<i>` (`disabled`; tour).
- `daily-chest-card` (tour); `daily-chest` (`disabled`, hanh-trinh).
- Hộp xác nhận `confirm-*`.
- ⚠ `tour.e2e:741-748` kiểm vùng sáng ôm đúng `quest-claim-1` và `quest-reroll-0`, sai lệch ≤ 1,5px.
- e2e phủ: checkin-quests, m2-meta, m2-ui, stability, tour, hanh-trinh.

**Hộp thư:**
- `screen-mail`.
- `mail-list` (tour), `mail-item-<id>`.
- `mail-claim-<id>`: ⚠ tour nhắm `button[data-testid^="mail-claim-"]:not([data-testid="mail-claim-all"])`, nên phải là thẻ `button`.
- `mail-claim-all` (review-m2; tour; `disabled` ở hanh-trinh).
- e2e phủ: review-m2, m2-ui, stability, hanh-trinh.

**Sự kiện:**
- `screen-event`: ⚠ chữ "04:00 ngày 12/11/2026" lúc sự kiện sắp diễn ra (event-2011:167).
- `event-tem` (`data-amount`), `event-checkin-claim`, `event-quest-<id>`, `event-quest-claim-<id>`.
- `event-recipe-<món>`: ⚠ có `.is-owned` khi đã nhận; chữ "Tri ân 20/11 · 2026", "nhận công thức".
- `event-exchange-<id>`, `event-exchange-item-<id>`.
- `event-chain-step` (`data-step`): ⚠ chữ "Mở hàng một ca hôm nay".
- `event-grace-chain` (review-m2): ⚠ phần tử `p.meta-hint.ev-grace-note`, xem mục 9.1.
- `chain-claim-tri_an_20_11_chuoi-4`.
- e2e phủ: event-2011, m2-meta, review-m2, m2-ui, hanh-trinh.

**Lên chặng:**
- `screen-stage-up` (`data-eligible`), `stage-conditions`, `stage-cond-<id>`, `stage-up-locked`, `post-goals`.
- e2e phủ: m2-ui (soát bố cục 360×740), hanh-trinh.

**Sổ công thức:**
- `screen-recipe-book`.
- `recipe-book-tab-mon`, `recipe-book-tab-tu` (tour khoanh từ tab này tới tab kia).
- `book-recipe-<món>`:
  - `data-status` (`owned`/`teaser`…), `data-cooks`, `data-best`, `data-flawless`.
  - ⚠ chữ "Có sẵn", "Công thức hiếm", "Tri ân 20/11 · 2026".
  - Tour dùng bộ chọn `[data-testid^="book-recipe-"]`.
- `book-open-<món>` (tour; stability).
- `book-rare-<món>`: ⚠ chữ "Mảnh n/3" (m4-rare:139).
- `book-taste-<món>`, `book-level-<món>`, `book-cooks-<món>`, `book-best-<món>`, `book-flawless-<món>`, `book-hiem-cost-<món>`.
- Chi tiết món: `recipe-detail`, `recipe-detail-close`, `recipe-detail-ing-<id>` (test kiểm **không** lộ nguyên liệu bẫy), `recipe-detail-step-<id>`.
- Sổ từ: `dialect-list`; `dialect-<món>` ⚠ chữ "trà tắc … trà quất", "nâu đá".
- e2e phủ: incident-notebook, m4-rare, stability, hanh-trinh.

**Sổ tay nghề:**
- `screen-notebook`.
- `notebook-progress` (`data-total`, `data-unlocked`).
- `notebook-tab-<nhóm>` (`data-dot`).
- `notebook-group-<nhóm>`, `notebook-claim-<nhóm>`, `notebook-claimed-<nhóm>`.
- `notebook-tip-<id>`: thẻ khóa có `data-unlocked="false"`, ⚠ chữ "Cách mở: " (incident-notebook:207).
- `notebook-featured`, `notebook-toast`.
- e2e phủ: incident-notebook, stability, hanh-trinh.

**Cài đặt:**
- Sao lưu:
  - `screen-settings`, `settings-backup`.
  - `backup-copy`, `backup-copy-again`; `backup-copy-status` (`data-copied`, chữ).
  - `backup-last`: ⚠ chữ "Chưa sao lưu", "Lần sao lưu gần nhất: dd/mm/yyyy hh:mm".
  - `backup-code-modal`, `backup-code`, `backup-done`, `backup-download`.
  - `backup-import`, `backup-import-modal`, `backup-input`, `backup-check`.
  - `backup-error`: ⚠ chữ "Chưa có mã", "sai hoặc thiếu ký tự", "không phải mã sao lưu".
  - `backup-preview`: `data-shop`, `data-day`, `data-wallet`, `data-chang`, `data-recipes`; ⚠ chữ "Bản hiện tại".
  - `backup-confirm`: ⚠ chữ đúng bằng "Dùng bản này" hoặc "Vẫn dùng bản này" (save-safety).
  - `backup-newer` (chữ), `backup-change`, `backup-cancel`.
  - Bản lưu đã cất: `archive-list`, `archive-restore-*`, `broken-archives` (chữ).
- Đặt lại game: `reset-game`, `reset-step1` (⚠ chữ "không bị xóa"), `reset-step2`, `reset-next`, `reset-confirm`, `reset-cancel`.
- Thiết lập: `setting-volume` và `setting-volume-value` (⚠ chữ "50%"), `setting-sound`, `setting-tips`, `setting-assistCash`, `setting-incident-<mức>` (`aria-checked`), `setting-tour`.
- `app-version`: ⚠ chữ chứa số phiên bản.
- Giới thiệu: `open-about`, `about-close`; `about-modal` ⚠ chữ "hư cấu", "số liệu minh họa", "không liên quan tới thương hiệu".
- Cài game, chơi offline: `install-app`, `install-hint` (⚠ chữ), `install-hint-ok`, `offline-state` (⚠ chữ "sẵn sàng chơi khi không có mạng").
- e2e phủ: pwa-backup, save-safety, review-m3-ux, iphone-overlays, stability, tour, hanh-trinh.

**Hướng dẫn và Cách chơi:**
- `help-button`, `help-sheet`.
- `help-replay`: ⚠ chữ là tên tour của màn, ví dụ "Quầy · Order", "Tổng kết ca", "Ca bán".
- `help-how`; `how-to-play` ⚠ chữ "Order … Thanh toán … Tính tiền … Làm đồ"; `how-card-<id>` (số thẻ = `HOW_TO_PLAY.length`).
- `help-reset`, `help-reset-confirm`, `help-reset-cancel`, `help-reset-done`, `help-back`, `help-close`.
- e2e phủ: tour.

**Tổng kết:**
- `summary`.
- ⚠ helpers `readLedger` và `checkLedger` đọc `[data-testid="summary"] table.ledger`:
  - mỗi `tr` gồm 2 ô `td`, ô đầu ghi nhãn, so bằng `STRINGS.summary.tips`, `eventIn`, `eventOut`;
  - dòng lãi là `tr.total`;
  - các dòng cộng lại phải bằng lãi.
- `summary-profit` (`data-amount`, chữ có số).
- `summary-drawer-diff`: ⚠ chữ đúng bằng "0đ" (one-shift:41).
- `summary-tip-rule` ⚠ chữ; `summary-event-money` gồm các `li[data-event]` có `data-money`, ⚠ chữ "Giải Nhất|Khuyến khích…", "Chưa có giải", "Tái phạm lỗi …".
- `summary-incident` (`data-incident`, `data-choice`, chữ).
- `summary-quests`, `summary-event-chain`, `summary-day-event` (`data-event`), `next-day`.
- ⚠ `tour.e2e:613-615`: `.summary-screen [help-button]` trúng chạm khi cuộn tới đáy.
- ⚠ Tour `tong_ket` nhắm `['.ledger .total', '.ledger']`, `summary-drawer-diff`, `summary-stars`, `summary-reviews`, `next-day`.
- e2e phủ: one-shift, subpath, checkin-quests, event-2011, incident-notebook, m4-tip-events, m4-tip-events-attp, tour, hanh-trinh (qua helpers `playShiftUi`).

**Gánh hàng và Lựa hàng:**
- `screen-market`.
- `market-intro` (`data-stall`): ⚠ tour `lua_hang` nhắm `[data-testid="market-intro"] .npc-talk` và `.market-goods`.
- `stall-start`: ⚠ chữ "Lựa tiếp" khi đang lựa dở (m4-rare:208); tour `requires`.
- `stall-locked`.
- `market-stage` (`data-stall`) chứa `minigame-stage[data-type="chon"]`: ⚠ m4-rare đếm `[data-testid^="shelf-"].chon-cell` đúng bằng 9.
- `market-result` (`data-score`, `data-got`).
- `market-got-<id>`: ⚠ chữ "+n phần <tên>".
- `market-fragment`, `market-tip` (lớp `.incident-tip`), `market-done`, `market-back`, `confirm-*`.
- e2e phủ: m4-rare, iphone-overlays.

**Hộp tình huống trong ca:** đã ghi ở mục 6. Kiểu nền của hộp chuyển sang đầu `css/sheet.css`; e2e phủ: incident-notebook, m4-tip-events-attp, helpers.

### 9.4 Soát chung trên các màn ngoài ca và tệp e2e phủ màn nào

Những e2e soát chung trên nhiều màn:

- `m2-ui` (360×740): bảng điểm danh, Chuẩn bị, Chợ Công Thức đủ 3 tab, Việc hôm nay, Hộp thư, Sự kiện, Lên chặng. Đòi không tràn ngang, chữ ≥ 14px, vùng chạm ≥ 44px với `button, a, input, select, [role=button], summary`.
- `incident-notebook` (360×740): cũng soát như trên ở Chuẩn bị, Sổ tay nghề, Sổ công thức, chi tiết món, Sổ từ và hộp tình huống.
- `pwa-backup`: cũng soát như trên ở Cài đặt và Giới thiệu.
- `hanh-trinh`: báo lỗi khi chữ < 13px, vùng chạm < 44px, có chữ "undefined/NaN/{biến}", hoặc trang tràn ngang.
- `iphone-overlays`: `measure()` dùng `elementFromPoint` ở tâm và 4 mép mỗi nút: nút Cài đặt, Chợ (tab Nâng cấp), lựa chọn sự kiện ngày, Gánh hàng và Lựa hàng.
- ⚠ `stability`: chuyển nhanh 20 vòng giữa Chuẩn bị và các màn con. Sau đó số bộ nghe trên bus, trên window/document, số phần tử bị tách khỏi trang còn giữ trong bộ nhớ và **số vòng `requestAnimationFrame` đang chạy ở màn Chuẩn bị** phải giữ nguyên. Hoạt ảnh JS mới ở màn Chuẩn bị phải tự dừng và tự dọn khi rời màn.

| Tệp e2e | Màn ngoài ca phủ |
|---|---|
| `checkin-quests` | Mở đầu, Chuẩn bị (`data-dot`, lùi giờ), Điểm danh, Việc hôm nay, Tổng kết (`summary-quests`) |
| `event-2011` | Mở đầu, Chuẩn bị (thẻ sự kiện ở các pha), Điểm danh, Sự kiện, chuỗi sự kiện, Tổng kết |
| `m2-meta` | Mở đầu, Chuẩn bị, Điểm danh, Chợ Công Thức (mua món, dù), Việc hôm nay, Sự kiện |
| `m2-ui` | Nấu thử, Chuẩn bị (sự kiện ngày + Phiếu Chợ Sớm), soát 360×740 các màn M2 + Lên chặng |
| `review-m2` | Mở đầu, Chuẩn bị (`prep-spoons`, thẻ sự kiện ân hạn), Hộp thư, Sự kiện, `chain-claim-*`, dải Giờ giả, khóa tab |
| `stability` | Chuẩn bị ↔ Sổ tay nghề, Sổ công thức (+ chi tiết, Sổ từ), Cài đặt (+ Giới thiệu), Chợ, Việc hôm nay, Hộp thư, Điểm danh |
| `m4-rare` | Chuẩn bị (gánh hàng, kho hiếm, mảnh), Gánh hàng / Lựa hàng, Nấu thử món hiếm, Sổ công thức (Công thức hiếm), hộp mời lên chặng |
| `shop` | Chuẩn bị, Chợ Công Thức (món, nâng cấp, dù), Nấu thử (`tasting-buy`) |
| `incident-notebook` | Chuẩn bị (lưới 7 ô, `data-dot`, sổ ghi nợ), Sổ tay nghề, Sổ công thức, Tổng kết (`summary-incident`), hộp tình huống |
| `pwa-backup` | Mở đầu (`.title-shop`), Chuẩn bị (nhắc sao lưu, "Có bản mới"), Cài đặt, Điểm danh |
| `save-safety`, `review-m3-ux` | Mở đầu, Cài đặt (mã sao lưu, bản đã cất), Chuẩn bị |
| `iphone-overlays` | Cài đặt, Chợ (Nâng cấp), Chuẩn bị (sự kiện ngày), Gánh hàng / Lựa hàng |
| `tour` | Mở đầu, Chuẩn bị, Điểm danh, Cài đặt (`setting-tour`), Chợ (nút "?"), Việc hôm nay (vùng sáng), Tổng kết, Hướng dẫn / Cách chơi |
| `one-shift`, `subpath` | Mở đầu, Chuẩn bị (`prep-day`), Tổng kết (`summary-profit`, `summary-drawer-diff`), `next-day` |
| `m4-tip-events`, `m4-tip-events-attp` | Tổng kết (sổ lãi lỗ, tiền sự kiện, luật tip), Chuẩn bị (thẻ ATTP, `day-event-warn`), hộp tình huống |
| `hanh-trinh` (chạy tay) | Toàn bộ màn ngoài ca |
