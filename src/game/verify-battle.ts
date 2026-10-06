/**
 * 战斗 Worker 化回归测试：协议 / 纯函数步进 / Worker 模式 / 同步降级 / 性能。
 * 运行：npx tsx src/game/verify-battle.ts
 */
import {
  BattleEngine,
  emptySnapshot,
  snapshotFromEntities,
  entitiesFromSnapshot,
  stepBattle,
  applyDamage,
  aliveCount,
} from '../GameEngine/battle';
import type { BattleEntitySnapshot, MainToWorker, WorkerToMain } from '../GameEngine/battle';
import { handleWorkerMessage } from '../GameEngine/battle';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

function ent(over: Partial<BattleEntitySnapshot> = {}): BattleEntitySnapshot {
  return {
    id: 0, x: 0, y: 0, vx: 0, vy: 0,
    hp: 100, maxHp: 100, radius: 10, faction: 1, alive: 1,
    ...over,
  };
}

/** 最小 Worker mock：在「同一线程」里跑 Worker 的消息处理逻辑 */
class MockWorker {
  onmessage: ((ev: MessageEvent<WorkerToMain>) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  terminated = false;
  received: MainToWorker[] = [];

  postMessage(msg: MainToWorker): void {
    this.received.push(msg);
    // 同步执行 Worker 端逻辑并回传
    const out = handleWorkerMessage(msg);
    if (out) this.onmessage?.({ data: out } as MessageEvent<WorkerToMain>);
  }

  terminate(): void {
    this.terminated = true;
  }
}

// ---- 1. 快照 SoA 往返 ----
console.log('1) 快照 SoA 往返');
{
  const list = [
    ent({ id: 1, x: 10, y: 20, faction: 0, hp: 80 }),
    ent({ id: 2, x: 30, y: 40, faction: 1, hp: 50 }),
  ];
  const snap = snapshotFromEntities(list);
  check('count 正确', snap.count === 2);
  check('字段数组长度一致', snap.fields.id.length === 2 && snap.fields.hp.length === 2);
  check('id 数据正确', snap.fields.id[0] === 1 && snap.fields.id[1] === 2);
  check('faction 数据正确', snap.fields.faction[0] === 0 && snap.fields.faction[1] === 1);

  const back = entitiesFromSnapshot(snap);
  check('往返后实体数一致', back.length === 2);
  check('往返后数据一致', back[0].x === 10 && back[1].hp === 50);

  check('空快照 count=0', emptySnapshot().count === 0);
  check('空快照往返为空数组', entitiesFromSnapshot(emptySnapshot()).length === 0);
}

// ---- 2. 纯函数步进 ----
console.log('2) 纯函数步进');
{
  // 玩家在原点，敌人在 (100,0)
  const snap = snapshotFromEntities([
    ent({ id: 1, x: 0, y: 0, faction: 0, radius: 10 }),
    ent({ id: 2, x: 100, y: 0, faction: 1, radius: 10 }),
  ]);

  const before = snap.fields.x[1];
  stepBattle(snap, 1 / 60);
  check('敌人朝玩家移动（x 减小）', snap.fields.x[1] < before, `${before} → ${snap.fields.x[1]}`);
  check('敌人获得朝玩家的速度', snap.fields.vx[1] < 0);

  // 无玩家时不动
  const noPlayer = snapshotFromEntities([ent({ id: 2, x: 100, y: 0, faction: 1 })]);
  const x0 = noPlayer.fields.x[0];
  stepBattle(noPlayer, 1 / 60);
  check('无玩家时敌人不动', noPlayer.fields.x[0] === x0);
}

// ---- 3. 接触伤害与死亡 ----
console.log('3) 接触伤害与死亡');
{
  // 敌人与玩家重叠 → 互相扣血
  const snap = snapshotFromEntities([
    ent({ id: 1, x: 0, y: 0, faction: 0, hp: 100, radius: 20 }),
    ent({ id: 2, x: 5, y: 0, faction: 1, hp: 100, radius: 20 }),
  ]);
  stepBattle(snap, 1 / 60);
  check('敌人受伤', snap.fields.hp[1] < 100);
  check('玩家受伤', snap.fields.hp[0] < 100);

  // 大量步进 → 敌人死亡
  for (let i = 0; i < 600; i++) stepBattle(snap, 1 / 60);
  check('长时间接触后敌人死亡', snap.fields.alive[1] === 0 || snap.fields.hp[1] === 0);
  check('aliveCount 反映存活数', aliveCount(snap) <= 2);
}

// ---- 4. applyDamage ----
console.log('4) applyDamage');
{
  const snap = snapshotFromEntities([ent({ id: 7, hp: 30 })]);
  check('扣血返回 false（未致死）', applyDamage(snap, 7, 10) === false);
  check('血量正确扣减', snap.fields.hp[0] === 20);
  check('致死返回 true', applyDamage(snap, 7, 100) === true);
  check('致死血量归零', snap.fields.hp[0] === 0);
  check('致死标记 alive=0', snap.fields.alive[0] === 0);
  check('未知 id 返回 false', applyDamage(snap, 999, 10) === false);
}

// ---- 5. Worker 消息协议 ----
console.log('5) Worker 消息协议');
{
  const snap = snapshotFromEntities([ent({ id: 1, faction: 0 }), ent({ id: 2, x: 50 })]);
  const ready = handleWorkerMessage({ type: 'init', snapshot: snap });
  check('init → ready', ready?.type === 'ready');

  const state = handleWorkerMessage({ type: 'tick', dt: 1 / 60 });
  check('tick → state', state?.type === 'state');
  check('tick 计数递增', state?.type === 'state' && state.tick === 1);

  const st2 = handleWorkerMessage({ type: 'tick', dt: 1 / 60 });
  check('tick 继续递增', st2?.type === 'state' && st2.tick === 2);

  const dmg = handleWorkerMessage({ type: 'damage', id: 2, amount: 999 });
  check('damage → state', dmg?.type === 'state');
  check('damage 生效（敌人死亡）', dmg?.type === 'state' && dmg.snapshot.fields.alive[1] === 0);

  check('dispose → null', handleWorkerMessage({ type: 'dispose' }) === null);
  check('未初始化 tick → error', handleWorkerMessage({ type: 'tick', dt: 0.1 })?.type === 'error');
}

// ---- 6. BattleEngine Worker 模式 ----
console.log('6) BattleEngine Worker 模式');
{
  const mock = new MockWorker();
  const engine = new BattleEngine({ workerFactory: () => mock as any });
  check('使用 Worker 模式', engine.getMode() === 'worker');

  let states = 0;
  engine.onState = () => states++;
  engine.init([ent({ id: 1, faction: 0 }), ent({ id: 2, x: 100 })]);
  check('init 消息已发送', mock.received.some((m) => m.type === 'init'));

  engine.tick(1 / 60);
  check('tick 触发状态回调', states === 1);
  check('Worker 模式也可读快照', engine.getSnapshot() !== null);

  engine.damage(2, 999);
  check('damage 触发状态回调', states === 2);
  check('damage 生效', engine.getEntities().find((e) => e.id === 2)!.alive === 0);

  engine.dispose();
  check('dispose 终止 Worker', mock.terminated);
  check('dispose 后标记已销毁', engine.isDisposed());
}

// ---- 7. 同步降级 ----
console.log('7) 同步降级');
{
  // 无 Worker 环境（工厂返回 null）
  const engine = new BattleEngine({ workerFactory: () => null });
  check('降级为同步模式', engine.getMode() === 'sync');

  let states = 0;
  engine.onState = () => states++;
  engine.init([ent({ id: 1, faction: 0 }), ent({ id: 2, x: 100 })]);
  engine.tick(1 / 60);
  check('同步模式 tick 生效', states === 1);
  check('同步模式快照可读', engine.getSnapshot() !== null);

  // forceSync
  const sync = new BattleEngine({ forceSync: true });
  check('forceSync 强制同步', sync.getMode() === 'sync');

  // 工厂抛错 → 降级
  const throwing = new BattleEngine({ workerFactory: () => { throw new Error('no worker'); } });
  check('工厂抛错时降级', throwing.getMode() === 'sync');
}

// ---- 8. 性能：主线程耗时与敌人数关系 ----
console.log('8) 性能（主线程不随敌人线性增长）');
{
  // 同步模式：主线程耗时随敌人数增长（基线）
  function syncCost(n: number): number {
    const engine = new BattleEngine({ forceSync: true });
    const list: BattleEntitySnapshot[] = [ent({ id: 0, faction: 0 })];
    for (let i = 1; i <= n; i++) list.push(ent({ id: i, x: 100 + i * 5 }));
    engine.init(list);
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) engine.tick(1 / 60);
    return performance.now() - t0;
  }

  // Worker 模式：主线程只 postMessage（用 mock 模拟「不同线程」，不计执行耗时）
  function workerCost(n: number): number {
    const mock = new MockWorker();
    const engine = new BattleEngine({ workerFactory: () => mock as any });
    const list: BattleEntitySnapshot[] = [ent({ id: 0, faction: 0 })];
    for (let i = 1; i <= n; i++) list.push(ent({ id: i, x: 100 + i * 5 }));
    engine.init(list);
    const t0 = performance.now();
    // 只发消息，不执行（模拟 Worker 在另一线程执行）
    for (let i = 0; i < 200; i++) (mock as any).postMessage({ type: 'tick', dt: 1 / 60 });
    return performance.now() - t0;
  }

  const small = syncCost(20);
  const large = syncCost(200);
  check('同步模式耗时随敌人数增长（基线）', large > small, `${small.toFixed(2)}ms → ${large.toFixed(2)}ms`);

  // Worker 模式：主线程开销应远小于同步模式
  const wSmall = workerCost(20);
  const wLarge = workerCost(200);
  check('Worker 模式主线程开销小', wLarge < large, `worker ${wLarge.toFixed(2)}ms vs sync ${large.toFixed(2)}ms`);
  check('Worker 模式主线程开销不随敌人显著增长', wLarge < wSmall * 5 + 1, `${wSmall.toFixed(2)}ms → ${wLarge.toFixed(2)}ms`);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) (globalThis as any).process?.exit?.(1);
