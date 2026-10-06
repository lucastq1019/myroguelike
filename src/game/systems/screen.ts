/**
 * 界面系统（画布内绘制）
 *
 * 绘制主菜单 / 暂停菜单 / 结束界面，并暴露按钮命中区域供鼠标点击。
 * 必须在 RenderSystem 之后运行。
 *
 * 设计：
 *   - 纯文字（不用 emoji，避免等宽字体 fallback 渲染异常）
 *   - 内容块整体垂直居中：先算总高度，再从 (H - totalH) / 2 开始布局
 */
import { GamePhase } from '../state';
import { SaveData } from '../save';
import { UNLOCKS } from '../resources/Unlocks';
import { UiLayer } from '../../GameEngine/ui';

export interface ScreenButton {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScreenContext {
  phase: GamePhase;
  /** 本局层数（结束界面用） */
  floor: number;
  /** 本局最高连击 */
  combo: number;
  /** 存档数据（最佳记录） */
  save: SaveData;
  /** 是否新纪录 */
  isNewBest: boolean;
  /** 本局获得灵魂（结束界面用） */
  soulsGained: number;
  /** 是否存在中途存档（主菜单显示「继续游戏」） */
  hasRunSave?: boolean;
}

/** 布局元素（用于计算总高度并居中） */
type Row =
  | { kind: 'title'; text: string; size: number; color: string; gap?: number }
  | { kind: 'text'; text: string; size: number; color: string; gap?: number }
  | { kind: 'button'; id: string; label: string; w: number; h: number; gap?: number }
  | {
      kind: 'unlock';
      id: string;
      name: string;
      desc: string;
      cost: number;
      /** 已解锁 */
      owned: boolean;
      /** 灵魂足够 */
      affordable: boolean;
      gap?: number;
    };

/** 默认行间距 */
const DEFAULT_GAP = 16;
/** 解锁行尺寸 */
const UNLOCK_ROW_W = 460;
const UNLOCK_ROW_H = 46;

export function createScreenSystem(
  canvasManager: { getCtx: () => CanvasRenderingContext2D | null; width: number; height: number },
) {
  /** UI 层：统一管理按钮 / 解锁行命中区域 */
  const ui = new UiLayer();
  /** 当前帧内容块的实际范围（用于测试/调试居中） */
  let blockTop = 0;
  let blockBottom = 0;

  /** 计算一行占用的高度（含其后的 gap） */
  function rowHeight(row: Row): number {
    const gap = row.gap ?? DEFAULT_GAP;
    if (row.kind === 'button') return row.h + gap;
    if (row.kind === 'unlock') return UNLOCK_ROW_H + gap;
    return row.size + gap;
  }

  /** 绘制一行，返回该行绘制后的 y（下一行的起始 y） */
  function drawRow(ctx: CanvasRenderingContext2D, row: Row, cx: number, y: number): number {
    const gap = row.gap ?? DEFAULT_GAP;
    if (row.kind === 'button') {
      const x = cx - row.w / 2;
      // 用 Button 控件绘制（自带命中检测，注册进 UI 层）
      ui.button({
        id: row.id,
        x,
        y,
        w: row.w,
        h: row.h,
        label: row.label,
        accent: '#4ec9b0',
        fontSize: 16,
      }).draw(ctx);
      return y + row.h + gap;
    }
    if (row.kind === 'unlock') {
      const w = UNLOCK_ROW_W;
      const h = UNLOCK_ROW_H;
      const x = cx - w / 2;
      const accent = row.owned ? '#4ec9b0' : row.affordable ? '#e5c07b' : '#555';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // 名称
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = row.owned ? '#4ec9b0' : '#d4d4d4';
      ctx.font = 'bold 15px ui-monospace, monospace';
      ctx.fillText(row.name, x + 16, y + h / 2 - 9);
      // 描述
      ctx.fillStyle = '#888';
      ctx.font = '12px ui-monospace, monospace';
      ctx.fillText(row.desc, x + 16, y + h / 2 + 11);

      // 右侧状态
      ctx.textAlign = 'right';
      if (row.owned) {
        ctx.fillStyle = '#4ec9b0';
        ctx.font = 'bold 13px ui-monospace, monospace';
        ctx.fillText('已解锁', x + w - 16, y + h / 2);
      } else {
        ctx.fillStyle = row.affordable ? '#e5c07b' : '#666';
        ctx.font = 'bold 13px ui-monospace, monospace';
        ctx.fillText(`${row.cost} 灵魂`, x + w - 16, y + h / 2);
        // 命中区域（仅未解锁项可点击）——注册进 UI 层
        ui.hitArea({ id: `unlock:${row.id}`, x, y, w, h, payload: row.id });
      }
      return y + h + gap;
    }
    // 文字：y 为该行顶部，绘制基线在 y + size/2
    ctx.fillStyle = row.color;
    ctx.font = `${row.kind === 'title' ? 'bold ' : ''}${row.size}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.text, cx, y + row.size / 2);
    return y + row.size + gap;
  }

  /** 绘制整块内容（垂直居中） */
  function drawBlock(ctx: CanvasRenderingContext2D, W: number, H: number, rows: Row[]): void {
    const totalH = rows.reduce((acc, r) => acc + rowHeight(r), 0);
    let y = (H - totalH) / 2;
    blockTop = y;
    for (const row of rows) {
      y = drawRow(ctx, row, W / 2, y);
    }
    blockBottom = y;
  }

  return {
    name: 'ScreenSystem',

    /** UI 层（供点击检测 / 测试） */
    getUi(): UiLayer {
      return ui;
    },

    /** 暴露按钮命中区域（供鼠标点击） */
    getButtons(): ScreenButton[] {
      return ui.all().map((w) => ({ id: w.id, label: '', x: w.x, y: w.y, w: w.w, h: w.h }));
    },

    /** 命中检测（画布坐标）—— 统一入口 */
    hitTest(id: string, px: number, py: number): boolean {
      return ui.hitTest(id, px, py);
    },

    /** 暴露内容块范围（调试/测试居中用） */
    getBlockBounds(): { top: number; bottom: number } {
      return { top: blockTop, bottom: blockBottom };
    },

    run(_world: unknown, _dt: number, sc: ScreenContext): void {
      const ctx = canvasManager.getCtx();
      if (!ctx) return;
      const W = canvasManager.width;
      const H = canvasManager.height;
      ui.begin();

      if (sc.phase === GamePhase.PLAYING) {
        ui.end();
        return; // 游戏中不画界面
      }

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 半透明遮罩
      ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
      ctx.fillRect(0, 0, W, H);

      if (sc.phase === GamePhase.MENU) {
        const menuRows: Row[] = [
          { kind: 'title', text: '动作 Roguelike', size: 42, color: '#4ec9b0', gap: 12 },
          { kind: 'text', text: '横版动作 · 连招 · 冲刺 · 蹬墙跳', size: 14, color: '#888', gap: 36 },
        ];
        // 有中途存档时，优先显示「继续游戏」
        if (sc.hasRunSave) {
          menuRows.push({ kind: 'button', id: 'continue', label: '继续游戏', w: 220, h: 52, gap: 12 });
        }
        menuRows.push({ kind: 'button', id: 'start', label: '开始游戏', w: 220, h: 52, gap: 12 });
        menuRows.push({ kind: 'button', id: 'shop', label: `解锁商店（${sc.save.souls} 灵魂）`, w: 220, h: 46, gap: 30 });
        menuRows.push({
          kind: 'text',
          text: `最高层数 ${sc.save.bestFloor}　最高连击 ${sc.save.bestCombo}　游玩次数 ${sc.save.runs}`,
          size: 13,
          color: '#666',
          gap: 12,
        });
        menuRows.push({ kind: 'text', text: '点击「开始游戏」或按 Enter', size: 12, color: '#555', gap: 0 });
        drawBlock(ctx, W, H, menuRows);
      } else if (sc.phase === GamePhase.SHOP) {
        const rows: Row[] = [
          { kind: 'title', text: '解锁商店', size: 32, color: '#4ec9b0', gap: 8 },
          { kind: 'text', text: `灵魂 ${sc.save.souls}　（每局按层数结算）`, size: 14, color: '#e5c07b', gap: 24 },
        ];
        for (const u of UNLOCKS) {
          const owned = sc.save.unlocked.includes(u.id);
          rows.push({
            kind: 'unlock',
            id: u.id,
            name: u.name,
            desc: u.desc,
            cost: u.cost,
            owned,
            affordable: sc.save.souls >= u.cost,
            gap: 10,
          });
        }
        rows.push({ kind: 'button', id: 'back', label: '返回主菜单', w: 220, h: 44, gap: 0 });
        drawBlock(ctx, W, H, rows);
      } else if (sc.phase === GamePhase.PAUSED) {
        drawBlock(ctx, W, H, [
          { kind: 'title', text: '已暂停', size: 34, color: '#d4d4d4', gap: 32 },
          { kind: 'button', id: 'resume', label: '继续游戏', w: 220, h: 48, gap: 12 },
          { kind: 'button', id: 'restart', label: '重新开始', w: 220, h: 48, gap: 12 },
          { kind: 'button', id: 'menu', label: '返回主菜单', w: 220, h: 48, gap: 24 },
          { kind: 'text', text: '按 ESC 继续', size: 12, color: '#555', gap: 0 },
        ]);
      } else if (sc.phase === GamePhase.GAMEOVER) {
        const rows: Row[] = [
          { kind: 'title', text: '你死了', size: 40, color: '#e06c75', gap: 20 },
          { kind: 'text', text: `到达第 ${sc.floor} 层`, size: 18, color: '#d4d4d4', gap: 10 },
          { kind: 'text', text: `本局最高连击 x${sc.combo}`, size: 14, color: '#ffd166', gap: 10 },
          { kind: 'text', text: `获得灵魂 +${sc.soulsGained}（共 ${sc.save.souls}）`, size: 14, color: '#e5c07b', gap: 10 },
        ];
        if (sc.isNewBest) {
          rows.push({ kind: 'text', text: '新纪录！', size: 16, color: '#4ec9b0', gap: 24 });
        } else {
          rows.push({ kind: 'text', text: `历史最高 第 ${sc.save.bestFloor} 层`, size: 13, color: '#666', gap: 24 });
        }
        rows.push({ kind: 'button', id: 'restart', label: '再来一局', w: 220, h: 48, gap: 12 });
        rows.push({ kind: 'button', id: 'menu', label: '返回主菜单', w: 220, h: 48, gap: 20 });
        rows.push({ kind: 'text', text: '按 R 快速重开', size: 12, color: '#555', gap: 0 });
        drawBlock(ctx, W, H, rows);
      }

      ui.end();
      ctx.restore();
    },
  };
}
