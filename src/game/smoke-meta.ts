/**
 * 元游戏冒烟测试：状态机 / 存档 / 音效 / 界面系统。
 * 运行：npx tsx src/game/smoke-meta.ts
 */
const calls: string[] = [];
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) {
    if (prop === 'canvas') return { width: 960, height: 600 };
    if (prop === 'measureText') return () => ({ width: 40 });
    return (...args: any[]) => { calls.push(`${prop}(${args.length})`); };
  },
  set: () => true,
});

import { GamePhase, GameStateMachine } from './state';
import { loadSave, writeSave, recordRun, clearSave, unlockItem, SOULS_NEW_BEST_BONUS } from './save';
import { AudioManager } from './audio';
import { createScreenSystem } from './systems/screen';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

// ---- 1. 状态机 ----
console.log('1) 状态机');
{
  const fsm = new GameStateMachine();
  check('初始为 MENU', fsm.is(GamePhase.MENU));
  fsm.set(GamePhase.PLAYING);
  check('切到 PLAYING', fsm.isPlaying());
  fsm.set(GamePhase.PAUSED);
  check('切到 PAUSED', fsm.is(GamePhase.PAUSED) && !fsm.isPlaying());
  fsm.set(GamePhase.GAMEOVER);
  check('切到 GAMEOVER', fsm.is(GamePhase.GAMEOVER));
}

// ---- 2. 存档 ----
console.log('2) 存档（localStorage 降级内存）');
{
  clearSave();
  const s0 = loadSave();
  check('初始存档为 0', s0.bestFloor === 0 && s0.bestCombo === 0 && s0.runs === 0);
  check('初始灵魂为 0', s0.souls === 0);
  check('初始无解锁项', s0.unlocked.length === 0);

  const r1 = recordRun(3, 5);
  check('记录第 3 层 → 新纪录', r1.isNewBest && r1.save.bestFloor === 3 && r1.save.runs === 1);
  check(`新纪录灵魂奖励（+${r1.soulsGained}）`, r1.soulsGained === 3 + SOULS_NEW_BEST_BONUS);

  const r2 = recordRun(2, 8);
  check('记录第 2 层 → 非新纪录', !r2.isNewBest && r2.save.bestFloor === 3);
  check('最高连击更新为 8', r2.save.bestCombo === 8);
  check('游玩次数累加为 2', r2.save.runs === 2);
  check(`非新纪录灵魂奖励（+${r2.soulsGained}）`, r2.soulsGained === 2);

  // 灵魂累计
  const soulsTotal = r1.soulsGained + r2.soulsGained;
  check(`灵魂累计正确（${loadSave().souls} = ${soulsTotal}）`, loadSave().souls === soulsTotal);

  writeSave({ bestFloor: 10, bestCombo: 20, runs: 5, souls: 100, unlocked: [] });
  const s1 = loadSave();
  check('写入后读回正确', s1.bestFloor === 10 && s1.bestCombo === 20 && s1.runs === 5 && s1.souls === 100);

  // 解锁：灵魂足够
  const u1 = unlockItem('vitality', 10);
  check('灵魂足够可解锁', u1 !== null && u1.souls === 90 && u1.unlocked.includes('vitality'));
  // 重复解锁
  const u2 = unlockItem('vitality', 10);
  check('重复解锁返回 null', u2 === null);
  // 灵魂不足
  const u3 = unlockItem('vampire', 9999);
  check('灵魂不足返回 null', u3 === null);
  check('失败不扣灵魂', loadSave().souls === 90);

  clearSave();
  check('清空后归零', loadSave().bestFloor === 0 && loadSave().souls === 0 && loadSave().unlocked.length === 0);
}

// ---- 3. 音效（无 AudioContext 时静默） ----
console.log('3) 音效');
{
  const am = new AudioManager();
  let threw = false;
  try {
    am.play('jump');
    am.play('hit');
    am.play('death');
    am.unlock();
  } catch {
    threw = true;
  }
  check('无 AudioContext 时播放不抛错', !threw);
  check('默认启用', am.isEnabled());
  am.setEnabled(false);
  check('可关闭', !am.isEnabled());
}

// ---- 4. 界面系统 ----
console.log('4) 界面系统');
{
  const screen = createScreenSystem({ getCtx: () => mockCtx, width: 960, height: 600 });
  const save = { bestFloor: 5, bestCombo: 12, runs: 3, souls: 40, unlocked: [] };

  // 主菜单
  calls.length = 0;
  screen.run(null, 1 / 60, { phase: GamePhase.MENU, floor: 0, combo: 0, save, isNewBest: false, soulsGained: 0 });
  const menuButtons = screen.getButtons();
  check('主菜单有「开始游戏」按钮', menuButtons.some((b) => b.id === 'start'));
  check('主菜单绘制了文字', calls.some((c) => c.startsWith('fillText')));

  // 游戏中：不画界面
  screen.run(null, 1 / 60, { phase: GamePhase.PLAYING, floor: 1, combo: 0, save, isNewBest: false, soulsGained: 0 });
  check('游戏中无界面按钮', screen.getButtons().length === 0);

  // 暂停
  screen.run(null, 1 / 60, { phase: GamePhase.PAUSED, floor: 2, combo: 3, save, isNewBest: false, soulsGained: 0 });
  const pauseButtons = screen.getButtons();
  check('暂停有 继续/重开/返回', pauseButtons.some((b) => b.id === 'resume') && pauseButtons.some((b) => b.id === 'restart') && pauseButtons.some((b) => b.id === 'menu'));

  // 结束
  screen.run(null, 1 / 60, { phase: GamePhase.GAMEOVER, floor: 4, combo: 9, save, isNewBest: true, soulsGained: 9 });
  const overButtons = screen.getButtons();
  check('结束有 再来一局/返回', overButtons.some((b) => b.id === 'restart') && overButtons.some((b) => b.id === 'menu'));

  // 垂直居中：内容块重心应接近画布中心（H/2 = 300）
  const bounds = screen.getBlockBounds();
  const blockCenter = (bounds.top + bounds.bottom) / 2;
  check(`结束界面内容块垂直居中（重心 ${blockCenter.toFixed(0)} ≈ 300）`, Math.abs(blockCenter - 300) < 10, `center=${blockCenter.toFixed(0)}`);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) throw new Error(`元游戏冒烟测试失败：${failed} 项`);
