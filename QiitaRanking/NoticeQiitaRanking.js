function noticeQiitaRanking() {
  let msg;
  try {
    let response = getQiitaRanking();
    if (response == '') {
      msg = '※最新のQiitaいいねランキングが登録されていません。\n違う取得日を指定してください。';
    } else {
      // Slack投稿内容の組み立て
      msg = '*■週間いいねランキング■* \n\n';
      // JSONをオブジェクトに変換
      response = JSON.parse(response);
      const dataList = response['data'];
      let count = 1;
      dataList.forEach(data => {
        // <url|文字列> の形式で文字列でのリンクを作成
        msg += count + '位：<' + data['url'] + '|' + data['title'] + '> \n';
        count++;
      })
    }
  } catch (e) {
    Logger.log('Qiitaいいねランキング取得エラー：' + '\nstack：\n' + e.stack);
  }

  try {
    //Slack側 Incoming WebHookのURL
    const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
    //Incoming WebHookに渡すパラメータ
    const jsonData =
        {
          'text': msg
        };
    //パラメータをJSONに変換
    const payload = JSON.stringify(jsonData);
    //送信オプション
    const options =
        {
          'method': 'post',
          'contentType': 'application/json',
          'payload': payload
        };
    //指定URL、オプションでリクエスト
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (e) {
    Logger.log('Slack送信エラー：' + e.message + '\nstack：\n' + e.stack);
  }
}

function getQiitaRanking() {
  const type = 'weekly';
  const date = new Date();
  // リクエスト時に今日を指定するとなぜかデータが取得できないので、前日を指定する
  const yesterday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  const formatYesterday = Utilities.formatDate(yesterday, 'JST', 'yyyy-MM-dd');
  const QIITA_SCRAIPING_URL = PropertiesService.getScriptProperties().getProperty('QIITA_SCRAIPING_URL') + type + '/' + formatYesterday;
  return UrlFetchApp.fetch(QIITA_SCRAIPING_URL);
}
