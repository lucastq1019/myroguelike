/**
 * UI 控件体系回归测试：命中检测 / 禁用态 / 层级 / 与 hud、screen 集成。
 * 运行：npx tsx src/game/verify-ui.ts
 */
import { UiLayer, Button, Panel, HitArea } from '../GameEngine/ui';
import { createHudSystem } from './systems/hud';
import { createScreenSystem } from './systems/screen';
import { GamePhase } from './state';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

/** 最小 canvas 桩：记录调用，不真的绘制 */
function makeCtx() {
  const calls: string[] = [];
  const ctx = new Proxy({} as any, {
    get(_t, prop: string) {
      return (..._args: any[]) => { calls.push(prop); return undefined; };
    },
    set() { return true; },
  });
  return { ctx, calls };
}
function makeCanvas(w = 960, h = 600) {
  const { ctx, calls } = makeCtx();
  return {
    width: w,
    height: h,
    getCtx: () => ctx,
    getCanvas: () => null,
    calls,
  } as any;
}

// ---- 1. Widget 命中检测 ----
console.log('1) Widget 命中检测');
{
  const b = new Button({ id: 'b', x: 100, y: 100, w: 200, h: 50, label: 'OK' });
  check('内部点命中', b.hitTest(150, 120));
  check('左上角边界命中', b.hitTest(100, 100));
  check('右下角边界命中', b.hitTest(300, 150));
  check('左侧外不命中', !b.hitTest(99, 120));
  check('下方外不命中', !b.hitTest(150, 151));
  check('centerX / centerY 正确', b.centerX === 200 && b.centerY === 125);
}

// ---- 2. 禁用态 ----
console.log('2) 禁用态');
{
  const b = new Button({ id: 'b', x: 0, y: 0, w: 100, h: 40, label: 'X', enabled: false });
  check('禁用态不响应命中', !b.hitTest(50, 20));

  const ui = new UiLayer();
  ui.begin();
  ui.button({ id: 'dis', x: 0, y: 0, w: 100, h: 40, label: 'X', enabled: false });
  ui.end();
  check('UiLayer.hitTest 对禁用控件返回 false', !ui.hitTest('dis', 50, 20));

  ui.begin();
  ui.button({ id: 'en', x: 0, y: 0, w: 100, h: 40, label: 'X', enabled: true });
  ui.end();
  check('UiLayer.hitTest 对启用控件返回 true', ui.hitTest('en', 50, 20));
}

// ---- 3. onClick 回调 ----
console.log('3) onClick 回调');
{
  const ui = new UiLayer();
  let clicked = 0;
  ui.begin();
  ui.button({ id: 'go', x: 10, y: 10, w: 100, h: 40, label: 'Go', onClick: () => clicked++ });
  ui.end();

  check('click 命中触发回调', ui.click(50, 30) && clicked === 1);
  check('click 未命中不触发', !ui.click(500, 500) && clicked === 1);
  check('hit 返回控件本身', ui.hit(50, 30)?.id === 'go');
  check('hit 未命中返回 null', ui.hit(500, 500) === null);
}

// ---- 4. 层级（后注册优先）----
console.log('4) 层级');
{
  const ui = new UiLayer();
  ui.begin();
  ui.button({ id: 'under', x: 0, y: 0, w: 100, h: 100, label: 'U' });
  ui.button({ id: 'over', x: 50, y: 50, w: 100, h: 100, label: 'O' });
  ui.end();
  check('重叠区命中后注册者', ui.hit(75, 75)?.id === 'over');
  check('非重叠区命中先注册者', ui.hit(10, 10)?.id === 'under');
}

// ---- 5. Panel 容器 ----
console.log('5) Panel 容器');
{
  const p = new Panel({ id: 'p', x: 0, y: 0, w: 400, h: 300, title: '面板' });
  const child = new Button({ id: 'c', x: 10, y: 10, w: 80, h: 30, label: 'C' });
  p.add(child);
  check('Panel 自身区域命中', p.hitTest(200, 150));
  check('Panel 子控件区域命中', p.hitTest(50, 25));
  check('Panel 外部不命中', !p.hitTest(500, 500));
  check('children 记录子控件', p.children.length === 1);
}

// ---- 6. HitArea 负载 ----
console.log('6) HitArea 负载');
{
  const ui = new UiLayer();
  ui.begin();
  ui.hitArea({ id: 'card:2', x: 0, y: 0, w: 50, h: 50, payload: 2 });
  ui.end();
  const w = ui.hit(25, 25) as HitArea;
  check('HitArea 命中', w !== null && w.id === 'card:2');
  check('payload 携带卡片 index', w.payload === 2);
}

// ---- 7. begin() 清空上一帧 ----
console.log('7) 帧重置');
{
  const ui = new UiLayer();
  ui.begin();
  ui.button({ id: 'a', x: 0, y: 0, w: 10, h: 10, label: 'A' });
  ui.end();
  check('第一帧有 1 个控件', ui.all().length === 1);

  ui.begin();
  ui.end();
  check('begin() 清空控件', ui.all().length === 0);
  check('清空后 hitTest 返回 false', !ui.hitTest('a', 5, 5));
}

// ---- 8. hud 集成：卡片 + 按钮命中区域 ----
console.log('8) hud 集成');
{
  const cm = makeCanvas();
  const hud = createHudSystem(cm);
  const state: any = {
    hp: 100, maxHp: 100, floor: 1, enemiesLeft: 3, coins: 50,
    upgradeChoosing: true, canReroll: true, rerollCost: 0, freeRerolls: 1,
    skipHeal: 25, combo: 0, comboStage: 0, buffs: [], gameOver: false,
    upgradeOptions: [
      { name: 'A', desc: 'a', rarity: 'common' },
      { name: 'B', desc: 'b', rarity: 'rare' },
      { name: 'C', desc: 'c', rarity: 'epic' },
    ],
  };
  hud.run(null, 1 / 60, state);

  const cards = hud.getUpgradeCardRects();
  check('暴露 3 张卡片命中区', cards.length === 3);
  check('卡片 index 正确', cards.map((c: any) => c.index).join(',') === '0,1,2');

  const btns = hud.getPanelButtons();
  check('暴露 2 个面板按钮', btns.length === 2);
  check('按钮 id 为 reroll/skip', btns.map((b: any) => b.id).join(',') === 'reroll,skip');
  check('reroll 可点击', btns[0].enabled === true);

  // 用 UI 层统一命中检测（替代手写矩形）
  const c0 = cards[0];
  check('hud.hitTest 命中卡片 0', hud.hitTest('card:0', c0.x + 5, c0.y + 5));
  check('hud.hitTest 卡片 0 外不命中', !hud.hitTest('card:0', c0.x - 5, c0.y - 5));
  const r = btns[0];
  check('hud.hitTest 命中 reroll 按钮', hud.hitTest('reroll', r.x + 5, r.y + 5));

  // 禁用态：金币不足
  state.canReroll = false;
  hud.run(null, 1 / 60, state);
  check('金币不足时 reroll 禁用', hud.getPanelButtons()[0].enabled === false);
  check('禁用后 hitTest 不命中', !hud.hitTest('reroll', r.x + 5, r.y + 5));

  // 非升级状态：无控件
  state.upgradeChoosing = false;
  hud.run(null, 1 / 60, state);
  check('非升级状态无卡片命中区', hud.getUpgradeCardRects().length === 0);
  check('非升级状态无按钮命中区', hud.getPanelButtons().length === 0);
}

// ---- 9. screen 集成 ----
console.log('9) screen 集成');
{
  const cm = makeCanvas();
  const screen = createScreenSystem(cm);
  const save: any = { souls: 100, unlocked: [], bestFloor: 3, bestCombo: 10, runs: 5 };

  screen.run(null, 1 / 60, {
    phase: GamePhase.MENU, floor: 0, combo: 0, save, isNewBest: false, soulsGained: 0,
  });
  const btns = screen.getButtons();
  check('主菜单有按钮', btns.length >= 2);
  check('含 start 按钮', btns.some((b: any) => b.id === 'start'));
  check('含 shop 按钮', btns.some((b: any) => b.id === 'shop'));

  const start = btns.find((b: any) => b.id === 'start')!;
  check('screen.hitTest 命中 start', screen.hitTest('start', start.x + 5, start.y + 5));
  check('screen.hitTest 未命中', !screen.hitTest('start', start.x - 50, start.y - 50));

  // 商店：解锁行命中区
  screen.run(null, 1 / 60, {
    phase: GamePhase.SHOP, floor: 0, combo: 0, save, isNewBest: false, soulsGained: 0,
  });
  const shopBtns = screen.getButtons();
  check('商店含 back 按钮', shopBtns.some((b: any) => b.id === 'back'));
  check('商店含解锁行命中区', shopBtns.some((b: any) => b.id.startsWith('unlock:')));

  // PLAYING：无控件
  screen.run(null, 1 / 60, {
    phase: GamePhase.PLAYING, floor: 1, combo: 0, save, isNewBest: false, soulsGained: 0,
  });
  check('PLAYING 状态无按钮', screen.getButtons().length === 0);

  // 居中块范围仍在
  screen.run(null, 1 / 60, {
    phase: GamePhase.MENU, floor: 0, combo: 0, save, isNewBest: false, soulsGained: 0,
  });
  const b = screen.getBlockBounds();
  check('内容块垂直居中（top < bottom）', b.top < b.bottom);
  check('内容块大致居中（top ≈ bottom 距边相等）', Math.abs((b.top - 0) - (600 - b.bottom)) < 40);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) (globalThis as any).process?.exit?.(1);
