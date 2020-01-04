function doPost(e) {
  const verifyToken = PropertiesService.getScriptProperties().getProperty('SLACK_OUTGOING_TOKEN');
  
  if (verifyToken !== e.parameter.token) {
    throw new Error("トークンが違います。");
  }
  dutyGacha();    
}

function dutyGacha() {
  const memberDataCellRange = 'A4:B23';
  const historyDataColumnRangeStart = 'D';
  const historyDataColumnRangeEnd = 'F';
  const historyDataColumnRange = historyDataColumnRangeStart + ':' + historyDataColumnRangeEnd;
  const historyDataTargetNum = 5;
  const dutyMemberNum = 2;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('当番履歴票');
    const joinMemberList = getJoinMemberList(sheet, memberDataCellRange, dutyMemberNum);
    const historyMenberList = getHistoryMemberList(sheet, historyDataColumnRange, historyDataTargetNum, dutyMemberNum);
    const gachaMemberList = getGachaMemberList(joinMemberList, historyMenberList, dutyMemberNum);
    const dutyMemberList = getDutyMemberList(gachaMemberList, dutyMemberNum);
    var msg = createNoticeMsg(gachaMemberList, dutyMemberList);
    
    const insertRow = sheet.getRange(historyDataColumnRangeStart + sheet.getMaxRows()).getNextDataCell(SpreadsheetApp.Direction.UP).getRow() + 1;
    const insertRange = historyDataColumnRangeStart + insertRow + ':' + historyDataColumnRangeEnd + insertRow;
    const insertDataArr = createInsertData(dutyMemberList);
    sheet.getRange(insertRange).setValues(insertDataArr);
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

function getJoinMemberList(sheet,memberDataCellRange, dutyMemberNum) {
  const memberData = sheet.getRange(memberDataCellRange).getValues();
  var joinMemberList = [];
  memberData.map(function(data){
    if (data[0] === '〇') {
      joinMemberList.push(data[1]);
    }
  });
  if (joinMemberList.length < dutyMemberNum) {
    throw new Error('ガチャ参加メンバーが抽選メンバー数より少ないです。ガチャ参加メンバーを増やしてください。');
  }
  return joinMemberList;
}

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

function getGachaMemberList(joinMemberList, historyMenberList, dutyMemberNum) {
  const gachaMemberList = joinMemberList.filter(function(data){ return historyMenberList.indexOf(data) === -1});
  if (gachaMemberList.length < dutyMemberNum) {
    throw new Error('ガチャ参加メンバーから履歴メンバーを除外した数が、抽選メンバー数より少ないです。ガチャ参加メンバーを増やしてください。'); 
  }
  return gachaMemberList;
}

//当番の抽選結果を返す
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

//0～(length-1)の乱数を返す
function random(length) {
  //例　5人の場合 0~0.9999… * 5 の小数点切り捨てで、0~4になる
  return Math.floor(Math.random() * length);
}

function createNoticeMsg(gachaMenber, dutyMemberList) {
  var noticeMsg = '';
  dutyMemberList.forEach(function(member) {
    noticeMsg += ":penguin:<ﾃﾞﾚﾚﾚﾚﾚﾃﾞﾃﾞﾝ!!　" + member + 'さん\n';
  });
  return noticeMsg;
}

function createInsertData(dutyMemberList) {
  var insertData = [Utilities.formatDate(new Date(), "JST", "yyyy/MM")];
  insertData = insertData.concat(dutyMemberList);
  const insertDataArr = [insertData];
  return insertDataArr;
}