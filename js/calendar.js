/**
 * calendar.js
 * 週表示カレンダーUI
 * GASエンドポイントが未設定の場合はデモデータで動作する
 */

// ===== 設定 =====
const BUSINESS_START_HOUR = 10; // 営業開始時間
const BUSINESS_END_HOUR = 19;   // 営業終了時間（最終受付18時＝18:00セルまで表示）
const CLOSED_DAY = 2;           // 定休日: 0=日, 1=月, 2=火（火曜定休）
const SLOT_DURATION = 60;       // 予約単位（分）

// ===== 状態管理 =====
let currentWeekStart = getMonday(new Date());
let selectedDateTime = null; // { date: '2024-12-01', time: '10:00', label: '12月1日(日) 10:00〜' }
let bookedSlots = [];         // GASから取得した予約済みスロット ['2024-12-01 10:00', ...]

// ===== 月曜日を取得 =====
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ===== 日付フォーマット =====
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = days[date.getDay()];
  return `${m}月${d}日(${w})`;
}

// ===== 週ラベル更新 =====
function updateWeekLabel() {
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);
  const label = `${currentWeekStart.getMonth()+1}月${currentWeekStart.getDate()}日 〜 ${end.getMonth()+1}月${end.getDate()}日`;
  document.getElementById('weekLabel').textContent = label;
}

// ===== カレンダーを描画 =====
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();

  const days = ['月', '火', '水', '木', '金', '土', '日'];
  const dayColors = ['', '', '', '', '', 'saturday', 'sunday'];

  // ヘッダー行（時間列）
  const timeHeader = document.createElement('div');
  timeHeader.className = 'cal-header time-col';
  timeHeader.textContent = '時間';
  grid.appendChild(timeHeader);

  // ヘッダー行（曜日・日付）
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const isToday = d.getTime() === today.getTime();
    const dayOfWeek = d.getDay();

    const header = document.createElement('div');
    header.className = `cal-header ${dayColors[i]} ${isToday ? 'today-header' : ''}`;
    header.innerHTML = `<span class="day-name">${days[i]}</span><span class="day-date">${d.getMonth()+1}/${d.getDate()}</span>`;
    grid.appendChild(header);
  }

  // 時間行
  for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
    const timeLabel = document.createElement('div');
    timeLabel.className = 'cal-time-label';
    timeLabel.textContent = `${h}:00`;
    grid.appendChild(timeLabel);

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      const timeStr = `${String(h).padStart(2, '0')}:00`;
      const slotKey = `${dateStr} ${timeStr}`;
      const dayOfWeek = d.getDay();

      const cell = document.createElement('div');
      cell.dataset.date = dateStr;
      cell.dataset.time = timeStr;

      const isPast = d < today || (d.getTime() === today.getTime() && h <= now.getHours());
      const isClosed = dayOfWeek === CLOSED_DAY;
      const isBooked = bookedSlots.includes(slotKey);
      const isSelected = selectedDateTime && selectedDateTime.date === dateStr && selectedDateTime.time === timeStr;

      const inner = document.createElement('div');
      inner.className = 'cell-inner';

      if (isPast || isClosed) {
        cell.className = 'cal-cell closed';
        inner.textContent = isClosed ? '定休日' : '';
        inner.style.fontSize = '0.65rem';
        inner.style.color = '#ccc';
      } else if (isBooked) {
        cell.className = 'cal-cell booked';
        inner.innerHTML = '<span class="cell-booked-txt">×</span>';
      } else if (isSelected) {
        cell.className = 'cal-cell selected';
        inner.innerHTML = '<span class="cell-selected-txt">✓</span>';
      } else {
        cell.className = 'cal-cell available';
        inner.innerHTML = '<span class="cell-available-txt">○</span>';
        cell.addEventListener('click', () => selectSlot(dateStr, timeStr, d));
      }

      cell.appendChild(inner);
      grid.appendChild(cell);
    }
  }
}

// ===== スロット選択 =====
function selectSlot(dateStr, timeStr, dateObj) {
  const label = `${formatDateLabel(dateObj)} ${timeStr}〜`;
  selectedDateTime = { date: dateStr, time: timeStr, label };

  // 表示更新
  const display = document.getElementById('selectedTimeDisplay');
  display.textContent = `選択中：${label}`;
  display.style.display = 'block';

  // 次へボタンを表示
  const nextBtn = document.getElementById('goToStep3FromCal');
  if (nextBtn) nextBtn.style.display = 'block';

  renderCalendar();

  // ステップ2へ進むボタンを活性化
  if (typeof enableStep2Button === 'function') enableStep2Button();
}

// ===== GASから予約済みスロットを取得 =====
async function fetchBookedSlots() {
  const endpoint = window.GAS_ENDPOINT;
  if (!endpoint || endpoint.includes('YOUR_GAS')) {
    // デモモード：ランダムに予約済みを生成
    const demo = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
        if (Math.random() < 0.25) {
          demo.push(`${dateStr} ${String(h).padStart(2,'0')}:00`);
        }
      }
    }
    bookedSlots = demo;
    renderCalendar();
    return;
  }

  try {
    const res = await fetch(`${endpoint}?action=getSlots`);
    const data = await res.json();
    bookedSlots = data.bookedSlots || [];
  } catch (e) {
    console.warn('GAS接続エラー（デモモードで動作中）:', e);
    bookedSlots = [];
  }
  renderCalendar();
}

// ===== 週移動 =====
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('calendarGrid')) return;

  updateWeekLabel();
  fetchBookedSlots();

  document.getElementById('prevWeek').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekLabel();
    fetchBookedSlots();
  });

  document.getElementById('nextWeek').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekLabel();
    fetchBookedSlots();
  });
});
