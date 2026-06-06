/**
 * admin.js — ROSSO 管理画面（Supabase版）
 */

let allReservations = [];

function formatDateAdmin(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function fetchReservations() {
  const { data, error } = await window.sb
    .from('reservations')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

function renderTable(reservations) {
  const tbody = document.getElementById('tableBody');
  const today = formatDateAdmin(new Date());

  if (reservations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="no-data-row">該当する予約はありません</td></tr>';
    return;
  }

  tbody.innerHTML = reservations.map(r => {
    const isToday = r.date === today;
    const statusBadge = {
      confirmed: '<span class="badge badge-confirmed">確定</span>',
      cancelled: '<span class="badge badge-cancelled">キャンセル</span>',
      pending:   '<span class="badge badge-pending">未確認</span>',
    }[r.status] || '<span class="badge badge-pending">未確認</span>';

    const cancelBtn = r.status !== 'cancelled'
      ? `<button class="btn-cancel" onclick="cancelReservation('${r.id}')">キャンセル</button>`
      : '—';

    const receivedAt = r.received_at
      ? new Date(r.received_at).toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
      : '—';

    return `
      <tr class="${isToday ? 'today-row' : ''}">
        <td>${r.date.replace(/-/g, '/')} ${r.time}</td>
        <td>${r.name}</td>
        <td>${r.phone}</td>
        <td>${r.menu}</td>
        <td>${r.note || '—'}</td>
        <td>${receivedAt}</td>
        <td>${statusBadge}</td>
        <td>${cancelBtn}</td>
      </tr>
    `;
  }).join('');
}

async function cancelReservation(id) {
  if (!confirm('この予約をキャンセルしますか？')) return;

  const { error } = await window.sb
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    alert('キャンセルに失敗しました: ' + error.message);
    return;
  }

  await init();
}

function updateSummary(reservations) {
  const today = formatDateAdmin(new Date());
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = formatDateAdmin(weekStart);
  const weekEndStr = formatDateAdmin(weekEnd);

  const thisWeek = reservations.filter(r =>
    r.date >= weekStartStr && r.date <= weekEndStr && r.status !== 'cancelled'
  ).length;
  const todayCount = reservations.filter(r =>
    r.date === today && r.status !== 'cancelled'
  ).length;
  const pending = reservations.filter(r => r.status === 'pending').length;

  document.getElementById('totalCount').textContent = thisWeek;
  document.getElementById('todayCount').textContent = todayCount;
  document.getElementById('pendingCount').textContent = pending;
}

function applyFilter(reservations) {
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;
  const status = document.getElementById('filterStatus').value;

  return reservations.filter(r => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (status && r.status !== status) return false;
    return true;
  });
}

async function init() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row">読み込み中...</td></tr>';

  try {
    allReservations = await fetchReservations();
    updateSummary(allReservations);
    renderTable(allReservations);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data-row">読み込みに失敗しました: ${e.message}</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('applyFilter').addEventListener('click', () => {
    const filtered = applyFilter(allReservations);
    renderTable(filtered);
  });

  document.getElementById('reloadBtn').addEventListener('click', init);
});
