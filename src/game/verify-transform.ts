/**
 * Transform 组件回归测试：旋转 / 缩放 / 序列化 / 渲染集成。
 * 运行：npx tsx src/game/verify-transform.ts
 */
import { World } from '../GameEngine/ecs';
import { Position, Sprite, Transform } from '../GameEngine/ecs/components';
import { Camera } from '../GameEngine/resources/Camera';
import { createRenderSystem } from '../GameEngine/renderer/RenderSystem';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

// ---- 1. 构造与默认值 ----
console.log('1) 构造与默认值');
{
  const t = new Transform();
  check('默认 rotation = 0', t.rotation === 0);
  check('默认 scaleX = 1', t.scaleX === 1);
  check('默认 scaleY = 1', t.scaleY === 1);
  check('默认是单位变换', t.isIdentity());

  const t2 = new Transform(Math.PI / 2, 2, 3);
  check('构造传参生效', t2.rotation === Math.PI / 2 && t2.scaleX === 2 && t2.scaleY === 3);
  check('非单位变换 isIdentity = false', !t2.isIdentity());
}

// ---- 2. 链式设置 ----
console.log('2) 链式设置');
{
  const t = new Transform();
  t.setRotation(Math.PI).setScale(2);
  check('setRotation 链式', t.rotation === Math.PI);
  check('setScale(2) 统一缩放', t.scaleX === 2 && t.scaleY === 2);

  t.setScale(3, 4);
  check('setScale(3,4) 分轴缩放', t.scaleX === 3 && t.scaleY === 4);

  check('degrees 转换正确', Math.abs(new Transform(Math.PI).degrees - 180) < 1e-9);
}

// ---- 3. 序列化 / 反序列化（行动项 H 的基础）----
console.log('3) 序列化 / 反序列化');
{
  const t = new Transform(1.5, 2, 0.5);
  const data = t.serialize();
  check('serialize 字段完整', data.rotation === 1.5 && data.scaleX === 2 && data.scaleY === 0.5);

  const restored = new Transform().deserialize(data);
  check('deserialize 还原 rotation', restored.rotation === 1.5);
  check('deserialize 还原 scale', restored.scaleX === 2 && restored.scaleY === 0.5);

  // 容错：空数据 / 部分数据
  const partial = new Transform().deserialize({ rotation: 0.25 });
  check('部分数据：只改 rotation', partial.rotation === 0.25 && partial.scaleX === 1 && partial.scaleY === 1);

  const fromNull = Transform.from(null);
  check('Transform.from(null) 得到单位变换', fromNull.isIdentity());
  const fromData = Transform.from({ scaleX: 5 });
  check('Transform.from(部分数据) 生效', fromData.scaleX === 5 && fromData.scaleY === 1);

  // clone 独立
  const src = new Transform(1, 2, 3);
  const cloned = src.clone();
  cloned.rotation = 9;
  check('clone 是深拷贝（互不影响）', src.rotation === 1 && cloned.rotation === 9);
}

// ---- 4. 渲染集成：旋转/缩放真的作用到 canvas ----
console.log('4) 渲染集成');
{
  const world = new World();
  world.insertResource(Camera, new Camera(960, 600, 960, 600));

  const e = world.spawn();
  world.addComponent(e, Position, new Position(100, 100));
  world.addComponent(e, Sprite, new Sprite(40, '#fff', 'rect'));

  // 记录 canvas 调用
  const calls: string[] = [];
  const ctx = new Proxy({} as any, {
    get(_t, prop: string) {
      if (prop === 'canvas') return { width: 960, height: 600 };
      return (...args: any[]) => { calls.push(prop); return undefined; };
    },
    set() { return true; },
  });
  const canvasManager = {
    width: 960,
    height: 600,
    getCtx: () => ctx,
    getCanvas: () => null,
  } as any;

  const rs = createRenderSystem(canvasManager, { grid: false, background: '#000' });

  // 无 Transform：不应调用 save/rotate/scale
  calls.length = 0;
  rs.run(world, 1 / 60);
  check('无 Transform 时不调用 rotate', !calls.includes('rotate'));
  check('无 Transform 时不调用 save', !calls.includes('save'));

  // 加单位 Transform：仍不应调用 rotate（零开销路径）
  world.addComponent(e, Transform, new Transform());
  calls.length = 0;
  rs.run(world, 1 / 60);
  check('单位 Transform 时跳过 rotate', !calls.includes('rotate'));

  // 非单位 Transform：应调用 save/rotate/scale/restore
  world.getComponent(e, Transform)!.setRotation(Math.PI / 4).setScale(2);
  calls.length = 0;
  rs.run(world, 1 / 60);
  check('非单位 Transform 调用 save', calls.includes('save'));
  check('非单位 Transform 调用 rotate', calls.includes('rotate'));
  check('非单位 Transform 调用 scale', calls.includes('scale'));
  check('非单位 Transform 调用 restore', calls.includes('restore'));
  check('save/restore 配对', calls.filter((c) => c === 'save').length === calls.filter((c) => c === 'restore').length);
}

// ---- 5. 与 Position 共存（不破坏热路径）----
console.log('5) 与 Position 共存');
{
  const world = new World();
  const e1 = world.spawn();
  world.addComponent(e1, Position, new Position(1, 1));
  const e2 = world.spawn();
  world.addComponent(e2, Position, new Position(2, 2));
  world.addComponent(e2, Transform, new Transform(1));

  const positions = world.dense(Position);
  check('dense(Position) 仍命中 2 个（含带 Transform 的）', positions.length === 2);
  check('Transform 不干扰 Position 数据', positions[0].x === 1 && positions[1].x === 2);
  check('Transform 可独立查询', world.getComponent(e2, Transform)!.rotation === 1);
  check('e1 无 Transform', world.getComponent(e1, Transform) === undefined);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) (globalThis as any).process?.exit?.(1);
