/**
 * 物理内核自测（无渲染，纯逻辑）
 *
 * 运行：npx tsx src/GameEngine/physics/verify-physics.ts
 *
 * 覆盖：
 *   1. 圆-圆 / 圆-矩形 / 矩形-矩形 碰撞检测
 *   2. 物理系统：两个圆相向运动 → 碰撞后分离、不重叠
 *   3. 静态墙：动态圆撞墙 → 被挡住不穿透
 *   4. 重力：球落到地面
 *   5. 单面平台：从上方落下站住，从下方穿过
 */
import { World } from '../ecs';
import { Position, Velocity } from '../ecs/components';
import { RigidBody, dynamicBody, staticBody } from './RigidBody';
import { Circle, Box, Platform } from './Shapes';
import { detect } from './collision';
import { createPhysicsSystem } from './PhysicsSystem';
import { PhysicsContacts } from './PhysicsContacts';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra = ''): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

// ---- 1. 碰撞检测 ----
console.log('1) 碰撞检测');
{
  const m = detect(new Circle(10), 0, 0, new Circle(10), 15, 0);
  check('圆-圆 重叠 → 命中', m !== null);
  check('圆-圆 法线指向 B', m !== null && m.nx > 0 && Math.abs(m.ny) < 1e-6);
  check('圆-圆 穿透深度 = 5', m !== null && Math.abs(m.penetration - 5) < 1e-6, `got ${m?.penetration}`);

  const m2 = detect(new Circle(10), 0, 0, new Circle(10), 25, 0);
  check('圆-圆 分离 → 不命中', m2 === null);

  const m3 = detect(new Circle(10), 0, 0, new Box(20, 20), 15, 0);
  check('圆-矩形 重叠 → 命中', m3 !== null);

  const m4 = detect(new Box(10, 10), 0, 0, new Box(10, 10), 15, 0);
  check('矩形-矩形 重叠 → 命中', m4 !== null);
  check('矩形-矩形 穿透 = 5', m4 !== null && Math.abs(m4.penetration - 5) < 1e-6, `got ${m4?.penetration}`);
}

// ---- 2. 两个圆相向运动 ----
console.log('2) 物理系统：两圆相向碰撞');
{
  const world = new World();
  const sys = createPhysicsSystem();

  const a = world.spawn();
  world.addComponent(a, Position, new Position(0, 0));
  world.addComponent(a, Velocity, new Velocity(100, 0));
  world.addComponent(a, RigidBody, dynamicBody(1, 0.5));
  world.addComponent(a, Circle, new Circle(10));

  const b = world.spawn();
  world.addComponent(b, Position, new Position(30, 0));
  world.addComponent(b, Velocity, new Velocity(-100, 0));
  world.addComponent(b, RigidBody, dynamicBody(1, 0.5));
  world.addComponent(b, Circle, new Circle(10));

  // 模拟 0.5 秒
  const dt = 1 / 60;
  for (let i = 0; i < 30; i++) sys.run(world, dt);

  const pa = world.getComponent(a, Position)!;
  const pb = world.getComponent(b, Position)!;
  const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
  check('碰撞后两圆不重叠（距离 >= 半径和）', dist >= 20 - 0.5, `dist=${dist.toFixed(2)}`);
  // 等质量正碰 + 恢复系数 0.5 → 各自反向弹回：a 向左、b 向右
  check('碰撞后相互弹开（a 左移、b 右移）', pa.x < 0 && pb.x > 30, `a=${pa.x.toFixed(1)} b=${pb.x.toFixed(1)}`);
}

// ---- 3. 动态圆撞静态墙 ----
console.log('3) 物理系统：动态圆撞静态墙');
{
  const world = new World();
  const sys = createPhysicsSystem();

  // 墙：位于 x=50 的静态矩形
  const wall = world.spawn();
  world.addComponent(wall, Position, new Position(50, 0));
  world.addComponent(wall, RigidBody, staticBody());
  world.addComponent(wall, Box, new Box(5, 100));

  // 球：从 x=0 向右冲
  const ball = world.spawn();
  world.addComponent(ball, Position, new Position(0, 0));
  world.addComponent(ball, Velocity, new Velocity(200, 0));
  world.addComponent(ball, RigidBody, dynamicBody(1, 0.2));
  world.addComponent(ball, Circle, new Circle(10));

  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) sys.run(world, dt);

  const pb = world.getComponent(ball, Position)!;
  // 墙左边界 = 50 - 5 = 45，球半径 10 → 球心最多到 35 附近
  check('球被墙挡住（未穿透）', pb.x <= 36, `ball.x=${pb.x.toFixed(2)}`);
  check('球未穿过墙', pb.x < 45, `ball.x=${pb.x.toFixed(2)}`);
}

// ---- 4. 重力：球落到地面 ----
console.log('4) 物理系统：重力落地');
{
  const world = new World();
  const sys = createPhysicsSystem({ gravityY: 2000 });

  // 地面（静态 Box）
  const ground = world.spawn();
  world.addComponent(ground, Position, new Position(0, 200));
  world.addComponent(ground, RigidBody, staticBody());
  world.addComponent(ground, Box, new Box(500, 20));

  // 球：从上方落下
  const ball = world.spawn();
  world.addComponent(ball, Position, new Position(0, 0));
  world.addComponent(ball, Velocity, new Velocity(0, 0));
  world.addComponent(ball, RigidBody, dynamicBody(1, 0, 0, 1)); // gravityScale=1
  world.addComponent(ball, Circle, new Circle(10));

  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) sys.run(world, dt);

  const pb = world.getComponent(ball, Position)!;
  const contacts = world.getResource(PhysicsContacts)!;
  // 地面顶面 = 200 - 20 = 180，球半径 10 → 球心应停在 170 附近
  check('球落到地面（未穿透）', pb.y <= 172 && pb.y > 160, `ball.y=${pb.y.toFixed(2)}`);
  check('球被标记为着地', contacts.isGrounded(ball.index));
}

// ---- 5. 单面平台：从上方落下站住，从下方穿过 ----
console.log('5) 物理系统：单面平台');
{
  // 5a. 从上方落下 → 站住
  const world = new World();
  const sys = createPhysicsSystem({ gravityY: 2000 });
  const plat = world.spawn();
  world.addComponent(plat, Position, new Position(0, 100));
  world.addComponent(plat, RigidBody, staticBody());
  world.addComponent(plat, Platform, new Platform(60, 8));

  const ball = world.spawn();
  world.addComponent(ball, Position, new Position(0, 0));
  world.addComponent(ball, Velocity, new Velocity(0, 0));
  world.addComponent(ball, RigidBody, dynamicBody(1, 0, 0, 1));
  world.addComponent(ball, Circle, new Circle(10));

  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) sys.run(world, dt);
  const pb = world.getComponent(ball, Position)!;
  // 平台顶面 = 100 - 8 = 92，球半径 10 → 球心停在 82 附近
  check('球从上方落到平台上站住', pb.y <= 84 && pb.y > 74, `ball.y=${pb.y.toFixed(2)}`);

  // 5b. 从下方上升 → 穿过
  const world2 = new World();
  const sys2 = createPhysicsSystem({ gravityY: 2000 });
  const plat2 = world2.spawn();
  world2.addComponent(plat2, Position, new Position(0, 100));
  world2.addComponent(plat2, RigidBody, staticBody());
  world2.addComponent(plat2, Platform, new Platform(60, 8));

  const ball2 = world2.spawn();
  world2.addComponent(ball2, Position, new Position(0, 150)); // 在平台下方
  world2.addComponent(ball2, Velocity, new Velocity(0, -600)); // 向上冲
  world2.addComponent(ball2, RigidBody, dynamicBody(1, 0, 0, 1));
  world2.addComponent(ball2, Circle, new Circle(10));

  for (let i = 0; i < 30; i++) sys2.run(world2, dt);
  const pb2 = world2.getComponent(ball2, Position)!;
  // 平台顶面=92：球从下方(y=150)上升应穿过平台（到达 y <= 82，即平台顶面之上）
  check('球从下方上升穿过平台', pb2.y <= 82.5, `ball.y=${pb2.y.toFixed(2)}`);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) {
  throw new Error(`物理内核自测失败：${failed} 项`);
}
