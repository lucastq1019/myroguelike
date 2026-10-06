/**
 * 性能与架构回归测试：查询优化 / 组件注册表 / 对象池。
 * 运行：npx tsx src/game/verify-perf.ts
 */
import { World, EntityPool } from '../GameEngine/ecs';
import { Position, Velocity, Sprite } from '../GameEngine/ecs/components';
import { ComponentRegistry } from '../GameEngine/ecs/ComponentRegistry';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

// ---- 1. 查询优化：findEntitiesInto 复用缓冲 ----
console.log('1) 查询优化');
{
  const world = new World();
  for (let i = 0; i < 10; i++) {
    const e = world.spawn();
    world.addComponent(e, Position, new Position(i, 0));
    if (i % 2 === 0) world.addComponent(e, Velocity, new Velocity(1, 0));
  }
  const buf: number[] = [];
  const posMask = world.maskOf(Position);
  const velMask = world.maskOf(Velocity);

  const all = world.findEntitiesInto(world.query().with(posMask).build(), buf);
  check('查询 Position 命中 10 个', all.length === 10, `got ${all.length}`);
  check('复用同一数组（无新分配）', all === buf);

  const moving = world.findEntitiesInto(world.query().with(posMask, velMask).build(), buf);
  check('查询 Position+Velocity 命中 5 个', moving.length === 5, `got ${moving.length}`);

  // findEntities 返回独立数组（安全）
  const a = world.findEntities(world.query().with(posMask).build());
  const b = world.findEntities(world.query().with(velMask).build());
  check('findEntities 返回独立数组（不互相覆盖）', a !== b && a.length === 10 && b.length === 5);
}

// ---- 2. 组件注册表：显式 id ----
console.log('2) 组件注册表（显式 id）');
{
  const reg = new ComponentRegistry();
  reg.register(Position, 5);
  reg.register(Velocity, 2);
  check('显式注册 Position → id 5', reg.getId(Position) === 5);
  check('显式注册 Velocity → id 2', reg.getId(Velocity) === 2);
  check('位掩码 = 1n << id', reg.getBitMask(Position) === (1n << 5n));
  check('位掩码 Velocity = 1n << 2n', reg.getBitMask(Velocity) === (1n << 2n));

  // 自动分配跳过已占用 id
  const autoId = reg.getId(Sprite);
  check('自动分配跳过已占用 id（≠5,≠2）', autoId !== 5 && autoId !== 2, `id=${autoId}`);

  // 重复注册同 id 幂等
  reg.register(Position, 5);
  check('重复注册同 id 幂等', reg.getId(Position) === 5);

  // 冲突注册抛错
  let threw = false;
  try { reg.register(Position, 9); } catch { threw = true; }
  check('重复注册不同 id 抛错', threw);
}

// ---- 3. 对象池 ----
console.log('3) 对象池（EntityPool）');
{
  const world = new World();
  const pool = new EntityPool(world, 16);

  // 从池中取实体（池空 → 新建）
  const e1 = pool.acquire();
  world.addComponent(e1, Position, new Position(1, 1));
  const idx1 = e1.index;

  // 回收
  pool.release(e1);
  check('回收后池中有 1 个空闲', pool.getFreeCount() === 1);
  check('回收后实体已销毁（组件清空）', world.getComponent(e1, Position) === undefined);

  // 再次 acquire → 复用同一 index
  const e2 = pool.acquire();
  check('复用同一 index', e2.index === idx1, `idx=${e2.index} vs ${idx1}`);
  check('复用后 version +1', e2.version === e1.version + 1, `v=${e2.version} vs ${e1.version}`);
  check('池已空', pool.getFreeCount() === 0);

  // 复用的实体可正常加组件
  world.addComponent(e2, Velocity, new Velocity(2, 0));
  check('复用实体可正常使用', world.getComponent(e2, Velocity) !== undefined);

  // 池满时真正销毁
  const smallPool = new EntityPool(world, 1);
  const a = smallPool.acquire();
  smallPool.release(a);
  const b = smallPool.acquire();
  smallPool.release(b); // 池满（capacity=1），再 release 会真正销毁
  const c = smallPool.acquire();
  smallPool.release(c);
  check('池满时释放不报错', true);
}

// ---- 4. 性能对比：查询 1000 实体 ----
console.log('4) 性能基准');
{
  const world = new World();
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const e = world.spawn();
    world.addComponent(e, Position, new Position(i, 0));
    if (i % 3 === 0) world.addComponent(e, Velocity, new Velocity(1, 0));
  }
  const posMask = world.maskOf(Position);
  const velMask = world.maskOf(Velocity);
  const q = world.query().with(posMask, velMask).build();

  // 预热
  for (let i = 0; i < 100; i++) world.findEntities(q);

  const ITER = 2000;
  const buf: number[] = [];

  // findEntities（每次分配）
  const t0 = performance.now();
  for (let i = 0; i < ITER; i++) world.findEntities(q);
  const t1 = performance.now();

  // findEntitiesInto（复用缓冲）
  const t2 = performance.now();
  for (let i = 0; i < ITER; i++) world.findEntitiesInto(q, buf);
  const t3 = performance.now();

  const allocMs = t1 - t0;
  const reuseMs = t3 - t2;
  console.log(`  findEntities     : ${allocMs.toFixed(1)}ms / ${ITER} 次`);
  console.log(`  findEntitiesInto : ${reuseMs.toFixed(1)}ms / ${ITER} 次`);
  console.log(`  复用缓冲提速     : ${((1 - reuseMs / allocMs) * 100).toFixed(0)}%`);
  check('复用缓冲不慢于分配版', reuseMs <= allocMs * 1.5, `reuse=${reuseMs.toFixed(1)} alloc=${allocMs.toFixed(1)}`);
  check('查询结果正确', world.findEntitiesInto(q, buf).length === Math.ceil(N / 3));
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) throw new Error(`性能架构回归测试失败：${failed} 项`);
