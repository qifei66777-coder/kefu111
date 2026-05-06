#!/usr/bin/env bash
# 启动 / 重启 ymwl_pusher（Workerman）
# 用法：
#   bash deploy/start_pusher.sh
#   PROJECT_ROOT=/www/wwwroot/kf-test bash deploy/start_pusher.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${PROJECT_ROOT:-}" ]]; then
  P1="$(cd "$SCRIPT_DIR/.." && pwd)"
  if [[ -d "$P1/public" ]]; then
    PROJECT_ROOT="$P1"
  elif [[ -d "$P1/kefu/public" ]]; then
    PROJECT_ROOT="$P1/kefu"
  else
    PROJECT_ROOT="$P1"
  fi
fi
PUSHER_DIR="$PROJECT_ROOT/ymwl_pusher"

if [[ ! -f "$PUSHER_DIR/start.php" ]]; then
  echo "错误: 未找到 $PUSHER_DIR/start.php"
  exit 1
fi

cd "$PUSHER_DIR"

if ! php start.php restart -d; then
  echo ""
  echo "========== ymwl_pusher 启动失败 =========="
  echo "请检查："
  echo "  1) PHP CLI 是否启用扩展 pcntl、posix（php -m）"
  echo "  2) php.ini 中 disable_functions 是否禁用了 pcntl_fork、posix_* 等"
  echo "  3) 端口是否被占用（与 ymwl_pusher/config.php 中 websocket_port、api_port 一致）"
  echo "  4) 当前用户是否有读代码目录、写 Workerman 日志的权限"
  exit 1
fi

php start.php status
