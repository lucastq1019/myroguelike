/**
 * 地图节点图（Roguelike 分支路线）
 *
 * 移植自旧 GameEngine 的 `core/objects/MapNode` 设计：
 *   - 节点有 `nextNodes` / `previousNodes`（双向图）
 *   - 分层（layer）布局，同层节点纵向排列
 *
 * 本模块只负责**图结构与生成**（纯数据 + 纯函数），
 * 渲染在 `systems/mapScreen.ts`，推进逻辑在 `game.ts`。
 *
 * 设计要点：
 *   - 每层 1~3 个节点，节点类型决定该层内容（战斗/精英/宝箱/休息/商店/Boss）
 *   - 边只连「相邻层」，且限制跨度过大（避免连线交叉混乱）
 *   - 第 1 层固定单入口，Boss 层固定单节点
 */

/** 节点类型 */
export type MapNodeKind = 'start' | 'battle' | 'elite' | 'treasure' | 'rest' | 'shop' | 'boss';

export const NODE_KIND_NAME: Record<MapNodeKind, string> = {
  start: '起点',
  battle: '战斗',
  elite: '精英',
  treasure: '宝箱',
  rest: '休息',
  shop: '商店',
  boss: 'Boss',
};

export const NODE_KIND_COLOR: Record<MapNodeKind, string> = {
  start: '#888',
  battle: '#d4d4d4',
  elite: '#e06c75',
  treasure: '#e5c07b',
  rest: '#4ec9b0',
  shop: '#569cd6',
  boss: '#c678dd',
};

/** 地图节点（图结构） */
export class MapNode {
  /** 唯一 id */
  readonly id: number;
  /** 所在层（从 0 起） */
  readonly layer: number;
  /** 层内序号（纵向位置） */
  readonly index: number;
  /** 节点类型 */
  kind: MapNodeKind;
  /** 后继节点 */
  next: MapNode[] = [];
  /** 前驱节点 */
  prev: MapNode[] = [];

  constructor(id: number, layer: number, index: number, kind: MapNodeKind) {
    this.id = id;
    this.layer = layer;
    this.index = index;
    this.kind = kind;
  }

  /** 添加后继（双向维护） */
  addNext(node: MapNode): void {
    if (!this.next.includes(node)) this.next.push(node);
    if (!node.prev.includes(this)) node.prev.push(this);
  }

  /** 是否可达（直接相邻） */
  canReach(node: MapNode): boolean {
    return this.next.includes(node);
  }
}

/** 地图（整张图） */
export class GameMap {
  /** 所有节点，按层分组 */
  readonly layers: MapNode[][] = [];
  /** id → 节点 */
  private byId = new Map<number, MapNode>();
  private nextId = 0;

  /** 创建并登记一个节点 */
  createNode(layer: number, index: number, kind: MapNodeKind): MapNode {
    const node = new MapNode(this.nextId++, layer, index, kind);
    while (this.layers.length <= layer) this.layers.push([]);
    this.layers[layer][index] = node;
    this.byId.set(node.id, node);
    return node;
  }

  get(id: number): MapNode | undefined {
    return this.byId.get(id);
  }

  /** 总层数 */
  get layerCount(): number {
    return this.layers.length;
  }

  /** 起点（第 0 层唯一节点） */
  get startNode(): MapNode {
    return this.layers[0][0];
  }

  /** 终点（最后一层唯一节点） */
  get bossNode(): MapNode {
    const last = this.layers[this.layers.length - 1];
    return last[0];
  }

  /** 所有节点（扁平） */
  allNodes(): MapNode[] {
    return [...this.byId.values()];
  }
}

/** 各类型的出现权重（按层深度调整） */
function pickKind(layer: number, layerCount: number, rng: () => number): MapNodeKind {
  // 第 1 层（起点之后）：以战斗为主
  if (layer === 1) return 'battle';
  // 倒数第 2 层：休息/商店概率提高（Boss 前补给）
  const nearBoss = layer === layerCount - 2;
  const roll = rng();
  if (nearBoss) {
    if (roll < 0.4) return 'rest';
    if (roll < 0.7) return 'shop';
    return 'battle';
  }
  if (roll < 0.5) return 'battle';
  if (roll < 0.65) return 'elite';
  if (roll < 0.78) return 'treasure';
  if (roll < 0.9) return 'rest';
  return 'shop';
}

export interface GenerateMapOptions {
  /** 总层数（含起点与 Boss 层） */
  layers?: number;
  /** 随机源（便于测试注入） */
  rng?: () => number;
}

/**
 * 生成一张分支地图。
 *
 * 结构：层 0 = 起点（1 节点） → 中间层（1~3 节点） → 最后一层 = Boss（1 节点）
 */
export function generateMap(opts: GenerateMapOptions = {}): GameMap {
  const layerCount = opts.layers ?? 8;
  const rng = opts.rng ?? Math.random;
  const map = new GameMap();

  // 起点层
  const start = map.createNode(0, 0, 'start');

  // 中间层
  for (let layer = 1; layer < layerCount - 1; layer++) {
    const count = 1 + Math.floor(rng() * 3); // 1~3 个
    for (let i = 0; i < count; i++) {
      map.createNode(layer, i, pickKind(layer, layerCount, rng));
    }
  }

  // Boss 层
  map.createNode(layerCount - 1, 0, 'boss');

  // 连边：相邻层之间，保证每个节点至少有一条入边和出边
  connectLayers(map, rng);

  // 起点 → 第 1 层全连
  for (const n of map.layers[1]) start.addNext(n);

  return map;
}

/** 连接相邻两层（保证连通性 + 限制跨度避免交叉） */
function connectLayers(map: GameMap, rng: () => number): void {
  for (let layer = 1; layer < map.layerCount - 1; layer++) {
    const from = map.layers[layer];
    const to = map.layers[layer + 1];

    // 每个 from 节点连 1~2 个 to 节点（按索引就近）
    for (let i = 0; i < from.length; i++) {
      const src = from[i];
      // 映射到 to 层的就近索引
      const ratio = from.length === 1 ? 0.5 : i / (from.length - 1);
      const base = Math.round(ratio * (to.length - 1));
      const targets = new Set<number>([base]);
      if (rng() < 0.45) {
        // 额外连一个相邻的（跨度 ±1，避免长距离交叉）
        const extra = base + (rng() < 0.5 ? -1 : 1);
        if (extra >= 0 && extra < to.length) targets.add(extra);
      }
      for (const t of targets) src.addNext(to[t]);
    }

    // 保证 to 层每个节点都有入边
    for (let j = 0; j < to.length; j++) {
      if (to[j].prev.length === 0) {
        const ratio = to.length === 1 ? 0.5 : j / (to.length - 1);
        const base = Math.round(ratio * (from.length - 1));
        from[base].addNext(to[j]);
      }
    }
  }
}

/**
 * 计算节点在「逻辑坐标」下的位置（用于渲染布局）。
 * 返回归一化坐标（0~1），由渲染层缩放到画布。
 */
export function layoutMap(map: GameMap): Map<number, { x: number; y: number }> {
  const pos = new Map<number, { x: number; y: number }>();
  const layerCount = map.layerCount;
  for (let layer = 0; layer < layerCount; layer++) {
    const nodes = map.layers[layer];
    const x = layerCount === 1 ? 0.5 : layer / (layerCount - 1);
    for (let i = 0; i < nodes.length; i++) {
      const y = nodes.length === 1 ? 0.5 : (i + 0.5) / nodes.length;
      pos.set(nodes[i].id, { x, y });
    }
  }
  return pos;
}

/** 从当前节点出发的可选后继 */
export function reachableFrom(node: MapNode): MapNode[] {
  return node.next;
}
