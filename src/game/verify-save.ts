/**
 * 实体状态序列化回归测试：组件注册 / 序列化 / 反序列化 / 容错 / 中途存档。
 * 运行：npx tsx src/game/verify-save.ts
 */
import { World } from '../GameEngine/ecs';
import {
  createWorldCodec,
  snapshotToJSON,
  snapshotFromJSON,
  SNAPSHOT_VERSION,
} from '../GameEngine/ecs/WorldCodec';
import { Position, Velocity, Transform } from '../GameEngine/ecs/components';
import { Health, Collider, PlayerTag, EnemyTag, ComboCounter, Weapon } from './components';
import {
  writeRunSave,
  loadRunSave,
  hasRunSave,
  clearRunSave,
  writeSave,
  loadSave,
  clearAll,
} from './save';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

/** 构造一个带若干实体的测试世界 */
function makeWorld() {
  const world = new World();
  const p = world.spawn();
  world.addComponent(p, Position, new Position(100, 200));
  world.addComponent(p, Velocity, new Velocity(3, -4));
  world.addComponent(p, Health, new Health(70, 100));
  world.addComponent(p, Collider, new Collider(14));
  world.addComponent(p, PlayerTag, new PlayerTag());
  world.addComponent(p, ComboCounter, new ComboCounter());
  world.addComponent(p, Weapon, new Weapon(0.45, 560, 14));

  const e = world.spawn();
  world.addComponent(e, Position, new Position(500, 300));
  world.addComponent(e, Health, new Health(50, 50));
  world.addComponent(e, EnemyTag, new EnemyTag());
  return { world, p, e };
}

const codec = () =>
  createWorldCodec()
    .register(Position, 'position')
    .register(Velocity, 'velocity')
    .register(Health, 'health')
    .register(Collider, 'collider')
    .register(ComboCounter, 'comboCounter')
    .register(Weapon, 'weapon')
    .register(PlayerTag, 'playerTag');

// ---- 1. 注册表 ----
console.log('1) 注册表');
{
  const c = codec();
  check('已注册 7 种组件', c.registeredNames().length === 7);
  check('isRegistered 命中', c.isRegistered('position'));
  check('isRegistered 未命中', !c.isRegistered('sprite'));
  check('未注册的组件不入档', !c.registeredNames().includes('sprite'));
}

// ---- 2. 序列化 ----
console.log('2) 序列化');
{
  const { world } = makeWorld();
  const snap = codec().serialize(world, { playerMask: world.maskOf(PlayerTag) });

  check('版本号正确', snap.version === SNAPSHOT_VERSION);
  check('有保存时间戳', typeof snap.savedAt === 'number' && snap.savedAt > 0);
  check('序列化出 2 个实体', snap.entities.length === 2);

  const player = snap.entities.find((e) => e.isPlayer);
  check('识别出玩家实体', player !== undefined);
  check('玩家实体含 7 个组件', player!.components.length === 7);

  const pos = player!.components.find((c) => c.type === 'position')!;
  check('Position 数据正确', (pos.data as any).x === 100 && (pos.data as any).y === 200);

  const hp = player!.components.find((c) => c.type === 'health')!;
  check('Health 数据正确', (hp.data as any).current === 70 && (hp.data as any).max === 100);

  const enemy = snap.entities.find((e) => !e.isPlayer);
  check('敌人实体非玩家', enemy !== undefined && !enemy.isPlayer);
  check('敌人含 2 个组件', enemy!.components.length === 2);
}

// ---- 3. 反序列化 ----
console.log('3) 反序列化');
{
  const { world } = makeWorld();
  const snap = codec().serialize(world, { playerMask: world.maskOf(PlayerTag) });

  const world2 = new World();
  const restored = codec().deserialize(world2, snap);
  check('恢复 2 个实体', restored === 2);

  const playerIdx = world2.findEntities(world2.query().with(world2.maskOf(PlayerTag)).build())[0];
  check('玩家标记已恢复', playerIdx !== undefined);

  const pos = world2.storage.get(playerIdx, Position)!;
  check('Position 恢复正确', pos.x === 100 && pos.y === 200);

  const hp = world2.storage.get(playerIdx, Health)!;
  check('Health 恢复正确', hp.current === 70 && hp.max === 100);

  const vel = world2.storage.get(playerIdx, Velocity)!;
  check('Velocity 恢复正确', vel.x === 3 && vel.y === -4);

  const weapon = world2.storage.get(playerIdx, Weapon)!;
  check('Weapon 恢复正确', weapon.damage === 14 && weapon.cooldown === 0.45);
}

// ---- 4. 往返一致性 ----
console.log('4) 往返一致性');
{
  const { world } = makeWorld();
  const c = codec();
  const snap1 = c.serialize(world, { playerMask: world.maskOf(PlayerTag) });

  const world2 = new World();
  c.deserialize(world2, snap1);
  const snap2 = c.serialize(world2, { playerMask: world2.maskOf(PlayerTag) });

  // 比较实体组件数据（忽略 index 与时间戳）
  const norm = (s: any) => s.entities.map((e: any) => ({
    isPlayer: e.isPlayer,
    comps: [...e.components].sort((a: any, b: any) => a.type.localeCompare(b.type)),
  }));
  check('往返后结构一致', JSON.stringify(norm(snap1)) === JSON.stringify(norm(snap2)));
}

// ---- 5. 自定义序列化组件（Transform）----
console.log('5) 自定义序列化组件');
{
  const c = createWorldCodec().register(Transform, 'transform');
  const world = new World();
  const e = world.spawn();
  world.addComponent(e, Transform, new Transform(1.5, 2, 0.5));

  const snap = c.serialize(world);
  const data = snap.entities[0].components[0].data as any;
  check('使用组件自定义 serialize', data.rotation === 1.5 && data.scaleX === 2);

  const world2 = new World();
  c.deserialize(world2, snap);
  const idx = world2.findEntities(world2.query().with(world2.maskOf(Transform)).build())[0];
  const tf = world2.storage.get(idx, Transform)!;
  check('自定义 deserialize 还原', tf.rotation === 1.5 && tf.scaleX === 2 && tf.scaleY === 0.5);
}

// ---- 6. 容错 ----
console.log('6) 容错');
{
  const { world } = makeWorld();
  const snap = codec().serialize(world);

  // 未知组件类型 → 跳过，不抛错
  const bad = JSON.parse(JSON.stringify(snap));
  bad.entities[0].components.push({ type: 'nonexistent', data: { a: 1 } });
  const world2 = new World();
  let threw = false;
  try { codec().deserialize(world2, bad); } catch { threw = true; }
  check('未知组件类型不抛错', !threw);
  check('未知组件被跳过（实体仍恢复）', world2.entities.getAllEntities().length > 0);

  // 空快照
  check('空实体列表返回 0', codec().deserialize(new World(), { version: 1, savedAt: 0, entities: [] }) === 0);
  check('null 快照返回 0', codec().deserialize(new World(), null as any) === 0);

  // 全部组件都未知 → 不留空实体
  const onlyUnknown = { version: 1, savedAt: 0, entities: [{ index: 0, isPlayer: false, components: [{ type: 'zzz', data: {} }] }] };
  const w3 = new World();
  codec().deserialize(w3, onlyUnknown);
  check('无效实体不残留', w3.entities.getAllEntities().length === 0);
}

// ---- 7. JSON 往返 ----
console.log('7) JSON 往返');
{
  const { world } = makeWorld();
  const snap = codec().serialize(world, { playerMask: world.maskOf(PlayerTag) });
  const json = snapshotToJSON(snap);
  check('可序列化为 JSON 字符串', typeof json === 'string' && json.length > 0);

  const back = snapshotFromJSON(json);
  check('可从 JSON 还原', back !== null && back.entities.length === snap.entities.length);
  check('版本号保留', back!.version === SNAPSHOT_VERSION);

  check('非法 JSON 返回 null', snapshotFromJSON('{bad json') === null);
  check('结构不对返回 null', snapshotFromJSON('{"a":1}') === null);
}

// ---- 8. 清空世界 ----
console.log('8) 清空世界');
{
  const { world } = makeWorld();
  check('清空前有实体', world.entities.getAllEntities().length === 2);
  const c = codec();
  const snap = c.serialize(world);
  c.loadInto(world, snap);
  check('loadInto 先清空再恢复（数量一致）', world.entities.getAllEntities().length === 2);
}

// ---- 9. 中途存档读写 ----
console.log('9) 中途存档读写');
{
  clearAll();
  check('初始无中途存档', !hasRunSave());

  writeRunSave('{"floor":3}');
  check('写入后可读取', hasRunSave());
  check('内容正确', loadRunSave() === '{"floor":3}');

  clearRunSave();
  check('清除后无存档', !hasRunSave());

  // 元进度与中途存档互不影响
  clearAll();
  writeSave({ bestFloor: 5, bestCombo: 20, runs: 3, souls: 10, unlocked: ['a'] });
  writeRunSave('run-data');
  check('元进度可读', loadSave().bestFloor === 5);
  check('中途存档可读', loadRunSave() === 'run-data');
  clearRunSave();
  check('清除中途存档不影响元进度', loadSave().bestFloor === 5);
  clearAll();
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) (globalThis as any).process?.exit?.(1);
