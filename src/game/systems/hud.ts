/**
 * HUD 系统（画布内绘制）
 *
 * 把原本的 DOM HUD 整合进画布：
 *   - 顶部 HUD 条：血条 + 层数 + 剩余敌人 + 连击/连招
 *   - 底部操作提示
 *   - 升级选择面板（3 张卡片，支持鼠标点击命中检测 + 键盘 1/2/3）
 *
 * 必须在 RenderSystem **之后**运行（否则被清屏覆盖）。
 * 升级卡片的命中区域通过 getUpgradeCardRects() 暴露，供 main.ts 做鼠标点击检测。
 */
import { GameState } from '../game';
import { RARITY_COLOR, RARITY_NAME } from '../resources/Upgrades';

export interface HudOptions {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
}

/** 升级卡片命中区域 */
export interface CardRect {
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
}

/** 提示文字 */
const TIP = 'A/D 移动 · K 跳跃(二段跳) · J 挥砍 · U 射击 · L 冲刺 · S+K 下穿 · 贴墙 K 蹬墙跳 · 1/2/3 选升级 · R 重开';

export function createHudSystem(
  canvasManager: { getCtx: () => CanvasRenderingContext2D | null; width: number; height: number },
) {
  /** 当前帧的升级卡片命中区域（供点击检测） */
  let cardRects: CardRect[] = [];

  return {
    name: 'HudSystem',

    /** 暴露升级卡片命中区域（供鼠标点击检测） */
    getUpgradeCardRects(): CardRect[] {
      return cardRects;
    },

    run(_world: unknown, _dt: number, state: GameState): void {
      const ctx = canvasManager.getCtx();
      if (!ctx) return;

      const W = canvasManager.width;
      const H = canvasManager.height;

      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      // ============ 顶部 HUD 条 ============
      const barH = 34;
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
      ctx.fillRect(0, 0, W, barH);

      // --- 血条 ---
      const hpX = 14;
      const hpY = 10;
      const hpW = 180;
      const hpH = 14;
      const hpRatio = state.maxHp > 0 ? Math.max(0, Math.min(1, state.hp / state.maxHp)) : 0;

      // 血条底
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(hpX, hpY, hpW, hpH);
      // 血条填充（低血变红）
      ctx.fillStyle = hpRatio > 0.3 ? '#e06c75' : '#ff5555';
      ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
      // 血条边框
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hpX, hpY, hpW, hpH);
      // 血量文字
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${state.hp}/${state.maxHp}`, hpX + hpW / 2, hpY + hpH / 2 + 0.5);

      // --- 层数 / 敌人 ---
      ctx.textAlign = 'left';
      ctx.font = '13px ui-monospace, monospace';
      ctx.fillStyle = '#d4d4d4';
      const infoX = hpX + hpW + 20;
      ctx.fillText(`第 ${state.floor} 层`, infoX, barH / 2);
      ctx.fillText(`剩余 ${state.enemiesLeft}`, infoX + 110, barH / 2);

      // --- 连击 / 连招 ---
      ctx.textAlign = 'right';
      let rightX = W - 240; // 给右上角小地图留空间
      if (state.comboStage > 0) {
        ctx.fillStyle = '#ff8c42';
        ctx.fillText(`连招 ${state.comboStage}/3`, rightX, barH / 2);
        rightX -= 100;
      }
      if (state.combo > 1) {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 14px ui-monospace, monospace';
        ctx.fillText(`连击 x${state.combo}`, rightX, barH / 2);
      }

      // --- 死亡提示 ---
      if (state.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, H / 2 - 40, W, 80);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e06c75';
        ctx.font = 'bold 26px ui-monospace, monospace';
        ctx.fillText(`你死了（第 ${state.floor} 层）`, W / 2, H / 2 - 10);
        ctx.fillStyle = '#d4d4d4';
        ctx.font = '14px ui-monospace, monospace';
        ctx.fillText('按 R 重开', W / 2, H / 2 + 22);
      }

      // ============ 底部操作提示 ============
      if (!state.gameOver) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(150,150,150,0.85)';
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(TIP, W / 2, H - 12);
      }

      // ============ 升级选择面板 ============
      cardRects = [];
      if (state.upgradeChoosing) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4ec9b0';
        ctx.font = 'bold 22px ui-monospace, monospace';
        ctx.fillText('选择升级', W / 2, H / 2 - 110);

        const cardW = 200;
        const cardH = 130;
        const gap = 24;
        const n = state.upgradeOptions.length;
        const totalW = n * cardW + (n - 1) * gap;
        const startX = (W - totalW) / 2;
        const cardY = H / 2 - 60;

        state.upgradeOptions.forEach((u, i) => {
          const cx = startX + i * (cardW + gap);
          const rarityColor = RARITY_COLOR[u.rarity];
          // 卡片背景
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(cx, cardY, cardW, cardH);
          // 边框按稀有度着色
          ctx.strokeStyle = rarityColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, cardY, cardW, cardH);

          // 序号
          ctx.textAlign = 'left';
          ctx.fillStyle = '#569cd6';
          ctx.font = '13px ui-monospace, monospace';
          ctx.fillText(`[${i + 1}]`, cx + 16, cardY + 22);

          // 稀有度标签（右上角）
          ctx.textAlign = 'right';
          ctx.fillStyle = rarityColor;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(RARITY_NAME[u.rarity], cx + cardW - 14, cardY + 22);

          // 名称（按稀有度着色）
          ctx.textAlign = 'left';
          ctx.fillStyle = rarityColor;
          ctx.font = 'bold 16px ui-monospace, monospace';
          ctx.fillText(u.name, cx + 16, cardY + 52);

          // 描述
          ctx.fillStyle = '#888';
          ctx.font = '13px ui-monospace, monospace';
          ctx.fillText(u.desc, cx + 16, cardY + 82);

          // 记录命中区域
          cardRects.push({ x: cx, y: cardY, w: cardW, h: cardH, index: i });
        });

        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText('点击卡片 或 按 1 / 2 / 3', W / 2, cardY + cardH + 30);
      }

      ctx.restore();
    },
  };
}
