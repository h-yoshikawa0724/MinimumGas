function noticeQiitaRanking() {
    try {
      response = getQiitaRanking();
      if (response == "") {
        msg = "※最新のQiitaいいねランキングが登録されていません。\n違う取得日を指定してください。"; 
      } else {
        // Slack投稿内容の組み立て
        msg = "*■週間いいねランキング■* \n\n";
        // JSONをオブジェクトに変換
        response = JSON.parse(response);
        dataList = response['data'];
        count = 1;
        dataList.forEach(function(data) {
          // <url|文字列> の形式で文字列でのリンクを作成
          msg += count + "位：<" + data['url'] + "|" + data['title'] + "> \n";
          count++;
        })
      }
    } catch (e) {
      Logger.log("Qiitaいいねランキング取得エラー：" + e.message + "\nfileName：" + e.fileName + "\nlineNumber：" + e.lineNumber + "\nstack：\n" + e.stack);
    }

    try {
      //Slack側 Incoming WebHookのURL
      var webHookUrl = "WebHookURLを指定";
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
      Logger.log("Slack送信エラー：" + e.message + "\nfileName：" + e.fileName + "\nlineNumber：" + e.lineNumber + "\nstack：\n" + e.stack);
    }
  }

  function getQiitaRanking() {
    var type = "weekly";
    var date = new Date();
    // リクエスト時に今日を指定するとなぜかデータが取得できないので、前日を指定する
    var yesterday = new Date(date.getYear(), date.getMonth(), date.getDate() - 1);
    var formatYesterday = Utilities.formatDate(yesterday, "JST", "yyyy-MM-dd");
    var qiitaScraipingUrl = "https://us-central1-qiita-trend-web-scraping.cloudfunctions.net/qiitaScraiping/" + type + "/" + formatYesterday;
    return UrlFetchApp.fetch(qiitaScraipingUrl);
  }
