/**
 * スプレッドシートから掃除当番データを読み込んでSlackに通知する
 */
function noticeCleaningDuty() {  
    try {
      //連携するスプレッドシートのうち、掃除当番表・抽選無しのシート情報を取得
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("掃除当番表・抽選無し");
      //シートの当番表の情報を取得（二次元配列）
      var data = sheet.getRange(3, 2, 7, 10).getValues();
      //グループ一覧
      var groupNames = ["A", "B", "C", "D", "E"];
      var msg = createNoticeMsg(data, groupNames);
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
  function createNoticeMsg(data, groupNames) {
    var noticeMsg = "今週の掃除当番のお知らせ\n\n";
    var col = searchColumn(data);
    for (var i = 0; i < groupNames.length; i++) {
      var row = searchGroupNameRow(data, groupNames[i]);
      var members = data[row][col].split("\n");
      noticeMsg += groupNames[i] + "：";
      for (var j = 0; j < members.length; j++) {
        memberName = memberCheck(members[j]);
        noticeMsg += memberName;
      }
      noticeMsg += "\n";
    }
    noticeMsg += "\nよろしくお願いします！";
    return noticeMsg;
  }

  /**
   * 今日(実行日)の日付をもとに、当番表の通知する週の列を特定する
   * @param {Object[][]} data 当番表のデータ
   * @return {number} 通知する週の情報がある列番号
   */
  function searchColumn(data) {
    var month = Utilities.formatDate(new Date(), "JST", "MM");
    var monthIndex = searchMonthIndex(data[0], month);
    var day = Utilities.formatDate(new Date(), "JST", "dd");
    for (var i = monthIndex; i < data[1].length; i++) {
      //当番表末尾や、その月の末尾に来た時場合は、そこでreturnする
      if (!data[1][i+1] ||  parseInt(data[1][i]) > data[1][i+1]) {
        return i;
      }
      if (parseInt(data[1][i]) <= day && parseInt(data[1][i+1]) > day) {
        return i;
      }
    }
    throw new Error("当番表の日付のデータが不正です");
  }

  /**
   * 今日(実行日)の月の情報がある列を特定する
   * ※一致する値があるindexを返すindexOfメソッドでは型も含めた比較になるので、あえてこのメソッドを作成
   * @param {Object[]} monthRow 月の情報が入力された行のデータ
   * @param {string} month 今日(実行日)の月
   * @return {number} 今日(実行日)の月の情報がある列番号
   */
  function searchMonthIndex(monthRow, month) {
    for (var i = 0; i < monthRow.length; i++) {
      if (monthRow[i] == parseInt(month)) {
        return i;
      }
    }
    throw new Error("当番表に今月のデータがありません");
  }

  /**
   * 当該グループの情報がある行を特定する
   * @param {Object[][]} data 当番表のデータ
   * @param {string} groupName グループ名
   * @return {number} 当該グループの情報がある行番号
   */
  function searchGroupNameRow(data, groupName) {
    //Underscoreライブラリを使用する準備
    var _ = Underscore.load();
    //行と列を反転させた配列を生成（indexOfメソッドは行にしか使用できないので、列で一致する値がある行を探すために反転させる）
    var reverseData = _.zip.apply(_, data);
    //当該グループの情報がある列番号（行と列を反転させているため、実質は行番号）を取得
    var index = reverseData[0].indexOf(groupName);
    if (index == -1) {
      throw new Error(groupName + "グループの行番号が取得できませんでした");
    }
    return index;
  }

  /**
   * 当番の人の名称を整形する
   * @param {string} member 当番の人の名称
   * @return {string} 整形した当番の人の名称
   */
  function memberCheck(member) {
    if (member == "？？？" || member == "???" || member == "") {
      return "(どなたか)  ";
    }
    return member + "さん  ";
  }