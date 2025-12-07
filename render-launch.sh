#!/bin/bash

#####################################################
# AutoTrader Render.com Launch Script
# Render環境でのアプリケーション起動用
#####################################################

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║         AutoTrader Render Launcher                ║"
echo "║                  v2.5.0                           ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# 環境情報表示
echo -e "${BLUE}環境情報:${NC}"
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"
echo "  NODE_ENV: ${NODE_ENV:-development}"
echo "  PORT: ${PORT:-5000}"
echo ""

# MongoDB接続確認
echo -e "${BLUE}MongoDB接続を確認中...${NC}"
if [ -z "$MONGODB_URI" ] && [ -z "$MONGO_URI" ]; then
    echo -e "${RED}✗ MONGODB_URI が設定されていません${NC}"
    exit 1
fi
echo -e "${GREEN}✓ MongoDB URI設定済み${NC}"
echo ""

# サーバー起動
echo -e "${BLUE}サーバーを起動中...${NC}"

if [ -d "server" ]; then
    cd server
    
    # ビルド済みクライアントがある場合は静的ファイルとして提供
    if [ -d "../client/build" ]; then
        echo -e "${GREEN}✓ ビルド済みクライアントを検出${NC}"
        export SERVE_STATIC=true
        export CLIENT_BUILD_PATH=../client/build
    fi
    
    # プロダクションモードで起動
    exec npm start
else
    echo -e "${RED}✗ serverディレクトリが見つかりません${NC}"
    exit 1
fi
