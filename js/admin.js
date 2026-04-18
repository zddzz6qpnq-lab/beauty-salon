/**
 * admin.js
 * 管理画面：予約一覧の取得・表示・フィルター
 */

const GAS_ENDPOINT = 'YOUR_GAS_ENDPOINT_URL';

// ===== デモデータ =====
function generateDemoData() {
  const menus = ['カット', 'カラー', 'パーマ', 'ヘッドスパ', 'カット＋カラー'];
  const names = ['山田 花子', '佐藤 美咲', '田中 亜子', '鈴木 恵', '木村 由紀', '中村 聡子'];
  const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled'];
  const notes = ['初めてのご来店', '', 'ショートにしたい', '', 'ダメージが気になる'];
  const data = [];
  const today = new Date();

  for (let i = -3; i <= 14; i++) {
    if (Math.random() < 0.4) continue;
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateAdmin(d);
    const hour = 10 + Math.floor(Math.random() * 8);
    const timeStr = `${String(hour).padStart(2,'0')}:00`;
    data.push({
      datetime: `${dateStr} ${timeStr}`,
      name: names[Math.floor(Math.random() * names.length)],
      phone: `090-${Math.floor(1000+Math.random()*8999)}-${Math.floor(1000+Math.random()*8999)}`,
      menu: menus[Math.floor(Math.random() * menus.length)],
      note: notes[Math.floor(Math.random() * notes.length)],
      receivedAt: formatDateAdmin(new Date(d.getTime() - Math.random() * 7 * 86400000)) + ' ' + `${String(Math.floor(8+Math.random()*14)).padStart(2,'0')}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }
  return data.sort((a, b) => a.datetime.localeCompare(b.datetime));
}

function formatDateAdmin(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===== データ取得 =====
async function fetchReservations() {
  if (!GAS_ENDPOINT || GAS_ENDPOINT.includes('YOUR_GAS')) {
    return generateDemoData();
  }
  try {
    const res = await fetch(`${GAS_ENDPOINT}?action=list`);
    const data = await res.json();
    return data.reservations || [];
  } catch (e) {
    console.warn('GAS接続エラー（デモデータで表示）:', e);
    return generateDemoData();
  }
}

// ===== テーブル描画 =====
function renderTable(reservations) {
  const tbody = document.getElementById('tableBody');
  const today = formatDateAdmin(new Date());

  if (reservations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data-row">該当する予約はありません</td></tr>';
    return;
  }

  tbody.innerHTML = reservations.map(r => {
    const isToday = r.datetime.startsWith(today);
    const statusBadge = {
      confirmed: '<span class="badge badge-confirmed">確定</span>',
      cancelled: '<span class="badge badge-cancelled">キャンセル</span>',
      pending: '<span class="badge badge-pending">未確認</span>',
    }[r.status] || '<span class="badge badge-pending">未確認</span>';

    return `
      <tr class="${isToday ? 'today-row' : ''}">
        <td>${r.datetime}</td>
        <td>${r.name}</td>
        <td>${r.phone}</td>
        <td>${r.menu}</td>
        <td>${r.note || '—'}</td>
        <td>${r.receivedAt}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// ===== サマリー更新 =====
function updateSummary(reservations) {
  const today = formatDateAdmin(new Date());
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = formatDateAdmin(weekStart);
  const weekEndStr = formatDateAdmin(weekEnd);

  const thisWeek = reservations.filter(r =>
    r.datetime >= weekStartStr && r.datetime <= weekEndStr + ' 99:99' && r.status !== 'cancelled'
  ).length;
  const todayCount = reservations.filter(r =>
    r.datetime.startsWith(today) && r.status !== 'cancelled'
  ).length;
  const pending = reservations.filter(r => r.status === 'pending').length;

  document.getElementById('totalCount').textContent = thisWeek;
  document.getElementById('todayCount').textContent = todayCount;
  document.getElementById('pendingCount').textContent = pending;
}

// ===== フィルター =====
function applyFilter(reservations) {
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;
  const status = document.getElementById('filterStatus').value;

  return reservations.filter(r => {
    const dateStr = r.datetime.substring(0, 10);
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    if (status && r.status !== status) return false;
    return true;
  });
}

// ===== 初期化 =====
let allReservations = [];

async function init() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading-row">読み込み中...</td></tr>';

  allReservations = await fetchReservations();
  updateSummary(allReservations);
  renderTable(allReservations);
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('applyFilter').addEventListener('click', () => {
    const filtered = applyFilter(allReservations);
    renderTable(filtered);
  });

  document.getElementById('reloadBtn').addEventListener('click', init);
});
