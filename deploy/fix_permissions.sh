#!/usr/bin/env bash
# 创建必要目录并设置写权限（Linux / 宝塔）
# 用法：
#   sudo bash deploy/fix_permissions.sh
#   OWNER=www DATA_GROUP=www bash deploy/fix_permissions.sh
#
# 若不加 sudo，仅能 chmod 当前用户有权限的路径。

set +e

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
OWNER="${OWNER:-}"
DATA_GROUP="${DATA_GROUP:-}"

echo "PROJECT_ROOT=$PROJECT_ROOT"

mkdir -p "$PROJECT_ROOT/runtime/cache" \
         "$PROJECT_ROOT/runtime/log" \
         "$PROJECT_ROOT/runtime/temp" \
         "$PROJECT_ROOT/public/upload/images" \
         "$PROJECT_ROOT/public/upload/files" \
         "$PROJECT_ROOT/public/upload/voice" \
         "$PROJECT_ROOT/public/uploads/addons/tmp" 2>/dev/null || true

# 目录权限：755，runtime 与 upload 放宽为 775 便于组写
find "$PROJECT_ROOT/runtime" -type d -exec chmod 775 {} \; 2>/dev/null || true
find "$PROJECT_ROOT/runtime" -type f -exec chmod 664 {} \; 2>/dev/null || true
chmod 775 "$PROJECT_ROOT/public/upload" "$PROJECT_ROOT/public/uploads" 2>/dev/null || true
chmod -R 775 "$PROJECT_ROOT/public/upload" 2>/dev/null || true
chmod -R 775 "$PROJECT_ROOT/public/uploads" 2>/dev/null || true

if [[ -n "$OWNER" ]]; then
  if [[ -n "$DATA_GROUP" ]]; then
    chown -R "$OWNER:$DATA_GROUP" "$PROJECT_ROOT/runtime" "$PROJECT_ROOT/public/upload" "$PROJECT_ROOT/public/uploads" 2>/dev/null || true
  else
    chown -R "$OWNER:$OWNER" "$PROJECT_ROOT/runtime" "$PROJECT_ROOT/public/upload" "$PROJECT_ROOT/public/uploads" 2>/dev/null || true
  fi
fi

echo ""
echo "完成：已尝试创建 runtime、public/upload(s) 并设置权限。"
echo "宝塔环境建议将站点用户设为 www，并执行："
echo "  OWNER=www DATA_GROUP=www sudo bash deploy/fix_permissions.sh"
