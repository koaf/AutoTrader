# Bybit 自動取引システム (AutoTrader)

Bybitのインバース無期限契約（Inverse Perpetual）を利用した、レバレッジ1倍の自動取引資産運用システムです。

---

## 📋 目次

1. [システム概要](#システム概要)
2. [主な機能](#主な機能)
3. [システム要件](#システム要件)
4. [インストール手順](#インストール手順)
5. [環境設定](#環境設定)
6. [起動方法](#起動方法)
7. [使い方](#使い方)
8. [APIエンドポイント](#apiエンドポイント)
9. [データベース設計](#データベース設計)
10. [自動取引ロジック](#自動取引ロジック)
11. [セキュリティ](#セキュリティ)
12. [トラブルシューティング](#トラブルシューティング)

---

## システム概要

### コンセプト

本システムは、Bybitの**ファンディングレート（資金調達率）**を活用した自動取引システムです。ファンディングレートの支払い時刻（9:00, 17:00, 1:00 JST）に合わせて自動的にポジションを調整し、安定した資産運用を目指します。

### 特徴

- **レバレッジ1倍固定**: リスクを最小限に抑えた安全な運用
- **複利運用対応**: 利益を自動的に再投資
- **マルチ通貨対応**: BTC, ETH, XRP, EOS, DOTなど複数通貨に対応
- **ユーザー管理**: 複数ユーザーの同時運用が可能
- **管理者機能**: システム全体の監視・制御

### 技術スタック

| カテゴリ | 技術 |
|---------|------|
| バックエンド | Node.js, Express.js |
| フロントエンド | React 18, React Router v6 |
| データベース | MongoDB, Mongoose |
| 認証 | JWT (JSON Web Token) |
| 暗号化 | AES-256 (crypto-js), bcryptjs |
| スケジューラー | node-cron |
| チャート | Chart.js, react-chartjs-2 |
| API通信 | Axios |

---

## 主な機能

### ユーザー機能

| 機能 | 説明 |
|------|------|
| ユーザー登録・ログイン | メールアドレスとパスワードによる認証 |
| ダッシュボード | 残高、ポジション、最近の取引を一覧表示 |
| APIキー管理 | BybitのAPIキーを暗号化して保存 |
| 取引履歴 | 過去の取引を詳細に確認 |
| 資産履歴 | 資産推移をグラフで可視化 |
| 通貨設定 | 取引対象通貨の有効/無効切り替え |
| アカウント設定 | パスワード変更、複利設定、取引ON/OFF |

### 管理者機能

| 機能 | 説明 |
|------|------|
| システムダッシュボード | 全体統計、スケジューラー状態確認 |
| ユーザー管理 | 全ユーザーの一覧・詳細表示 |
| ユーザー取引制御 | 個別ユーザーの取引ON/OFF |
| システムログ | エラー・取引・システムログの確認 |
| スケジューラー制御 | 自動取引の開始/停止 |

---

## システム要件

### 必須要件

- **Node.js**: v16.0.0 以上
- **npm**: v8.0.0 以上
- **MongoDB**: v5.0 以上
- **Bybitアカウント**: APIキー発行が必要

### 推奨環境

- **OS**: Windows 10/11, macOS, Ubuntu 20.04+
- **メモリ**: 4GB以上
- **ストレージ**: 10GB以上の空き容量

---

## インストール手順

### 1. リポジトリのクローン

```bash
cd c:\Users\admin\Documents
git clone <repository-url> AutoTrader
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

### 4. MongoDBのセットアップ

#### ローカルMongoDBの場合

```bash
# Windows (MongoDB Compassを使用するか、サービスとして起動)
net start MongoDB

# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod
```

#### MongoDB Atlasの場合

1. [MongoDB Atlas](https://www.mongodb.com/atlas)でアカウント作成
2. クラスターを作成
3. 接続文字列を取得

---

## 環境設定

### .envファイルの作成

プロジェクトルートに`.env`ファイルを作成します。

```bash
copy .env.example .env
```

### 環境変数の設定

```env
# サーバー設定
PORT=5000
NODE_ENV=development

# MongoDB接続
MONGODB_URI=mongodb://localhost:27017/autotrader

# JWT設定（32文字以上の安全な文字列）
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-chars

# 暗号化キー（32文字の文字列）
ENCRYPTION_KEY=your-32-character-encryption-key!

# Bybit API設定（オプション：テスト用）
BYBIT_TESTNET=false
```

### 環境変数の説明

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `PORT` | サーバーポート番号 | `5000` |
| `NODE_ENV` | 実行環境 | `development` / `production` |
| `MONGODB_URI` | MongoDB接続文字列 | `mongodb://localhost:27017/autotrader` |
| `JWT_SECRET` | JWTトークン署名用シークレット | 32文字以上のランダム文字列 |
| `ENCRYPTION_KEY` | APIキー暗号化用キー | 32文字の文字列 |
| `BYBIT_TESTNET` | テストネット使用フラグ | `true` / `false` |

### セキュリティキーの生成

```javascript
// Node.js REPLで実行
require('crypto').randomBytes(32).toString('hex')
```

---

## 起動方法

### 開発環境

#### ターミナル1: バックエンドサーバー

```bash
cd c:\Users\admin\Documents\AutoTrader
npm run dev
```

#### ターミナル2: フロントエンド開発サーバー

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

# サーバー起動
npm start
```

### アクセスURL

| 環境 | URL |
|------|-----|
| フロントエンド（開発） | http://localhost:3000 |
| バックエンドAPI | http://localhost:5000 |
| フロントエンド（本番） | http://localhost:5000 |

---

## 使い方

### 初回セットアップ

#### 1. 管理者アカウントの作成

最初に登録したユーザーは通常ユーザーとして作成されます。管理者にするには、MongoDBで直接ロールを変更します。

```javascript
// MongoDB Shellで実行
use autotrader
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

#### 2. ユーザー登録

1. http://localhost:3000/register にアクセス
2. メールアドレスとパスワードを入力
3. 「登録」ボタンをクリック

#### 3. ログイン

1. http://localhost:3000/login にアクセス
2. 登録したメールアドレスとパスワードでログイン

### APIキーの設定

#### Bybit APIキーの取得

1. [Bybit](https://www.bybit.com)にログイン
2. 「API管理」→「新しいキーを作成」
3. 以下の権限を設定:
   - **読み取り**: 有効
   - **取引**: 有効
   - **出金**: **無効**（セキュリティのため）
4. IP制限を設定（推奨）

#### システムへのAPIキー登録

1. ダッシュボードの「APIキー設定」セクションへ
2. 「API Key」と「API Secret」を入力
3. 「保存」をクリック
4. APIキーは暗号化されて保存されます

### 取引設定

#### 通貨の選択

1. サイドメニューから「通貨設定」を選択
2. 取引したい通貨をONに切り替え
3. 対応通貨: BTC, ETH, XRP, EOS, DOT

#### 複利設定

1. サイドメニューから「アカウント」を選択
2. 「複利設定」セクションで:
   - **複利を有効にする**: ON/OFF
   - **再投資率**: 0〜100%（利益の何%を再投資するか）
3. 「設定を保存」をクリック

#### 取引の開始

1. 「アカウント」ページで「自動取引を有効にする」をON
2. APIキーが設定されていることを確認
3. スケジューラーが稼働中であれば、設定時刻に自動取引開始

### ダッシュボードの見方

#### 残高カード

| 項目 | 説明 |
|------|------|
| 総残高 | ウォレット内の総資産（BTC換算） |
| 利用可能残高 | 取引に使用可能な残高 |
| 未実現損益 | 現在のポジションの含み損益 |

#### ポジション一覧

| 項目 | 説明 |
|------|------|
| 通貨 | 取引通貨ペア |
| 方向 | Long（買い）/ Short（売り） |
| サイズ | ポジションサイズ |
| 参入価格 | ポジションを建てた価格 |
| 現在価格 | 現在の市場価格 |
| 未実現P&L | 含み損益 |

#### 最近の取引

直近の取引履歴が表示されます。

### 管理者機能の使い方

#### 管理者ダッシュボードへのアクセス

1. 管理者アカウントでログイン
2. サイドメニューから「管理者」→「ダッシュボード」

#### スケジューラーの制御

1. 管理者ダッシュボードの「スケジューラー」カードで状態確認
2. 「開始」/「停止」ボタンでON/OFF切り替え

#### ユーザー管理

1. 「管理者」→「ユーザー管理」
2. ユーザー一覧から対象ユーザーを選択
3. 「詳細」ボタンでユーザー詳細を確認
4. 「取引」ボタンで個別ユーザーの取引ON/OFF

#### システムログの確認

1. 「管理者」→「システムログ」
2. タイプ・カテゴリでフィルタリング可能
3. エラーログは赤色で強調表示

---

## APIエンドポイント

### 認証 API (`/api/auth`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | `/register` | ユーザー登録 | 不要 |
| POST | `/login` | ログイン | 不要 |
| GET | `/me` | 現在のユーザー情報取得 | 必要 |
| PUT | `/password` | パスワード変更 | 必要 |
| PUT | `/settings` | ユーザー設定更新 | 必要 |

### APIキー API (`/api/apikey`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/` | APIキー存在確認 | 必要 |
| POST | `/` | APIキー保存 | 必要 |
| DELETE | `/` | APIキー削除 | 必要 |
| POST | `/verify` | APIキー検証 | 必要 |

### 取引 API (`/api/trading`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/dashboard` | ダッシュボードデータ | 必要 |
| GET | `/positions` | ポジション一覧 | 必要 |
| POST | `/close-all` | 全ポジションクローズ | 必要 |
| GET | `/funding-rate/:symbol` | ファンディングレート取得 | 必要 |
| GET | `/history` | 取引履歴 | 必要 |
| GET | `/asset-history` | 資産履歴 | 必要 |
| GET | `/currencies` | 通貨設定取得 | 必要 |
| PUT | `/currencies` | 通貨設定更新 | 必要 |

### 管理者 API (`/api/admin`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/stats` | システム統計 | 管理者 |
| GET | `/users` | ユーザー一覧 | 管理者 |
| GET | `/users/:userId` | ユーザー詳細 | 管理者 |
| PUT | `/users/:userId/toggle-trading` | 取引ON/OFF | 管理者 |
| GET | `/logs` | システムログ | 管理者 |
| GET | `/scheduler/status` | スケジューラー状態 | 管理者 |
| POST | `/scheduler/start` | スケジューラー開始 | 管理者 |
| POST | `/scheduler/stop` | スケジューラー停止 | 管理者 |

### リクエスト/レスポンス例

#### ログイン

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6789012345",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### ダッシュボードデータ取得

```http
GET /api/trading/dashboard
Authorization: Bearer <token>
```

```json
{
  "balance": {
    "totalWalletBalance": "1.5432",
    "availableBalance": "1.2345",
    "unrealisedPnl": "0.0123"
  },
  "positions": [
    {
      "symbol": "BTCUSD",
      "side": "Buy",
      "size": "100",
      "entryPrice": "45000",
      "markPrice": "45500",
      "unrealisedPnl": "0.0111"
    }
  ],
  "recentTrades": [...]
}
```

---

## データベース設計

### コレクション一覧

```
autotrader/
├── users          # ユーザー情報
├── apikeys        # 暗号化されたAPIキー
├── tradehistories # 取引履歴
├── assethistories # 資産スナップショット
├── positions      # ポジション履歴
├── systemlogs     # システムログ
└── systemsettings # システム設定
```

### Users コレクション

```javascript
{
  _id: ObjectId,
  email: String,           // メールアドレス（ユニーク）
  password: String,        // ハッシュ化されたパスワード
  role: String,            // "user" | "admin"
  tradingEnabled: Boolean, // 取引有効フラグ
  currencies: {            // 通貨設定
    BTC: Boolean,
    ETH: Boolean,
    XRP: Boolean,
    EOS: Boolean,
    DOT: Boolean
  },
  compoundInterest: {      // 複利設定
    enabled: Boolean,
    reinvestmentRate: Number // 0-100
  },
  createdAt: Date,
  updatedAt: Date
}
```

### ApiKeys コレクション

```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // 参照: Users
  apiKey: String,          // AES暗号化されたAPIキー
  apiSecret: String,       // AES暗号化されたAPIシークレット
  isTestnet: Boolean,      // テストネットフラグ
  createdAt: Date,
  updatedAt: Date
}
```

### TradeHistories コレクション

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  symbol: String,          // "BTCUSD", "ETHUSD"など
  side: String,            // "Buy" | "Sell"
  orderType: String,       // "Market" | "Limit"
  qty: String,             // 数量
  price: String,           // 約定価格
  executedAt: Date,        // 約定日時
  orderId: String,         // Bybit注文ID
  pnl: Number,             // 実現損益
  fee: Number,             // 手数料
  fundingRate: Number,     // ファンディングレート
  createdAt: Date
}
```

### AssetHistories コレクション

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  totalBalance: Number,    // 総残高
  availableBalance: Number,// 利用可能残高
  unrealisedPnl: Number,   // 未実現損益
  currency: String,        // "BTC"
  snapshotAt: Date,        // スナップショット日時
  createdAt: Date
}
```

### SystemLogs コレクション

```javascript
{
  _id: ObjectId,
  type: String,            // "info" | "warning" | "error" | "trade" | "system"
  category: String,        // "auth" | "trade" | "api" | "scheduler" | "system" | "admin"
  message: String,         // ログメッセージ
  userId: ObjectId,        // 関連ユーザー（オプション）
  details: Object,         // 追加情報
  createdAt: Date
}
```

---

## 自動取引ロジック

### 取引スケジュール

ファンディングレートの支払い時刻に合わせて自動取引を実行します。

| 実行時刻 (JST) | 説明 |
|----------------|------|
| 09:00 | 第1回ファンディングレート |
| 17:00 | 第2回ファンディングレート |
| 01:00 | 第3回ファンディングレート |

### 取引フロー

```
[スケジューラー起動]
        ↓
[取引有効ユーザー取得]
        ↓
[各ユーザーループ]
        ↓
[APIキー復号化]
        ↓
[ウォレット残高取得]
        ↓
[有効通貨でループ]
        ↓
[ファンディングレート取得]
        ↓
[ポジションサイズ計算]
  └─ 複利有効時: 残高 × 再投資率
  └─ 複利無効時: 初期設定残高
        ↓
[注文実行]
  └─ レバレッジ: 1倍
  └─ 注文タイプ: 成行
        ↓
[取引履歴保存]
        ↓
[資産スナップショット保存]
```

### ファンディングレート戦略

```javascript
// ファンディングレートに基づくポジション決定
if (fundingRate > 0) {
  // 正のレート: ロングがショートに支払う
  // → ショートポジションを取る（受け取り側）
  side = 'Sell';
} else {
  // 負のレート: ショートがロングに支払う
  // → ロングポジションを取る（受け取り側）
  side = 'Buy';
}
```

### 複利計算

```javascript
// 複利が有効な場合のポジションサイズ計算
if (user.compoundInterest.enabled) {
  const reinvestmentRate = user.compoundInterest.reinvestmentRate / 100;
  positionSize = totalBalance * reinvestmentRate;
} else {
  positionSize = initialBalance;
}
```

---

## セキュリティ

### 実装されているセキュリティ機能

| 機能 | 説明 |
|------|------|
| パスワードハッシュ化 | bcryptjs（ソルトラウンド10） |
| APIキー暗号化 | AES-256暗号化 |
| JWT認証 | 有効期限7日間のトークン |
| CORS制限 | 許可されたオリジンのみ |
| 入力検証 | express-validator |
| レート制限 | express-rate-limit（推奨） |

### セキュリティ推奨事項

#### 本番環境での追加設定

```javascript
// server/index.js に追加
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // IPあたり100リクエスト
}));
```

#### APIキーの権限設定

- **必須**: 読み取り、取引
- **禁止**: 出金（絶対に無効にすること）
- **推奨**: IP制限を設定

#### 環境変数の管理

- `.env`ファイルは絶対にGitにコミットしない
- 本番環境では環境変数を直接設定
- シークレットは定期的にローテーション

---

## トラブルシューティング

### よくある問題と解決方法

#### MongoDBに接続できない

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**解決方法**:
1. MongoDBサービスが起動しているか確認
2. 接続文字列が正しいか確認
3. ファイアウォールの設定を確認

#### APIキーエラー

```
Bybit API Error: Invalid API key
```

**解決方法**:
1. APIキーとシークレットが正しいか確認
2. APIキーの権限設定を確認
3. IP制限がある場合、サーバーIPを許可リストに追加
4. テストネット設定を確認

#### JWT認証エラー

```
Error: jwt malformed / jwt expired
```

**解決方法**:
1. 再ログインしてトークンを更新
2. ブラウザのlocalStorageをクリア
3. JWT_SECRETが変更されていないか確認

#### 取引が実行されない

**確認事項**:
1. `tradingEnabled`が`true`になっているか
2. APIキーが設定されているか
3. 対象通貨が有効になっているか
4. スケジューラーが稼働しているか
5. 十分な残高があるか

#### ポートが使用中

```
Error: listen EADDRINUSE: address already in use :::5000
```

**解決方法**:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS / Linux
lsof -i :5000
kill -9 <PID>
```

### ログの確認方法

#### サーバーログ

コンソール出力を確認

#### システムログ（データベース）

```javascript
// MongoDB Shell
use autotrader
db.systemlogs.find({ type: "error" }).sort({ createdAt: -1 }).limit(10)
```

#### 管理者画面

管理者でログイン → システムログページ

---

## ファイル構成

```
AutoTrader/
├── package.json              # バックエンド設定
├── .env.example              # 環境変数テンプレート
├── .env                      # 環境変数（Git管理外）
├── README.md                 # このドキュメント
│
├── server/
│   ├── index.js              # Expressサーバーエントリーポイント
│   ├── models/
│   │   ├── index.js          # モデルエクスポート
│   │   ├── User.js           # ユーザーモデル
│   │   ├── ApiKey.js         # APIキーモデル
│   │   ├── TradeHistory.js   # 取引履歴モデル
│   │   ├── AssetHistory.js   # 資産履歴モデル
│   │   ├── Position.js       # ポジションモデル
│   │   ├── SystemLog.js      # システムログモデル
│   │   └── SystemSettings.js # システム設定モデル
│   ├── services/
│   │   ├── bybitClient.js    # Bybit APIクライアント
│   │   └── tradingScheduler.js # 自動取引スケジューラー
│   ├── middleware/
│   │   └── auth.js           # 認証ミドルウェア
│   └── routes/
│       ├── auth.js           # 認証ルート
│       ├── apikey.js         # APIキールート
│       ├── trading.js        # 取引ルート
│       └── admin.js          # 管理者ルート
│
└── client/
    ├── package.json          # フロントエンド設定
    ├── public/
    │   └── index.html        # HTMLテンプレート
    └── src/
        ├── index.js          # Reactエントリーポイント
        ├── index.css         # グローバルスタイル
        ├── App.js            # メインアプリコンポーネント
        ├── context/
        │   └── AuthContext.js # 認証コンテキスト
        ├── services/
        │   └── api.js        # Axios設定
        ├── components/
        │   ├── Layout.js     # ユーザーレイアウト
        │   ├── Layout.css
        │   ├── AdminLayout.js # 管理者レイアウト
        │   └── AdminLayout.css
        └── pages/
            ├── Login.js      # ログインページ
            ├── Register.js   # 登録ページ
            ├── Auth.css
            ├── Dashboard.js  # ダッシュボード
            ├── Dashboard.css
            ├── TradeHistory.js # 取引履歴
            ├── TradeHistory.css
            ├── AssetHistory.js # 資産履歴
            ├── AssetHistory.css
            ├── Currencies.js # 通貨設定
            ├── Currencies.css
            ├── Account.js    # アカウント設定
            ├── Account.css
            └── admin/
                ├── AdminDashboard.js  # 管理者ダッシュボード
                ├── AdminDashboard.css
                ├── AdminUsers.js      # ユーザー管理
                ├── AdminUsers.css
                ├── AdminUserDetail.js # ユーザー詳細
                ├── AdminUserDetail.css
                ├── AdminLogs.js       # システムログ
                └── AdminLogs.css
```

---

## ライセンス

MIT License

---

## サポート

問題が発生した場合は、以下を確認してください：

1. このREADMEのトラブルシューティングセクション
2. システムログ（管理者画面）
3. サーバーコンソール出力

---

## 更新履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2024-XX-XX | 初回リリース |

---

**⚠️ 免責事項**: 本システムは投資助言を目的としたものではありません。暗号資産取引には大きなリスクが伴います。投資判断は自己責任で行ってください。
