# Render.com デプロイガイド

このドキュメントでは、AutoTraderをRender.comにデプロイする手順を説明します。

---

## 📋 前提条件

1. [Render.com](https://render.com)アカウント
2. GitHubリポジトリ（このプロジェクト）
3. MongoDB Atlas（無料プランで可）

---

## 🚀 デプロイ手順

### 1. MongoDB Atlasのセットアップ

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)にサインアップ
2. 無料クラスター（M0 Sandbox）を作成
3. Database Access で管理者ユーザーを作成
4. Network Access で `0.0.0.0/0` を許可（全IPからのアクセス）
5. 接続文字列をコピー：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/autotrader?retryWrites=true&w=majority
   ```

---

### 2. Renderでサービス作成

#### Web Serviceの作成

1. Renderダッシュボードで **New +** → **Web Service** を選択
2. GitHubリポジトリを接続
3. 以下の設定を入力：

| 項目 | 値 |
|:-----|:---|
| **Name** | `autotrader`（任意の名前） |
| **Environment** | `Node` |
| **Region** | `Singapore`（最寄りのリージョン） |
| **Branch** | `main` |
| **Build Command** | `npm run render-setup` |
| **Start Command** | `npm run render-start` |
| **Instance Type** | `Free`（または任意のプラン） |

---

### 3. 環境変数の設定

Renderダッシュボードの **Environment** タブで以下を追加：

#### 必須環境変数

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/autotrader?retryWrites=true&w=majority

# JWT Secret（32文字以上のランダム文字列）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars

# 暗号化キー（32文字以上のランダム文字列）
ENCRYPTION_KEY=your-encryption-key-change-this-must-be-32-characters-long

# Node環境
NODE_ENV=production

# ポート（Renderが自動設定するため通常は不要）
PORT=5000
```

#### オプション環境変数（ライセンス管理を使用する場合）

```bash
GOOGLE_SHEETS_ID=your-google-sheets-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----
```

#### 管理者初期設定（オプション）

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password-123
```

---

### 4. デプロイ実行

1. **Create Web Service** をクリック
2. 自動的にビルドとデプロイが開始されます
3. ログを確認してエラーがないことを確認

---

## 📊 デプロイ後の確認

### アプリケーションアクセス

デプロイ完了後、以下のURLでアクセス可能になります：

```
https://autotrader-xxxx.onrender.com
```

### ログの確認

Renderダッシュボードの **Logs** タブでサーバーログを確認できます。

```bash
# 成功時のログ例
✓ MongoDB接続成功
✓ サーバーがポート 5000 で起動しました
```

---

## 🔧 トラブルシューティング

### package-lock.json 不整合エラー

**エラー:** `npm ci can only install packages when your package.json and package-lock.json are in sync`

✅ 解決策：
1. ローカルで依存関係を更新：
```bash
cd server
npm install
cd ../client
npm install
```

2. 更新された`package-lock.json`をコミット：
```bash
git add server/package-lock.json client/package-lock.json
git commit -m "Update package-lock.json"
git push
```

3. Renderで再デプロイ

> **注意:** `render-setup.sh`は自動的に`npm ci`が失敗した場合`npm install`にフォールバックします。

---

### ビルドエラー

**エラー:** `npm: command not found`

```bash
# package.json のenginesセクションを確認
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

---

### MongoDB接続エラー

**エラー:** `MongoNetworkError: failed to connect`

✅ チェックリスト：
- MongoDB Atlasのユーザー名/パスワードが正しいか
- Network Accessで `0.0.0.0/0` が許可されているか
- 接続文字列の形式が正しいか

---

### メモリ不足エラー

**エラー:** `JavaScript heap out of memory`

**解決策:** Renderの有料プラン（Starter以上）にアップグレード

または環境変数に追加：
```bash
NODE_OPTIONS=--max-old-space-size=512
```

---

### クライアントビルドエラー

**エラー:** `npm run build` が失敗

```bash
# client/package.json を確認
# ビルドスクリプトが存在するか確認
"scripts": {
  "build": "react-scripts build"
}
```

---

## 🔄 継続的デプロイ（CD）

Renderは自動的にGitHubのmainブランチへのpushを検出してデプロイします。

### 手動デプロイ

Renderダッシュボードから **Manual Deploy** → **Deploy latest commit** を選択

---

## 💰 料金プラン

| プラン | 価格 | スペック |
|:-------|:------|:---------|
| **Free** | $0/月 | 512MB RAM、自動スリープ（15分） |
| **Starter** | $7/月 | 512MB RAM、常時稼働 |
| **Standard** | $25/月 | 2GB RAM、常時稼働 |

> **注意:** Freeプランは15分間アクセスがないとスリープします。
> 初回アクセス時に起動に30秒程度かかります。

---

## 🔐 セキュリティ推奨事項

1. **JWT_SECRET と ENCRYPTION_KEY**
   - 32文字以上のランダム文字列を使用
   - 本番環境では必ず変更

2. **MongoDB Atlas**
   - 強力なパスワードを設定
   - 可能であればIPホワイトリストを使用

3. **管理者パスワード**
   - 初回ログイン後すぐに変更

4. **環境変数**
   - GitHubリポジトリにコミットしない
   - Renderダッシュボードでのみ設定

---

## 📚 参考リンク

- [Render.com ドキュメント](https://render.com/docs)
- [MongoDB Atlas ドキュメント](https://docs.atlas.mongodb.com/)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)

---

## 🆘 サポート

問題が発生した場合：
1. Renderのログを確認
2. MongoDB Atlasの接続状態を確認
3. 環境変数が正しく設定されているか確認
4. GitHubのIssuesで質問

---

## 次のステップ

- [📘 セットアップガイド](SETUP.md) - ローカル開発環境
- [🔌 APIリファレンス](API.md) - APIドキュメント
- [🔑 取引所設定](EXCHANGES.md) - APIキー設定
