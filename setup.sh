#!/bin/bash

#####################################################
# AutoTrader Setup Script
# Ubuntu 20.04 LTS対応
#####################################################

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ロゴ表示
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║           AutoTrader Setup Script                 ║"
echo "║              Ubuntu 20.04 LTS                     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# root権限チェック
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠ root権限が必要です。sudoで実行してください。${NC}"
    echo "使用方法: sudo ./setup.sh"
    exit 1
fi

# 実行ユーザー取得
ACTUAL_USER=${SUDO_USER:-$USER}
ACTUAL_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)

echo -e "${GREEN}✓ セットアップを開始します...${NC}"
echo -e "  実行ユーザー: ${ACTUAL_USER}"
echo ""

#####################################################
# 1. システムアップデート
#####################################################
echo -e "${BLUE}[1/7] システムをアップデート中...${NC}"
apt-get update -y
apt-get upgrade -y
echo -e "${GREEN}✓ システムアップデート完了${NC}"
echo ""

#####################################################
# 2. 必要パッケージのインストール
#####################################################
echo -e "${BLUE}[2/7] 必要パッケージをインストール中...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common
echo -e "${GREEN}✓ 必要パッケージインストール完了${NC}"
echo ""

#####################################################
# 3. Node.js 20.x インストール
#####################################################
echo -e "${BLUE}[3/7] Node.js 20.x をインストール中...${NC}"

# 既存のNode.jsを確認
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${YELLOW}  既存のNode.js検出: ${NODE_VERSION}${NC}"
fi

# NodeSourceリポジトリ追加
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# バージョン確認
echo -e "${GREEN}✓ Node.js $(node -v) インストール完了${NC}"
echo -e "${GREEN}✓ npm $(npm -v) インストール完了${NC}"
echo ""

#####################################################
# 4. MongoDB 6.0 インストール
#####################################################
echo -e "${BLUE}[4/7] MongoDB 6.0 をインストール中...${NC}"

# MongoDB GPGキー追加
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

# リポジトリ追加 (Ubuntu 20.04 focal)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# インストール
apt-get update -y
apt-get install -y mongodb-org

# MongoDB起動・有効化
systemctl start mongod
systemctl enable mongod

echo -e "${GREEN}✓ MongoDB 6.0 インストール完了${NC}"
echo ""

#####################################################
# 5. PM2 インストール (グローバル)
#####################################################
echo -e "${BLUE}[5/7] PM2をインストール中...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 $(pm2 -v) インストール完了${NC}"
echo ""

#####################################################
# 6. プロジェクト依存関係インストール
#####################################################
echo -e "${BLUE}[6/7] プロジェクト依存関係をインストール中...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# サーバー側
if [ -d "server" ]; then
    echo "  サーバー依存関係をインストール中..."
    cd server
    sudo -u "$ACTUAL_USER" npm install
    cd ..
    echo -e "${GREEN}  ✓ サーバー依存関係インストール完了${NC}"
fi

# クライアント側
if [ -d "client" ]; then
    echo "  クライアント依存関係をインストール中..."
    cd client
    sudo -u "$ACTUAL_USER" npm install
    cd ..
    echo -e "${GREEN}  ✓ クライアント依存関係インストール完了${NC}"
fi

echo -e "${GREEN}✓ 依存関係インストール完了${NC}"
echo ""

#####################################################
# 7. 環境設定ファイル作成
#####################################################
echo -e "${BLUE}[7/7] 環境設定ファイルを作成中...${NC}"

# サーバー用 .env
if [ -d "server" ] && [ ! -f "server/.env" ]; then
    cat > server/.env << 'EOF'
# サーバー設定
PORT=5000
NODE_ENV=production

# MongoDB設定
MONGODB_URI=mongodb://localhost:27017/autotrader

# JWT設定
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 暗号化キー（32文字以上推奨）
ENCRYPTION_KEY=your-encryption-key-change-this-32chars

# Google Sheets設定（ライセンス管理用）
GOOGLE_SHEETS_ID=your-google-sheets-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"

# 管理者初期設定
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
EOF
    chown "$ACTUAL_USER:$ACTUAL_USER" server/.env
    chmod 600 server/.env
    echo -e "${GREEN}  ✓ server/.env を作成しました${NC}"
    echo -e "${YELLOW}  ⚠ server/.env を編集して実際の値を設定してください${NC}"
fi

# クライアント用 .env
if [ -d "client" ] && [ ! -f "client/.env" ]; then
    cat > client/.env << 'EOF'
REACT_APP_API_URL=http://localhost:5000/api
EOF
    chown "$ACTUAL_USER:$ACTUAL_USER" client/.env
    echo -e "${GREEN}  ✓ client/.env を作成しました${NC}"
fi

echo ""

#####################################################
# ファイアウォール設定（オプション）
#####################################################
echo -e "${BLUE}ファイアウォール設定を確認中...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 5000/tcp comment 'AutoTrader API'
    ufw allow 3000/tcp comment 'AutoTrader Client'
    echo -e "${GREEN}✓ ファイアウォール設定完了 (ポート 3000, 5000)${NC}"
fi
echo ""

#####################################################
# 完了メッセージ
#####################################################
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║          セットアップが完了しました！             ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "次のステップ:"
echo ""
echo "1. 環境設定ファイルを編集:"
echo -e "   ${YELLOW}nano server/.env${NC}"
echo ""
echo "2. アプリケーションを起動:"
echo -e "   ${YELLOW}./launch.sh${NC}"
echo ""
echo "3. ブラウザでアクセス:"
echo -e "   ${BLUE}http://localhost:3000${NC}"
echo ""

# MongoDB状態確認
echo -e "${BLUE}サービス状態:${NC}"
systemctl is-active --quiet mongod && echo -e "  MongoDB: ${GREEN}稼働中${NC}" || echo -e "  MongoDB: ${RED}停止${NC}"
echo ""
