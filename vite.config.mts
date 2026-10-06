import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/**
 * Vite 配置
 *
 * 说明：
 * - 原项目用 Webpack，此处切换到 Vite（dev 用 esbuild 转译，不做类型检查 → 能跑）。
 * - 旧项目存在大量 TS 类型错误，`vite build` 会失败；dev 不受影响。
 * - 入口指向 ecs-lab（阶段一验证页），旧 index.ts 保留不删。
 * - 原 webpack 的 alias `@` -> src 保留，方便后续复用。
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  server: {
    open: true,
    port: 5173,
  },
  // 原项目用 worker-loader，Vite 用 `?worker` 语法，此处暂不处理 worker
  // 阶段一不涉及 worker（battle/Worker.ts）
});
