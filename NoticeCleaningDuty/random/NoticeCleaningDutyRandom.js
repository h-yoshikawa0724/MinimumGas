/**
 * 掃除当番をランダムで決めて通知
 */
function noticeCleaningDutyRandom() {
  //連携するスプレッドシートのうち、グループ表のシート情報を取得
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("掃除当番グループ表");
  //シートの全ての値を取得（二次元配列）
  var data = sheet.getDataRange().getValues();

  //掃除当番のグループ
  var groupNames = ["A", "B", "C", "D", "E"];
  //掃除当番を決定し、通知メッセージを生成
  var msg = decideCleaningDuty(data, groupNames);

  //Slack側 Incoming WebHookのURL
  var webHookUrl = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  //Incoming WebHookに渡すパラメータ
  var jsonData =
      {
        "text": msg
      };
  //パラメータをJSONに変換
  var payload = JSON.stringify(jsonData);
  //送信オプション
  var options =
      {
        "method": "post",
        "contentType": "application/json",
        "payload": payload
      };
  //指定URL、オプションでリクエスト
  UrlFetchApp.fetch(webHookUrl, options);
}

/**
 * 掃除当番を決定し、通知メッセージを作成して返す
 * @param {Object[][]} data
 * @param {Array} groupNames
 * @return {string} 掃除当番通知メッセージ
 */
function decideCleaningDuty(data, groupNames) {
  var noticeMsg = "今週の掃除当番のお知らせ\n\n";
  for (var i = 0; i < groupNames.length; i++) {
    var groupNameRow = searchGroupNameRow(data, groupNames[i]);
    var lastColumn = getLastColumn(data, groupNameRow);
    var members = data[groupNameRow - 1].slice(2, lastColumn);
    var numbers = toDraw(members.length);
    noticeMsg += groupNames[i] + "：" + members[numbers[0]] + "・" + members[numbers[1]] + "\n";
  }
  noticeMsg+= "\nよろしくお願いします。"
  return noticeMsg;
}

/**
 * 指定グループ名がある行番号を返す
 * @param {Object[][]} data
 * @param {string} groupName
 * @return {Number} 行番号
 */
function searchGroupNameRow(data, groupName) {
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === groupName) {
      return i + 1;
    }
  }
}

//指定した行の最終使用列番号を返す
function getLastColumn(data, row) {
  for (var i = 2; i <= data[row-1].length; i++) {
    if (data[row-1][i] === undefined || data[row-1][i] === "") {
      return i;
    }
  }
}

//掃除当番の抽選結果を返す
function toDraw(length) {
  var numbers = [];
  numbers[0] = random(length);
  do {
    numbers[1] = random(length);
  } while(numbers[0] === numbers[1]);
  return numbers;
}

//0～(length-1)の乱数を返す
function random(length) {
  //例　5人の場合 0~0.9999… * 5 の小数点切り捨てで、0~4になる
  return Math.floor(Math.random() * length);
}