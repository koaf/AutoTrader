# 🔌 APIリファレンス

AutoTraderのREST APIエンドポイント一覧です。

---

## 📋 目次

1. [認証](#認証)
2. [エンドポイント一覧](#エンドポイント一覧)
   - [認証API](#認証api)
   - [APIキーAPI](#apikeyapi)
   - [取引API](#取引api)
   - [管理者API](#管理者api)
3. [リクエスト/レスポンス例](#リクエストレスポンス例)
4. [エラーコード](#エラーコード)

---

## 認証

### Bearer Token認証

すべての認証が必要なエンドポイントは、JWTトークンをヘッダーに含める必要があります。

```http
Authorization: Bearer <token>
```

### トークンの取得

ログインAPIで取得したトークンを使用します（有効期限：7日間）。

---

## エンドポイント一覧

### 認証API

`/api/auth`

| メソッド | パス | 説明 | 認証 |
|:---------|:-----|:-----|:----:|
| POST | `/register` | ユーザー登録 | 不要 |
| POST | `/login` | ログイン | 不要 |
| GET | `/me` | 現在のユーザー情報 | 必要 |
| PUT | `/password` | パスワード変更 | 必要 |
| PUT | `/settings` | ユーザー設定更新 | 必要 |

---

### APIキーAPI

`/api/apikey`

| メソッド | パス | 説明 | 認証 |
|:---------|:-----|:-----|:----:|
| GET | `/` | 全取引所のAPIキー情報 | 必要 |
| GET | `/exchanges` | サポート取引所一覧 | 必要 |
| GET | `/:exchange` | 特定取引所のAPIキー情報 | 必要 |
| POST | `/` | APIキー保存 | 必要 |
| DELETE | `/` | 全APIキー削除 | 必要 |
| DELETE | `/:exchange` | 特定取引所のAPIキー削除 | 必要 |
| POST | `/validate` | APIキー検証 | 必要 |

---

### 取引API

`/api/trading`

| メソッド | パス | 説明 | 認証 |
|:---------|:-----|:-----|:----:|
| GET | `/wallet` | ウォレット残高 | 必要 |
| GET | `/wallet?exchange=xxx` | 特定取引所の残高 | 必要 |
| GET | `/positions` | 全ポジション | 必要 |
| GET | `/positions?exchange=xxx` | 特定取引所のポジション | 必要 |
| POST | `/close-all` | 全ポジション決済 | 必要 |
| GET | `/funding-rate/:symbol` | ファンディングレート | 必要 |
| GET | `/history` | 取引履歴 | 必要 |
| GET | `/asset-history` | 資産履歴 | 必要 |
| GET | `/currencies` | 通貨設定取得 | 必要 |
| POST | `/currencies` | 通貨設定更新 | 必要 |
| POST | `/toggle` | 取引ON/OFF切替 | 必要 |
| GET | `/pnl-report` | 損益レポート | 必要 |
| GET | `/export-csv` | CSV出力 | 必要 |

---

### 管理者API

`/api/admin`

| メソッド | パス | 説明 | 認証 |
|:---------|:-----|:-----|:----:|
| GET | `/stats` | システム統計 | 管理者 |
| GET | `/users` | ユーザー一覧 | 管理者 |
| GET | `/users/:userId` | ユーザー詳細 | 管理者 |
| PUT | `/users/:userId/toggle-trading` | 取引ON/OFF | 管理者 |
| GET | `/logs` | システムログ | 管理者 |
| GET | `/scheduler/status` | スケジューラー状態 | 管理者 |
| POST | `/scheduler/start` | スケジューラー開始 | 管理者 |
| POST | `/scheduler/stop` | スケジューラー停止 | 管理者 |

---

## リクエスト/レスポンス例

### ログイン

**リクエスト:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス:**

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

---

### ウォレット残高取得

**リクエスト:**

```http
GET /api/trading/wallet
Authorization: Bearer <token>
```

**レスポンス:**

```json
{
  "wallets": [
    {
      "exchange": "bybit",
      "isTestnet": false,
      "wallet": [
        {
          "currency": "USDT",
          "walletBalance": 1000.50,
          "availableBalance": 800.25,
          "usedMargin": 200.25,
          "unrealizedPnl": 15.30,
          "totalEquity": 1015.80
        }
      ]
    },
    {
      "exchange": "binance",
      "isTestnet": false,
      "wallet": [...]
    }
  ]
}
```

---

### ポジション取得

**リクエスト:**

```http
GET /api/trading/positions?exchange=bybit
Authorization: Bearer <token>
```

**レスポンス:**

```json
{
  "exchange": "bybit",
  "isTestnet": false,
  "positions": [
    {
      "symbol": "BTCUSD",
      "side": "Buy",
      "size": 100,
      "entryPrice": 45000,
      "markPrice": 45500,
      "leverage": 1,
      "unrealizedPnl": 1.11,
      "liquidationPrice": 0,
      "positionValue": 0.00222
    }
  ]
}
```

---

### 全ポジション決済

**リクエスト:**

```http
POST /api/trading/close-all
Authorization: Bearer <token>
Content-Type: application/json

{
  "exchange": "bybit",
  "symbol": "BTCUSD"  // オプション
}
```

**レスポンス:**

```json
{
  "message": "ポジションを決済しました",
  "exchange": "bybit",
  "results": [
    {
      "retCode": 0,
      "retMsg": "OK",
      "result": {
        "orderId": "123456789"
      }
    }
  ]
}
```

---

### APIキー登録

**リクエスト:**

```http
POST /api/apikey
Authorization: Bearer <token>
Content-Type: application/json

{
  "exchange": "bybit",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret",
  "isTestnet": false
}
```

**レスポンス:**

```json
{
  "message": "APIキーを保存しました",
  "exchange": "bybit",
  "isTestnet": false
}
```

---

## エラーコード

### HTTPステータスコード

| コード | 説明 |
|:-------|:-----|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエストエラー |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

### エラーレスポンス形式

```json
{
  "message": "エラーメッセージ",
  "error": "詳細情報（開発環境のみ）"
}
```

---

## 次のステップ

- [🗄️ データベース設計](DATABASE.md) - MongoDBスキーマ
- [📘 セットアップガイド](SETUP.md) - システムの設定
