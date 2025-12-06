# 🔑 取引所API設定ガイド

各取引所のAPIキー取得方法と設定手順です。

---

## 📋 目次

1. [共通の注意事項](#共通の注意事項)
2. [CEX（中央集権型取引所）](#cex中央集権型取引所)
   - [Bybit](#bybit)
   - [Binance](#binance)
   - [OKX](#okx)
   - [Gate.io](#gateio)
3. [DEX（分散型取引所）](#dex分散型取引所)
   - [Aster DEX](#aster-dex)
   - [Hyperliquid](#hyperliquid)
   - [EdgeX](#edgex)
4. [認証方式の比較](#認証方式の比較)

---

## 共通の注意事項

### ⚠️ セキュリティに関する重要事項

1. **出金権限は絶対に無効にする**
   - APIキーには取引権限のみを付与
   - 万が一の漏洩時の被害を最小限に

2. **IP制限を設定（推奨）**
   - サーバーのIPアドレスのみ許可
   - 不正アクセスを防止

3. **APIキーは定期的にローテーション**
   - 3ヶ月に1回程度の更新を推奨

4. **テストネットで動作確認**
   - 本番環境の前にテストネットで検証

---

## CEX（中央集権型取引所）

### Bybit

#### APIキー取得手順

1. [Bybit](https://www.bybit.com)にログイン
2. 右上のアカウントアイコン → 「API」
3. 「新しいキーを作成」をクリック
4. 以下の設定を行う：

| 設定項目 | 値 |
|:---------|:---|
| APIキーの種類 | システム生成 |
| 読み取り | ✅ 有効 |
| 取引 | ✅ 有効 |
| 出金 | ❌ **無効** |
| IP制限 | 推奨：サーバーIPを設定 |

#### システムへの登録

| フィールド | 入力値 |
|:-----------|:-------|
| 取引所 | Bybit |
| API Key | 取得したAPIキー |
| API Secret | 取得したAPIシークレット |
| テストネット | 必要に応じてチェック |

#### 対応通貨

- BTCUSD, ETHUSD, XRPUSD, EOSUSD（インバース無期限）

---

### Binance

#### APIキー取得手順

1. [Binance](https://www.binance.com)にログイン
2. 右上のアカウントアイコン → 「API管理」
3. 「APIの作成」→「システム生成」を選択
4. 以下の権限を設定：

| 設定項目 | 値 |
|:---------|:---|
| 読み取り専用 | ✅ 有効 |
| 先物取引を有効にする | ✅ 有効 |
| 出金を有効にする | ❌ **無効** |
| IP制限 | 推奨：サーバーIPを設定 |

#### システムへの登録

| フィールド | 入力値 |
|:-----------|:-------|
| 取引所 | Binance |
| API Key | 取得したAPIキー |
| API Secret | 取得したAPIシークレット |
| テストネット | 必要に応じてチェック |

#### 対応通貨

- BTCUSDT, ETHUSDT, BNBUSDT, XRPUSDT, SOLUSDT（USDS-M Futures）

---

### OKX

#### APIキー取得手順

1. [OKX](https://www.okx.com)にログイン
2. 右上のアカウントアイコン → 「API」
3. 「APIを作成」をクリック
4. **パスフレーズを設定**（必須・後で必要）
5. 以下の権限を設定：

| 設定項目 | 値 |
|:---------|:---|
| 読み取り | ✅ 有効 |
| 取引 | ✅ 有効 |
| 出金 | ❌ **無効** |

#### システムへの登録

| フィールド | 入力値 |
|:-----------|:-------|
| 取引所 | OKX |
| API Key | 取得したAPIキー |
| API Secret | 取得したAPIシークレット |
| パスフレーズ | 設定したパスフレーズ |
| テストネット | 必要に応じてチェック |

> ⚠️ OKXはパスフレーズが必須です

#### 対応通貨

- BTC-USDT-SWAP, ETH-USDT-SWAP, SOL-USDT-SWAP, XRP-USDT-SWAP, DOGE-USDT-SWAP

---

### Gate.io

#### APIキー取得手順

1. [Gate.io](https://www.gate.io)にログイン
2. アカウント → 「API管理」
3. 「APIキーを作成」をクリック
4. 以下の権限を設定：

| 設定項目 | 値 |
|:---------|:---|
| 先物取引 | ✅ 有効 |
| 出金 | ❌ **無効** |
| IP制限 | 推奨：サーバーIPを設定 |

#### システムへの登録

| フィールド | 入力値 |
|:-----------|:-------|
| 取引所 | Gate.io |
| API Key | 取得したAPIキー |
| API Secret | 取得したAPIシークレット |
| テストネット | 必要に応じてチェック |

#### 対応通貨

- BTC_USDT, ETH_USDT, SOL_USDT, XRP_USDT, DOGE_USDT（USDT Perpetual）

---

## DEX（分散型取引所）

### Aster DEX

Aster DEXはWeb3/ECDSA署名を使用した非カストディアル認証を採用しています。

#### APIウォレット取得手順

1. [Aster DEX](https://www.asterdex.com)にアクセス
2. ウォレットを接続
3. 「API Wallet」ページへ移動
4. 新しいAPIウォレットを生成
5. **秘密鍵を安全に保管**

#### システムへの登録

| フィールド | 入力値 |
|:-----------|:-------|
| 取引所 | Aster DEX |
| API Key | メインウォレットアドレス（0x...） |
| API Secret | APIウォレットの秘密鍵 |
| テストネット | 必要に応じてチェック |

> 💡 秘密鍵はローカルで署名に使用され、サーバーには送信されません

#### 対応通貨

- BTCUSDT, ETHUSDT, SOLUSDT, ARBUSDT, DOGEUSDT

---

### Hyperliquid

Hyperliquid は高性能L1 DEXで、Web3/ECDSA署名を使用します。

#### 設定手順

1. [Hyperliquid](https://app.hyperliquid.xyz)にアクセス
2. ウォレットを接続
3. 資金をデポジット
4. ウォレットの秘密鍵を取得（MetaMaskなどから）

#### システムへの登録

| フィールド | 入力値 |
|:-----------|:-------|
| 取引所 | Hyperliquid |
| API Key | ウォレットアドレス（0x...） |
| API Secret | ウォレットの秘密鍵 |
| テストネット | 必要に応じてチェック |

#### テストネット

- URL: https://app.hyperliquid-testnet.xyz
- テストネット用のETHを取得してテスト可能

#### 対応通貨

- BTC, ETH, SOL, ARB, DOGE, AVAX, MATIC, OP

---

### EdgeX

EdgeXはStarkEx L2上に構築されたDEXで、HMAC-SHA256認証を使用します。

#### APIキー取得手順

1. [EdgeX](https://app.edgex.exchange)にアクセス
2. ウォレットを接続してアカウント作成
3. 「Settings」→「API Keys」
4. 新しいAPIキーを生成

#### システムへの登録

| フィールド | 入力値 |
|:-----------|:-------|
| 取引所 | EdgeX |
| API Key | 取得したAPIキー |
| API Secret | 取得したAPIシークレット |
| テストネット | 必要に応じてチェック |

#### 対応通貨

- BTC-USDC-PERP, ETH-USDC-PERP, SOL-USDC-PERP, ARB-USDC-PERP, AVAX-USDC-PERP, OP-USDC-PERP

---

## 認証方式の比較

| 取引所 | 認証方式 | カストディ | 秘密鍵の扱い |
|:-------|:---------|:-----------|:-------------|
| Bybit | HMAC-SHA256 | カストディアル | サーバーに保存 |
| Binance | HMAC-SHA256 | カストディアル | サーバーに保存 |
| OKX | HMAC-SHA256 | カストディアル | サーバーに保存 |
| Gate.io | HMAC-SHA512 | カストディアル | サーバーに保存 |
| Aster | Web3/ECDSA | 非カストディアル | ローカル署名 |
| Hyperliquid | Web3/ECDSA | 非カストディアル | ローカル署名 |
| EdgeX | HMAC-SHA256 | 非カストディアル | サーバーに保存 |

### 認証方式の違い

#### HMAC（CEX向け）
```
APIキー + シークレット → HMAC署名 → サーバーで検証
```
- シンプルで高速
- APIシークレットをサーバーと共有

#### Web3/ECDSA（DEX向け）
```
秘密鍵でローカル署名 → 公開鍵（アドレス）で検証
```
- 秘密鍵がサーバーに渡らない
- より高いセキュリティ

---

## 次のステップ

- [📘 セットアップガイド](SETUP.md) - システムの設定
- [⚙️ ライセンス管理](LICENSE_SYSTEM.md) - ライセンスシステム
