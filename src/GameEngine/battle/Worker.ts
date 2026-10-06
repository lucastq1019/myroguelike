/**
 * 战斗 Worker 入口
 *
 * 在 Worker 线程中跑 `stepBattle`，主线程只收发消息。
 * 通过 `new Worker(new URL('./Worker.ts', import.meta.url), { type: 'module' })` 启动。
 *
 * 消息协议见 `./Protocol.ts`。
 */
import {
  MainToWorker,
  WorkerToMain,
  BattleWorldSnapshot,
  stepBattle,
  applyDamage,
} from './Protocol';

let snapshot: BattleWorldSnapshot | null = null;
let tick = 0;

/** 向主线程发消息（Worker 环境有 postMessage，测试环境可能没有） */
function post(msg: WorkerToMain): void {
  const g = globalThis as any;
  if (typeof g.postMessage === 'function') g.postMessage(msg);
}

/** 处理主线程消息（导出以便单测直接调用） */
export function handleMessage(msg: MainToWorker): WorkerToMain | null {
  switch (msg.type) {
    case 'init':
      snapshot = msg.snapshot;
      tick = 0;
      return { type: 'ready' };

    case 'tick': {
      if (!snapshot) return { type: 'error', message: '未初始化' };
      stepBattle(snapshot, msg.dt);
      tick++;
      return { type: 'state', snapshot, tick };
    }

    case 'damage': {
      if (!snapshot) return { type: 'error', message: '未初始化' };
      applyDamage(snapshot, msg.id, msg.amount);
      return { type: 'state', snapshot, tick };
    }

    case 'dispose':
      snapshot = null;
      tick = 0;
      return null;

    default:
      return { type: 'error', message: `未知消息类型: ${(msg as any).type}` };
  }
}

// Worker 环境下监听主线程消息
const g = globalThis as any;
if (typeof g.addEventListener === 'function' && typeof g.postMessage === 'function') {
  g.addEventListener('message', (ev: MessageEvent<MainToWorker>) => {
    const out = handleMessage(ev.data);
    if (out) post(out);
  });
}
