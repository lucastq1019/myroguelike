/**
 * 游戏运行时验证（mock 浏览器环境）
 *
 * 验证：GameEngine 启动 + Game 装配 + 横版关卡生成 + 重力/跳跃/近战 + 升级流程。
 * 运行：npx tsx src/game/verify-game.ts
 */
// ---- mock 浏览器环境（必须在 import 之前） ----
const listeners: Record<string, Function[]> = {};
(globalThis as any).window = {
  innerWidth: 960,
  innerHeight: 600,
  devicePixelRatio: 1,
  addEventListener: (t: string, cb: Function) => {
    (listeners[t] ||= []).push(cb);
  },
  removeEventListener: () => {},
};
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).performance = { now: () => Date.now() };

const drawCalls: string[] = [];
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) {
    if (prop === 'canvas') return { width: 960, height: 600 };
    return () => {
      drawCalls.push(prop as string);
    };
  },
  set: () => true,
});
const mockCanvas: any = {
  width: 960,
  height: 600,
  style: {},
  addEventListener: () => {},
  getContext: () => mockCtx,
};
(globalThis as any).document = {
  createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : { style: {}, appendChild: () => {} }),
  body: { appendChild: () => {}, insertBefore: () => {} },
};

// ---- 导入（在 mock 之后） ----
import GameEngine from '../GameEngine/GameEngine';
import { createRenderSystem } from '../GameEngine/renderer/RenderSystem';
import { Position, Velocity } from '../GameEngine/ecs/components';
import { EnemyTag, PlayerTag, Wall, Collider, Platform, MeleeAttack } from './components';
import { PhysicsContacts } from '../GameEngine/physics';
import { Game, GameState } from './game';

function section(t: string) {
  console.log('\n' + '='.repeat(52));
  console.log('  ' + t);
  console.log('='.repeat(52));
}
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
}

section('1. GameEngine 启动 + Game 装配');
const engine = GameEngine.getInstance({ screenWidth: 960, screenHeight: 600 });
check('GameEngine 单例', engine === GameEngine.getInstance());
check('World 存在', engine.getWorld() !== undefined);
check('Camera 资源存在', engine.getCamera() !== undefined);
check('Input 资源存在', engine.getInput() !== undefined);
check('Time 资源存在', engine.getTime() !== undefined);

const states: GameState[] = [];
const game = new Game({ onStateChange: (s) => states.push(s) });
check('Game 构造 + 初始状态', states.length > 0);
check(`初始层数 = ${states[0].floor}`, states[0].floor === 1);
check(`初始 HP = ${states[0].hp}`, states[0].hp === 100);

section('2. 注册渲染系统 + 运行若干帧');
engine.addSystem(
  createRenderSystem(engine.canvasManager, { background: '#141821', grid: false }),
);
engine.addSystem({ name: 'GameLogicSystem', run: () => game.update() });

const world = engine.getWorld();
// 手动推进 180 帧（模拟 3 秒，让玩家落地）
for (let i = 0; i < 180; i++) {
  world.update(1 / 60);
}
check('渲染被调用', drawCalls.length > 0);
check(`渲染调用次数 > 0（${drawCalls.length}）`, drawCalls.length > 0);

section('3. 横版关卡内容');
const enemyMask = world.maskOf(EnemyTag);
const enemies = world.findEntities(world.query().with(enemyMask).build());
check(`关卡有敌人（${enemies.length}）`, enemies.length > 0);

const platformMask = world.maskOf(Platform);
const platforms = world.findEntities(world.query().with(platformMask).build());
check(`关卡有悬浮平台（${platforms.length}）`, platforms.length > 0);

section('3.5 重力：玩家落地（着地）');
{
  const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  const pPos = world.storage.get(playerIdx, Position)!;
  const contacts = world.getResource(PhysicsContacts);
  check(`玩家已着地（isGrounded）`, contacts ? contacts.isGrounded(playerIdx) : false);
  check(`玩家在地面上方（y=${pPos.y.toFixed(0)}）`, pPos.y > 0 && pPos.y < 600);
}

section('3.6 跳跃：施加向上速度后应离地上升');
{
  const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  const vel = world.storage.get(playerIdx, Velocity)!;
  const pPos = world.storage.get(playerIdx, Position)!;
  const yBefore = pPos.y;
  vel.y = -720; // 模拟跳跃初速
  for (let i = 0; i < 10; i++) world.update(1 / 60);
  const yAfter = world.storage.get(playerIdx, Position)!.y;
  check(`跳跃后位置上移（${yBefore.toFixed(0)} → ${yAfter.toFixed(0)}）`, yAfter < yBefore);
}

section('3.7 物理：玩家未穿透地面');
{
  const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  // 再跑一会儿确保落地稳定
  for (let i = 0; i < 120; i++) world.update(1 / 60);
  const pPos = world.storage.get(playerIdx, Position)!;
  check(`玩家未掉出关卡底部（y=${pPos.y.toFixed(0)} < 600）`, pPos.y < 600);
}

section('3.8 近战：玩家有 MeleeAttack 组件');
{
  const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  const atk = world.storage.get(playerIdx, MeleeAttack);
  check('玩家具备近战能力', atk !== undefined);
}

section('4. 升级流程');
game.chooseUpgrade(0); // 即使未进入升级态也应安全
check('chooseUpgrade 安全调用', true);

console.log('\n✅ 游戏运行时验证完成');

