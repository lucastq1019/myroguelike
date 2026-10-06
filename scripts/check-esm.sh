#!/bin/bash
# 用 isolatedModules 检查「纯类型被当值导出/导入」问题（Vite/esbuild 约束）
cd "$(dirname "$0")/.." || exit 1
npx tsc --noEmit --isolatedModules \
  --target es2020 --module esnext --moduleResolution bundler \
  --strict --skipLibCheck \
  src/ecs-lab/index.ts src/roguelike/main.ts 2>&1 | grep -E 'error TS' | head -40
echo "--- done ---"
