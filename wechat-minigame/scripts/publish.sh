#!/bin/bash
# 微信小游戏发布脚本
# 用法: ./scripts/publish.sh [版本号] [描述]
# 示例: ./scripts/publish.sh 1.1.0 "修复bug并优化性能"

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/js/config.js"

# 版本号参数
VERSION=${1:-""}
DESCRIPTION=${2:-"发布新版本"}

# 检查版本号
if [ -z "$VERSION" ]; then
    echo -e "${RED}错误: 请提供版本号${NC}"
    echo "用法: ./scripts/publish.sh [版本号] [描述]"
    echo "示例: ./scripts/publish.sh 1.1.0 \"修复bug并优化性能\""
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   微信小游戏发布脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "版本号: ${YELLOW}$VERSION${NC}"
echo -e "描述: ${YELLOW}$DESCRIPTION${NC}"
echo -e "项目目录: ${YELLOW}$PROJECT_DIR${NC}"
echo ""

# 步骤1: 设置为生产环境
echo -e "${YELLOW}[1/3] 设置为生产环境...${NC}"

# 检查配置文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}错误: 配置文件不存在: $CONFIG_FILE${NC}"
    exit 1
fi

# 备份原始配置
cp "$CONFIG_FILE" "$CONFIG_FILE.bak"

# 将 __DEV__ 设置为 false
sed -i '' 's/const __DEV__ = true;/const __DEV__ = false;/' "$CONFIG_FILE"

# 验证修改
if grep -q "const __DEV__ = false;" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ 已设置 __DEV__ = false${NC}"
else
    echo -e "${RED}错误: 设置 __DEV__ 失败${NC}"
    # 恢复备份
    mv "$CONFIG_FILE.bak" "$CONFIG_FILE"
    exit 1
fi

# 步骤2: 上传到微信平台
echo ""
echo -e "${YELLOW}[2/3] 上传到微信平台...${NC}"

# 检查微信开发者工具CLI
CLI_PATH="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
if [ ! -f "$CLI_PATH" ]; then
    echo -e "${RED}错误: 微信开发者工具CLI不存在${NC}"
    echo "请确保已安装微信开发者工具"
    # 恢复备份
    mv "$CONFIG_FILE.bak" "$CONFIG_FILE"
    exit 1
fi

# 执行上传
UPLOAD_RESULT=$("$CLI_PATH" upload --project "$PROJECT_DIR" -v "$VERSION" -d "$DESCRIPTION" 2>&1)
UPLOAD_STATUS=$?

if [ $UPLOAD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ 上传成功${NC}"
    echo "$UPLOAD_RESULT" | grep -E "(TOTAL|size)"
else
    echo -e "${RED}上传失败:${NC}"
    echo "$UPLOAD_RESULT"
    # 恢复备份
    mv "$CONFIG_FILE.bak" "$CONFIG_FILE"
    exit 1
fi

# 步骤3: 恢复开发环境
echo ""
echo -e "${YELLOW}[3/3] 恢复开发环境配置...${NC}"

# 恢复备份
mv "$CONFIG_FILE.bak" "$CONFIG_FILE"

if grep -q "const __DEV__ = true;" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ 已恢复 __DEV__ = true${NC}"
else
    echo -e "${YELLOW}警告: 恢复配置可能存在问题，请手动检查${NC}"
fi

# 完成
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   发布完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "版本 ${YELLOW}$VERSION${NC} 已上传到微信公众平台"
echo ""
echo -e "下一步操作:"
echo "1. 登录 https://mp.weixin.qq.com"
echo "2. 进入「管理」→「版本管理」"
echo "3. 找到版本 $VERSION 并提交审核"
echo ""
