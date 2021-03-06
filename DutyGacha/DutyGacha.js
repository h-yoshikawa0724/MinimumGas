// POSTリクエスト時に当番ガチャを実行する
function doPost(e) {
  // トークン認証を行い、特定のSlackチャンネルからのリクエストのみ受付
  const verifyToken = PropertiesService.getScriptProperties().getProperty('SLACK_OUTGOING_TOKEN');

  if (verifyToken !== e.parameter.token) {
    throw new Error('トークンが違います。');
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
  // 抽選する当番の人数
  const dutyMemberNum = 2;
  let msg;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('当番履歴表');
    const filterHistoryData = getFilterHistoryData(sheet, historyDataColumnRange);
    const lastIndex = filterHistoryData.length - 1;
    const thisMonthMemberNameList = getThisMonthMemberNameList(filterHistoryData, lastIndex, dutyMemberNum);
    // 当月の当番履歴情報がすでにある場合はそのメンバーの情報を取得
    if (thisMonthMemberNameList !== null) {
      const thisMonthMemberList = getThisMonthMemberList(sheet, memberDataCellRange, thisMonthMemberNameList, dutyMemberNum);
      msg = createNoticeMsg(thisMonthMemberList, false);
    // ない場合は抽選に必要な情報を取得し、抽選を行い、スプレッドシートに書き込み
    } else {
      const joinMemberList = getJoinMemberList(sheet, memberDataCellRange, dutyMemberNum);
      const historyMenberList = getHistoryMemberList(filterHistoryData, lastIndex, historyDataTargetNum, dutyMemberNum);
      const gachaMemberList = getGachaMemberList(joinMemberList, historyMenberList, dutyMemberNum);
      const dutyMemberList = getDutyMemberList(gachaMemberList, dutyMemberNum);
      msg = createNoticeMsg(dutyMemberList, true);

      const insertRow = sheet.getRange(historyDataColumnRangeStart + sheet.getMaxRows()).getNextDataCell(SpreadsheetApp.Direction.UP).getRow() + 1;
      const insertRange = historyDataColumnRangeStart + insertRow + ':' + historyDataColumnRangeEnd + insertRow;
      const insertDataArr = createInsertData(dutyMemberList);
      // スプレッドシートに当月当番データを書き込み
      sheet.getRange(insertRange).setValues(insertDataArr);
      // スプレッドシートに書き込んだ行に罫線を引く
      sheet.getRange(insertRange).setBorder(false, true, true, true, true, false); 
    }
  } catch (e) {
    msg = 'エラーが発生しました：' + '\nstack：\n' + e.stack;
    Logger.log(msg);
  }

  try {
    const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
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
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (e) {
    Logger.log('送信エラー：' + '\nstack：\n' + e.stack);
  }
}

// 当番履歴表の列のデータから空白セルを除いたものを返す
function getFilterHistoryData(sheet, historyDataColumnRange) {
  const range = sheet.getRange(historyDataColumnRange);
  const historyData = range.getValues();
  return historyData.filter(data => data[0] !== '');
}

// 当番履歴表に当月当番の情報があればそのメンバー名を、なければnullを返す
function getThisMonthMemberNameList(filterHistoryData, lastIndex, dutyMemberNum) {
  if (Utilities.formatDate(filterHistoryData[lastIndex][0], 'JST', 'yyyy/MM')
                           === Utilities.formatDate(new Date(), 'JST', 'yyyy/MM')) {
    const historyDataTargetNum = 1;
    return getHistoryMemberList(filterHistoryData, lastIndex, historyDataTargetNum, dutyMemberNum);
  } else {
    return null;
  }
}

// メンバー表から当月当番メンバーのslack_idと名前を抽出して、オブジェクトの配列で返す
function getThisMonthMemberList(sheet, memberDataCellRange, thisMonthMemberNameList, dutyMemberNum) {
  const memberData = sheet.getRange(memberDataCellRange).getValues();
  let thisMonthMemberList = [];
  memberData.map(data => {
    if (thisMonthMemberNameList.includes(data[2])) {
      thisMonthMemberList.push({id: data[1], name: data[2]});
    }
  });
  if (thisMonthMemberList.length < dutyMemberNum) {
    throw new Error('当月当番メンバーの情報がメンバー表に不足しています。');
  }
  return thisMonthMemberList;
}

// メンバー表からガチャ参加メンバーのslack_idと名前を抽出して、オブジェクトの配列で返す
function getJoinMemberList(sheet, memberDataCellRange, dutyMemberNum) {
  const memberData = sheet.getRange(memberDataCellRange).getValues();
  let joinMemberList = [];
  memberData.map(data => {
    if (data[0] === '〇') {
      joinMemberList.push({id: data[1], name: data[2]});
    }
  });
  if (joinMemberList.length < dutyMemberNum) {
    throw new Error('ガチャ参加メンバーが抽選する当番の人数より少ないです。ガチャ参加メンバーを増やしてください。');
  }
  return joinMemberList;
}

// 当番履歴表から指定件数分の履歴メンバーを抽出して配列で返す
function getHistoryMemberList(filterHistoryData, lastIndex, historyDataTargetNum, dutyMemberNum) {
  let historyMenberList = [];
  for (let i = 0; i < historyDataTargetNum; i++) {
    for (let l = 1; l <= dutyMemberNum; l++) {
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
  const gachaMemberList = joinMemberList.filter(data => !historyMenberList.includes(data.name));
  if (gachaMemberList.length < dutyMemberNum) {
    throw new Error('ガチャ参加メンバーから履歴メンバーを除外した数が、抽選する当番の人数より少ないです。ガチャ参加メンバーを増やしてください。'); 
  }
  return gachaMemberList;
}

// 抽選する当番人数分、当番抽選を行い、当月の当番メンバーの配列を返す
function getDutyMemberList(gachaMenberList, dutyMemberNum) {
  let dutyMemberList = [];
  let index;
  for (let i = 0; i < dutyMemberNum; i++) {
    do {
      index = random(gachaMenberList.length);
    } while (dutyMemberList.includes(gachaMenberList[index]));
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
function createNoticeMsg(noticeMemberList, gachaFlg) {
  let noticeMsg = '今月の当番\n';
  // 新たにガチャを行った場合の通知メッセージ
  if (gachaFlg) {
    noticeMemberList.forEach(memberData => {
      noticeMsg += ':penguin:<ﾃﾞﾚﾚﾚﾚﾚﾃﾞﾃﾞﾝ!!　<' + memberData.id + '> さん\n';
    });
  // 新たにガチャを行わなかった場合の通知メッセージ
  } else {
    noticeMemberList.forEach(memberData => {
      noticeMsg += ':penguin:<ﾃﾞﾃﾞﾝ!!　<' + memberData.id + '> さん\n';
    });
    noticeMsg += '(すでに今月ガチャ済み)\n';
  }
  return noticeMsg;
}

// スプレッドシートに記録する当月データの二次元配列を返す
function createInsertData(dutyMemberList) {
  let insertData = [Utilities.formatDate(new Date(), 'JST', 'yyyy/MM')];
  dutyMemberList.forEach(memberData => insertData.push(memberData.name));
  const insertDataArr = [insertData];
  return insertDataArr;
}