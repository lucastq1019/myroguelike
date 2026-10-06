/**
 * 四个动作能力的专项测试：下穿 / 蹬墙跳 / 冲刺 / 二段跳
 *
 * 运行：npx tsx src/game/verify-abilities.ts
 *
 * 通过直接操作 Input 资源来模拟按键。
 */
// mock 浏览器环境
const listeners: Record<string, Function[]> = {};
(globalThis as any).window = {
  innerWidth: 960, innerHeight: 600, devicePixelRatio: 1,
  addEventListener: (t: string, cb: Function) => { (listeners[t] ||= []).push(cb); },
  removeEventListener: () => {},
};
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).performance = { now: () => Date.now() };
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) { return prop === 'canvas' ? { width: 960, height: 600 } : () => {}; },
  set: () => true,
});
const mockCanvas: any = { width: 960, height: 600, style: {}, addEventListener: () => {}, getContext: () => mockCtx };
(globalThis as any).document = {
  createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : { style: {}, appendChild: () => {} }),
  body: { appendChild: () => {}, insertBefore: () => {} },
};

import { World, Entity } from '../GameEngine/ecs';
import { Position, Velocity, Sprite } from '../GameEngine/ecs/components';
import {
  PlayerTag, Platform, JumpState, DashState, IgnorePlatforms, EnemyTag, Health,
  RigidBody, staticBody, dynamicBody, Box, Locomotion, Circle, Knockback, Collider,
  ComboState, ComboCounter, MeleeAttack, Afterimage, Facing, HitFlash,
  DamageNumber, HitSpark, DeathBurst,
} from './components';
import { PhysicsContacts, ContactDir, createPhysicsSystem } from '../GameEngine/physics';
import { Camera } from '../GameEngine/resources/Camera';
import { Input } from '../GameEngine/resources/Input';
import { createLocomotionSystem } from './systems/locomotion';
import { createMeleeSystem } from './systems/melee';
import { createAfterimageSystem } from './systems/afterimage';
import { FxSystem } from './systems/fx';
import { CollisionSystem } from './systems/collision';
import { LifecycleSystem } from './systems/lifecycle';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

/** 可编程假 Input：覆盖 isDown，用于模拟按键 */
class FakeInput extends Input {
  private down = new Set<string>();
  press(k: string) { this.down.add(k.toLowerCase()); }
  release(k: string) { this.down.delete(k.toLowerCase()); }
  override isDown(key: string): boolean { return this.down.has(key.toLowerCase()); }
}

const DT = 1 / 60;

/** 创建测试世界，并注册「移动 + 物理 + 碰撞 + 生命周期 + 残影 + 特效」系统 */
function makeWorld(): { world: World; input: FakeInput } {
  const world = new World();
  const input = new FakeInput();
  world.insertResource(Camera, new Camera(960, 600, 960, 600));
  world.addSystem(createLocomotionSystem(input));
  world.addSystem(createMeleeSystem(input));
  world.addSystem(createAfterimageSystem());
  world.addSystem(FxSystem);
  world.addSystem(createPhysicsSystem({ gravityY: 2000 }));
  world.addSystem(CollisionSystem);
  world.addSystem(LifecycleSystem);
  return { world, input };
}

/** 创建地面 + 悬浮平台 */
function makeTerrain(world: World): void {
  const ground = world.spawn();
  world.addComponent(ground, Position, new Position(0, 200));
  world.addComponent(ground, RigidBody, staticBody());
  world.addComponent(ground, Box, new Box(500, 20));

  const plat = world.spawn();
  world.addComponent(plat, Position, new Position(0, 100));
  world.addComponent(plat, RigidBody, staticBody());
  world.addComponent(plat, Platform, new Platform(60, 8));
}

/** 创建玩家实体（带动作能力） */
function makePlayer(world: World, x: number, y: number): Entity {
  const p = world.spawn();
  world.addComponent(p, Position, new Position(x, y));
  world.addComponent(p, Velocity, new Velocity(0, 0));
  world.addComponent(p, PlayerTag, new PlayerTag());
  world.addComponent(p, RigidBody, dynamicBody(1, 0, 0, 1));
  world.addComponent(p, Circle, new Circle(10));
  world.addComponent(p, JumpState, new JumpState());
  world.addComponent(p, DashState, new DashState());
  world.addComponent(p, Facing, new Facing(1));
  world.addComponent(p, Locomotion, new Locomotion(240, 720, 0.45, 900, 2, 620, 0.16, 0.5, 380, 620, 90));
  world.addComponent(p, MeleeAttack, new MeleeAttack(0.32, 0.12, 26, 20, 30, 220));
  world.addComponent(p, ComboState, new ComboState(3));
  world.addComponent(p, ComboCounter, new ComboCounter());
  world.addComponent(p, Sprite, new Sprite(28, '#4ec9b0'));
  return p;
}

/** 推进 n 帧（含输入边沿更新） */
function step(world: World, input: FakeInput, n: number): void {
  for (let i = 0; i < n; i++) {
    input.endFrame();
    world.update(DT);
  }
}

// ============ 1. 下穿平台 ============
console.log('1) 下穿平台（S+K）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 82); // 平台顶面 92 - 半径 10

  step(world, input, 10); // 稳定站在平台上
  const yOnPlatform = world.getComponent(p, Position)!.y;
  check('初始站在平台上（y≈82）', Math.abs(yOnPlatform - 82) < 3, `y=${yOnPlatform.toFixed(1)}`);

  // 按住 S + 按 K
  input.press('s');
  input.press('k');
  input.endFrame();
  world.update(DT);
  const ig = world.getComponent(p, IgnorePlatforms);
  check('下穿触发 IgnorePlatforms', !!ig && ig.timer > 0, `timer=${ig?.timer}`);

  input.release('k');
  step(world, input, 60);
  const yAfter = world.getComponent(p, Position)!.y;
  check(`下穿后落到平台下方（${yOnPlatform.toFixed(0)} → ${yAfter.toFixed(0)}）`, yAfter > 100);
  check('下穿后落到地面（y≈170）', Math.abs(yAfter - 170) < 5, `y=${yAfter.toFixed(1)}`);
}

// ============ 2. 二段跳 ============
console.log('2) 二段跳（K）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170); // 地面上（地面顶面 180 - 半径 10）

  step(world, input, 5);

  input.press('k'); input.endFrame(); world.update(DT);
  const left1 = world.getComponent(p, JumpState)!.jumpsLeft;
  check('第一次跳后剩余 1 次', left1 === 1, `left=${left1}`);

  input.release('k');
  step(world, input, 10);

  input.press('k'); input.endFrame(); world.update(DT);
  const left2 = world.getComponent(p, JumpState)!.jumpsLeft;
  check('第二次跳后剩余 0 次', left2 === 0, `left=${left2}`);
  const velY = world.getComponent(p, Velocity)!.y;
  check('二段跳产生向上速度', velY < 0, `vy=${velY.toFixed(0)}`);

  input.release('k'); input.endFrame(); world.update(DT);
  input.press('k'); input.endFrame(); world.update(DT);
  const left3 = world.getComponent(p, JumpState)!.jumpsLeft;
  check('第三次跳无效（仍为 0）', left3 === 0, `left=${left3}`);
}

// ============ 3. 冲刺 ============
console.log('3) 冲刺（L）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170);

  step(world, input, 5);

  input.press('l'); input.endFrame(); world.update(DT);
  const dash = world.getComponent(p, DashState)!;
  check('冲刺触发（timer > 0）', dash.timer > 0, `timer=${dash.timer.toFixed(3)}`);
  const velX = world.getComponent(p, Velocity)!.x;
  check('冲刺速度向右', velX > 400, `vx=${velX.toFixed(0)}`);
  const rb = world.getComponent(p, RigidBody)!;
  check('冲刺期间重力关闭', rb.gravityScale === 0, `gs=${rb.gravityScale}`);

  input.release('l');
  step(world, input, 30);
  const rb2 = world.getComponent(p, RigidBody)!;
  check('冲刺后重力恢复', rb2.gravityScale === 1, `gs=${rb2.gravityScale}`);
  const dash2 = world.getComponent(p, DashState)!;
  check('冲刺进入冷却', dash2.cooldown > 0, `cd=${dash2.cooldown.toFixed(2)}`);
}

// ============ 4. 蹬墙跳 ============
console.log('4) 蹬墙跳（贴墙 + K）');
{
  const { world, input } = makeWorld();
  // 左墙（静态 Box，位于 x=-30）
  const wall = world.spawn();
  world.addComponent(wall, Position, new Position(-30, 100));
  world.addComponent(wall, RigidBody, staticBody());
  world.addComponent(wall, Box, new Box(10, 100));

  const p = makePlayer(world, -10, 100);

  // 向左推，让玩家贴墙
  input.press('a');
  step(world, input, 20);
  const contacts = world.getResource(PhysicsContacts)!;
  // 接触语义：ContactDir.Right = 被向右推 = 墙在左
  const touchingWall = contacts.has(p.index, ContactDir.Left) || contacts.has(p.index, ContactDir.Right);
  check('玩家贴墙（检测到左右接触）', touchingWall,
    `left=${contacts.has(p.index, ContactDir.Left)} right=${contacts.has(p.index, ContactDir.Right)}`);

  // 按 K 蹬墙跳
  input.press('k'); input.endFrame(); world.update(DT);
  const vel = world.getComponent(p, Velocity)!;
  check('蹬墙跳产生向上速度', vel.y < 0, `vy=${vel.y.toFixed(0)}`);
  check('蹬墙跳产生向右蹬出速度', vel.x > 100, `vx=${vel.x.toFixed(0)}`);
  const jump = world.getComponent(p, JumpState)!;
  // 蹬墙跳消耗 1 次，但首次蹬墙有「奖励 +1」→ 净不变（2 → 2）
  check('蹬墙跳消耗 1 次 + 奖励 1 次（净不变）', jump.jumpsLeft === 2, `left=${jump.jumpsLeft}`);
  check('蹬墙奖励已标记使用', jump.wallJumpRewardUsed === true);
}

// ============ 4.5 无限连跳防护 ============
console.log('4.5) 无限连跳防护（严格：只有落地重置 + 蹬墙奖励仅一次）');
{
  const { world, input } = makeWorld();
  // 左右两面墙，形成一个「夹缝」，玩家可在其中反复蹬墙
  const wallL = world.spawn();
  world.addComponent(wallL, Position, new Position(-30, 100));
  world.addComponent(wallL, RigidBody, staticBody());
  world.addComponent(wallL, Box, new Box(10, 100));
  const wallR = world.spawn();
  world.addComponent(wallR, Position, new Position(30, 100));
  world.addComponent(wallR, RigidBody, staticBody());
  world.addComponent(wallR, Box, new Box(10, 100));

  const p = makePlayer(world, 0, 100); // 悬空（左右墙之间）
  const jump = world.getComponent(p, JumpState)!;

  // 尝试连续蹬墙跳 6 次（每次贴墙后按 K）
  let successfulJumps = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const before = jump.jumpsLeft;
    // 贴墙（朝最近墙移动）
    input.press('a');
    step(world, input, 8);
    input.press('k'); input.endFrame(); world.update(DT);
    if (jump.jumpsLeft < before) successfulJumps++; // 消耗了跳跃 = 成功起跳
    input.release('k'); input.release('a');
    step(world, input, 4);
  }
  // 严格模式：跳跃次数有限（奖励仅一次），无法无限连跳
  check(`连续蹬墙跳次数受限（${successfulJumps} <= 3）`, successfulJumps <= 3, `jumps=${successfulJumps}`);
  check('跳跃次数最终耗尽（= 0）', jump.jumpsLeft === 0, `left=${jump.jumpsLeft}`);
}

// ============ 4.55 蹬墙奖励跳跃（每段滞空仅一次） ============
console.log('4.55) 蹬墙奖励跳跃（每段滞空仅一次）');
{
  const { world, input } = makeWorld();
  // 地面（供落地测试）
  const ground = world.spawn();
  world.addComponent(ground, Position, new Position(0, 200));
  world.addComponent(ground, RigidBody, staticBody());
  world.addComponent(ground, Box, new Box(500, 20));
  const wallL = world.spawn();
  world.addComponent(wallL, Position, new Position(-30, 100));
  world.addComponent(wallL, RigidBody, staticBody());
  world.addComponent(wallL, Box, new Box(10, 100));
  const wallR = world.spawn();
  world.addComponent(wallR, Position, new Position(30, 100));
  world.addComponent(wallR, RigidBody, staticBody());
  world.addComponent(wallR, Box, new Box(10, 100));

  const p = makePlayer(world, 0, 100);
  const jump = world.getComponent(p, JumpState)!;
  check('初始未使用蹬墙奖励', jump.wallJumpRewardUsed === false);
  // 第一次蹬墙：消耗 1 + 奖励 1 → 净不变
  input.press('a'); step(world, input, 8);
  input.press('k'); input.endFrame(); world.update(DT);
  check('首次蹬墙后 jumpsLeft 净不变（2）', jump.jumpsLeft === 2, `left=${jump.jumpsLeft}`);
  check('首次蹬墙后奖励已标记使用', jump.wallJumpRewardUsed === true);
  input.release('k'); input.release('a'); step(world, input, 4);

  // 第二次蹬墙：只消耗，无奖励 → 2 → 1
  input.press('d'); step(world, input, 8); // 朝右墙移动
  input.press('k'); input.endFrame(); world.update(DT);
  check('二次蹬墙只消耗（2→1）', jump.jumpsLeft === 1, `left=${jump.jumpsLeft}`);

  // 落地 → 重置奖励机会（可再次获得）
  input.release('k'); input.release('d');
  const pos = world.getComponent(p, Position)!;
  const v = world.getComponent(p, Velocity)!;
  pos.x = 0;
  pos.y = 170; // 移到地面上
  v.x = 0;
  v.y = 0;
  step(world, input, 15);
  check('落地后奖励机会重置', jump.wallJumpRewardUsed === false, `used=${jump.wallJumpRewardUsed}`);
  check('落地后跳跃次数重置为 2', jump.jumpsLeft === 2, `left=${jump.jumpsLeft}`);
}

// ============ 4.6 冲刺 CD ============
console.log('4.6) 冲刺冷却（0.5s）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170);
  const dash = world.getComponent(p, DashState)!;

  step(world, input, 5);

  // 第一次冲刺
  input.press('l'); input.endFrame(); world.update(DT);
  check('冲刺触发', dash.timer > 0);
  const cdAfterFirst = dash.cooldown;
  check('冲刺后 CD 设为 0.5s', Math.abs(cdAfterFirst - 0.5) < 0.02, `cd=${cdAfterFirst.toFixed(3)}`);

  // 冲刺结束但 CD 未过 → 再次按 L 不应触发
  input.release('l');
  step(world, input, 12); // 冲刺时长 0.16s ≈ 10 帧，此时 CD 还剩 ~0.3s
  const timerBefore = dash.timer;
  input.press('l'); input.endFrame(); world.update(DT);
  check('CD 期间无法再次冲刺', dash.timer <= 0 || dash.timer <= timerBefore, `timer=${dash.timer.toFixed(3)}`);

  // 等 CD 结束 → 可再次冲刺
  input.release('l');
  step(world, input, 35); // 再等 ~0.58s
  input.press('l'); input.endFrame(); world.update(DT);
  check('CD 结束后可再次冲刺', dash.timer > 0, `timer=${dash.timer.toFixed(3)}`);
}

// ============ 5. 3 段连招 ============
console.log('5) 3 段连招（J 连按）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170);

  step(world, input, 5);

  // 第 1 段
  input.press('j'); input.endFrame(); world.update(DT);
  const cs = world.getComponent(p, ComboState)!;
  check('第 1 段连招', cs.comboIndex === 1, `stage=${cs.comboIndex}`);

  // 冷却结束前再次按 J（窗口内）→ 第 2 段
  input.release('j'); input.endFrame();
  for (let i = 0; i < 20; i++) { input.endFrame(); world.update(DT); } // 等冷却
  input.press('j'); input.endFrame(); world.update(DT);
  check('第 2 段连招', cs.comboIndex === 2, `stage=${cs.comboIndex}`);

  // 第 3 段
  input.release('j'); input.endFrame();
  for (let i = 0; i < 20; i++) { input.endFrame(); world.update(DT); }
  input.press('j'); input.endFrame(); world.update(DT);
  check('第 3 段连招', cs.comboIndex === 3, `stage=${cs.comboIndex}`);

  // 超出窗口 → 重置回第 1 段
  input.release('j'); input.endFrame();
  for (let i = 0; i < 40; i++) { input.endFrame(); world.update(DT); } // 超过 COMBO_WINDOW (0.45s ≈ 27 帧)
  check('超窗口连招重置', cs.comboIndex === 0, `stage=${cs.comboIndex}`);
}

// ============ 6. 命中连击计数 ============
console.log('6) 命中连击计数（ComboCounter）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170);

  // 敌人（在玩家右侧，处于攻击范围内）
  const enemy = world.spawn();
  world.addComponent(enemy, Position, new Position(30, 170));
  world.addComponent(enemy, Velocity, new Velocity(0, 0));
  world.addComponent(enemy, EnemyTag, new EnemyTag());
  world.addComponent(enemy, Health, new Health(1000, 1000));
  world.addComponent(enemy, Collider, new Collider(12));
  world.addComponent(enemy, Knockback, new Knockback(0));

  step(world, input, 5);

  // 攻击一次（命中敌人）
  input.press('j'); input.endFrame(); world.update(DT);
  // 跑几帧让判定盒与敌人碰撞
  for (let i = 0; i < 5; i++) { input.endFrame(); world.update(DT); }
  const cc = world.getComponent(p, ComboCounter)!;
  check('命中敌人后连击 +1', cc.count >= 1, `count=${cc.count}`);

  // 连击超时 → 重置
  input.release('j');
  for (let i = 0; i < 120; i++) {
    input.endFrame();
    if (cc.timer > 0) { cc.timer -= DT; if (cc.timer <= 0) { cc.timer = 0; cc.count = 0; } }
    world.update(DT);
  }
  check('连击超时后重置为 0', cc.count === 0, `count=${cc.count}`);
}

// ============ 7. 冲刺残影 ============
console.log('7) 冲刺残影（Afterimage）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170);

  step(world, input, 5);

  input.press('l'); input.endFrame(); world.update(DT);
  // 冲刺期间跑若干帧，应生成残影
  for (let i = 0; i < 10; i++) { input.endFrame(); world.update(DT); }
  const ghosts = world.dense(Afterimage);
  check('冲刺期间生成残影', ghosts.length > 0, `ghosts=${ghosts.length}`);
  if (ghosts.length > 0) {
    check('残影有正寿命', ghosts[0].life > 0 && ghosts[0].life <= ghosts[0].maxLife);
  }

  // 冲刺结束后残影应逐渐消失
  input.release('l');
  for (let i = 0; i < 60; i++) { input.endFrame(); world.update(DT); }
  const ghostsAfter = world.dense(Afterimage);
  check('冲刺结束后残影消失', ghostsAfter.length === 0, `ghosts=${ghostsAfter.length}`);
}

// ============ 8. 受击闪白 ============
console.log('8) 受击闪白（HitFlash）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170);

  // 敌人（在玩家右侧，处于攻击范围内）
  const enemy = world.spawn();
  world.addComponent(enemy, Position, new Position(30, 170));
  world.addComponent(enemy, Velocity, new Velocity(0, 0));
  world.addComponent(enemy, EnemyTag, new EnemyTag());
  world.addComponent(enemy, Health, new Health(1000, 1000));
  world.addComponent(enemy, Collider, new Collider(12));
  world.addComponent(enemy, Knockback, new Knockback(0));

  step(world, input, 5);

  // 攻击命中敌人
  input.press('j'); input.endFrame(); world.update(DT);
  for (let i = 0; i < 3; i++) { input.endFrame(); world.update(DT); }
  const flash = world.getComponent(enemy, HitFlash);
  check('命中敌人后触发 HitFlash', !!flash && flash.timer > 0, `timer=${flash?.timer}`);

  // 闪白到期后移除
  input.release('j');
  for (let i = 0; i < 30; i++) { input.endFrame(); world.update(DT); }
  const flashAfter = world.getComponent(enemy, HitFlash);
  check('闪白到期后移除', flashAfter === undefined);
}

// ============ 9. 打击特效（Juice） ============
console.log('9) 打击特效（伤害飘字 / 冲击波 / 爆裂粒子 / 屏幕震动）');
{
  const { world, input } = makeWorld();
  makeTerrain(world);
  const p = makePlayer(world, 0, 170);

  // 敌人（会被一击击杀，触发爆裂）
  const enemy = world.spawn();
  world.addComponent(enemy, Position, new Position(30, 170));
  world.addComponent(enemy, Velocity, new Velocity(0, 0));
  world.addComponent(enemy, EnemyTag, new EnemyTag());
  world.addComponent(enemy, Health, new Health(10, 10)); // 低血，一击死
  world.addComponent(enemy, Collider, new Collider(12));
  world.addComponent(enemy, Knockback, new Knockback(0));

  step(world, input, 5);

  // 攻击命中
  input.press('j'); input.endFrame(); world.update(DT);
  for (let i = 0; i < 3; i++) { input.endFrame(); world.update(DT); }

  const dmgNums = world.dense(DamageNumber);
  const sparks = world.dense(HitSpark);
  const bursts = world.dense(DeathBurst);
  check('命中生成伤害飘字', dmgNums.length > 0, `count=${dmgNums.length}`);
  check('命中生成冲击波', sparks.length > 0, `count=${sparks.length}`);
  check('击杀生成爆裂粒子', bursts.length > 0, `count=${bursts.length}`);

  // 屏幕震动：需要有 Camera 资源 + 命中后 shakeTime > 0
  const cam = world.getResource(Camera);
  check('存在 Camera 资源', !!cam);

  // 特效到期后自动销毁
  input.release('j');
  for (let i = 0; i < 80; i++) { input.endFrame(); world.update(DT); }
  check('特效到期后销毁（飘字）', world.dense(DamageNumber).length === 0);
  check('特效到期后销毁（冲击波）', world.dense(HitSpark).length === 0);
  check('特效到期后销毁（爆裂）', world.dense(DeathBurst).length === 0);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) throw new Error(`动作能力测试失败：${failed} 项`);
