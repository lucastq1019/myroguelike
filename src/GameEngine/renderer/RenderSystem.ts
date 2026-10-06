/**
 * RenderSystem —— 渲染系统（ECS 式）
 *
 * 查 Position + Sprite 组件，经相机变换后绘制到 Canvas。
 * - 相机从 Resource 读取
 * - 视口剔除（只画可见实体）
 * - 支持自定义绘制钩子（如传送门脉冲、无敌闪烁）
 */
import type { World } from '../ecs/World';
import { Position } from '../ecs/components/Position';
import { Sprite } from '../ecs/components/Sprite';
import { Transform } from '../ecs/components/Transform';
import { Camera } from '../resources/Camera';
import CanvasManager from './CanvasManager';

/** 自定义绘制钩子：返回 true 表示已处理，跳过默认绘制 */
export type SpriteDecorator = (
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number },
  sprite: Sprite,
  entityIndex: number,
  world: World,
  time: number,
) => boolean;

export interface RenderSystemOptions {
  /** 背景色 */
  background?: string;
  /** 是否绘制网格 */
  grid?: boolean;
  /** 网格间距 */
  gridSize?: number;
  /** 自定义绘制钩子（按顺序尝试） */
  decorators?: SpriteDecorator[];
}

export function createRenderSystem(
  canvasManager: CanvasManager,
  options: RenderSystemOptions = {},
) {
  const {
    background = '#181818',
    grid = true,
    gridSize = 64,
    decorators = [],
  } = options;

  let time = 0;

  return {
    name: 'RenderSystem',
    run(world: World, dt: number): void {
      time += dt;
      const ctx = canvasManager.getCtx();
      if (!ctx) return;

      const camera = world.getResource(Camera);
      if (!camera) return;

      const w = canvasManager.width;
      const h = canvasManager.height;

      // 背景
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      // 网格（随相机移动）
      if (grid) drawGrid(ctx, camera, w, h, gridSize);

      // 绘制实体
      const sprites = world.dense(Sprite);
      const entities = world.denseEntities(Sprite);
      for (let i = 0; i < sprites.length; i++) {
        const idx = entities[i];
        const pos = world.storage.get(idx, Position);
        if (!pos) continue;
        if (!camera.isVisible(pos.x, pos.y, 80)) continue;

        const screen = camera.worldToScreen(pos.x, pos.y);
        const sprite = sprites[i];

        // 尝试自定义绘制钩子
        let handled = false;
        for (const dec of decorators) {
          if (dec(ctx, screen, sprite, idx, world, time)) {
            handled = true;
            break;
          }
        }
        if (handled) continue;

        // 默认绘制（应用 Transform 的旋转/缩放，无 Transform 或单位变换时零开销）
        ctx.globalAlpha = 1;
        const tf = world.storage.get(idx, Transform);
        const needsTransform = tf !== undefined && !tf.isIdentity();
        if (needsTransform) {
          ctx.save();
          ctx.translate(screen.x, screen.y);
          ctx.rotate(tf.rotation);
          ctx.scale(tf.scaleX, tf.scaleY);
        }
        const drawX = needsTransform ? 0 : screen.x;
        const drawY = needsTransform ? 0 : screen.y;

        if (sprite.shape === 'circle') {
          ctx.fillStyle = sprite.color;
          ctx.beginPath();
          ctx.arc(drawX, drawY, sprite.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = sprite.color;
          ctx.fillRect(drawX - sprite.size / 2, drawY - sprite.size / 2, sprite.size, sprite.size);
        }
        if (needsTransform) ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  w: number,
  h: number,
  gridSize: number,
): void {
  const startX = Math.floor((camera.x - w / 2) / gridSize) * gridSize;
  const startY = Math.floor((camera.y - h / 2) / gridSize) * gridSize;
  ctx.strokeStyle = '#242424';
  ctx.lineWidth = 1;
  for (let x = startX; x < camera.x + w / 2 + gridSize; x += gridSize) {
    const sx = camera.worldToScreen(x, 0).x;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }
  for (let y = startY; y < camera.y + h / 2 + gridSize; y += gridSize) {
    const sy = camera.worldToScreen(0, y).y;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
  }
}

export default createRenderSystem;
