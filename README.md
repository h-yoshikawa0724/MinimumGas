## MinimumGas
規模の小さいGASプロジェクトのスクリプト置き場

自アカウントのGASプロジェクト管理画面：[G Suite Developer Hub](https://script.google.com/home)

### ライブラリ
GASエディタの リソース→ライブラリ から確認。  
新たに追加する場合は、ライブラリのプロジェクトキーを入力する。

### プロパティストア
GASプロジェクトに紐づいてデータを持っておける領域。  
プロパティ（キー）：値 の形式で環境変数のように扱える。  
3つの種類があるが、ここではスクリプトプロパティのみ記述。

#### スクリプトプロパティ
・登録、編集  
GASエディタの ファイル→プロジェクトのプロパティ→スクリプトのプロパティ から

※注意...そのGASプロジェクトのオーナー権限のアカウントである必要がある

・使用  
```js
PropertiesService.getScriptProperties().getProperty('プロパティ名');
```

### Clasp
[GitHub - clasp](https://github.com/google/clasp)  
GASをローカルで開発したい時に使えるCLIツール。

#### インストール
```
$ yarn add global @google/clasp
```

#### Google App Script APIの有効化
[G Suite Developer Hub - 設定](https://script.google.com/home/usersettings)から。  
Google App Script APIを有効化にする。  
※これをやらないとpushができない

#### ログイン
```
$ clasp login
```
自動でGoogleアカウントのログイン画面がブラウザで開く。  
ログインし、アクセス権限を許可する。

#### GASプロジェクトをクローン
```
$ clasp clone [scriptId/scriptURL]
```
scriptIdはGASエディタから、ファイル→プロジェクトのプロパティ→情報 で確認。

GASのコードをクローンとともに以下が作成される。
- `clasp.json`...scriptIdが記述されているファイル
- `appsscript.json`...使用しているライブラリなどの情報が記述されているファイル

#### GASエディタからpull
```
$ clasp pull
```

バージョン指定の場合
```
$ clasp -versionNumber バージョンナンバー
```

#### GASエディタへpush
```
$ clasp push
```
※push時に、GASエディタを開いている場合は再読み込みすること

