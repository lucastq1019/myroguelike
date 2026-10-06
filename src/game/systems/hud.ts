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
import { NODE_KIND_COLOR, NODE_KIND_NAME } from '../resources/MapGraph';
import { UiLayer } from '../../GameEngine/ui';

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

/** 升级面板按钮命中区域 */
export interface PanelButtonRect {
  id: 'reroll' | 'skip';
  x: number;
  y: number;
  w: number;
  h: number;
  /** 是否可点击（金币不足/次数用尽 → false） */
  enabled: boolean;
}

/** 提示文字 */
const TIP = 'A/D 移动 · K 跳跃(二段跳) · J 挥砍 · U 射击 · L 冲刺 · S+K 下穿 · 贴墙 K 蹬墙跳 · 1/2/3 选升级 · Q 刷新 · E 跳过 · R 重开';

// ============ 布局常量（画布内 HUD） ============
/** 顶部 HUD 条高度 */
const BAR_H = 34;
/** 血条位置与尺寸 */
const HP_X = 14;
const HP_Y = 10;
const HP_W = 180;
const HP_H = 14;
/** 血条右侧信息（层数 / 剩余敌人 / 金币）的间距 */
const INFO_GAP = 20;
const INFO_KIND_DX = 78;
const INFO_ENEMY_DX = 110;
const INFO_COIN_DX = 200;
/** 右上角为小地图预留的宽度（连击/连招右对齐起点） */
const RIGHT_RESERVE = 240;
const RIGHT_STAGE_DX = 100;
/** 升级卡片尺寸与间距 */
const CARD_W = 200;
const CARD_H = 130;
const CARD_GAP = 24;
/** 升级面板标题相对画布中心的纵向偏移 */
const TITLE_DY = -110;
const CARD_DY = -60;
/** 升级面板底部按钮尺寸与间距 */
const PANEL_BTN_W = 150;
const PANEL_BTN_H = 40;
const PANEL_BTN_GAP = 20;
/** 按钮相对卡片底部的纵向偏移 */
const PANEL_BTN_DY = 60;
/** 刷新 / 跳过 按钮强调色 */
const ACCENT_REROLL = '#4ec9b0';
const ACCENT_SKIP = '#e5c07b';

export function createHudSystem(
  canvasManager: { getCtx: () => CanvasRenderingContext2D | null; width: number; height: number },
) {
  /** UI 层：统一管理升级卡片 / 面板按钮的命中区域 */
  const ui = new UiLayer();

  return {
    name: 'HudSystem',

    /** UI 层（供点击检测 / 测试） */
    getUi(): UiLayer {
      return ui;
    },

    /** 暴露升级卡片命中区域（供鼠标点击检测） */
    getUpgradeCardRects(): CardRect[] {
      return ui
        .all()
        .filter((w) => w.id.startsWith('card:'))
        .map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h, index: Number(w.id.slice(5)) }));
    },

    /** 暴露升级面板按钮命中区域（刷新 / 跳过） */
    getPanelButtons(): PanelButtonRect[] {
      return ui
        .all()
        .filter((w) => w.id === 'reroll' || w.id === 'skip')
        .map((w) => ({
          id: w.id as 'reroll' | 'skip',
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          enabled: w.enabled,
        }));
    },

    /** 命中检测（画布坐标）—— 统一入口，替代手写矩形判断 */
    hitTest(id: string, px: number, py: number): boolean {
      return ui.hitTest(id, px, py);
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
      const barH = BAR_H;
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
      ctx.fillRect(0, 0, W, barH);

      // --- 血条 ---
      const hpX = HP_X;
      const hpY = HP_Y;
      const hpW = HP_W;
      const hpH = HP_H;
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

      // --- 层数 / 敌人 / 金币 ---
      ctx.textAlign = 'left';
      ctx.font = '13px ui-monospace, monospace';
      ctx.fillStyle = '#d4d4d4';
      const infoX = hpX + hpW + INFO_GAP;
      ctx.fillText(`第 ${state.floor} 层`, infoX, barH / 2);
      // 节点类型（地图选路结果）
      ctx.fillStyle = NODE_KIND_COLOR[state.nodeKind];
      ctx.fillText(NODE_KIND_NAME[state.nodeKind], infoX + INFO_KIND_DX, barH / 2);
      ctx.fillStyle = '#d4d4d4';
      ctx.fillText(`剩余 ${state.enemiesLeft}`, infoX + INFO_ENEMY_DX, barH / 2);
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`金币 ${state.coins}`, infoX + INFO_COIN_DX, barH / 2);

      // --- 增益倒计时（血条下方） ---
      if (state.buffs.length > 0) {
        ctx.textAlign = 'left';
        ctx.font = '11px ui-monospace, monospace';
        let bx = HP_X;
        const by = barH + 12;
        for (const b of state.buffs) {
          ctx.fillStyle = b.color;
          const label = `${b.name} ${b.timer.toFixed(1)}s`;
          ctx.fillText(label, bx, by);
          bx += ctx.measureText(label).width + 14;
        }
      }

      // --- 连击 / 连招 ---
      ctx.textAlign = 'right';
      let rightX = W - RIGHT_RESERVE; // 给右上角小地图留空间
      if (state.comboStage > 0) {
        ctx.fillStyle = '#ff8c42';
        ctx.fillText(`连招 ${state.comboStage}/3`, rightX, barH / 2);
        rightX -= RIGHT_STAGE_DX;
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
      ui.begin();
      if (state.upgradeChoosing) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4ec9b0';
        ctx.font = 'bold 22px ui-monospace, monospace';
        ctx.fillText('选择升级', W / 2, H / 2 + TITLE_DY);

        const cardW = CARD_W;
        const cardH = CARD_H;
        const gap = CARD_GAP;
        const n = state.upgradeOptions.length;
        const totalW = n * cardW + (n - 1) * gap;
        const startX = (W - totalW) / 2;
        const cardY = H / 2 + CARD_DY;

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

          // 记录命中区域（UI 层统一管理）
          ui.hitArea({ id: `card:${i}`, x: cx, y: cardY, w: cardW, h: cardH, payload: i });
        });

        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText('点击卡片 或 按 1 / 2 / 3', W / 2, cardY + cardH + 30);

        // ---- 刷新 / 跳过 按钮（Button 控件自带命中检测）----
        const btnY = cardY + cardH + PANEL_BTN_DY;
        const btnW = PANEL_BTN_W;
        const btnH = PANEL_BTN_H;
        const gapB = PANEL_BTN_GAP;
        const totalBW = btnW * 2 + gapB;
        const bx0 = (W - totalBW) / 2;

        // 刷新按钮
        const rerollLabel =
          state.rerollCost === 0 ? `刷新 (免费 ${state.freeRerolls})` : `刷新 (${state.rerollCost} 金币)`;
        ui.button({
          id: 'reroll',
          x: bx0,
          y: btnY,
          w: btnW,
          h: btnH,
          label: rerollLabel,
          enabled: state.canReroll,
          accent: ACCENT_REROLL,
        }).draw(ctx);

        // 跳过按钮
        const skipLabel = `跳过 (+${state.skipHeal} HP)`;
        ui.button({
          id: 'skip',
          x: bx0 + btnW + gapB,
          y: btnY,
          w: btnW,
          h: btnH,
          label: skipLabel,
          enabled: true,
          accent: ACCENT_SKIP,
        }).draw(ctx);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText('按 Q 刷新 · 按 E 跳过', W / 2, btnY + btnH + 22);
      }
      ui.end();

      ctx.restore();
    },
  };
}
