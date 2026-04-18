/**
 * ROSSO 美容室 予約管理 - Google Apps Script
 *
 * ▼ セットアップ手順
 *  1. Google スプレッドシートを新規作成
 *  2. 拡張機能 → Apps Script を開き、このコードを貼り付ける
 *  3. 下の SPREADSHEET_ID を作成したスプレッドシートのIDに変更
 *  4. 下の ADMIN_TOKEN を任意の文字列に変更（admin.js と同じ値にする）
 *  5. 「デプロイ」→「新しいデプロイ」→ 種類:ウェブアプリ
 *     - 実行ユーザー: 自分
 *     - アクセス: 全員（匿名ユーザーを含む）
 *  6. デプロイURLをコピーして reservation.js の GAS_ENDPOINT に貼り付ける
 */

const SPREADSHEET_ID = '1bDe5z4KM1fbcyvx0tWa3Jj_pU8JuyTLtcjfxQujNZAc';
const SHEET_NAME     = 'reservations';
const ADMIN_TOKEN    = 'rosso-admin-2024';       // ← admin.js と同じ値に変更

// ─────────────────────────────────────────
// GETリクエスト
// ─────────────────────────────────────────
function doGet(e) {
    const action = e.parameter.action;

    if (action === 'slots') {
        return handleGetSlots(e);
    }
    if (action === 'admin') {
        return handleAdminGet(e);
    }

    return jsonResponse({ error: 'Invalid action' });
}

/**
 * 指定期間の予約済みスロット一覧を返す
 * ?action=slots&start=YYYY-MM-DD&end=YYYY-MM-DD
 */
function handleGetSlots(e) {
    const start = e.parameter.start || '';
    const end   = (e.parameter.end  || '') + ' 23:59';

    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    const booked = [];

    for (let i = 1; i < data.length; i++) {
        const datetime = String(data[i][0]);
        if (datetime >= start && datetime <= end) {
            booked.push(datetime);
        }
    }

    return jsonResponse({ booked });
}

/**
 * 全予約データを返す（管理画面用）
 * ?action=admin&token=ADMIN_TOKEN
 */
function handleAdminGet(e) {
    if (e.parameter.token !== ADMIN_TOKEN) {
        return jsonResponse({ error: 'Unauthorized' });
    }

    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ reservations: [] });

    const reservations = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        reservations.push({
            datetime:  String(row[0]),
            name:      String(row[1]),
            phone:     String(row[2]),
            menu:      String(row[3]),
            notes:     String(row[4] || ''),
            createdAt: row[5] ? new Date(row[5]).toISOString() : '',
        });
    }

    return jsonResponse({ reservations });
}

// ─────────────────────────────────────────
// POSTリクエスト（予約登録）
// ─────────────────────────────────────────
function doPost(e) {
    const lock = LockService.getScriptLock();

    try {
        lock.waitLock(30000);
    } catch (err) {
        return jsonResponse({ success: false, message: '現在混み合っています。しばらく経ってからもう一度お試しください。' });
    }

    try {
        const raw  = e.postData ? e.postData.contents : '{}';
        const body = JSON.parse(raw);

        const { datetime, name, phone, menu, notes } = body;

        // バリデーション
        if (!datetime || !name || !phone || !menu) {
            return jsonResponse({ success: false, message: '必須項目が入力されていません。' });
        }
        if (!isValidDatetime(datetime)) {
            return jsonResponse({ success: false, message: '日時の形式が正しくありません。' });
        }

        const sheet    = getSheet();
        const existing = sheet.getDataRange().getValues();

        // ダブルブッキングチェック
        for (let i = 1; i < existing.length; i++) {
            if (String(existing[i][0]) === datetime) {
                return jsonResponse({
                    success: false,
                    message: 'この時間はすでに予約が入っています。別の時間をお選びください。'
                });
            }
        }

        // 過去日時チェック
        const slotDate = new Date(datetime.replace(' ', 'T') + ':00');
        const cutoff   = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2時間前
        if (slotDate <= cutoff) {
            return jsonResponse({ success: false, message: 'この時間はすでに受付を終了しています。' });
        }

        // 予約を追加
        sheet.appendRow([
            datetime,
            name.trim(),
            phone.trim(),
            menu,
            (notes || '').trim(),
            new Date(),
        ]);

        return jsonResponse({ success: true, message: '予約が完了しました。' });

    } catch (err) {
        return jsonResponse({ success: false, message: 'エラーが発生しました: ' + err.message });
    } finally {
        lock.releaseLock();
    }
}

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────
function getSheet() {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let   sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(['日時', '名前', '電話番号', 'メニュー', '備考', '登録日時']);
        sheet.setFrozenRows(1);
        // ヘッダー行を太字・背景色に
        const headerRange = sheet.getRange(1, 1, 1, 6);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#e4eff7');
    }

    return sheet;
}

function isValidDatetime(str) {
    // "YYYY-MM-DD HH:00" の形式チェック
    return /^\d{4}-\d{2}-\d{2} \d{2}:00$/.test(str);
}

function jsonResponse(data) {
    const output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
}
