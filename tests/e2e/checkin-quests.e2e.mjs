// E2E điểm danh + Việc hôm nay với đồng hồ giả (page.clock), giờ Việt Nam, ngày đổi lúc 04:00:
//   lần đầu mở game → bảng điểm danh tự hiện → nhận ô 1; tải lại cùng ngày → không hiện lại;
//   03:59 hôm sau vẫn là ngày cũ, qua 04:00 (đang ở màn Chuẩn bị) → bảng tự hiện → nhận ô 2;
//   lùi đồng hồ 2 ngày → không nhận được, có dòng nhắc; giờ đúng lại → nhận tiếp được;
//   Việc hôm nay có 3 việc; chơi trọn 1 ca thật qua giao diện, xong việc "món không lỗi nguyên liệu" → bấm Nhận.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, playShiftUi } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { refIncomeFor } from '../../src/core/state.js'
import { vn } from '../helpers/meta-helpers.mjs'

// Seed 42: Việc hôm nay ngày 08/10/2026 có "N món không có lỗi nguyên liệu" (làm được trong ca ngày 1, 4 khách).
const SEED = 42
const QUEST = 'mon_du_nguyen_lieu'

// Chạy đồng hồ qua lượt kiểm tra 30 giây của màn Chuẩn bị (qua 04:00 thì làm mới, bật bảng điểm danh).
async function tickPrep(page) {
  await page.clock.runFor(31000)
}

async function checkinShown(page, ms = 1200) {
  return !!(await page.waitForSelector(T('checkin-popup'), { timeout: ms }).catch(() => null))
}

async function claimCheckin(page) {
  await page.waitForSelector(`${T('checkin-claim')}:not([disabled])`)
  await page.tap(T('checkin-claim'))
  await page.waitForSelector(T('checkin-popup'), { state: 'detached', timeout: 5000 })
}

// Vào màn khác rồi quay lại để màn Chuẩn bị vẽ lại theo giờ hiện tại.
async function reopenPrep(page) {
  await page.tap(T('open-quests'))
  await page.waitForSelector(T('screen-quests'))
  await page.tap(T('meta-back'))
  await page.waitForSelector(T('screen-prep'))
}

test('điểm danh qua mốc 04:00, khóa khi lùi giờ; Việc hôm nay xong trong ca và nhận thưởng', { timeout: 600000 }, async () => {
  const g = await openGame({ clock: { time: vn('2026-10-06T09:00') }, name: 'diem-danh-viec' })
  const { page, errors } = g
  try {
    // --- Lần đầu mở game: đặt tên xe → màn Chuẩn bị → bảng điểm danh tự hiện
    await page.goto(g.url(`/?seed=${SEED}&test=1`))
    await page.fill(T('shop-name-input'), 'Xe Điểm Danh')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    assert.ok(await checkinShown(page, 5000), 'lần đầu mở game phải hiện bảng điểm danh')
    await g.shot('diem-danh-lan-dau')
    assert.equal(await page.getAttribute(T('checkin-slot-0'), 'data-claimed'), 'false')
    assert.match(await page.textContent(T('checkin-claim')), /Ngày 1/)
    await claimCheckin(page)
    let s = await waitSave(page, st => st.checkin.next === 1)
    assert.equal(s.checkin.lastDay, '2026-10-06')
    assert.equal(s.seed, SEED)
    assert.ok(s.cosmetics.owned.includes('vien_khai_truong'), 'ô 1: viền biển xe "Khai Trương"')
    assert.equal(s.goldSpoons, 10, 'ô 1: 10 Muỗng Vàng')
    assert.equal(await page.getAttribute(T('open-checkin'), 'data-dot'), '0')

    // --- Tải lại cùng ngày: không hiện lại
    await page.reload()
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    assert.equal(await checkinShown(page), false, 'tải lại cùng ngày không được hiện lại bảng điểm danh')
    // mở tay vẫn xem được, nút nhận khóa
    await page.tap(T('open-checkin'))
    await page.waitForSelector(T('checkin-popup'))
    assert.equal(await page.isDisabled(T('checkin-claim')), true)
    assert.equal(await page.getAttribute(T('checkin-slot-0'), 'data-claimed'), 'true')
    await page.tap(T('checkin-close'))
    await page.waitForSelector(T('checkin-popup'), { state: 'detached' })

    // --- 03:59 hôm sau: vẫn ngày cũ
    await page.clock.setSystemTime(vn('2026-10-07T03:59'))
    await tickPrep(page)
    assert.equal(await checkinShown(page, 500), false, '03:59 vẫn là ngày cũ')
    // --- qua 04:00 giờ Việt Nam: bảng tự hiện khi đang ở màn Chuẩn bị, nhận ô 2
    await page.clock.setSystemTime(vn('2026-10-07T04:00'))
    await tickPrep(page)
    assert.ok(await checkinShown(page, 5000), 'qua 04:00 phải hiện bảng điểm danh ngày mới')
    assert.equal(await page.getAttribute(T('checkin-slot-1'), 'data-claimed'), 'false')
    await claimCheckin(page)
    s = await waitSave(page, st => st.checkin.next === 2)
    assert.equal(s.checkin.lastDay, '2026-10-07')
    assert.equal(s.items.phieu_cho_som, 1, 'ô 2: Phiếu Chợ Sớm')

    // --- sang ngày 08/10 (bảng hiện, để sau), rồi lùi đồng hồ máy 2 ngày
    await page.clock.setSystemTime(vn('2026-10-08T09:00'))
    await tickPrep(page)
    assert.ok(await checkinShown(page, 5000))
    await page.tap(T('checkin-close'))
    await page.waitForSelector(T('checkin-popup'), { state: 'detached' })
    await page.clock.setSystemTime(vn('2026-10-06T09:00'))
    await reopenPrep(page)
    await page.waitForSelector(T('rewind-note'))
    assert.match(await page.textContent(T('rewind-note')), /lùi/)
    assert.equal(await page.getAttribute(T('open-checkin'), 'data-dot'), '0')
    await page.tap(T('open-checkin'))
    await page.waitForSelector(T('checkin-popup'))
    await g.shot('diem-danh-lui-gio')
    assert.equal(await page.isDisabled(T('checkin-claim')), true, 'lùi giờ: không được nhận')
    assert.match(await page.textContent(T('checkin-note')), /lùi/)
    assert.equal(await page.getAttribute(T('checkin-note'), 'class'), 'ck-note is-warn')
    await page.tap(T('checkin-close'))
    await page.waitForSelector(T('checkin-popup'), { state: 'detached' })
    s = await readSave(page)
    assert.equal(s.checkin.next, 2, 'lùi giờ không nhận thêm ô')

    // --- giờ máy đúng lại: hết nhắc, nhận tiếp ô 3 của ngày 08/10
    await page.clock.setSystemTime(vn('2026-10-08T10:00'))
    await reopenPrep(page)
    assert.equal(await page.$(T('rewind-note')), null)
    await page.tap(T('open-checkin'))
    await claimCheckin(page)
    s = await waitSave(page, st => st.checkin.next === 3)
    assert.equal(s.checkin.lastDay, '2026-10-08')

    // --- Việc hôm nay: 3 việc (Quầy, Bếp, Chất lượng), chưa xong thì chưa nhận được
    await page.tap(T('open-quests'))
    await page.waitForSelector(T('quest-2'))
    assert.equal(await page.$(T('quest-3')), null, 'đúng 3 việc')
    const ids = []
    for (let i = 0; i < 3; i++) ids.push(await page.getAttribute(T('quest-' + i), 'data-id'))
    assert.deepEqual(ids.map(id => DATA.QUESTS.find(q => q.id === id).group), ['quay', 'bep', 'chat_luong'])
    const qi = ids.indexOf(QUEST)
    assert.ok(qi >= 0, `seed ${SEED} ngày 08/10 phải có việc ${QUEST}: ${ids.join(', ')}`)
    const target = Number(await page.getAttribute(T('quest-' + qi), 'data-target'))
    assert.equal(await page.getAttribute(T('quest-' + qi), 'data-progress'), '0')
    assert.equal(await page.isDisabled(T('quest-claim-' + qi)), true)
    await g.shot('viec-hom-nay')
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))

    // --- Chơi trọn ca ngày 1 qua giao diện
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const served = await playShiftUi(g, { useClock: true })
    assert.ok(served.length >= target, `phục vụ ${served.length} khách`)
    await page.waitForSelector(T('summary'))
    await page.waitForSelector(T('summary-quests'))
    s = await waitSave(page, st => !st.shift)
    const q = s.daily.quests[qi]
    assert.equal(q.id, QUEST)
    assert.ok(q.progress >= q.target, `việc chưa xong: ${q.progress}/${q.target}`)
    assert.equal(q.claimed, false)
    await page.tap(T('next-day'))
    await page.waitForSelector(T('screen-prep'))
    assert.equal(await checkinShown(page, 800), false, 'đã nhận hôm nay: không bật lại bảng')

    // --- Nhận thưởng việc đã xong
    assert.ok(Number(await page.getAttribute(T('open-quests'), 'data-dot')) >= 1, 'chấm đỏ Việc hôm nay')
    await page.tap(T('open-quests'))
    await page.waitForSelector(`${T('quest-claim-' + qi)}:not([disabled])`)
    assert.equal(await page.getAttribute(T('quest-' + qi), 'data-progress'), String(target))
    const before = await readSave(page)
    await page.tap(T('quest-claim-' + qi))
    await page.waitForSelector(`${T('quest-claim-' + qi)}[disabled]`)
    const after = await waitSave(page, st => st.daily.quests[qi].claimed)
    const money = Math.ceil(0.2 * refIncomeFor({ data: DATA }, before.day) / 1000) * 1000
    assert.equal(after.wallet, before.wallet + money, 'thưởng 0,2 thu nhập tham chiếu')
    assert.equal(after.reputation, before.reputation + 5, 'thưởng +5 danh tiếng')
    assert.equal(after.stats.questsClaimed, before.stats.questsClaimed + 1)
    assert.match(await page.textContent(T('quest-claim-' + qi)), /Đã nhận/)
    await g.shot('viec-da-nhan')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
