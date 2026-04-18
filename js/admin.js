/**
 * 管理画面
 *
 * GAS_ENDPOINT と ADMIN_TOKEN を設定してください。
 * ADMIN_TOKEN は gas/Code.gs の ADMIN_TOKEN と同じ値にします。
 */
const GAS_ENDPOINT = 'YOUR_GAS_ENDPOINT_URL';
const ADMIN_TOKEN  = 'rosso-admin-2024';   // ← Code.gs と同じ値に変更

// ─────────────────────────────────────────
// 初期化
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function checkAuth() {
    const saved = sessionStorage.getItem('rosso_admin');
    if (saved === ADMIN_TOKEN) {
        showDashboard();
        return;
    }
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('authForm').addEventListener('submit', onAuthSubmit);
}

function onAuthSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('passwordInput').value;
    if (input === ADMIN_TOKEN) {
        sessionStorage.setItem('rosso_admin', input);
        document.getElementById('authSection').style.display = 'none';
        showDashboard();
    } else {
        document.getElementById('authError').style.display = 'block';
    }
}

// ─────────────────────────────────────────
// ダッシュボード表示
// ─────────────────────────────────────────
function showDashboard() {
    document.getElementById('dashboard').style.display = 'block';
    loadReservations();

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('rosso_admin');
        location.reload();
    });

    document.getElementById('refreshBtn').addEventListener('click', loadReservations);

    document.getElementById('filterDate').addEventListener('change', filterTable);
    document.getElementById('filterMenu').addEventListener('change', filterTable);
    document.getElementById('searchName').addEventListener('input', filterTable);
}

// ─────────────────────────────────────────
// 予約データ取得
// ─────────────────────────────────────────
let allReservations = [];

async function loadReservations() {
    setLoading(true);

    try {
        if (!GAS_ENDPOINT || GAS_ENDPOINT === 'YOUR_GAS_ENDPOINT_URL') {
            allReservations = generateDemoReservations();
        } else {
            const res  = await fetch(`${GAS_ENDPOINT}?action=admin&token=${ADMIN_TOKEN}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            allReservations = data.reservations || [];
        }

        // 新しい順に並べる
        allReservations.sort((a, b) => a.datetime < b.datetime ? -1 : 1);
        renderTable(allReservations);
        updateSummary(allReservations);

    } catch (err) {
        console.error(err);
        document.getElementById('tableBody').innerHTML =
            `<tr><td colspan="6" style="text-align:center;color:#c0634a;padding:40px;">
                データの取得に失敗しました。GASのURLとトークンを確認してください。
            </td></tr>`;
    } finally {
        setLoading(false);
    }
}

// ─────────────────────────────────────────
// テーブル描画
// ─────────────────────────────────────────
function renderTable(reservations) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (reservations.length === 0) {
        document.getElementById('tableBody').innerHTML =
            '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-sub);">該当する予約はありません</td></tr>';
        return;
    }

    const rows = reservations.map(r => {
        const slotDate = new Date(r.datetime.replace(' ', 'T'));
        const isPast   = slotDate < today;
        const rowClass = isPast ? 'row-past' : '';

        const [datePart, timePart] = r.datetime.split(' ');
        const [y, mo, d] = datePart.split('-').map(Number);
        const dayName = ['日','月','火','水','木','金','土'][new Date(y, mo-1, d).getDay()];
        const displayDate = `${y}/${String(mo).padStart(2,'0')}/${String(d).padStart(2,'0')}（${dayName}）`;

        return `
            <tr class="${rowClass}">
                <td class="td-date">${displayDate}<br><span class="td-time">${timePart}</span></td>
                <td class="td-name">${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.phone)}</td>
                <td><span class="menu-badge">${escapeHtml(r.menu)}</span></td>
                <td class="td-notes">${escapeHtml(r.notes || '—')}</td>
                <td class="td-created">${formatCreatedAt(r.createdAt)}</td>
            </tr>`;
    }).join('');

    document.getElementById('tableBody').innerHTML = rows;
}

function updateSummary(reservations) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDatePart(today);

    const todayCount   = reservations.filter(r => r.datetime.startsWith(todayStr)).length;
    const upcomingCount = reservations.filter(r => {
        const d = new Date(r.datetime.replace(' ', 'T'));
        d.setHours(0,0,0,0);
        return d >= today;
    }).length;

    document.getElementById('summaryTotal').textContent    = reservations.length;
    document.getElementById('summaryToday').textContent    = todayCount;
    document.getElementById('summaryUpcoming').textContent = upcomingCount;
}

// ─────────────────────────────────────────
// フィルター
// ─────────────────────────────────────────
function filterTable() {
    const dateVal  = document.getElementById('filterDate').value;
    const menuVal  = document.getElementById('filterMenu').value;
    const nameVal  = document.getElementById('searchName').value.trim().toLowerCase();

    const filtered = allReservations.filter(r => {
        if (dateVal && !r.datetime.startsWith(dateVal)) return false;
        if (menuVal && r.menu !== menuVal)               return false;
        if (nameVal && !r.name.toLowerCase().includes(nameVal)) return false;
        return true;
    });

    renderTable(filtered);
}

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────
function setLoading(isLoading) {
    document.getElementById('loadingIndicator').style.display = isLoading ? 'block' : 'none';
    document.getElementById('refreshBtn').disabled = isLoading;
}

function formatDatePart(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatCreatedAt(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// デモ用ダミーデータ
function generateDemoReservations() {
    const menus = ['カット', 'カラー', 'パーマ', 'ヘッドスパ', 'カット＋カラー'];
    const names = ['山田 花子', '田中 美咲', '鈴木 陽子', '佐藤 恵', '伊藤 里奈'];
    const phones = ['090-1234-5678', '080-2345-6789', '070-3456-7890', '090-4567-8901', '080-5678-9012'];
    const result = [];

    const today = new Date();
    for (let i = -3; i <= 14; i++) {
        if (Math.random() < 0.4) continue;
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (d.getDay() === 1) continue; // 月曜定休
        const hour = 9 + Math.floor(Math.random() * 9);
        const idx  = Math.floor(Math.random() * names.length);
        result.push({
            datetime:  `${formatDatePart(d)} ${String(hour).padStart(2,'0')}:00`,
            name:      names[idx],
            phone:     phones[idx],
            menu:      menus[Math.floor(Math.random() * menus.length)],
            notes:     Math.random() < 0.3 ? 'アレルギーあり（パラベン）' : '',
            createdAt: new Date(d.getTime() - 86400000 * 3).toISOString(),
        });
    }
    return result;
}
