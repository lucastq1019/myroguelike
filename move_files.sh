#!/bin/bash

# 移动文件脚本
# 此脚本用于将项目中的文件移动到正确的目录位置

# 确保脚本在项目根目录执行
cd "$(dirname "$0")"

# 创建必要的目录（如果不存在）
mkdir -p src/nouse

# 移动未分类文件到nouse目录
# 注意：根据目录结构，这些文件似乎已经在nouse目录中
# 以下命令会检查文件是否存在于原位置，如果存在则移动
if [ -f "src/GameEngine/EditorUI.ts" ]; then
  mv src/GameEngine/EditorUI.ts src/nouse/
  echo "已移动 src/GameEngine/EditorUI.ts 到 src/nouse/"
else
  echo "src/GameEngine/EditorUI.ts 已在正确位置"
fi

if [ -f "src/GameEngine/EntityTreeRenderer.ts" ]; then
  mv src/GameEngine/EntityTreeRenderer.ts src/nouse/
  echo "已移动 src/GameEngine/EntityTreeRenderer.ts 到 src/nouse/"
else
  echo "src/GameEngine/EntityTreeRenderer.ts 已在正确位置"
fi

if [ -f "src/GameEngine/PropertyPanel.ts" ]; then
  mv src/GameEngine/PropertyPanel.ts src/nouse/
  echo "已移动 src/GameEngine/PropertyPanel.ts 到 src/nouse/"
else
  echo "src/GameEngine/PropertyPanel.ts 已在正确位置"
fi

# 检查并移动其他可能需要调整位置的文件
# 例如: 将Component.ts添加到project_map.md
if [ -f "src/GameEngine/ecs/Component.ts" ]; then
  # 在project_map.md中添加Component.ts的条目
  sed -i '/## ECS系统/a | `src/GameEngine/ecs/Component.ts` | ECS架构组件基类 (轻量级) |' project_map.md
  echo "已在project_map.md中添加Component.ts的条目"
else
  echo "src/GameEngine/ecs/Component.ts 不存在"
fi

# 修复assets/code目录下的文件名拼写错误
if [ -f "src/assets/code/Platfrom.js" ]; then
  mv src/assets/code/Platfrom.js src/assets/code/Platform.js
  echo "已修复文件名: Platfrom.js -> Platform.js"
fi

echo "文件移动和修复操作完成！"