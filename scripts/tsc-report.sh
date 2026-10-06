#!/bin/bash
# 统计 tsc 错误按文件分布
cd "$(dirname "$0")/.." || exit 1
npx tsc --noEmit 2>&1 | grep -E 'error TS' | sed -E 's/\(.*//' | sort | uniq -c | sort -rn
