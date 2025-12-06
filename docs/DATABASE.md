# 🗄️ データベース設計

AutoTraderのMongoDBスキーマ定義です。

---

## 📋 目次

1. [概要](#概要)
2. [コレクション一覧](#コレクション一覧)
3. [スキーマ詳細](#スキーマ詳細)
4. [インデックス](#インデックス)
5. [関連図](#関連図)

---

## 概要

| 項目 | 値 |
|:-----|:---|
| データベース | MongoDB |
| ODM | Mongoose |
| デフォルトDB名 | `autotrader` |

---

## コレクション一覧

| コレクション | 説明 | ファイル |
|:-------------|:-----|:---------|
| `users` | ユーザー情報 | `User.js` |
| `apikeys` | 取引所APIキー | `ApiKey.js` |
| `tradehistories` | 取引履歴 | `TradeHistory.js` |
| `assethistories` | 資産履歴 | `AssetHistory.js` |
| `usersettings` | ユーザー設定 | `UserSettings.js` |
| `logs` | システムログ | `Log.js` |

---

## スキーマ詳細

### Users

ユーザー認証・管理情報

```javascript
{
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  licenseKey: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tradingEnabled: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

---

### ApiKeys

取引所APIキー（暗号化保存）

```javascript
{
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: String,
    required: true,
    enum: [
      'bybit', 
      'binance', 
      'okx', 
      'gateio',
      'aster',
      'hyperliquid',
      'edgex'
    ]
  },
  apiKey: {
    type: String,
    required: true  // 暗号化済み
  },
  apiSecret: {
    type: String,
    required: true  // 暗号化済み
  },
  passphrase: {
    type: String    // OKXのみ、暗号化済み
  },
  privateKey: {
    type: String    // Aster/Hyperliquidのみ、暗号化済み
  },
  walletAddress: {
    type: String    // Aster/Hyperliquidのみ
  },
  isTestnet: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**複合インデックス:** `{ userId: 1, exchange: 1 }` (unique)

---

### TradeHistories

取引履歴

```javascript
{
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['Buy', 'Sell'],
    required: true
  },
  orderType: {
    type: String,
    enum: ['Market', 'Limit'],
    default: 'Market'
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  realizedPnl: {
    type: Number,
    default: 0
  },
  fee: {
    type: Number,
    default: 0
  },
  orderId: {
    type: String,
    required: true
  },
  tradeType: {
    type: String,
    enum: ['open', 'close', 'liquidation'],
    default: 'open'
  },
  executedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

---

### AssetHistories

資産スナップショット履歴

```javascript
{
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: String,
    required: true
  },
  totalEquity: {
    type: Number,
    required: true
  },
  availableBalance: {
    type: Number,
    required: true
  },
  usedMargin: {
    type: Number,
    default: 0
  },
  unrealizedPnl: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USDT'
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}
```

---

### UserSettings

ユーザー個別設定

```javascript
{
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  tradingSettings: {
    defaultLeverage: {
      type: Number,
      default: 1
    },
    riskPerTrade: {
      type: Number,
      default: 1  // パーセント
    },
    maxPositions: {
      type: Number,
      default: 5
    },
    enabledExchanges: [{
      type: String
    }]
  },
  currencySettings: {
    // 取引所ごとの有効通貨設定
    bybit: [String],
    binance: [String],
    okx: [String],
    gateio: [String],
    aster: [String],
    hyperliquid: [String],
    edgex: [String]
  },
  notificationSettings: {
    emailAlerts: {
      type: Boolean,
      default: false
    },
    tradeAlerts: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

---

### Logs

システムログ

```javascript
{
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    required: true
  },
  category: {
    type: String,
    enum: ['system', 'trading', 'auth', 'api', 'scheduler'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  userId: {
    type: ObjectId,
    ref: 'User'
  },
  exchange: {
    type: String
  },
  metadata: {
    type: Mixed  // 追加情報
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000  // 30日後に自動削除
  }
}
```

---

## インデックス

### 推奨インデックス

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ licenseKey: 1 }, { unique: true });

// ApiKeys
db.apikeys.createIndex({ userId: 1, exchange: 1 }, { unique: true });
db.apikeys.createIndex({ userId: 1 });

// TradeHistories
db.tradehistories.createIndex({ userId: 1, executedAt: -1 });
db.tradehistories.createIndex({ userId: 1, exchange: 1 });
db.tradehistories.createIndex({ userId: 1, symbol: 1 });

// AssetHistories
db.assethistories.createIndex({ userId: 1, recordedAt: -1 });
db.assethistories.createIndex({ userId: 1, exchange: 1, recordedAt: -1 });

// Logs
db.logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
db.logs.createIndex({ userId: 1, createdAt: -1 });
db.logs.createIndex({ level: 1, category: 1 });
```

---

## 関連図

```
┌──────────────────────────────────────────────────────────────────┐
│                            Users                                  │
│  (_id, email, password, role, licenseKey, tradingEnabled)        │
└──────────────┬─────────────────────────────────────────────┬─────┘
               │                                             │
               │ 1:N                                         │ 1:1
               ▼                                             ▼
┌──────────────────────────┐                 ┌─────────────────────────┐
│        ApiKeys           │                 │     UserSettings        │
│  (userId, exchange,      │                 │  (userId, trading,      │
│   apiKey, apiSecret)     │                 │   currency, notify)     │
└──────────────────────────┘                 └─────────────────────────┘
               │
               │ 1:N
               ▼
┌──────────────────────────┐     ┌─────────────────────────┐
│     TradeHistories       │     │     AssetHistories      │
│  (userId, exchange,      │     │  (userId, exchange,     │
│   symbol, side, pnl)     │     │   totalEquity)          │
└──────────────────────────┘     └─────────────────────────┘
               
               ▼
┌──────────────────────────┐
│          Logs            │
│  (level, category,       │
│   message, userId)       │
└──────────────────────────┘
```

---

## バックアップ

### mongodumpでのバックアップ

```bash
# 全データベース
mongodump --uri="mongodb://localhost:27017/autotrader" --out=./backup

# 特定コレクション
mongodump --uri="mongodb://localhost:27017/autotrader" \
  --collection=users --out=./backup
```

### mongorestoreでのリストア

```bash
mongorestore --uri="mongodb://localhost:27017/autotrader" ./backup/autotrader
```

---

## 次のステップ

- [🔌 APIリファレンス](API.md) - REST APIドキュメント
- [📘 セットアップガイド](SETUP.md) - システムの設定
