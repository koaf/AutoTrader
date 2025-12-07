#!/bin/bash

#####################################################
# AutoTrader Render.com Setup Script
# Render環境での初期セットアップ用
#####################################################

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║         AutoTrader Render Setup Script            ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# 環境変数チェック
check_env_var() {
    local var_name=$1
    if [ -z "${!var_name}" ]; then
        echo -e "${YELLOW}⚠ 環境変数 $var_name が設定されていません${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $var_name 設定済み${NC}"
        return 0
    fi
}

echo -e "${BLUE}[1/5] 環境変数を確認中...${NC}"

# 必須環境変数のチェック
MISSING_VARS=0

check_env_var "MONGODB_URI" || MISSING_VARS=$((MISSING_VARS + 1))
check_env_var "JWT_SECRET" || MISSING_VARS=$((MISSING_VARS + 1))
check_env_var "ENCRYPTION_KEY" || MISSING_VARS=$((MISSING_VARS + 1))

# オプション環境変数の確認
echo -e "${BLUE}オプション環境変数:${NC}"
check_env_var "GOOGLE_SHEETS_ID" || echo -e "${YELLOW}  (ライセンス管理を使用しない場合はスキップ可)${NC}"
check_env_var "GOOGLE_SERVICE_ACCOUNT_EMAIL" || true
check_env_var "GOOGLE_PRIVATE_KEY" || true

if [ $MISSING_VARS -gt 0 ]; then
    echo ""
    echo -e "${RED}✗ $MISSING_VARS 個の必須環境変数が設定されていません${NC}"
    echo ""
    echo "Renderダッシュボードで以下を設定してください:"
    echo "  - MONGODB_URI"
    echo "  - JWT_SECRET"
    echo "  - ENCRYPTION_KEY"
    echo "  - NODE_ENV=production"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ 環境変数チェック完了${NC}"
echo ""

#####################################################
# 2. Node.js環境確認
#####################################################
echo -e "${BLUE}[2/5] Node.js環境を確認中...${NC}"

if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
else
    echo -e "${RED}✗ Node.jsが見つかりません${NC}"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"
else
    echo -e "${RED}✗ npmが見つかりません${NC}"
    exit 1
fi

echo ""

#####################################################
# 3. 依存関係インストール
#####################################################
echo -e "${BLUE}[3/5] サーバー依存関係をインストール中...${NC}"

if [ -d "server" ]; then
    cd server
    
    # package-lock.jsonが存在し、同期が取れている場合はnpm ci、それ以外はnpm install
    if [ -f "package-lock.json" ]; then
        echo "  package-lock.json検出: npm ciを試行中..."
        npm ci --production 2>/dev/null || {
            echo -e "${YELLOW}  npm ci失敗: npm installにフォールバック${NC}"
            npm install --production
        }
    else
        echo "  package-lock.json未検出: npm installを実行中..."
        npm install --production
    fi
    
    cd ..
    echo -e "${GREEN}✓ サーバー依存関係インストール完了${NC}"
else
    echo -e "${RED}✗ serverディレクトリが見つかりません${NC}"
    exit 1
fi

echo ""

#####################################################
# 4. クライアントビルド
#####################################################
echo -e "${BLUE}[4/5] クライアントをビルド中...${NC}"

if [ -d "client" ]; then
    cd client
    
    # クライアント用環境変数設定
    if [ -n "$RENDER_EXTERNAL_URL" ]; then
        echo "REACT_APP_API_URL=${RENDER_EXTERNAL_URL}/api" > .env.production
        echo -e "${GREEN}✓ API URL設定: ${RENDER_EXTERNAL_URL}/api${NC}"
    else
        echo "REACT_APP_API_URL=/api" > .env.production
        echo -e "${YELLOW}⚠ RENDER_EXTERNAL_URLが未設定。相対パスを使用${NC}"
    fi
    
    # node_modulesをクリーンアップ（パーミッションエラー対策）
    if [ -d "node_modules" ]; then
        echo "  既存のnode_modulesを削除中..."
        rm -rf node_modules
    fi
    
    # 依存関係の再インストール
    echo "  依存関係をインストール中..."
    npm install
    
    # ビルド実行前にreact-scriptsの実行権限を確認
    if [ -f "node_modules/.bin/react-scripts" ]; then
        chmod +x node_modules/.bin/react-scripts
    fi
    
    echo "  ビルドを実行中..."
    npm run build
    
    cd ..
    echo -e "${GREEN}✓ クライアントビルド完了${NC}"
else
    echo -e "${YELLOW}⚠ clientディレクトリが見つかりません（サーバーのみモード）${NC}"
fi

echo ""

#####################################################
# 5. MongoDB接続テスト
#####################################################
echo -e "${BLUE}[5/5] MongoDB接続をテスト中...${NC}"

# Node.jsでMongoDB接続テスト
cd server
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB接続成功');
    process.exit(0);
})
.catch(err => {
    console.error('MongoDB接続失敗:', err.message);
    process.exit(1);
});
" && echo -e "${GREEN}✓ MongoDB接続成功${NC}" || {
    echo -e "${RED}✗ MongoDB接続失敗${NC}"
    echo -e "${YELLOW}  MONGODB_URIを確認してください${NC}"
    exit 1
}

cd ..
echo ""

#####################################################
# 完了メッセージ
#####################################################
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║        Renderセットアップが完了しました！         ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "環境情報:"
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"
echo "  NODE_ENV: ${NODE_ENV:-development}"
echo ""

if [ -n "$RENDER_EXTERNAL_URL" ]; then
    echo "アクセスURL:"
    echo -e "  ${BLUE}${RENDER_EXTERNAL_URL}${NC}"
    echo ""
fi

echo "次のステップ:"
echo "  ./render-launch.sh を実行してアプリケーションを起動"
echo ""
