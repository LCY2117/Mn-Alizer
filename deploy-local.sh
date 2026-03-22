#!/usr/bin/env bash
# 锰智云枢 - 本地快速部署脚本 (Linux / macOS)
# 用法：bash deploy-local.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  锰智云枢 本地快速部署脚本 (Linux)  ${NC}"
echo -e "${GREEN}======================================${NC}"

# ── 1. 检查 Node.js ──────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}[错误] 未检测到 Node.js，请先安装 Node.js 18 或以上版本。${NC}"
  echo "       下载地址：https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)")
MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$MAJOR" -lt 18 ]; then
  echo -e "${RED}[错误] 当前 Node.js 版本为 $NODE_VERSION，需要 18 或以上版本。${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Node.js $NODE_VERSION${NC}"

# ── 2. 检查 npm ───────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo -e "${RED}[错误] 未检测到 npm，请确认 Node.js 安装完整。${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] npm $(npm -v)${NC}"

# ── 3. 进入脚本所在目录 ───────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 4. 初始化 .env ────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${YELLOW}[提示] 已从 .env.example 生成 .env 文件，请按需修改配置后重新运行本脚本。${NC}"
    echo -e "${YELLOW}       常用配置项：${NC}"
    echo -e "${YELLOW}         PORT                 服务端口（默认 8787）${NC}"
    echo -e "${YELLOW}         APP_PUBLIC_ORIGIN     对外访问地址（本地可留空或填 http://localhost:8787）${NC}"
    echo -e "${YELLOW}         SILICONFLOW_API_KEY   AI 助手 API Key${NC}"
    echo -e "${YELLOW}         APP_GATE_PASSWORD     访问口令（可留空）${NC}"
    echo ""
    read -r -p "是否现在继续部署？[y/N] " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
      echo "已退出，请编辑 .env 后重新运行 bash deploy-local.sh"
      exit 0
    fi
  else
    echo -e "${YELLOW}[提示] 未找到 .env.example，跳过 .env 初始化，将使用默认配置。${NC}"
  fi
else
  echo -e "${GREEN}[✓] 已检测到 .env 文件${NC}"
fi

# ── 5. 安装依赖 ───────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/2] 正在安装依赖（npm install）...${NC}"
npm install

# ── 6. 构建前端 ───────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/2] 正在构建前端（npm run build）...${NC}"
npm run build

# ── 7. 读取端口 ───────────────────────────────────────────────────────────────
# 优先从 .env 文件中读取 PORT，再回退到环境变量，最后使用默认值 8787
PORT_FROM_ENV=""
if [ -f ".env" ]; then
  PORT_FROM_ENV=$(grep -E '^[[:space:]]*PORT[[:space:]]*=' .env | head -1 \
    | sed 's/^[[:space:]]*PORT[[:space:]]*=[[:space:]]*//' \
    | sed 's/[[:space:]]*#.*//' \
    | tr -d "[:space:]'\"")
fi
if [[ "$PORT_FROM_ENV" =~ ^[0-9]+$ ]] && [ "$PORT_FROM_ENV" -ge 1 ] && [ "$PORT_FROM_ENV" -le 65535 ]; then
  PORT="$PORT_FROM_ENV"
else
  PORT="${PORT:-8787}"
fi

# ── 8. 启动服务 ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  部署完成，正在启动服务...          ${NC}"
echo -e "${GREEN}  访问地址：http://localhost:${PORT}  ${NC}"
echo -e "${GREEN}  按 Ctrl+C 停止服务                 ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

export NODE_ENV=production
node server/index.js
