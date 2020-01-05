// POSTリクエスト時に当番ガチャを実行する
// （トークン認証を行い、特定のSlackチャンネルからのリクエストのみ受付）
function doPost(e) {
  const verifyToken = PropertiesService.getScriptProperties().getProperty('SLACK_OUTGOING_TOKEN');

  if (verifyToken !== e.parameter.token) {
    throw new Error("トークンが違います。");
  }
  dutyGacha();
}

// スプレッドシートのデータを元に当番ガチャを行い、結果をSlackに投稿する
function dutyGacha() {
  // メンバー表のデータ部分のセル範囲
  const memberDataCellRange = 'A4:C23';
  // 当番履歴表の開始列
  const historyDataColumnRangeStart = 'E';
  // 当番履歴表の終了列
  const historyDataColumnRangeEnd = 'G';
  // 当番履歴表の列範囲
  const historyDataColumnRange = historyDataColumnRangeStart + ':' + historyDataColumnRangeEnd;
  // ガチャから除外する履歴件数
  const historyDataTargetNum = 5;
  // 当番抽選の人数
  const dutyMemberNum = 2;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('当番履歴表');
    const joinMemberList = getJoinMemberList(sheet, memberDataCellRange, dutyMemberNum);
    const historyMenberList = getHistoryMemberList(sheet, historyDataColumnRange, historyDataTargetNum, dutyMemberNum);
    const gachaMemberList = getGachaMemberList(joinMemberList, historyMenberList, dutyMemberNum);
    const dutyMemberList = getDutyMemberList(gachaMemberList, dutyMemberNum);
    var msg = createNoticeMsg(gachaMemberList, dutyMemberList);

    const insertRow = sheet.getRange(historyDataColumnRangeStart + sheet.getMaxRows()).getNextDataCell(SpreadsheetApp.Direction.UP).getRow() + 1;
    const insertRange = historyDataColumnRangeStart + insertRow + ':' + historyDataColumnRangeEnd + insertRow;
    const insertDataArr = createInsertData(dutyMemberList);
    // スプレッドシートに当月当番データを書き込み
    sheet.getRange(insertRange).setValues(insertDataArr);
    // スプレッドシートに書き込んだ行に罫線を引く
    sheet.getRange(insertRange).setBorder(false, true, true, true, true, false);
  } catch (e) {
    var msg = 'エラーが発生しました：' + e.message + '\nfileName：' + e.fileName + '\nlineNumber：' + e.lineNumber + '\nstack：\n' + e.stack;
    Logger.log(msg);
  }

  try {
    const webHookUrl = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
    const jsonData =
        {
          'text': msg
        };
    const payload = JSON.stringify(jsonData);
    const options =
        {
          'method': 'post',
          'contentType': 'application/json',
          'payload': payload
        };
    UrlFetchApp.fetch(webHookUrl, options);
  } catch (e) {
    Logger.log('送信エラー：' + e.message + '\nfileName：' + e.fileName + '\nlineNumber：' + e.lineNumber + '\nstack：\n' + e.stack);
  }
}

// メンバー表からガチャ参加メンバーのslack_idと名前を抽出して、オブジェクトの配列で返す
function getJoinMemberList(sheet, memberDataCellRange, dutyMemberNum) {
  const memberData = sheet.getRange(memberDataCellRange).getValues();
  var joinMemberList = [];
  memberData.map(function(data){
    if (data[0] === '〇') {
      joinMemberList.push({id: data[1], name: data[2]});
    }
  });
  if (joinMemberList.length < dutyMemberNum) {
    throw new Error('ガチャ参加メンバーが当番抽選メンバー数より少ないです。ガチャ参加メンバーを増やしてください。');
  }
  return joinMemberList;
}

// 当番履歴表から指定件数分の履歴メンバーを抽出して配列で返す
function getHistoryMemberList(sheet, historyDataColumnRange, historyDataTargetNum, dutyMemberNum) {
  const range = sheet.getRange(historyDataColumnRange);
  const historyData = range.getValues();
  const filterHistoryData = historyData.filter(function(data) { return data[0] !== ''});
  const lastIndex = filterHistoryData.length - 1;
  var historyMenberList = [];
  for (var i = 0; i < historyDataTargetNum; i++) {
    for (var l = 1; l <= dutyMemberNum; l++) {
      if (filterHistoryData[lastIndex - i][l] === '') {
        continue;
      }
      if (filterHistoryData[lastIndex - i][l].match(/当番.*/)) {
        return historyMenberList;
      }
      historyMenberList.push(filterHistoryData[lastIndex - i][l]);
    }
  }
  return historyMenberList;
}

// ガチャ参加メンバーから履歴メンバーを除外したものを配列で返す
function getGachaMemberList(joinMemberList, historyMenberList, dutyMemberNum) {
  const gachaMemberList = joinMemberList.filter(function(data){ return historyMenberList.indexOf(data.name) === -1});
  if (gachaMemberList.length < dutyMemberNum) {
    throw new Error('ガチャ参加メンバーから履歴メンバーを除外した数が、抽選メンバー数より少ないです。ガチャ参加メンバーを増やしてください。'); 
  }
  return gachaMemberList;
}

// 当番抽選メンバー数分、当番抽選を行い、当月の当番メンバーの配列を返す
function getDutyMemberList(gachaMenberList, dutyMemberNum) {
  var dutyMemberList = [];
  for (var i = 0; i < dutyMemberNum; i++) {
    do {
      var index = random(gachaMenberList.length);
    } while (dutyMemberList.indexOf(gachaMenberList[index]) !== -1);
    dutyMemberList[i] = gachaMenberList[index];
  }

  return dutyMemberList;
}

// 0～(length-1)の乱数を返す
function random(length) {
  //例　5人の場合 0~0.9999… * 5 の小数点切り捨てで、0~4になる
  return Math.floor(Math.random() * length);
}

// Slack通知メッセージを作成して返す
function createNoticeMsg(gachaMenber, dutyMemberList) {
  var noticeMsg = '';
  dutyMemberList.forEach(function(memberData) {
    noticeMsg += ":penguin:<ﾃﾞﾚﾚﾚﾚﾚﾃﾞﾃﾞﾝ!!　" + "<" + memberData.id + "> さん\n";
  });
  return noticeMsg;
}

// スプレッドシートに記録する当月データの二次元配列を返す
function createInsertData(dutyMemberList) {
  var insertData = [Utilities.formatDate(new Date(), "JST", "yyyy/MM")];
  dutyMemberList.forEach(function(memberData) {
    insertData.push(memberData.name);
  });
  const insertDataArr = [insertData];
  return insertDataArr;
}