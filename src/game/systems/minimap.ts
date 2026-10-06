/**
 * 小地图系统（右上角）
 *
 * 在画布右上角绘制关卡概要：
 *   - 地形轮廓（地面 / 墙 / 悬浮平台）
 *   - 敌人（红点）
 *   - 玩家（绿点）
 *   - 传送门（蓝点）
 *   - 相机当前视野框
 *
 * 数据来源：World（实体组件）+ Camera 资源（关卡尺寸 / 视野）。
 * 必须在 RenderSystem **之后**运行，才能覆盖在画面之上。
 */
import { World } from '../../GameEngine/ecs';
import { Position } from '../../GameEngine/ecs/components';
import { Camera } from '../../GameEngine/resources/Camera';
import { Wall, Platform, EnemyTag, PlayerTag, Portal, Box } from '../components';

export interface MinimapOptions {
  /** 小地图宽度（像素） */
  width?: number;
  /** 小地图高度（像素） */
  height?: number;
  /** 距画布边缘的边距（像素） */
  margin?: number;
  /** 背景色 */
  background?: string;
  /** 边框色 */
  border?: string;
  /** 地形色 */
  terrainColor?: string;
  /** 平台色 */
  platformColor?: string;
  /** 敌人色 */
  enemyColor?: string;
  /** 玩家色 */
  playerColor?: string;
  /** 传送门色 */
  portalColor?: string;
  /** 视野框色 */
  viewportColor?: string;
}

const DEFAULTS: Required<MinimapOptions> = {
  width: 200,
  height: 120,
  margin: 12,
  background: 'rgba(10, 14, 20, 0.78)',
  border: 'rgba(120, 160, 200, 0.7)',
  terrainColor: '#4a4a4a',
  platformColor: '#6a6a6a',
  enemyColor: '#e06c75',
  playerColor: '#4ec9b0',
  portalColor: '#61afef',
  viewportColor: 'rgba(255, 255, 255, 0.35)',
};

export function createMinimapSystem(
  canvasManager: { getCtx: () => CanvasRenderingContext2D | null; width: number; height: number },
  options: MinimapOptions = {},
) {
  const opt = { ...DEFAULTS, ...options };

  return {
    name: 'MinimapSystem',
    run(world: World): void {
      const ctx = canvasManager.getCtx();
      if (!ctx) return;

      const camera = world.getResource(Camera);
      if (!camera) return;

      const worldW = camera.worldW;
      const worldH = camera.worldH;
      if (worldW <= 0 || worldH <= 0) return;

      // 小地图区域（右上角）
      const mw = opt.width;
      const mh = opt.height;
      const mx = canvasManager.width - mw - opt.margin;
      const my = opt.margin;

      // 世界 → 小地图坐标的缩放（保持比例，居中）
      const scale = Math.min(mw / worldW, mh / worldH);
      const drawW = worldW * scale;
      const drawH = worldH * scale;
      const offX = mx + (mw - drawW) / 2;
      const offY = my + (mh - drawH) / 2;

      const toMap = (wx: number, wy: number) => ({
        x: offX + wx * scale,
        y: offY + wy * scale,
      });

      ctx.save();

      // 背景
      ctx.globalAlpha = 1;
      ctx.fillStyle = opt.background;
      ctx.fillRect(mx, my, mw, mh);

      // 裁剪到小地图区域，避免地形溢出
      ctx.beginPath();
      ctx.rect(mx, my, mw, mh);
      ctx.clip();

      // --- 地形（地面 / 墙） ---
      ctx.fillStyle = opt.terrainColor;
      const wallMask = world.maskOf(Wall);
      const posMask = world.maskOf(Position);
      const wallIdxs = world.findEntities(world.query().with(wallMask, posMask).build());
      for (const wi of wallIdxs) {
        // 平台单独画（跳过，下面用 Platform 画）
        if (world.storage.has(wi, Platform)) continue;
        const pos = world.storage.get(wi, Position)!;
        const box = world.storage.get(wi, Box);
        if (box) {
          const p = toMap(pos.x - box.halfW, pos.y - box.halfH);
          ctx.fillRect(p.x, p.y, box.halfW * 2 * scale, box.halfH * 2 * scale);
        } else {
          const p = toMap(pos.x, pos.y);
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
      }

      // --- 悬浮平台 ---
      ctx.fillStyle = opt.platformColor;
      const platMask = world.maskOf(Platform);
      const platIdxs = world.findEntities(world.query().with(platMask, posMask).build());
      for (const pi of platIdxs) {
        const pos = world.storage.get(pi, Position)!;
        const plat = world.storage.get(pi, Platform)!;
        const p = toMap(pos.x - plat.halfW, pos.y - plat.halfH);
        ctx.fillRect(p.x, p.y, plat.halfW * 2 * scale, Math.max(1.5, plat.halfH * 2 * scale));
      }

      // --- 传送门 ---
      const portalMask = world.maskOf(Portal);
      const portalIdxs = world.findEntities(world.query().with(portalMask, posMask).build());
      ctx.fillStyle = opt.portalColor;
      for (const pi of portalIdxs) {
        const pos = world.storage.get(pi, Position)!;
        const p = toMap(pos.x, pos.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 敌人 ---
      const enemyMask = world.maskOf(EnemyTag);
      const enemyIdxs = world.findEntities(world.query().with(enemyMask, posMask).build());
      ctx.fillStyle = opt.enemyColor;
      for (const ei of enemyIdxs) {
        const pos = world.storage.get(ei, Position)!;
        const p = toMap(pos.x, pos.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 玩家 ---
      const playerMask = world.maskOf(PlayerTag);
      const playerIdxs = world.findEntities(world.query().with(playerMask, posMask).build());
      ctx.fillStyle = opt.playerColor;
      for (const pi of playerIdxs) {
        const pos = world.storage.get(pi, Position)!;
        const p = toMap(pos.x, pos.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // 玩家外圈高亮
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // --- 相机视野框 ---
      const vLeft = camera.x - camera.viewportW / 2;
      const vTop = camera.y - camera.viewportH / 2;
      const vp = toMap(vLeft, vTop);
      ctx.strokeStyle = opt.viewportColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(vp.x, vp.y, camera.viewportW * scale, camera.viewportH * scale);

      ctx.restore();

      // 边框（在裁剪之外画，保证完整）
      ctx.globalAlpha = 1;
      ctx.strokeStyle = opt.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx, my, mw, mh);
    },
  };
}
