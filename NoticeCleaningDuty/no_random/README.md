## 実行日の日付をもとに掃除当番通知
実行日の日付をもとに、その週の当番の列を特定し当番を通知する。  
※毎週月曜日に通知する想定で作成している。  
※シートに正しく今月分の担当データがあること。

グループ表の内容が不正の場合は例外をスローし、エラー内容を通知する。
また、セルが空白もしくは？？？の場合は「どなたか」と表示する。

### 連携シート
「掃除当番表・抽選無し」という名称の以下のシート  
<img src="/NoticeCleaningDuty/no_random_one/group.png">

### ライブラリ
Underscore：M3i7wmUA_5n0NSEaa6NnNqOBao7QLBR4j

### 通知内容
<img src="/NoticeCleaningDuty/no_random_one/result.png">

### エラー通知例
<img src="/NoticeCleaningDuty/no_random_one/error.png">
