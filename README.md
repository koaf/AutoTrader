# マルチ取引所 自動取引システム (AutoTrader)

複数の暗号資産取引所（Bybit, Binance, OKX, Gate.io, Aster, Hyperliquid, EdgeX）に対応した、レバレッジ1倍の自動取引資産運用システムです。

---

## 📋 目次

1. [システム概要](#システム概要)
2. [対応取引所](#対応取引所)
3. [主な機能](#主な機能)
4. [システム要件](#システム要件)
5. [インストール手順](#インストール手順)
6. [環境設定](#環境設定)
7. [ライセンス管理システム](#ライセンス管理システム)
8. [起動方法](#起動方法)
9. [使い方](#使い方)
10. [APIエンドポイント](#apiエンドポイント)
11. [データベース設計](#データベース設計)
12. [自動取引ロジック](#自動取引ロジック)
13. [セキュリティ](#セキュリティ)
14. [トラブルシューティング](#トラブルシューティング)

---

## システム概要

### コンセプト

本システムは、複数の暗号資産取引所の**ファンディングレート（資金調達率）**を活用した自動取引システムです。ファンディングレートの支払い時刻に合わせて自動的にポジションを調整し、安定した資産運用を目指します。

### 特徴

- **マルチ取引所対応**: Bybit, Binance, OKX, Gate.io, Aster, Hyperliquid, EdgeX
- **レバレッジ1倍固定**: リスクを最小限に抑えた安全な運用
- **複利運用対応**: 利益を自動的に再投資
- **マルチ通貨対応**: 各取引所で複数通貨に対応
- **ユーザー管理**: 複数ユーザーの同時運用が可能
- **管理者機能**: システム全体の監視・制御
- **ライセンス認証**: Google スプレッドシート連携による購入者管理

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

## 対応取引所

### 実装済み（CEX）

| 取引所 | タイプ | テストネット | 特記事項 |
|--------|--------|-------------|---------|
| **Bybit** | CEX | ✅ | インバース無期限契約 |
| **Binance** | CEX | ✅ | USDS-M Futures |

### 実装予定（CEX）

| 取引所 | タイプ | テストネット | 特記事項 |
|--------|--------|-------------|---------|
| **OKX** | CEX | ✅ | パスフレーズ認証が必要 |
| **Gate.io** | CEX | ✅ | USDT Perpetual |

### 実装予定（DEX）

| 取引所 | タイプ | テストネット | 特記事項 |
|--------|--------|-------------|---------|
| **Aster DEX** | DEX | ❌ | Web3署名（ウォレットアドレス必要） |
| **Hyperliquid** | DEX | ✅ | L1 DEX、Web3署名 |
| **EdgeX** | DEX | ✅ | StarkEx L2、Web3署名 |

### 取引所別API認証方式

| 取引所 | 認証方式 | 必要な認証情報 |
|--------|---------|---------------|
| Bybit | HMAC-SHA256 | API Key + API Secret |
| Binance | HMAC-SHA256 | API Key + API Secret |
| OKX | HMAC-SHA256 | API Key + API Secret + Passphrase |
| Gate.io | HMAC-SHA512 | API Key + API Secret |
| Aster | HMAC/Web3 | API Key + API Secret + Wallet Address |
| Hyperliquid | Web3署名 | API Key + API Secret + Wallet Address |
| EdgeX | Web3署名 | API Key + API Secret + Wallet Address |

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
| `GAS_WEBHOOK_URL` | Google Apps ScriptのウェブアプリURL | `https://script.google.com/macros/s/xxx/exec` |
| `GAS_API_SECRET` | GASとの通信用シークレット | GASで生成された32文字の文字列 |

### セキュリティキーの生成

```javascript
// Node.js REPLで実行
require('crypto').randomBytes(32).toString('hex')
```

---

## ライセンス管理システム

Google Apps Script (GAS) とスプレッドシートを使用したライセンス認証システムです。
ユーザー登録時に自動的にスプレッドシートへ情報が記録され、管理者が手動で承認することでシステムを利用可能にします。

### システムフロー

```
[ユーザー登録]
      ↓
[スプレッドシートに自動記録]
      ↓
[管理者がライセンス列をONに変更]
      ↓
[ユーザーがシステムを利用可能]
```

### GASセットアップ手順

#### 1. スプレッドシートの作成

1. [Google スプレッドシート](https://sheets.google.com)で新しいスプレッドシートを作成
2. スプレッドシートに分かりやすい名前を付ける（例：「AutoTrader ユーザー管理」）

#### 2. Google Apps Scriptの作成

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を選択
2. 新しいプロジェクトが開く
3. `gas/LicenseManager.gs` の内容をすべてコピーして貼り付け
4. プロジェクト名を設定（例：「AutoTrader License Manager」）
5. 「保存」（Ctrl+S）

#### 3. 初期設定の実行

1. Apps Scriptエディタで関数選択ドロップダウンから `initialSetup` を選択
2. 「実行」ボタンをクリック
3. 初回実行時は「承認が必要です」と表示されるので承認する：
   - 「権限を確認」をクリック
   - Googleアカウントを選択
   - 「詳細」→「（プロジェクト名）（安全ではないページ）に移動」
   - 「許可」をクリック
4. 設定完了のダイアログが表示される
5. **表示されたAPIシークレットをメモする**

#### 4. ウェブアプリとしてデプロイ

1. Apps Scriptエディタで「デプロイ」→「新しいデプロイ」
2. 「種類の選択」で「⚙ ウェブアプリ」を選択
3. 以下の設定を行う：
   - **説明**: 「License Management API」（任意）
   - **次のユーザーとして実行**: 「自分」
   - **アクセスできるユーザー**: 「全員」
4. 「デプロイ」をクリック
5. **表示されたウェブアプリURLをコピー**

#### 5. 環境変数の設定

`.env`ファイルに以下を追加：

```env
# Google Apps Script License Configuration
GAS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
GAS_API_SECRET=your_gas_api_secret_here
```

- `GAS_WEBHOOK_URL`: 手順4でコピーしたウェブアプリURL
- `GAS_API_SECRET`: 手順3でメモしたAPIシークレット

### スプレッドシートの構造

GASを実行すると、以下のヘッダーを持つ「ユーザー管理」シートが自動作成されます：

| No. | メールアドレス | ユーザーID | 登録日時 | ライセンス | 承認日時 | メモ |
|-----|--------------|-----------|---------|-----------|---------|------|
| 1 | user@example.com | 64a1b2c3... | 2024-01-01T09:00:00Z | OFF | | |

### ライセンス管理方法

#### 承認方法（2つの方法）

**方法1: 直接編集**
1. スプレッドシートを開く
2. 対象ユーザーの「ライセンス」列（E列）を `OFF` から `ON` に変更

**方法2: メニューから操作**
1. スプレッドシートを開く
2. 対象ユーザーの行を選択（複数行可）
3. メニューの「ライセンス管理」→「選択行のライセンスをONにする」

#### ライセンスの取り消し

1. 対象ユーザーの「ライセンス」列を `ON` から `OFF` に変更
2. または「ライセンス管理」→「選択行のライセンスをOFFにする」

### ユーザー側の動作

1. **登録直後**: 「ライセンス承認待ち」画面が表示される
2. **管理者が承認**: 30秒ごとに自動確認、または「ライセンス状態を確認」ボタンで即時確認
3. **承認後**: ダッシュボードにアクセス可能

### GASの更新方法

スクリプトを更新した場合は、新しいデプロイが必要です：

1. Apps Scriptエディタで「デプロイ」→「デプロイを管理」
2. 右上の「✏ 編集」アイコンをクリック
3. 「バージョン」を「新しいバージョン」に変更
4. 「デプロイ」をクリック

**注意**: URLは変わりませんが、新しいバージョンとして再デプロイする必要があります。

### トラブルシューティング（ライセンス）

#### 「License service not configured」エラー

- `.env`ファイルに`GAS_WEBHOOK_URL`と`GAS_API_SECRET`が設定されているか確認
- サーバーを再起動

#### スプレッドシートに登録されない

- GASのデプロイが正しく行われているか確認
- ウェブアプリURLが正しいか確認
- APIシークレットが一致しているか確認
- GASの実行ログを確認（Apps Script→実行→履歴）

#### ライセンスがONなのにログインできない

- ユーザーが「ライセンス状態を確認」ボタンをクリック
- またはログアウトして再ログイン
- スプレッドシートの値が正確に`ON`（大文字）になっているか確認

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

#### 取引所別APIキー取得方法

##### Bybit

1. [Bybit](https://www.bybit.com)にログイン
2. 「API管理」→「新しいキーを作成」
3. 以下の権限を設定:
   - **読み取り**: 有効
   - **取引**: 有効
   - **出金**: **無効**（セキュリティのため）
4. IP制限を設定（推奨）

##### Binance

1. [Binance](https://www.binance.com)にログイン
2. 「API管理」→「APIの作成」
3. 「システム生成」を選択
4. 以下の権限を設定:
   - **先物取引を有効にする**: 有効
   - **出金を有効にする**: **無効**
5. IP制限を設定（推奨）

##### OKX（準備中）

1. [OKX](https://www.okx.com)にログイン
2. 「API」→「APIを作成」
3. **パスフレーズを設定**（必須）
4. 以下の権限を設定:
   - **取引**: 有効
   - **出金**: **無効**

#### システムへのAPIキー登録

1. ダッシュボードの「アカウント」→「API設定」タブへ
2. 取引所を選択
3. 「API Key」と「API Secret」を入力
4. OKXの場合は「パスフレーズ」も入力
5. DEXの場合は「ウォレットアドレス」も入力
6. テストネットを使用する場合はチェックを入れる
7. 「登録」をクリック
8. APIキーは暗号化されて保存されます

### 取引設定

#### 取引所の追加

1. サイドメニューから「アカウント」を選択
2. 「API設定」タブを開く
3. 取引所を選択してAPIキーを登録
4. 複数の取引所を同時に登録可能

#### 通貨の選択

1. サイドメニューから「通貨設定」を選択
2. 取引したい通貨をONに切り替え
3. 取引所ごとに対応通貨が異なります

| 取引所 | 対応通貨 |
|--------|---------|
| Bybit | BTC, ETH, XRP, EOS |
| Binance | BTC, ETH, BNB, XRP, SOL |

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

#### 取引所フィルター

ダッシュボード右上のドロップダウンで表示する取引所を選択できます：
- **全取引所**: すべての登録済み取引所を表示
- **個別取引所**: 特定の取引所のみ表示

#### 残高カード（取引所別）

| 項目 | 説明 |
|------|------|
| 取引所名 | Bybit, Binance等 |
| 環境 | テストネット/本番環境 |
| 総残高 | ウォレット内の総資産 |
| 利用可能残高 | 取引に使用可能な残高 |
| 未実現損益 | 現在のポジションの含み損益 |

#### ポジション一覧（取引所別）

| 項目 | 説明 |
|------|------|
| 取引所 | ポジションを保有している取引所 |
| 通貨 | 取引通貨ペア |
| 方向 | Long（買い）/ Short（売り） |
| サイズ | ポジションサイズ |
| 参入価格 | ポジションを建てた価格 |
| 現在価格 | 現在の市場価格 |
| 未実現P&L | 含み損益 |
| 全決済 | 取引所ごとに全ポジション決済可能 |

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
| GET | `/` | 全取引所のAPIキー情報取得 | 必要 |
| GET | `/exchanges` | サポート取引所一覧 | 必要 |
| GET | `/:exchange` | 特定取引所のAPIキー情報 | 必要 |
| POST | `/` | APIキー保存（取引所指定） | 必要 |
| DELETE | `/` | 全APIキー削除 | 必要 |
| DELETE | `/:exchange` | 特定取引所のAPIキー削除 | 必要 |
| POST | `/validate` | APIキー検証 | 必要 |

### 取引 API (`/api/trading`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/wallet` | 全取引所のウォレット残高 | 必要 |
| GET | `/wallet?exchange=xxx` | 特定取引所のウォレット残高 | 必要 |
| GET | `/positions` | 全取引所のポジション一覧 | 必要 |
| GET | `/positions?exchange=xxx` | 特定取引所のポジション一覧 | 必要 |
| POST | `/close-all` | 全ポジションクローズ（取引所指定可） | 必要 |
| GET | `/funding-rate/:symbol?exchange=xxx` | ファンディングレート取得 | 必要 |
| GET | `/history` | 取引履歴 | 必要 |
| GET | `/asset-history` | 資産履歴 | 必要 |
| GET | `/currencies` | 通貨設定取得 | 必要 |
| GET | `/currencies?exchange=xxx` | 取引所別通貨設定取得 | 必要 |
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
  exchange: String,        // "bybit" | "binance" | "okx" | "gateio" | "aster" | "hyperliquid" | "edgex"
  apiKey: String,          // AES暗号化されたAPIキー
  apiSecret: String,       // AES暗号化されたAPIシークレット
  passphrase: String,      // AES暗号化されたパスフレーズ（OKX用）
  walletAddress: String,   // AES暗号化されたウォレットアドレス（DEX用）
  isTestnet: Boolean,      // テストネットフラグ
  isValid: Boolean,        // APIキー有効フラグ
  lastValidated: Date,     // 最終検証日時
  createdAt: Date,
  updatedAt: Date
}
```

### TradeHistories コレクション

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  exchange: String,        // "bybit" | "binance" | etc.
  symbol: String,          // "BTCUSD", "BTCUSDT"など
  side: String,            // "Buy" | "Sell" | "Close"
  orderType: String,       // "Market" | "Limit"
  qty: String,             // 数量
  price: String,           // 約定価格
  executedAt: Date,        // 約定日時
  orderId: String,         // 取引所注文ID
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
│   │   ├── ApiKey.js         # APIキーモデル（マルチ取引所対応）
│   │   ├── TradeHistory.js   # 取引履歴モデル
│   │   ├── AssetHistory.js   # 資産履歴モデル
│   │   ├── Position.js       # ポジションモデル
│   │   ├── SystemLog.js      # システムログモデル
│   │   └── SystemSettings.js # システム設定モデル
│   ├── services/
│   │   ├── bybitClient.js    # Bybit APIクライアント
│   │   ├── binanceClient.js  # Binance Futures APIクライアント
│   │   ├── exchangeFactory.js # 取引所クライアントファクトリー
│   │   └── tradingScheduler.js # 自動取引スケジューラー
│   ├── middleware/
│   │   └── auth.js           # 認証ミドルウェア
│   └── routes/
│       ├── auth.js           # 認証ルート
│       ├── apikey.js         # APIキールート（マルチ取引所対応）
│       ├── trading.js        # 取引ルート（マルチ取引所対応）
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
            ├── Dashboard.js  # ダッシュボード（マルチ取引所対応）
            ├── Dashboard.css
            ├── TradeHistory.js # 取引履歴
            ├── TradeHistory.css
            ├── AssetHistory.js # 資産履歴
            ├── AssetHistory.css
            ├── Currencies.js # 通貨設定
            ├── Currencies.css
            ├── Account.js    # アカウント設定（マルチ取引所対応）
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
| 1.0.0 | 2024-12-01 | 初回リリース（Bybit対応） |
| 1.1.0 | 2024-12-02 | ライセンスシステム対応 |
| 2.0.0 | 2024-12-02 | マルチ取引所対応（Binance追加） |
---

**⚠️ 免責事項**: 本システムは投資助言を目的としたものではありません。暗号資産取引には大きなリスクが伴います。投資判断は自己責任で行ってください。
