/**
 * 战斗消息协议（移植自旧 GameEngine 的 `battle/Types` + `BattleEngine`）
 *
 * 旧设计：战斗逻辑跑在 Web Worker，主线程只收发消息。
 * 新设计：保留「消息协议」这一核心抽象，但把 payload 换成
 *        **扁平数值数组（SoA）**，便于结构化克隆 / Transferable 零拷贝。
 *
 * 协议：
 *   主线程 → Worker：init / tick / dispose
 *   Worker → 主线程：ready / state / error
 */

/** 战斗实体快照（扁平数值，便于零拷贝传输） */
export interface BattleEntitySnapshot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  /** 阵营：0 = 玩家，1 = 敌人 */
  faction: 0 | 1;
  /** 是否存活 */
  alive: 0 | 1;
}

/** 战斗世界快照（SoA：每个字段一个数组） */
export interface BattleWorldSnapshot {
  /** 实体数量 */
  count: number;
  /** 字段名 → 数值数组 */
  fields: {
    id: number[];
    x: number[];
    y: number[];
    vx: number[];
    vy: number[];
    hp: number[];
    maxHp: number[];
    radius: number[];
    faction: number[];
    alive: number[];
  };
}

/** 主线程 → Worker */
export type MainToWorker =
  | { type: 'init'; snapshot: BattleWorldSnapshot }
  | { type: 'tick'; dt: number }
  | { type: 'damage'; id: number; amount: number }
  | { type: 'dispose' };

/** Worker → 主线程 */
export type WorkerToMain =
  | { type: 'ready' }
  | { type: 'state'; snapshot: BattleWorldSnapshot; tick: number }
  | { type: 'error'; message: string };

/** 空快照 */
export function emptySnapshot(): BattleWorldSnapshot {
  return {
    count: 0,
    fields: { id: [], x: [], y: [], vx: [], vy: [], hp: [], maxHp: [], radius: [], faction: [], alive: [] },
  };
}

/** 从实体数组构造快照（SoA） */
export function snapshotFromEntities(entities: BattleEntitySnapshot[]): BattleWorldSnapshot {
  const s = emptySnapshot();
  s.count = entities.length;
  for (const e of entities) {
    s.fields.id.push(e.id);
    s.fields.x.push(e.x);
    s.fields.y.push(e.y);
    s.fields.vx.push(e.vx);
    s.fields.vy.push(e.vy);
    s.fields.hp.push(e.hp);
    s.fields.maxHp.push(e.maxHp);
    s.fields.radius.push(e.radius);
    s.fields.faction.push(e.faction);
    s.fields.alive.push(e.alive);
  }
  return s;
}

/** 快照还原为实体数组（AoS，便于阅读/断言） */
export function entitiesFromSnapshot(s: BattleWorldSnapshot): BattleEntitySnapshot[] {
  const out: BattleEntitySnapshot[] = [];
  for (let i = 0; i < s.count; i++) {
    out.push({
      id: s.fields.id[i],
      x: s.fields.x[i],
      y: s.fields.y[i],
      vx: s.fields.vx[i],
      vy: s.fields.vy[i],
      hp: s.fields.hp[i],
      maxHp: s.fields.maxHp[i],
      radius: s.fields.radius[i],
      faction: s.fields.faction[i] as 0 | 1,
      alive: s.fields.alive[i] as 0 | 1,
    });
  }
  return out;
}

/**
 * 纯函数战斗步进：不依赖 Worker，可单测。
 * 规则（占位，可扩展）：
 *   - 位置按速度积分
 *   - 玩家（faction 0）朝最近的敌人移动
 *   - 敌人（faction 1）朝玩家移动
 *   - 接触（距离 < 半径和）→ 互相扣血
 */
export function stepBattle(s: BattleWorldSnapshot, dt: number): void {
  const f = s.fields;
  const n = s.count;

  // 找玩家
  let playerIdx = -1;
  for (let i = 0; i < n; i++) {
    if (f.faction[i] === 0 && f.alive[i] === 1) { playerIdx = i; break; }
  }
  if (playerIdx < 0) return;

  const px = f.x[playerIdx];
  const py = f.y[playerIdx];

  for (let i = 0; i < n; i++) {
    if (f.alive[i] !== 1 || i === playerIdx) continue;

    // 朝玩家移动
    const dx = px - f.x[i];
    const dy = py - f.y[i];
    const dist = Math.hypot(dx, dy) || 1;
    const speed = f.faction[i] === 1 ? 60 : 80;
    f.vx[i] = (dx / dist) * speed;
    f.vy[i] = (dy / dist) * speed;

    // 积分
    f.x[i] += f.vx[i] * dt;
    f.y[i] += f.vy[i] * dt;

    // 接触伤害
    const minDist = f.radius[i] + f.radius[playerIdx];
    if (dist < minDist) {
      f.hp[i] = Math.max(0, f.hp[i] - 0.5 * dt * 60);
      f.hp[playerIdx] = Math.max(0, f.hp[playerIdx] - 0.3 * dt * 60);
      if (f.hp[i] <= 0) f.alive[i] = 0;
      if (f.hp[playerIdx] <= 0) f.alive[playerIdx] = 0;
    }
  }

  // 玩家也积分（速度由输入设置，这里保持）
  f.x[playerIdx] += f.vx[playerIdx] * dt;
  f.y[playerIdx] += f.vy[playerIdx] * dt;
}

/** 对指定实体施加伤害（返回是否致死） */
export function applyDamage(s: BattleWorldSnapshot, id: number, amount: number): boolean {
  const f = s.fields;
  for (let i = 0; i < s.count; i++) {
    if (f.id[i] !== id) continue;
    f.hp[i] = Math.max(0, f.hp[i] - amount);
    if (f.hp[i] <= 0) {
      f.alive[i] = 0;
      return true;
    }
    return false;
  }
  return false;
}

/** 存活实体数 */
export function aliveCount(s: BattleWorldSnapshot): number {
  let n = 0;
  for (let i = 0; i < s.count; i++) if (s.fields.alive[i] === 1) n++;
  return n;
}
