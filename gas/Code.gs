/**
 * Code.gs — ROSSO 予約システム
 * Google Apps Script
 *
 * 設定：SPREADSHEET_ID を自分のスプレッドシートIDに書き換えてください
 */

// ===== 設定 =====
const SPREADSHEET_ID = '1bDe5z4KM1fbcyvx0tWa3Jj_pU8JuyTLtcjfxQujNZAc';
const SHEET_NAME = '予約データ';

// ===== GET: 予約済みスロット一覧 or 予約リストを返す =====
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getSlots') {
    return getBookedSlots();
  } else if (action === 'list') {
    return getReservationList();
  }

  return jsonResponse({ status: 'error', message: '不明なアクション' });
}

// ===== POST: 予約登録 =====
function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'リクエスト形式が不正です' });
  }

  if (payload.action === 'reserve') {
    return registerReservation(payload);
  }

  return jsonResponse({ status: 'error', message: '不明なアクション' });
}

// ===== 予約済みスロット一覧を返す =====
function getBookedSlots() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const bookedSlots = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[6]; // G列: ステータス
    if (status === 'cancelled') continue;
    const rawDate = row[0]; // A列: 日付
    const rawTime = row[1]; // B列: 時間 (HH:00)
    if (!rawDate || !rawTime) continue;
    // Sheetsが日付をDateオブジェクトに変換するので文字列に戻す
    const dateStr = (rawDate instanceof Date)
      ? Utilities.formatDate(rawDate, 'Asia/Tokyo', 'yyyy-MM-dd')
      : String(rawDate);
    bookedSlots.push(`${dateStr} ${rawTime}`);
  }

  return jsonResponse({ status: 'ok', bookedSlots });
}

// ===== 予約リストを返す =====
function getReservationList() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const reservations = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    reservations.push({
      datetime: `${row[0]} ${row[1]}`,
      name: row[2],
      phone: row[3],
      menu: row[4],
      note: row[5],
      status: row[6],
      receivedAt: row[7],
    });
  }

  return jsonResponse({ status: 'ok', reservations });
}

// ===== 予約を登録する（ダブルブッキング防止） =====
function registerReservation(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10秒待機
  } catch (e) {
    return jsonResponse({ status: 'error', message: 'サーバーが混雑しています。少し待ってから再送信してください。' });
  }

  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const { date, time, name, phone, menu, note } = payload;

    // ダブルブッキングチェック
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[6];
      if (status === 'cancelled') continue;
      if (row[0] === date && row[1] === time) {
        lock.releaseLock();
        return jsonResponse({ status: 'conflict', message: 'その日時はすでに予約済みです' });
      }
    }

    // 入力値の簡易バリデーション
    if (!date || !time || !name || !phone || !menu) {
      lock.releaseLock();
      return jsonResponse({ status: 'error', message: '必須項目が不足しています' });
    }

    // 書き込み
    const receivedAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
    sheet.appendRow([date, time, name, phone, menu, note || '', 'confirmed', receivedAt]);

    lock.releaseLock();
    return jsonResponse({ status: 'ok', message: '予約が完了しました' });
  } catch (e) {
    lock.releaseLock();
    return jsonResponse({ status: 'error', message: e.toString() });
  }
}

// ===== シートを取得（なければ作成） =====
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // ヘッダーを設定
    sheet.getRange(1, 1, 1, 8).setValues([[
      '日付', '時間', '名前', '電話番号', 'メニュー', '備考', 'ステータス', '受付日時'
    ]]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ===== JSON レスポンスを返す =====
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
