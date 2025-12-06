# 🚀 AutoTrader - マルチ取引所自動取引システム

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/koaf/AutoTrader)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

複数の暗号資産取引所に対応した、**ファンディングレート**を活用した自動取引システムです。

---

## ✨ 特徴

- 🏦 **7つの取引所に対応** - CEX 4社 + DEX 3社
- 📈 **ファンディングレート戦略** - 支払い時刻に合わせた自動取引
- 🔒 **レバレッジ1倍固定** - リスクを抑えた安全運用
- 💹 **複利運用対応** - 利益の自動再投資
- 👥 **マルチユーザー** - 複数ユーザーの同時運用
- 🔐 **セキュリティ** - APIキーのAES-256暗号化

---

## 🏦 対応取引所

### CEX（中央集権型取引所）

| 取引所 | 契約タイプ | 認証方式 | テストネット |
|:------:|:----------|:---------|:------------:|
| **Bybit** | インバース無期限 | HMAC-SHA256 | ✅ |
| **Binance** | USDS-M Futures | HMAC-SHA256 | ✅ |
| **OKX** | Perpetual Swap | HMAC-SHA256 + Passphrase | ✅ |
| **Gate.io** | USDT Perpetual | HMAC-SHA512 | ✅ |

### DEX（分散型取引所）

| 取引所 | 契約タイプ | 認証方式 | テストネット |
|:------:|:----------|:---------|:------------:|
| **Aster DEX** | USDT-M Perpetual | Web3/ECDSA | ✅ |
| **Hyperliquid** | USDC Perpetual (L1) | Web3/ECDSA | ✅ |
| **EdgeX** | USDC Perpetual (StarkEx L2) | HMAC-SHA256 | ✅ |

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|:--------|:-----|
| **Backend** | Node.js, Express.js |
| **Frontend** | React 18, React Router v6, Chart.js |
| **Database** | MongoDB, Mongoose |
| **認証** | JWT, bcryptjs |
| **暗号化** | AES-256 (crypto-js) |
| **スケジューラー** | node-cron |

---

## ⚡ クイックスタート

### 必要要件

- Node.js v16.0.0+
- MongoDB v5.0+
- 取引所のAPIキー

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/koaf/AutoTrader.git
cd AutoTrader

# 依存関係をインストール
npm install
cd client && npm install && cd ..

# 環境変数を設定
cp .env.example .env
# .envファイルを編集

# 起動
npm run dev          # バックエンド
cd client && npm start  # フロントエンド（別ターミナル）
```

### 環境変数（.env）

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/autotrader
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key!
```

---

## 📖 ドキュメント

| ドキュメント | 説明 |
|:------------|:-----|
| [📘 セットアップガイド](docs/SETUP.md) | 詳細なインストール・設定手順 |
| [🔑 取引所API設定](docs/EXCHANGES.md) | 各取引所のAPIキー取得・設定方法 |
| [⚙️ ライセンス管理](docs/LICENSE_SYSTEM.md) | Google Sheets連携のライセンスシステム |
| [🔌 APIリファレンス](docs/API.md) | REST APIエンドポイント一覧 |
| [🗄️ データベース設計](docs/DATABASE.md) | MongoDBスキーマ定義 |

---

## 📁 プロジェクト構成

```
AutoTrader/
├── 📄 package.json
├── 📄 .env.example
├── 📄 README.md
├── 📁 docs/                    # ドキュメント
│   ├── SETUP.md
│   ├── EXCHANGES.md
│   ├── LICENSE_SYSTEM.md
│   ├── API.md
│   └── DATABASE.md
├── 📁 server/                  # バックエンド
│   ├── index.js
│   ├── 📁 models/              # Mongooseモデル
│   ├── 📁 routes/              # APIルート
│   ├── 📁 services/            # 取引所クライアント
│   │   ├── bybitClient.js
│   │   ├── binanceClient.js
│   │   ├── okxClient.js
│   │   ├── gateioClient.js
│   │   ├── asterClient.js
│   │   ├── hyperliquidClient.js
│   │   ├── edgexClient.js
│   │   ├── exchangeFactory.js
│   │   └── tradingScheduler.js
│   └── 📁 middleware/          # 認証ミドルウェア
├── 📁 client/                  # フロントエンド (React)
│   ├── 📁 src/
│   │   ├── 📁 pages/
│   │   ├── 📁 components/
│   │   └── 📁 services/
│   └── 📁 public/
└── 📁 gas/                     # Google Apps Script
    └── LicenseManager.gs
```

---

## 🔄 自動取引の仕組み

### ファンディングレート戦略

```
┌─────────────────────────────────────────────────────────┐
│  ファンディングレート > 0                               │
│  → ロングがショートに支払う                             │
│  → ショートポジションを取得（受け取り側）               │
├─────────────────────────────────────────────────────────┤
│  ファンディングレート < 0                               │
│  → ショートがロングに支払う                             │
│  → ロングポジションを取得（受け取り側）                 │
└─────────────────────────────────────────────────────────┘
```

### 取引スケジュール（JST）

| 時刻 | イベント |
|:----:|:--------|
| 09:00 | 第1回ファンディングレート |
| 17:00 | 第2回ファンディングレート |
| 01:00 | 第3回ファンディングレート |

---

## 🔐 セキュリティ

| 機能 | 実装 |
|:-----|:-----|
| パスワード | bcrypt（ソルトラウンド10） |
| APIキー保存 | AES-256暗号化 |
| 認証 | JWT（7日間有効） |
| 入力検証 | express-validator |

> ⚠️ **重要**: 取引所APIキーは「出金権限なし」で発行してください。

---

## 📊 対応通貨

| 取引所 | 対応ペア |
|:-------|:---------|
| Bybit | BTC, ETH, XRP, EOS |
| Binance | BTC, ETH, BNB, XRP, SOL |
| OKX | BTC, ETH, SOL, XRP, DOGE |
| Gate.io | BTC, ETH, SOL, XRP, DOGE |
| Aster DEX | BTC, ETH, SOL, ARB, DOGE |
| Hyperliquid | BTC, ETH, SOL, ARB, DOGE, AVAX, MATIC, OP |
| EdgeX | BTC, ETH, SOL, ARB, AVAX, OP |

---

## 📝 更新履歴

| Ver | 日付 | 変更内容 |
|:----|:-----|:---------|
| 2.5.0 | 2024-12-06 | EdgeX対応追加 |
| 2.4.0 | 2024-12-06 | Hyperliquid対応追加 |
| 2.3.0 | 2024-12-06 | Aster DEX対応追加 |
| 2.2.0 | 2024-12-03 | Gate.io対応追加 |
| 2.1.0 | 2024-12-03 | OKX対応追加 |
| 2.0.0 | 2024-12-02 | マルチ取引所対応（Binance追加） |
| 1.1.0 | 2024-12-02 | ライセンスシステム対応 |
| 1.0.0 | 2024-12-01 | 初回リリース（Bybit対応） |

---

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

---

## ⚠️ 免責事項

**本システムは投資助言を目的としたものではありません。**

暗号資産取引には大きなリスクが伴います。投資判断は自己責任で行ってください。開発者は本システムの使用により生じた損失について一切の責任を負いません。

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/koaf">koaf</a>
</p>
