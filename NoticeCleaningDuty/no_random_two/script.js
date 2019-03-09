/**
 * スプレッドシートから掃除当番データを読み込んでSlackに通知する
 */
function noticeCleaningDuty() {  
    try {
      //連携するスプレッドシートのうち、グループ表のシート情報を取得
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("グループ表");
      //シートの事業部メンバー表の情報を取得（二次元配列）
      var memberData = sheet.getRange(4, 1, 3, 11).getValues();
      //シートの月ごとの当番対応表（二次元配列）
      var dutyData = sheet.getRange(8, 2, 5, 2).getValues();
      var msg = createNoticeMsg(memberData, dutyData);
    } catch (e) {
      var msg = "エラーが発生しました：" + e.message + "\nfileName：" + e.fileName + "\nlineNumber：" + e.lineNumber + "\nstack：\n" + e.stack; 
      Logger.log(msg);
    }

    try {
      //Slack側 Incoming WebHookのURL
      var webHookUrl = '※WebhookURLを指定';
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
    } catch (e) {
      Logger.log("送信エラー：" + e.message + "\nfileName：" + e.fileName + "\nlineNumber：" + e.lineNumber + "\nstack：\n" + e.stack);
    }
  }

  /**
   * Slackに通知するメッセージを作成する
   * @param {Object[][]} data 当番表のデータ
   * @param {string[]} groupNames グループ名称の配列
   * @return {string} 通知するメッセージ
   */
  function createNoticeMsg(memberData, dutyData) {
    var noticeMsg = "今月の掃除当番のお知らせ\n\n";
    var dutyName = searchDuty(dutyData);
    noticeMsg += "「" + dutyName + "」です\n\n";
    var dutyMember = searchDutymember(dutyName, memberData); 
    for (var i = 1; i < dutyMember.length; i++) {
      noticeMsg += memberCheck(dutyMember[i]);
      if (i % 3 == 0) {
        noticeMsg += "\n";
      }
    }
    noticeMsg += "\n\nよろしくお願いします！";
    return noticeMsg;
  }

  /**
   * 今日(実行日)の日付をもとに、当番の事業部を特定する
   * @param {Object[][]} dutyData 月ごとの当番表のデータ
   * @return {string} 当番の事業部名
   */
  function searchDuty(dutyData) {
    var month = Utilities.formatDate(new Date(), "JST", "M") + "月";
    for (var i = 0; i < dutyData.length; i++) {
      if (month == dutyData[i][0]) {
        return  "事業部" + dutyData[i][1];
      }
    }
    throw new Error("月ごとの当番表のデータが不正です");
  }

  /**
   * 当番事業部名をもとに、当番の事業部メンバーを特定する
   * @param {string} dutyName 当番事業部名
   * @param {Object[][]} memberData 事業部メンバー表のデータ
   * @return {string[]} 当番事業部のメンバーのデータ
   */
  function searchDutymember(dutyName, memberData) {
    for (var i = 0; i < memberData.length; i++) {
      if (dutyName == memberData[i][0]) {
        return memberData[i];
      }
    }
    throw new Error("事業部のメンバー表データが不正です");
  }

  /**
   * 当番の人の名称を整形する
   * @param {string} member 当番の人の名称
   * @return {string} 整形した当番の人の名称
   */
  function memberCheck(member) {
    if (member == "") {
      return "";
    }
    return member + "さん  ";
  }