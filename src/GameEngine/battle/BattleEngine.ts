/**
 * BattleEngine —— 战斗引擎（主线程侧）
 *
 * 移植自旧 GameEngine 的 `battle/BattleEngine`：
 *   - 战斗逻辑跑在 **Web Worker**，主线程只收发消息
 *   - 主线程不阻塞，敌人再多也不掉帧
 *
 * 新增（相对旧版）：
 *   - **降级模式**：无 Worker 环境（Node / SSR / 测试）自动退化为同步执行
 *   - **可注入 Worker 工厂**：便于测试
 *   - 快照用扁平 SoA 数组，便于结构化克隆
 *
 * 用法：
 *   const engine = new BattleEngine();
 *   engine.init(entities);
 *   engine.onState = (snap, tick) => { ... };
 *   engine.tick(1/60);
 */
import {
  BattleEntitySnapshot,
  BattleWorldSnapshot,
  MainToWorker,
  WorkerToMain,
  snapshotFromEntities,
  entitiesFromSnapshot,
  stepBattle,
  applyDamage,
  aliveCount,
} from './Protocol';

export interface BattleEngineOptions {
  /** 自定义 Worker 工厂（测试注入；返回 null 则降级为同步模式） */
  workerFactory?: () => Worker | null;
  /** 是否强制同步模式（不使用 Worker） */
  forceSync?: boolean;
}

export class BattleEngine {
  private worker: Worker | null = null;
  /** 同步模式下的本地快照 */
  private localSnapshot: BattleWorldSnapshot | null = null;
  private localTick = 0;
  private mode: 'worker' | 'sync' = 'sync';
  private disposed = false;

  /** 状态回调（每 tick 一次） */
  onState: ((snapshot: BattleWorldSnapshot, tick: number) => void) | null = null;
  /** 错误回调 */
  onError: ((message: string) => void) | null = null;

  constructor(opts: BattleEngineOptions = {}) {
    if (opts.forceSync) {
      this.mode = 'sync';
      return;
    }
    const factory = opts.workerFactory ?? defaultWorkerFactory;
    try {
      const w = factory();
      if (w) {
        this.worker = w;
        this.mode = 'worker';
        w.onmessage = (ev: MessageEvent<WorkerToMain>) => this.handleWorkerMessage(ev.data);
        w.onerror = (ev: any) => this.onError?.(String(ev?.message ?? 'worker error'));
      }
    } catch {
      // 创建 Worker 失败 → 降级
      this.mode = 'sync';
    }
  }

  /** 当前运行模式 */
  getMode(): 'worker' | 'sync' {
    return this.mode;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  /** 初始化战斗（传入实体列表） */
  init(entities: BattleEntitySnapshot[]): void {
    const snapshot = snapshotFromEntities(entities);
    if (this.mode === 'worker' && this.worker) {
      this.post({ type: 'init', snapshot });
    } else {
      this.localSnapshot = snapshot;
      this.localTick = 0;
    }
  }

  /** 推进一帧 */
  tick(dt: number): void {
    if (this.disposed) return;
    if (this.mode === 'worker' && this.worker) {
      this.post({ type: 'tick', dt });
    } else if (this.localSnapshot) {
      stepBattle(this.localSnapshot, dt);
      this.localTick++;
      this.onState?.(this.localSnapshot, this.localTick);
    }
  }

  /** 对指定实体施加伤害 */
  damage(id: number, amount: number): void {
    if (this.disposed) return;
    if (this.mode === 'worker' && this.worker) {
      this.post({ type: 'damage', id, amount });
    } else if (this.localSnapshot) {
      applyDamage(this.localSnapshot, id, amount);
      this.onState?.(this.localSnapshot, this.localTick);
    }
  }

  /** 当前快照（同步模式可用；Worker 模式返回最近一次收到的快照） */
  getSnapshot(): BattleWorldSnapshot | null {
    return this.localSnapshot;
  }

  /** 存活实体数 */
  aliveCount(): number {
    return this.localSnapshot ? aliveCount(this.localSnapshot) : 0;
  }

  /** 实体列表（AoS 视图，便于断言） */
  getEntities(): BattleEntitySnapshot[] {
    return this.localSnapshot ? entitiesFromSnapshot(this.localSnapshot) : [];
  }

  /** 销毁（终止 Worker / 清空状态） */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.worker) {
      try {
        this.post({ type: 'dispose' });
        this.worker.terminate();
      } catch {
        /* ignore */
      }
      this.worker = null;
    }
    this.localSnapshot = null;
    this.localTick = 0;
  }

  // ---- 内部 ----

  private post(msg: MainToWorker): void {
    try {
      this.worker?.postMessage(msg);
    } catch (e) {
      this.onError?.(String(e));
    }
  }

  private handleWorkerMessage(msg: WorkerToMain): void {
    switch (msg.type) {
      case 'ready':
        break;
      case 'state':
        // Worker 模式下把收到的快照存为本地视图
        this.localSnapshot = msg.snapshot;
        this.localTick = msg.tick;
        this.onState?.(msg.snapshot, msg.tick);
        break;
      case 'error':
        this.onError?.(msg.message);
        break;
    }
  }
}

/** 默认 Worker 工厂：浏览器/Vite 环境下创建模块化 Worker */
function defaultWorkerFactory(): Worker | null {
  const g = globalThis as any;
  if (typeof g.Worker !== 'function') return null;
  return new g.Worker(new URL('./Worker.ts', import.meta.url), { type: 'module' });
}
