/**
 * AI 状态机 + 策略（移植自旧 GameEngine 的 `engines/AIEngine` 设计）
 *
 * 旧设计：`AIState` 枚举（IDLE/PATROL/CHASE/FLEE）+ 策略模式
 *         （ChaseStrategy / FleeStrategy 各自封装「怎么动」）。
 *
 * 新设计（ECS 化）：
 *   - 状态机是**纯函数**：`step(state, ctx, dt) → nextState`
 *   - 策略是**纯函数**：`(ctx) → 期望水平速度`
 *   - 二者都不持有实体引用，只吃「上下文快照」，便于单测与复用
 *
 * 这样 `enemyAI.ts` 里原先按 EnemyKind 分支的大 switch 被拆成：
 *   每种敌人 = 一份「状态转移表 + 策略表」
 */

/** AI 状态 */
export enum AIState {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  WINDUP = 'windup',
  DASH = 'dash',
  RECOVER = 'recover',
  KEEP_DISTANCE = 'keepDistance',
  FLOAT = 'float',
}

/** 状态机运行时上下文（每帧快照，不含实体引用） */
export interface AIContext {
  /** 自身位置 */
  x: number;
  y: number;
  /** 玩家位置 */
  playerX: number;
  playerY: number;
  /** 到玩家的水平距离 */
  dx: number;
  /** 到玩家的欧氏距离 */
  dist: number;
  /** 朝向玩家的水平方向（-1 / 1） */
  dir: number;
  /** 当前状态已持续秒数 */
  elapsed: number;
  /** 巡逻边界（可选） */
  patrolLeft?: number;
  patrolRight?: number;
  /** 巡逻方向（可选，会被写回） */
  patrolDir?: number;
}

/** 策略：返回期望水平速度 */
export type Strategy = (ctx: AIContext, speed: number) => number;

/** 转移条件 */
export type Transition = (ctx: AIContext, params: Record<string, number>) => boolean;

/** 状态机定义 */
export interface StateMachine {
  initial: AIState;
  /** 状态 → 该状态的策略 */
  strategies: Partial<Record<AIState, Strategy>>;
  /** 状态 → 转移列表（按序求值，首个命中即转移） */
  transitions: Partial<Record<AIState, { to: AIState; when: Transition }[]>>;
}

/** 状态机运行时（每个实体一份） */
export interface MachineRuntime {
  state: AIState;
  elapsed: number;
}

/** 创建运行时 */
export function createRuntime(sm: StateMachine): MachineRuntime {
  return { state: sm.initial, elapsed: 0 };
}

/**
 * 推进一帧：先求转移，再应用当前状态策略。
 * 返回期望水平速度。
 */
export function step(
  sm: StateMachine,
  rt: MachineRuntime,
  ctx: AIContext,
  speed: number,
  dt: number,
  params: Record<string, number> = {},
): number {
  rt.elapsed += dt;
  ctx.elapsed = rt.elapsed;

  // 1) 求转移
  const trans = sm.transitions[rt.state];
  if (trans) {
    for (const t of trans) {
      if (t.when(ctx, params)) {
        rt.state = t.to;
        rt.elapsed = 0;
        ctx.elapsed = 0;
        break;
      }
    }
  }

  // 2) 应用策略
  const strat = sm.strategies[rt.state];
  return strat ? strat(ctx, speed) : 0;
}

// ============ 内置策略 ============

/** 静止 */
export const idleStrategy: Strategy = () => 0;

/** 巡逻：在边界间来回（写回 ctx.patrolDir） */
export const patrolStrategy: Strategy = (ctx, speed) => {
  const left = ctx.patrolLeft ?? -Infinity;
  const right = ctx.patrolRight ?? Infinity;
  let dir = ctx.patrolDir ?? 1;
  if (ctx.x <= left) dir = 1;
  if (ctx.x >= right) dir = -1;
  ctx.patrolDir = dir;
  return dir * speed;
};

/** 追击：朝玩家水平移动 */
export const chaseStrategy: Strategy = (ctx, speed) => ctx.dir * speed;

/** 保持距离：太近后退、太远前进、区间内静止 */
export function keepDistanceStrategy(ideal: number, deadzone = 40): Strategy {
  return (ctx, speed) => {
    if (ctx.dist < ideal - deadzone) return -ctx.dir * speed;
    if (ctx.dist > ideal + deadzone) return ctx.dir * speed;
    return 0;
  };
}

/** 冲锋：蓄力/后摇静止，冲锋时朝玩家 */
export const dashStrategy: Strategy = (ctx, speed) => ctx.dir * speed;

// ============ 内置转移条件 ============

/** 玩家进入范围 */
export function playerInRange(range: number): Transition {
  return (ctx) => ctx.dist < range;
}

/** 玩家超出范围 */
export function playerOutOfRange(range: number): Transition {
  return (ctx) => ctx.dist >= range;
}

/** 计时结束 */
export function timerDone(): Transition {
  return (ctx) => ctx.elapsed <= 0;
}

/** 已持续超过 seconds 秒 */
export function elapsedOver(seconds: number): Transition {
  return (ctx) => ctx.elapsed >= seconds;
}

// ============ 预置状态机 ============

/** chaser：巡逻 ⇄ 追击 */
export function chaserMachine(chaseRange: number): StateMachine {
  return {
    initial: AIState.PATROL,
    strategies: {
      [AIState.PATROL]: patrolStrategy,
      [AIState.CHASE]: chaseStrategy,
    },
    transitions: {
      [AIState.PATROL]: [{ to: AIState.CHASE, when: playerInRange(chaseRange) }],
      [AIState.CHASE]: [{ to: AIState.PATROL, when: playerOutOfRange(chaseRange) }],
    },
  };
}

/**
 * charger：IDLE → WINDUP → DASH → RECOVER → IDLE
 * 蓄力/冲锋/后摇时长通过 params 传入（windup / dashTime / recover）。
 */
export function chargerMachine(): StateMachine {
  return {
    initial: AIState.IDLE,
    strategies: {
      [AIState.IDLE]: idleStrategy,
      [AIState.WINDUP]: idleStrategy,
      [AIState.DASH]: dashStrategy,
      [AIState.RECOVER]: idleStrategy,
    },
    transitions: {
      [AIState.IDLE]: [{ to: AIState.WINDUP, when: playerInRange(320) }],
      // 蓄力满 → 冲锋（时长由 params.windup 提供）
      [AIState.WINDUP]: [{ to: AIState.DASH, when: (ctx, p) => ctx.elapsed >= (p.windup ?? 0.5) }],
      // 冲锋结束 → 后摇
      [AIState.DASH]: [{ to: AIState.RECOVER, when: (ctx, p) => ctx.elapsed >= (p.dashTime ?? 0.35) }],
      // 后摇结束 → 回到 IDLE
      [AIState.RECOVER]: [{ to: AIState.IDLE, when: (ctx, p) => ctx.elapsed >= (p.recover ?? 0.5) }],
    },
  };
}

/** shooter：始终保持距离 */
export function shooterMachine(ideal: number): StateMachine {
  return {
    initial: AIState.KEEP_DISTANCE,
    strategies: {
      [AIState.KEEP_DISTANCE]: keepDistanceStrategy(ideal),
    },
    transitions: {},
  };
}

/** flyer：漂浮 + 保持距离 */
export function flyerMachine(ideal: number): StateMachine {
  return {
    initial: AIState.FLOAT,
    strategies: {
      [AIState.FLOAT]: keepDistanceStrategy(ideal, 30),
    },
    transitions: {},
  };
}
