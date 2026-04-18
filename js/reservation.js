/**
 * 予約フォーム送信 & GAS連携
 *
 * ▼ 設定：GASデプロイ後にURLを貼り付けてください
 */
window.GAS_ENDPOINT = 'YOUR_GAS_ENDPOINT_URL';

document.addEventListener('DOMContentLoaded', () => {
    // カレンダー初期化
    initCalendar();

    // フォーム送信
    const form = document.getElementById('reservationForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

// ─────────────────────────────────────────
// フォーム送信処理
// ─────────────────────────────────────────
async function handleSubmit(e) {
    e.preventDefault();

    const datetime = document.getElementById('selectedDatetimeInput').value;
    if (!datetime) {
        showError('カレンダーから日時を選択してください。');
        return;
    }

    const payload = {
        datetime: datetime,
        name:     document.getElementById('resName').value.trim(),
        phone:    document.getElementById('resPhone').value.trim(),
        menu:     document.getElementById('resMenu').value,
        notes:    document.getElementById('resNotes').value.trim(),
    };

    if (!payload.name || !payload.phone || !payload.menu) {
        showError('お名前・電話番号・メニューは必須項目です。');
        return;
    }

    hideError();
    setSubmitting(true);

    try {
        const result = await postReservation(payload);

        if (result.success) {
            showSuccess(payload);
            markSlotAsBooked(payload.datetime);
        } else {
            showError(result.message || '予約の送信に失敗しました。もう一度お試しください。');
        }
    } catch (err) {
        console.error(err);
        showError('通信エラーが発生しました。電波の状態を確認してもう一度お試しください。');
    } finally {
        setSubmitting(false);
    }
}

// ─────────────────────────────────────────
// GAS POSTリクエスト
// Content-Type: text/plain で送信することで CORS preflight を回避
// ─────────────────────────────────────────
async function postReservation(payload) {
    const endpoint = window.GAS_ENDPOINT;

    if (!endpoint || endpoint === 'YOUR_GAS_ENDPOINT_URL') {
        // デモモード: 疑似レスポンス
        await new Promise(r => setTimeout(r, 1200));
        return { success: true };
    }

    const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

// ─────────────────────────────────────────
// UI操作
// ─────────────────────────────────────────
function setSubmitting(isLoading) {
    const btn = document.getElementById('submitBtn');
    btn.disabled = isLoading;
    btn.textContent = isLoading ? '送信中...' : '予約を確定する';
}

function showError(msg) {
    const el = document.getElementById('formError');
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
    document.getElementById('formError').style.display = 'none';
}

function showSuccess(payload) {
    const [datePart, timePart] = payload.datetime.split(' ');
    const [y, mo, d] = datePart.split('-').map(Number);
    const displayDate = `${y}年${mo}月${d}日 ${timePart}〜`;

    document.getElementById('bookingFormInner').innerHTML = `
        <div class="success-box">
            <div class="success-icon">✓</div>
            <h3>ご予約ありがとうございます</h3>
            <p>
                <strong>${payload.name}</strong> 様<br>
                ${displayDate}（${payload.menu}）のご予約を承りました。<br><br>
                確認のご連絡をさしあげる場合がございます。<br>
                お電話番号 <strong>${payload.phone}</strong> にご注意ください。
            </p>
            <a href="index.html" class="back-btn">トップページへ戻る</a>
        </div>
    `;
}
