/**
 * 地图选择界面（画布内绘制）
 *
 * 显示整张分支地图：
 *   - 已走过的路径高亮
 *   - 当前节点标记
 *   - 可达节点可点击（其余置灰）
 *   - 节点按类型着色 + 图标文字
 *
 * 必须在 RenderSystem 之后运行。
 * 命中区域通过 UiLayer 统一管理（getUi().hitTest / hit）。
 */
import { UiLayer } from '../../GameEngine/ui';
import {
  GameMap,
  MapNode,
  layoutMap,
  NODE_KIND_COLOR,
  NODE_KIND_NAME,
} from '../resources/MapGraph';

export interface MapScreenContext {
  map: GameMap;
  /** 当前所在节点（null = 尚未进入地图） */
  currentNode: MapNode | null;
  /** 已访问过的节点 id */
  visited: Set<number>;
}

/** 画布内边距 */
const PAD_X = 110;
const PAD_Y = 110;
/** 节点半径 */
const NODE_R = 20;
/** 命中半径（比视觉半径大，好点） */
const HIT_R = 26;

export function createMapScreenSystem(
  canvasManager: { getCtx: () => CanvasRenderingContext2D | null; width: number; height: number },
) {
  const ui = new UiLayer();
  /** 当前帧节点屏幕坐标（供命中检测） */
  let nodePoints: { node: MapNode; x: number; y: number; selectable: boolean }[] = [];

  return {
    name: 'MapScreenSystem',

    getUi(): UiLayer {
      return ui;
    },

    /** 当前帧节点坐标（测试/调试用） */
    getNodePoints() {
      return nodePoints;
    },

    /** 命中检测：点 (px, py) 是否落在某节点上，返回该节点 */
    hitNode(px: number, py: number): MapNode | null {
      for (const p of nodePoints) {
        if (!p.selectable) continue;
        if (Math.hypot(px - p.x, py - p.y) <= HIT_R) return p.node;
      }
      return null;
    },

    run(_world: unknown, _dt: number, sc: MapScreenContext): void {
      const ctx = canvasManager.getCtx();
      if (!ctx) return;
      const W = canvasManager.width;
      const H = canvasManager.height;

      ui.begin();
      nodePoints = [];

      // 遮罩
      ctx.save();
      ctx.fillStyle = 'rgba(8, 12, 18, 0.92)';
      ctx.fillRect(0, 0, W, H);

      // 标题
      ctx.fillStyle = '#4ec9b0';
      ctx.font = 'bold 26px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('选择路线', W / 2, 46);
      ctx.fillStyle = '#666';
      ctx.font = '12px ui-monospace, monospace';
      ctx.fillText('点击高亮节点前进', W / 2, 74);

      const { map, currentNode, visited } = sc;
      const layout = layoutMap(map);
      const innerW = W - PAD_X * 2;
      const innerH = H - PAD_Y * 2;

      /** 归一化 → 屏幕坐标 */
      const toScreen = (id: number) => {
        const p = layout.get(id)!;
        return { x: PAD_X + p.x * innerW, y: PAD_Y + p.y * innerH };
      };

      // 可达集合
      const reachable = new Set<number>();
      if (currentNode) {
        for (const n of currentNode.next) reachable.add(n.id);
      }

      // ---- 先画连线 ----
      for (const node of map.allNodes()) {
        const a = toScreen(node.id);
        for (const next of node.next) {
          const b = toScreen(next.id);
          const traversed = visited.has(node.id) && visited.has(next.id);
          const active = currentNode?.id === node.id && reachable.has(next.id);
          ctx.strokeStyle = traversed ? '#4ec9b0' : active ? '#e5c07b' : '#2f3540';
          ctx.lineWidth = traversed || active ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // ---- 再画节点 ----
      for (const node of map.allNodes()) {
        const p = toScreen(node.id);
        const isCurrent = currentNode?.id === node.id;
        const isVisited = visited.has(node.id);
        const isReachable = reachable.has(node.id);
        const selectable = isReachable;
        const color = NODE_KIND_COLOR[node.kind];

        // 可达节点：外圈脉动提示
        if (selectable) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, NODE_R + 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#e5c07b';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 节点圆
        ctx.beginPath();
        ctx.arc(p.x, p.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = isVisited || isCurrent ? color : selectable ? color : '#2a2f38';
        ctx.globalAlpha = isVisited || isCurrent || selectable ? 1 : 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;

        // 当前节点：实心高亮 + 白边
        ctx.strokeStyle = isCurrent ? '#ffffff' : '#12161d';
        ctx.lineWidth = isCurrent ? 3 : 2;
        ctx.stroke();

        // 类型文字（节点下方）
        ctx.fillStyle = isVisited || isCurrent || selectable ? '#d4d4d4' : '#555';
        ctx.font = '11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(NODE_KIND_NAME[node.kind], p.x, p.y + NODE_R + 14);

        nodePoints.push({ node, x: p.x, y: p.y, selectable });

        // 注册命中区域（圆形用方形近似，够用且统一）
        if (selectable) {
          ui.hitArea({
            id: `node:${node.id}`,
            x: p.x - HIT_R,
            y: p.y - HIT_R,
            w: HIT_R * 2,
            h: HIT_R * 2,
            payload: node.id,
          });
        }
      }

      // 图例
      const kinds = ['battle', 'elite', 'treasure', 'rest', 'shop', 'boss'] as const;
      let lx = PAD_X - 60;
      const ly = H - 34;
      ctx.textAlign = 'left';
      ctx.font = '11px ui-monospace, monospace';
      for (const k of kinds) {
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fillStyle = NODE_KIND_COLOR[k];
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.fillText(NODE_KIND_NAME[k], lx + 12, ly);
        lx += 84;
      }

      ui.end();
      ctx.restore();
    },
  };
}
