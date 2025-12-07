#!/bin/bash

#####################################################
# AutoTrader Launch Script
# Ubuntu 20.04 LTS対応
#####################################################

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ロゴ表示
show_logo() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║              AutoTrader Launcher                  ║"
    echo "║                   v2.5.0                          ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ヘルプ表示
show_help() {
    echo "使用方法: ./launch.sh [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  start       アプリケーションを起動（デフォルト）"
    echo "  stop        アプリケーションを停止"
    echo "  restart     アプリケーションを再起動"
    echo "  status      状態を表示"
    echo "  logs        ログを表示"
    echo "  dev         開発モードで起動"
    echo "  build       クライアントをビルド"
    echo "  help        このヘルプを表示"
    echo ""
}

# 前提条件チェック
check_prerequisites() {
    echo -e "${BLUE}前提条件をチェック中...${NC}"
    
    # Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.jsがインストールされていません${NC}"
        echo "  setup.shを実行してください"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
    
    # npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npmがインストールされていません${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"
    
    # PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}⚠ PM2がインストールされていません。インストール中...${NC}"
        npm install -g pm2
    fi
    echo -e "${GREEN}✓ PM2 $(pm2 -v)${NC}"
    
    # MongoDB
    if ! systemctl is-active --quiet mongod; then
        echo -e "${YELLOW}⚠ MongoDBが停止しています。起動中...${NC}"
        sudo systemctl start mongod
    fi
    echo -e "${GREEN}✓ MongoDB 稼働中${NC}"
    
    # 環境設定ファイル
    if [ ! -f "server/.env" ]; then
        echo -e "${RED}✗ server/.env が見つかりません${NC}"
        echo "  setup.shを実行するか、手動で作成してください"
        exit 1
    fi
    echo -e "${GREEN}✓ 環境設定ファイル存在${NC}"
    
    echo ""
}

# アプリケーション起動
start_app() {
    echo -e "${BLUE}アプリケーションを起動中...${NC}"
    echo ""
    
    # サーバー起動
    if [ -d "server" ]; then
        echo -e "${CYAN}[Server] 起動中...${NC}"
        cd server
        pm2 start npm --name "autotrader-server" -- start
        cd ..
    fi
    
    # クライアント起動（ビルド済みの場合はserve、なければビルド）
    if [ -d "client" ]; then
        if [ -d "client/build" ]; then
            echo -e "${CYAN}[Client] ビルド済みファイルを提供中...${NC}"
            cd client
            pm2 start npm --name "autotrader-client" -- run serve
            cd ..
        else
            echo -e "${YELLOW}[Client] ビルドが必要です。ビルド中...${NC}"
            cd client
            npm run build
            pm2 start npm --name "autotrader-client" -- run serve
            cd ..
        fi
    fi
    
    echo ""
    pm2 save
    
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║           アプリケーションを起動しました          ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "アクセスURL:"
    echo -e "  フロントエンド: ${BLUE}http://localhost:3000${NC}"
    echo -e "  バックエンドAPI: ${BLUE}http://localhost:5000${NC}"
    echo ""
    echo "コマンド:"
    echo "  ログ表示:    ./launch.sh logs"
    echo "  状態確認:    ./launch.sh status"
    echo "  停止:        ./launch.sh stop"
    echo ""
}

# アプリケーション停止
stop_app() {
    echo -e "${BLUE}アプリケーションを停止中...${NC}"
    pm2 stop autotrader-server 2>/dev/null || true
    pm2 stop autotrader-client 2>/dev/null || true
    pm2 delete autotrader-server 2>/dev/null || true
    pm2 delete autotrader-client 2>/dev/null || true
    echo -e "${GREEN}✓ アプリケーションを停止しました${NC}"
}

# アプリケーション再起動
restart_app() {
    echo -e "${BLUE}アプリケーションを再起動中...${NC}"
    pm2 restart autotrader-server 2>/dev/null || true
    pm2 restart autotrader-client 2>/dev/null || true
    echo -e "${GREEN}✓ アプリケーションを再起動しました${NC}"
}

# 状態表示
show_status() {
    echo -e "${BLUE}アプリケーション状態:${NC}"
    echo ""
    pm2 status
    echo ""
    
    # MongoDB状態
    echo -e "${BLUE}MongoDB状態:${NC}"
    if systemctl is-active --quiet mongod; then
        echo -e "  ${GREEN}● mongod 稼働中${NC}"
    else
        echo -e "  ${RED}● mongod 停止${NC}"
    fi
    echo ""
}

# ログ表示
show_logs() {
    echo -e "${BLUE}ログを表示中... (Ctrl+C で終了)${NC}"
    echo ""
    pm2 logs
}

# 開発モード起動
start_dev() {
    echo -e "${BLUE}開発モードで起動中...${NC}"
    echo ""
    
    # サーバー（開発モード）
    if [ -d "server" ]; then
        echo -e "${CYAN}[Server] 開発モードで起動中...${NC}"
        cd server
        pm2 start npm --name "autotrader-server-dev" -- run dev
        cd ..
    fi
    
    # クライアント（開発モード）
    if [ -d "client" ]; then
        echo -e "${CYAN}[Client] 開発モードで起動中...${NC}"
        cd client
        pm2 start npm --name "autotrader-client-dev" -- start
        cd ..
    fi
    
    echo ""
    echo -e "${GREEN}✓ 開発モードで起動しました${NC}"
    echo ""
    echo "アクセスURL:"
    echo -e "  フロントエンド: ${BLUE}http://localhost:3000${NC}"
    echo -e "  バックエンドAPI: ${BLUE}http://localhost:5000${NC}"
    echo ""
}

# クライアントビルド
build_client() {
    if [ -d "client" ]; then
        echo -e "${BLUE}クライアントをビルド中...${NC}"
        cd client
        npm run build
        cd ..
        echo -e "${GREEN}✓ ビルド完了${NC}"
    else
        echo -e "${RED}✗ clientディレクトリが見つかりません${NC}"
    fi
}

# メイン処理
main() {
    show_logo
    
    case "${1:-start}" in
        start)
            check_prerequisites
            start_app
            ;;
        stop)
            stop_app
            ;;
        restart)
            restart_app
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        dev)
            check_prerequisites
            start_dev
            ;;
        build)
            build_client
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}不明なコマンド: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# 実行
main "$@"
