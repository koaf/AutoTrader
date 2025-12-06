# 📘 セットアップガイド

AutoTraderの詳細なインストール・設定手順です。

---

## 📋 目次

1. [システム要件](#システム要件)
2. [インストール手順](#インストール手順)
3. [環境変数の設定](#環境変数の設定)
4. [MongoDBのセットアップ](#mongodbのセットアップ)
5. [起動方法](#起動方法)
6. [初回セットアップ](#初回セットアップ)
7. [トラブルシューティング](#トラブルシューティング)

---

## システム要件

### 必須

| 項目 | バージョン |
|:-----|:----------|
| Node.js | v16.0.0 以上 |
| npm | v8.0.0 以上 |
| MongoDB | v5.0 以上 |

### 推奨環境

| 項目 | 推奨値 |
|:-----|:-------|
| OS | Windows 10/11, macOS, Ubuntu 20.04+ |
| メモリ | 4GB以上 |
| ストレージ | 10GB以上の空き容量 |

---

## インストール手順

### 1. リポジトリのクローン

```bash
cd c:\Users\admin\Documents
git clone https://github.com/koaf/AutoTrader.git
cd AutoTrader
```

### 2. バックエンドの依存関係インストール

```bash
npm install
```

### 3. フロントエンドの依存関係インストール

```bash
cd client
npm install
cd ..
```

---

## 環境変数の設定

### .envファイルの作成

```bash
copy .env.example .env
```

### 環境変数一覧

| 変数名 | 説明 | 例 |
|:-------|:-----|:---|
| `PORT` | サーバーポート番号 | `5000` |
| `NODE_ENV` | 実行環境 | `development` / `production` |
| `MONGODB_URI` | MongoDB接続文字列 | `mongodb://localhost:27017/autotrader` |
| `JWT_SECRET` | JWT署名用シークレット | 32文字以上のランダム文字列 |
| `ENCRYPTION_KEY` | APIキー暗号化用キー | 32文字の文字列 |
| `GAS_WEBHOOK_URL` | Google Apps ScriptのURL | `https://script.google.com/macros/s/xxx/exec` |
| `GAS_API_SECRET` | GAS通信用シークレット | 32文字の文字列 |

### セキュリティキーの生成

```javascript
// Node.js REPLで実行
require('crypto').randomBytes(32).toString('hex')
```

### .envの例

```env
# サーバー設定
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/autotrader

# セキュリティ（必ず変更してください）
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key!

# ライセンス管理（オプション）
GAS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
GAS_API_SECRET=your_gas_api_secret_here
```

---

## MongoDBのセットアップ

### ローカルMongoDBの場合

#### Windows

```bash
# サービスとして起動
net start MongoDB

# または MongoDB Compass を使用
```

#### macOS（Homebrew）

```bash
brew services start mongodb-community
```

#### Ubuntu

```bash
sudo systemctl start mongod
```

### MongoDB Atlasの場合

1. [MongoDB Atlas](https://www.mongodb.com/atlas)でアカウント作成
2. クラスターを作成
3. 「Connect」→「Connect your application」
4. 接続文字列をコピーして`.env`に設定

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/autotrader
```

---

## 起動方法

### 開発環境

#### ターミナル1: バックエンド

```bash
cd c:\Users\admin\Documents\AutoTrader
npm run dev
```

#### ターミナル2: フロントエンド

```bash
cd c:\Users\admin\Documents\AutoTrader\client
npm start
```

### 本番環境

```bash
# フロントエンドのビルド
cd client
npm run build
cd ..

# サーバー起動（静的ファイルも配信）
npm start
```

### アクセスURL

| 環境 | URL |
|:-----|:----|
| フロントエンド（開発） | http://localhost:3000 |
| バックエンドAPI | http://localhost:5000 |
| フロントエンド（本番） | http://localhost:5000 |

---

## 初回セットアップ

### 1. ユーザー登録

1. http://localhost:3000/register にアクセス
2. メールアドレスとパスワードを入力
3. 「登録」ボタンをクリック

### 2. 管理者アカウントの作成

最初のユーザーを管理者にする場合：

```javascript
// MongoDB Shellで実行
use autotrader
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

### 3. APIキーの設定

1. ダッシュボードの「アカウント」→「API設定」
2. 取引所を選択
3. APIキー情報を入力して登録

---

## トラブルシューティング

### MongoDBに接続できない

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**解決方法:**
1. MongoDBサービスが起動しているか確認
2. 接続文字列が正しいか確認
3. ファイアウォールの設定を確認

### ポートが使用中

```
Error: listen EADDRINUSE: address already in use :::5000
```

**解決方法:**

```powershell
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### JWT認証エラー

```
Error: jwt malformed / jwt expired
```

**解決方法:**
1. 再ログインしてトークンを更新
2. ブラウザのlocalStorageをクリア

### モジュールが見つからない

```
Error: Cannot find module 'xxx'
```

**解決方法:**

```bash
rm -rf node_modules
npm install
```

---

## 次のステップ

- [🔑 取引所API設定](EXCHANGES.md) - APIキーの取得と設定
- [⚙️ ライセンス管理](LICENSE_SYSTEM.md) - ライセンスシステムの設定
