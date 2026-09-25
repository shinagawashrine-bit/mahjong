/**
 * 麻雀成績記録アプリ ― 共有用スクリプト
 *
 * スプレッドシートを「データの置き場所」として使うだけのものです。
 * 自分で開いて編集する必要はありません。
 *
 * 使い方
 *   1. スプレッドシートのメニュー「拡張機能」→「Apps Script」
 *   2. 中身を全部消して、このファイルの内容を貼り付ける
 *   3. 右上の「デプロイ」→「新しいデプロイ」
 *      種類：ウェブアプリ／次のユーザーとして実行：自分
 *      アクセスできるユーザー：全員
 *   4. 出てきた「ウェブアプリのURL」をアプリに貼り付ける
 */

var SHEET_NAME = 'data';
var CHUNK = 45000;   // 1セルに入る上限に収まる長さで分割する
var COLS  = 12;      // 分割して入れる列数（B〜M）

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1).setValue('key');
    sh.getRange(1, COLS + 2).setValue('updatedAt');
  }
  return sh;
}

function findRow_(sh, key) {
  var last = sh.getLastRow();
  if (last < 1) return 0;
  var keys = sh.getRange(1, 1, last, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]) === key) return i + 1;
  }
  return 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 読み出し: ?k=合言葉 */
function doGet(e) {
  var key = String((e && e.parameter && e.parameter.k) || '').trim();
  if (!key) return json_({ error: 'nokey' });
  var sh = sheet_();
  var row = findRow_(sh, key);
  if (!row) return json_({ error: 'notfound' });
  var text = sh.getRange(row, 2, 1, COLS).getValues()[0].join('');
  if (!text) return json_({ error: 'empty' });
  try {
    return json_(JSON.parse(text));
  } catch (err) {
    return json_({ error: 'broken' });
  }
}

/** 書き込み: 本文に {"k":"合言葉","data":{...}} */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'badbody' });
  }
  var key = String(body.k || '').trim();
  if (!key) return json_({ error: 'nokey' });

  var text = JSON.stringify(body.data);
  if (text.length > CHUNK * COLS) return json_({ error: 'toobig' });

  var parts = [];
  for (var i = 0; i < text.length; i += CHUNK) parts.push(text.substr(i, CHUNK));
  while (parts.length < COLS) parts.push('');

  var sh = sheet_();
  var row = findRow_(sh, key);
  if (!row) {
    row = Math.max(sh.getLastRow(), 1) + 1;
    sh.getRange(row, 1).setValue(key);
  }
  sh.getRange(row, 2, 1, COLS).setValues([parts]);
  sh.getRange(row, COLS + 2).setValue(new Date());
  return json_({ ok: true });
}
