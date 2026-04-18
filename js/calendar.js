/**
 * 週表示カレンダー
 *
 * GAS_ENDPOINT を reservation.js 側で window.GAS_ENDPOINT に設定してから
 * このファイルを読み込んでください。
 */

const BUSINESS_HOURS = { start: 9, end: 18 };   // 9:00〜17:00 (最終スロット)
const BUSINESS_DAYS  = [2, 3, 4, 5, 6, 7];      // 火〜日（0=日, 1=月 ... ※後述でISO週対応）
const CLOSED_WEEKDAYS = [1];                      // 定休日: 月曜（getDay()の値: 0=日, 1=月）
const BOOKING_BUFFER_HOURS = 2;                   // 予約は2時間前まで受付

let currentWeekStart = null;   // 表示中の週の月曜
let bookedSlots = [];          // GASから取得した予約済み日時リスト
let selectedSlot = null;       // 選択中のスロット文字列 "YYYY-MM-DD HH:00"

// ─────────────────────────────────────────
// 初期化
// ─────────────────────────────────────────
function initCalendar() {
    currentWeekStart = getThisWeekTuesday(new Date());  // 今週火曜を起点に
    renderWeekNav();
    loadAndRender();

    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        currentWeekStart = addDays(currentWeekStart, -7);
        renderWeekNav();
        loadAndRender();
    });

    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        currentWeekStart = addDays(currentWeekStart, 7);
        renderWeekNav();
        loadAndRender();
    });
}

// ─────────────────────────────────────────
// 日付ユーティリティ
// ─────────────────────────────────────────
function getThisWeekTuesday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // 今日が火曜〜日曜なら今週火曜、月曜なら先週火曜からにする
    const day = d.getDay(); // 0=日 1=月 2=火...
    const diffToTuesday = day === 0 ? -5 : day === 1 ? -6 : -(day - 2);
    d.setDate(d.getDate() + diffToTuesday);
    return d;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDatetime(date, hour) {
    return `${formatDate(date)} ${String(hour).padStart(2, '0')}:00`;
}

function parseSlotDate(slotStr) {
    // "YYYY-MM-DD HH:00" → Date
    const [datePart, timePart] = slotStr.split(' ');
    const [y, mo, d] = datePart.split('-').map(Number);
    const [h] = timePart.split(':').map(Number);
    return new Date(y, mo - 1, d, h, 0, 0);
}

// ─────────────────────────────────────────
// 週ナビゲーション表示
// ─────────────────────────────────────────
function renderWeekNav() {
    const endDay = addDays(currentWeekStart, 5); // 火〜日の6日間
    const startLabel = `${currentWeekStart.getMonth() + 1}/${currentWeekStart.getDate()}`;
    const endLabel   = `${endDay.getMonth() + 1}/${endDay.getDate()}`;
    document.getElementById('weekLabel').textContent =
        `${currentWeekStart.getFullYear()}年 ${startLabel}（火）〜 ${endLabel}（日）`;

    // 過去週には戻れないようにする
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeekTue = getThisWeekTuesday(today);
    document.getElementById('prevWeekBtn').disabled =
        currentWeekStart <= thisWeekTue;
}

// ─────────────────────────────────────────
// GASから予約済みスロットを取得してレンダリング
// ─────────────────────────────────────────
async function loadAndRender() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '<div class="calendar-loading">カレンダーを読み込み中...</div>';

    const endDay = addDays(currentWeekStart, 5);
    const start  = formatDate(currentWeekStart);
    const end    = formatDate(endDay);

    try {
        const endpoint = window.GAS_ENDPOINT;
        if (!endpoint || endpoint === 'YOUR_GAS_ENDPOINT_URL') {
            // デモモード: ランダムで空き/予約済みを表示
            bookedSlots = generateDemoSlots(currentWeekStart, endDay);
        } else {
            const res  = await fetch(`${endpoint}?action=slots&start=${start}&end=${end}`);
            const data = await res.json();
            bookedSlots = data.booked || [];
        }
    } catch (e) {
        console.warn('GAS取得失敗（デモモードで表示）:', e);
        bookedSlots = generateDemoSlots(currentWeekStart, endDay);
    }

    renderCalendar();
}

// デモ用: 約30%の確率で予約済みにする
function generateDemoSlots(startDay, endDay) {
    const slots = [];
    const d = new Date(startDay);
    while (d <= endDay) {
        if (!CLOSED_WEEKDAYS.includes(d.getDay())) {
            for (let h = BUSINESS_HOURS.start; h < BUSINESS_HOURS.end; h++) {
                if (Math.random() < 0.3) slots.push(formatDatetime(d, h));
            }
        }
        d.setDate(d.getDate() + 1);
    }
    return slots;
}

// ─────────────────────────────────────────
// カレンダーをHTMLに描画
// ─────────────────────────────────────────
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const dayNames = ['火', '水', '木', '金', '土', '日'];
    const days = [];
    for (let i = 0; i < 6; i++) days.push(addDays(currentWeekStart, i));

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ── ヘッダー行 ──
    let html = '<div class="cal-header-row">';
    html += '<div class="cal-time-header"></div>';
    days.forEach((day, i) => {
        const isToday   = day.getTime() === today.getTime();
        const isSat     = day.getDay() === 6;
        const isClosed  = CLOSED_WEEKDAYS.includes(day.getDay());
        let cls = 'cal-day-header';
        if (isSat)    cls += ' saturday';
        if (isToday)  cls += ' today';
        if (isClosed) cls += ' closed-header';
        html += `<div class="${cls}">
            ${dayNames[i]}<br>
            <span class="date-num">${day.getMonth() + 1}/${day.getDate()}</span>
        </div>`;
    });
    html += '</div>';

    // ── 時間行 ──
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
        html += '<div class="cal-row">';
        html += `<div class="cal-time-cell">${hour}:00</div>`;

        days.forEach(day => {
            const isClosed = CLOSED_WEEKDAYS.includes(day.getDay());
            if (isClosed) {
                html += '<div class="cal-slot closed">定休</div>';
                return;
            }

            const datetime  = formatDatetime(day, hour);
            const slotDate  = parseSlotDate(datetime);
            const cutoff    = new Date(now.getTime() + BOOKING_BUFFER_HOURS * 60 * 60 * 1000);
            const isPast    = slotDate <= cutoff;
            const isBooked  = bookedSlots.includes(datetime);
            const isSelected = selectedSlot === datetime;

            let cls = 'cal-slot';
            let label = '';
            let dataAttr = '';

            if (isBooked) {
                cls += ' booked';
                label = '予約済';
            } else if (isPast) {
                cls += ' past';
                label = '－';
            } else if (isSelected) {
                cls += ' selected';
                label = '選択中';
                dataAttr = `data-slot="${datetime}"`;
            } else {
                cls += ' available';
                label = '空き';
                dataAttr = `data-slot="${datetime}"`;
            }

            html += `<div class="${cls}" ${dataAttr}>${label}</div>`;
        });

        html += '</div>';
    }

    grid.innerHTML = html;

    // クリックイベント
    grid.querySelectorAll('.cal-slot.available, .cal-slot.selected').forEach(el => {
        el.addEventListener('click', () => {
            const slot = el.dataset.slot;
            if (!slot) return;
            selectSlot(slot);
        });
    });
}

// ─────────────────────────────────────────
// スロット選択
// ─────────────────────────────────────────
function selectSlot(datetime) {
    selectedSlot = datetime;
    renderCalendar();

    // フォームに日時をセット
    const [datePart, timePart] = datetime.split(' ');
    const [y, mo, d] = datePart.split('-').map(Number);
    const displayDate = `${y}年${mo}月${d}日（${getWeekdayName(new Date(y, mo-1, d))}）${timePart}〜`;

    document.getElementById('selectedSlotDisplay').textContent = displayDate;
    document.getElementById('selectedDatetimeInput').value = datetime;

    // フォームセクションを表示してスクロール
    const formSection = document.getElementById('bookingFormSection');
    formSection.classList.remove('hidden');
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getWeekdayName(date) {
    return ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
}

// ─────────────────────────────────────────
// 予約完了後にカレンダーを更新する
// ─────────────────────────────────────────
function markSlotAsBooked(datetime) {
    bookedSlots.push(datetime);
    selectedSlot = null;
    renderCalendar();
}
