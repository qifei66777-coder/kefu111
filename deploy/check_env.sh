#!/usr/bin/env bash
# 新服务器环境自检（Linux / 宝塔）
# 用法：在项目根目录执行
#   bash deploy/check_env.sh
# 或指定根目录：
#   PROJECT_ROOT=/www/wwwroot/kf-test bash deploy/check_env.sh

set -o pipefail

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

FAIL=0
ok() { echo "[OK]   $*"; }
fail() { echo "[FAIL] $*"; FAIL=1; }

echo "========== 环境检查 =========="
echo "PROJECT_ROOT=$PROJECT_ROOT"
echo ""

# PHP CLI
if ! command -v php >/dev/null 2>&1; then
  fail "未找到 php 命令（请安装 PHP CLI）"
else
  PHP_VER="$(php -r 'echo PHP_VERSION;')"
  ok "PHP CLI 版本: $PHP_VER"
fi

need_ext() {
  local e="$1"
  if php -m 2>/dev/null | grep -qi "^${e}$"; then
    ok "扩展 $e"
  else
    fail "缺少 PHP 扩展: $e"
  fi
}

echo "--- PHP 扩展 ---"
need_ext curl
need_ext mbstring
need_ext pdo_mysql
need_ext fileinfo
need_ext openssl
need_ext gd
need_ext pcntl
need_ext posix

echo "--- 目录可写 ---"
check_writable() {
  local d="$1"
  if [[ ! -d "$d" ]]; then
    fail "目录不存在: $d（请先执行: bash deploy/fix_permissions.sh）"
  elif [[ -w "$d" ]]; then
    ok "可写: $d"
  else
    fail "不可写: $d"
  fi
}
check_writable "$PROJECT_ROOT/runtime"
if [[ -d "$PROJECT_ROOT/public/upload" ]]; then
  check_writable "$PROJECT_ROOT/public/upload"
else
  fail "缺少 public/upload（请执行: bash deploy/fix_permissions.sh）"
fi

if [[ -d "$PROJECT_ROOT/public/uploads" ]]; then
  check_writable "$PROJECT_ROOT/public/uploads"
else
  ok "public/uploads 不存在（可选，脚本可创建）"
fi

echo "--- Pusher ---"
PUSHER_START="$PROJECT_ROOT/ymwl_pusher/start.php"
if [[ -f "$PUSHER_START" ]]; then
  ok "存在: ymwl_pusher/start.php"
else
  fail "缺少: ymwl_pusher/start.php"
fi

CFG="$PROJECT_ROOT/ymwl_pusher/config.php"
WS_PORT=""
API_PORT=""
if [[ -f "$CFG" ]]; then
  WS_PORT="$(grep -E '^\$websocket_port\s*=' "$CFG" | head -1 | sed -E "s/.*=\s*([0-9]+)\s*;.*/\1/")"
  API_PORT="$(grep -E '^\$api_port\s*=' "$CFG" | head -1 | sed -E "s/.*=\s*([0-9]+)\s*;.*/\1/")"
  ok "读取 ymwl_pusher/config.php: websocket_port=${WS_PORT:-?} api_port=${API_PORT:-?}"
else
  fail "缺少: ymwl_pusher/config.php"
fi

echo "--- 端口监听（需 ss 或 netstat）---"
if command -v ss >/dev/null 2>&1; then
  LIST_CMD=(ss -lntp)
elif command -v netstat >/dev/null 2>&1; then
  LIST_CMD=(netstat -lntp)
else
  fail "未找到 ss/netstat，跳过端口检测"
  LIST_CMD=()
fi

if [[ ${#LIST_CMD[@]} -gt 0 && -n "$WS_PORT" ]]; then
  if "${LIST_CMD[@]}" 2>/dev/null | grep -qE "[:.]${WS_PORT}\s"; then
    ok "WebSocket 端口 $WS_PORT 正在监听（进程需为 ymwl_pusher / php）"
  else
    fail "WebSocket 端口 $WS_PORT 未监听（请先启动: bash deploy/start_pusher.sh）"
  fi
fi

if [[ ${#LIST_CMD[@]} -gt 0 && -n "$API_PORT" ]]; then
  API_LINE="$("${LIST_CMD[@]}" 2>/dev/null | grep -E "[:.]${API_PORT}\b" || true)"
  if [[ -z "$API_LINE" ]]; then
    fail "Pusher API 端口 $API_PORT 未监听（若已启动 pusher 仍如此，检查 config 与 start.php）"
  else
    if echo "$API_LINE" | grep -q '127.0.0.1'; then
      ok "Pusher API 端口 $API_PORT 仅绑定 127.0.0.1（符合内网访问要求）"
    elif echo "$API_LINE" | grep -qE '0\.0\.0\.0|\*|:::'; then
      fail "Pusher API 端口 $API_PORT 监听在 0.0.0.0 或 * — 请勿对公网放行，并检查 ymwl_pusher/start.php 中 apiListen 是否为 127.0.0.1"
    else
      ok "Pusher API 端口 $API_PORT 有监听（请人工确认绑定地址: $API_LINE）"
    fi
  fi
fi

echo "--- disable_functions（Workerman 相关）---"
DF="$(php -i 2>/dev/null | grep -i '^disable_functions' | head -1 || true)"
if [[ -n "$DF" ]]; then
  echo "    $DF"
  echo "$DF" | grep -qiE 'pcntl_|posix_' && fail "disable_functions 可能禁用了 pcntl/posix，将导致 ymwl_pusher 无法启动"
else
  ok "未检测到 disable_functions 行（或 php -i 不可用）"
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "========== 结果: 全部 OK =========="
  exit 0
else
  echo "========== 结果: 存在 FAIL，请逐项处理 =========="
  exit 1
fi
