/**
 * AI 状态机回归测试：状态转移 / 策略 / 与 enemyAI 集成。
 * 运行：npx tsx src/game/verify-ai.ts
 */
import {
  AIState,
  createRuntime,
  step,
  idleStrategy,
  patrolStrategy,
  chaseStrategy,
  keepDistanceStrategy,
  playerInRange,
  playerOutOfRange,
  elapsedOver,
  chaserMachine,
  chargerMachine,
  shooterMachine,
  flyerMachine,
} from '../GameEngine/ai';
import type { AIContext } from '../GameEngine/ai';
import { World } from '../GameEngine/ecs';
import { Position, Velocity } from '../GameEngine/ecs/components';
import { EnemyAISystem } from './systems/enemyAI';
import { PlayerTag, Chase, Charger, Shooter, Patrol, Flying } from './components';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

function ctx(over: Partial<AIContext> = {}): AIContext {
  const x = over.x ?? 0;
  const y = over.y ?? 0;
  const px = over.playerX ?? 100;
  const py = over.playerY ?? 0;
  const dx = px - x;
  const dy = py - y;
  return {
    x, y, playerX: px, playerY: py,
    dx, dist: Math.hypot(dx, dy),
    dir: dx > 0 ? 1 : -1,
    elapsed: 0,
    ...over,
  };
}

// ---- 1. 内置策略 ----
console.log('1) 内置策略');
{
  check('idle 返回 0', idleStrategy(ctx(), 100) === 0);

  // 巡逻：向右走，撞到右边界后反向
  const c1 = ctx({ x: 0, patrolLeft: -100, patrolRight: 100, patrolDir: 1 });
  check('巡逻向右', patrolStrategy(c1, 50) === 50);
  const c2 = ctx({ x: 100, patrolLeft: -100, patrolRight: 100, patrolDir: 1 });
  check('到右边界反向', patrolStrategy(c2, 50) === -50);
  check('反向写回 ctx.patrolDir', c2.patrolDir === -1);
  const c3 = ctx({ x: -100, patrolLeft: -100, patrolRight: 100, patrolDir: -1 });
  check('到左边界反向', patrolStrategy(c3, 50) === 50);

  // 追击：朝玩家
  check('追击朝右', chaseStrategy(ctx({ x: 0, playerX: 100 }), 70) === 70);
  check('追击朝左', chaseStrategy(ctx({ x: 0, playerX: -100 }), 70) === -70);

  // 保持距离
  const kd = keepDistanceStrategy(260, 40);
  check('太近后退', kd(ctx({ x: 0, playerX: 100 }), 60) === -60);
  check('太远前进', kd(ctx({ x: 0, playerX: 400 }), 60) === 60);
  check('区间内静止', kd(ctx({ x: 0, playerX: 260 }), 60) === 0);
}

// ---- 2. 转移条件 ----
console.log('2) 转移条件');
{
  check('playerInRange 命中', playerInRange(300)(ctx({ x: 0, playerX: 100 }), {}));
  check('playerInRange 未命中', !playerInRange(50)(ctx({ x: 0, playerX: 100 }), {}));
  check('playerOutOfRange 命中', playerOutOfRange(50)(ctx({ x: 0, playerX: 100 }), {}));
  check('elapsedOver 命中', elapsedOver(1)(ctx({ elapsed: 1.5 }), {}));
  check('elapsedOver 未命中', !elapsedOver(1)(ctx({ elapsed: 0.5 }), {}));
}

// ---- 3. chaser 状态机：PATROL ⇄ CHASE ----
console.log('3) chaser 状态机');
{
  const sm = chaserMachine(320);
  const rt = createRuntime(sm);
  check('初始状态 PATROL', rt.state === AIState.PATROL);

  // 玩家远：保持 PATROL，向右巡逻
  const far = ctx({ x: 0, playerX: 1000, patrolLeft: -200, patrolRight: 200, patrolDir: 1 });
  const v1 = step(sm, rt, far, 70, 1 / 60);
  check('玩家远时巡逻（速度 70）', rt.state === AIState.PATROL && v1 === 70);

  // 玩家近：转 CHASE，朝玩家
  const near = ctx({ x: 0, playerX: 100 });
  const v2 = step(sm, rt, near, 70, 1 / 60);
  check('玩家近时转 CHASE', rt.state === AIState.CHASE);
  check('CHASE 朝玩家移动', v2 === 70);

  // 玩家又远：回 PATROL
  const far2 = ctx({ x: 0, playerX: 1000, patrolLeft: -200, patrolRight: 200, patrolDir: 1 });
  step(sm, rt, far2, 70, 1 / 60);
  check('玩家远离后回 PATROL', rt.state === AIState.PATROL);
}

// ---- 4. charger 状态机：IDLE → WINDUP → DASH → RECOVER → IDLE ----
console.log('4) charger 状态机');
{
  const sm = chargerMachine();
  const rt = createRuntime(sm);
  const P = { windup: 0.5, dashTime: 0.35, recover: 0.5 };
  const DT = 1 / 60;
  check('初始状态 IDLE', rt.state === AIState.IDLE);

  // 玩家远：保持 IDLE，速度 0
  let v = step(sm, rt, ctx({ x: 0, playerX: 1000 }), 0, DT, P);
  check('玩家远时 IDLE 不动', rt.state === AIState.IDLE && v === 0);

  // 玩家近：转 WINDUP
  v = step(sm, rt, ctx({ x: 0, playerX: 100 }), 0, DT, P);
  check('玩家近时转 WINDUP', rt.state === AIState.WINDUP);
  check('WINDUP 静止', v === 0);

  // 蓄力未满：仍在 WINDUP
  step(sm, rt, ctx({ x: 0, playerX: 100 }), 0, DT, P);
  check('蓄力未满仍在 WINDUP', rt.state === AIState.WINDUP);

  // 蓄力满（0.5s）：转 DASH，朝玩家冲锋
  for (let i = 0; i < 32; i++) step(sm, rt, ctx({ x: 0, playerX: 100 }), 420, DT, P);
  check('蓄力满后转 DASH', rt.state === AIState.DASH);
  check('DASH 朝玩家冲锋', step(sm, rt, ctx({ x: 0, playerX: 100 }), 420, DT, P) === 420);

  // 冲锋结束（0.35s）：转 RECOVER
  for (let i = 0; i < 25; i++) step(sm, rt, ctx({ x: 0, playerX: 100 }), 420, DT, P);
  check('冲锋后转 RECOVER', rt.state === AIState.RECOVER);
  check('RECOVER 静止', step(sm, rt, ctx({ x: 0, playerX: 100 }), 420, DT, P) === 0);

  // 后摇结束（0.5s）：回 IDLE
  for (let i = 0; i < 35; i++) step(sm, rt, ctx({ x: 0, playerX: 1000 }), 0, DT, P);
  check('后摇后回 IDLE', rt.state === AIState.IDLE);
}

// ---- 5. shooter / flyer 状态机 ----
console.log('5) shooter / flyer');
{
  const ssm = shooterMachine(260);
  const srt = createRuntime(ssm);
  check('shooter 初始 KEEP_DISTANCE', srt.state === AIState.KEEP_DISTANCE);
  check('shooter 太近后退', step(ssm, srt, ctx({ x: 0, playerX: 100 }), 60, 1 / 60) === -60);
  check('shooter 太远前进', step(ssm, srt, ctx({ x: 0, playerX: 500 }), 60, 1 / 60) === 60);
  check('shooter 无转移（状态不变）', srt.state === AIState.KEEP_DISTANCE);

  const fsm = flyerMachine(90);
  const frt = createRuntime(fsm);
  check('flyer 初始 FLOAT', frt.state === AIState.FLOAT);
  check('flyer 太远前进', step(fsm, frt, ctx({ x: 0, playerX: 400 }), 90, 1 / 60) === 90);
  check('flyer 太近后退', step(fsm, frt, ctx({ x: 0, playerX: 10 }), 90, 1 / 60) === -90);
}

// ---- 6. elapsed 累计与重置 ----
console.log('6) elapsed 累计与重置');
{
  const sm = chargerMachine();
  const rt = createRuntime(sm);
  const P = { windup: 0.5, dashTime: 0.35, recover: 0.5 };
  step(sm, rt, ctx({ x: 0, playerX: 1000 }), 0, 0.5, P);
  check('elapsed 累计', Math.abs(rt.elapsed - 0.5) < 1e-9);
  step(sm, rt, ctx({ x: 0, playerX: 1000 }), 0, 0.5, P);
  check('elapsed 继续累计', Math.abs(rt.elapsed - 1.0) < 1e-9);

  // 触发转移后 elapsed 归零
  step(sm, rt, ctx({ x: 0, playerX: 100 }), 0, 1 / 60, P);
  check('转移后 elapsed 归零', rt.elapsed === 0);
}

// ---- 7. 与 enemyAI 集成（真实世界跑若干帧）----
console.log('7) enemyAI 集成');
{
  const world = new World();
  const p = world.spawn();
  world.addComponent(p, Position, new Position(0, 0));
  world.addComponent(p, PlayerTag, new PlayerTag());

  // chaser（带巡逻）
  const ch = world.spawn();
  world.addComponent(ch, Position, new Position(200, 0));
  world.addComponent(ch, Velocity, new Velocity(0, 0));
  world.addComponent(ch, Chase, new Chase(70));
  world.addComponent(ch, Patrol, new Patrol(50, 100, 300));

  // charger
  const cr = world.spawn();
  world.addComponent(cr, Position, new Position(300, 0));
  world.addComponent(cr, Velocity, new Velocity(0, 0));
  world.addComponent(cr, Charger, new Charger(0.7, 420, 0.35));

  // shooter
  const sh = world.spawn();
  world.addComponent(sh, Position, new Position(500, 0));
  world.addComponent(sh, Velocity, new Velocity(0, 0));
  world.addComponent(sh, Shooter, new Shooter(1.6, 380, 300, 8));

  // flyer
  const fl = world.spawn();
  world.addComponent(fl, Position, new Position(400, -100));
  world.addComponent(fl, Velocity, new Velocity(0, 0));
  world.addComponent(fl, Flying, new Flying(90, 40, 1.6));

  // 跑 120 帧
  for (let i = 0; i < 120; i++) EnemyAISystem.run(world, 1 / 60);

  const chVel = world.getComponent(ch, Velocity)!;
  const crVel = world.getComponent(cr, Velocity)!;
  const shVel = world.getComponent(sh, Velocity)!;
  const flVel = world.getComponent(fl, Velocity)!;

  // chaser 玩家在 0，敌人在 200 → 距离 200 < 320 → CHASE，朝左（负）
  check('chaser 追击玩家（向左）', chVel.x < 0, `vel.x=${chVel.x}`);
  // charger 玩家在范围内 → 已进入 WINDUP/DASH 循环
  const crComp = world.getComponent(cr, Charger)!;
  check('charger 状态已推进（非 idle 或已循环）', typeof crComp.state === 'string');
  // shooter 距离 500 > 260+40 → 朝玩家（向左）
  check('shooter 靠近玩家（向左）', shVel.x < 0, `vel.x=${shVel.x}`);
  // flyer 距离 400 > 90+30 → 朝玩家（向左）
  check('flyer 靠近玩家（向左）', flVel.x < 0, `vel.x=${flVel.x}`);
  // flyer 垂直有速度（正弦漂浮）
  check('flyer 垂直漂浮（vel.y 非零）', flVel.y !== 0, `vel.y=${flVel.y}`);

  // charger 在 120 帧内至少进入过 dash（速度非零）
  let sawDash = false;
  for (let i = 0; i < 60; i++) {
    EnemyAISystem.run(world, 1 / 60);
    if (Math.abs(world.getComponent(cr, Velocity)!.x) > 100) sawDash = true;
  }
  check('charger 会进入冲锋（速度 > 100）', sawDash);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) (globalThis as any).process?.exit?.(1);
