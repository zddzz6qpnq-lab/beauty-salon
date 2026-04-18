/**
 * reservation.js
 * 3ステップ予約フォーム制御 + GAS送信
 */

// GASエンドポイント（デプロイ後にここを書き換える）
window.GAS_ENDPOINT = 'YOUR_GAS_ENDPOINT_URL';

// ===== ステップ管理 =====
function showStep(stepNum) {
  [1, 2, 3].forEach(n => {
    const content = document.getElementById(`step${n}`);
    const indicator = document.getElementById(`step${n}-indicator`);
    if (content) content.classList.toggle('hidden', n !== stepNum);
    if (indicator) {
      indicator.classList.remove('active', 'done');
      if (n === stepNum) indicator.classList.add('active');
      if (n < stepNum) indicator.classList.add('done');
    }
  });
}

// ===== バリデーション =====
function validate() {
  let valid = true;

  const name = document.getElementById('name').value.trim();
  const nameErr = document.getElementById('name-error');
  if (!name) { nameErr.textContent = 'お名前を入力してください'; valid = false; }
  else { nameErr.textContent = ''; }

  const phone = document.getElementById('phone').value.trim();
  const phoneErr = document.getElementById('phone-error');
  if (!phone) { phoneErr.textContent = '電話番号を入力してください'; valid = false; }
  else if (!/^[\d\-+]{10,15}$/.test(phone.replace(/[\s\-]/g, ''))) {
    phoneErr.textContent = '正しい電話番号を入力してください'; valid = false;
  } else { phoneErr.textContent = ''; }

  const menu = document.getElementById('menu').value;
  const menuErr = document.getElementById('menu-error');
  if (!menu) { menuErr.textContent = 'メニューを選択してください'; valid = false; }
  else { menuErr.textContent = ''; }

  return valid;
}

// ===== 確認画面に入力内容を反映 =====
function fillConfirm() {
  document.getElementById('confirm-datetime').textContent = selectedDateTime ? selectedDateTime.label : '';
  document.getElementById('confirm-name').textContent = document.getElementById('name').value.trim();
  document.getElementById('confirm-phone').textContent = document.getElementById('phone').value.trim();
  document.getElementById('confirm-menu').textContent = document.getElementById('menu').value;
  document.getElementById('confirm-note').textContent = document.getElementById('note').value.trim() || 'なし';
}

// ===== GASに送信 =====
async function submitReservation() {
  const submitBtn = document.getElementById('submitBtn');
  const submitMsg = document.getElementById('submitMsg');
  submitBtn.disabled = true;
  submitBtn.textContent = '送信中...';
  submitMsg.className = 'submit-msg hidden';

  const payload = {
    action: 'reserve',
    date: selectedDateTime.date,
    time: selectedDateTime.time,
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    menu: document.getElementById('menu').value,
    note: document.getElementById('note').value.trim(),
  };

  // GASが未設定の場合はデモ成功
  if (!window.GAS_ENDPOINT || window.GAS_ENDPOINT.includes('YOUR_GAS')) {
    await new Promise(r => setTimeout(r, 1000)); // 疑似遅延
    showSuccessMessage(submitMsg, payload.name, payload.date, payload.time);
    return;
  }

  try {
    const res = await fetch(window.GAS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === 'ok') {
      showSuccessMessage(submitMsg, payload.name, payload.date, payload.time);
    } else if (data.status === 'conflict') {
      submitMsg.className = 'submit-msg error';
      submitMsg.textContent = 'ご希望の日時はすでに埋まってしまいました。別の日時をお選びください。';
      submitMsg.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'この内容で予約する';
    } else {
      throw new Error(data.message || '不明なエラー');
    }
  } catch (e) {
    submitMsg.className = 'submit-msg error';
    submitMsg.textContent = '送信に失敗しました。お手数ですがLINEまたはお電話にてご予約ください。';
    submitMsg.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'この内容で予約する';
  }
}

function showSuccessMessage(el, name, date, time) {
  el.className = 'submit-msg success';
  el.innerHTML = `
    <strong>✓ ご予約が完了しました！</strong><br><br>
    ${name} 様のご予約を承りました。<br>
    ${date.replace(/-/g, '/')} ${time}〜 にお待ちしております。<br><br>
    ご不明な点はお気軽にLINEまたはお電話にてお問い合わせください。
  `;
  el.classList.remove('hidden');
  document.getElementById('submitBtn').style.display = 'none';
  document.getElementById('backToStep2').style.display = 'none';
}

// ===== イベント設定 =====
document.addEventListener('DOMContentLoaded', () => {
  // STEP1 → STEP2（日時選択後に表示されるボタンから）
  // カレンダーで選択したらSTEP2ボタンを活性化するため
  // ※ selectedTimeDisplay の下にステップ移動ボタンを動的に追加
  const display = document.getElementById('selectedTimeDisplay');
  if (display) {
    // カレンダー選択後に「この日時で進む」ボタンを追加
    const calNextBtn = document.createElement('button');
    calNextBtn.id = 'calNextBtn';
    calNextBtn.className = 'btn-next';
    calNextBtn.style.cssText = 'display:none; margin: 20px auto 0; display: none;';
    calNextBtn.textContent = 'この日時で予約する →';
    calNextBtn.addEventListener('click', () => {
      if (!selectedDateTime) return;
      document.getElementById('step2SelectedTime').textContent =
        `予約日時：${selectedDateTime.label}`;
      showStep(2);
    });
    display.after(calNextBtn);

    window.enableStep2Button = () => {
      calNextBtn.style.display = 'block';
    };
  }

  // STEP2 → STEP3
  document.getElementById('goToStep3')?.addEventListener('click', () => {
    if (!selectedDateTime) {
      alert('先に日時を選んでください');
      showStep(1);
      return;
    }
    if (!validate()) return;
    fillConfirm();
    showStep(3);
  });

  // STEP3 → STEP2
  document.getElementById('backToStep2')?.addEventListener('click', () => {
    showStep(2);
  });

  // STEP2 → STEP1
  document.getElementById('backToStep1')?.addEventListener('click', () => {
    showStep(1);
  });

  // 送信
  document.getElementById('submitBtn')?.addEventListener('click', submitReservation);

  // 初期表示
  showStep(1);
});
