/**
 * 横版动作平台 Roguelike 入口
 *
 * 用 GameEngine 启动：注册渲染系统 + 游戏逻辑系统，然后 engine.start()。
 * 渲染装饰器见 ./render/decorators.ts（本文件只做装配与交互绑定）。
 */
import GameEngine from '../GameEngine/GameEngine';
import { createRenderSystem } from '../GameEngine/renderer/RenderSystem';
import { createMinimapSystem } from './systems/minimap';
import { createHudSystem } from './systems/hud';
import { createScreenSystem } from './systems/screen';
import { createMapScreenSystem } from './systems/mapScreen';
import { GamePhase, GameStateMachine } from './state';
import { loadSave, recordRun, unlockItem, SaveData, writeRunSave, loadRunSave, clearRunSave, hasRunSave } from './save';
import { getUnlockDef } from './resources/Unlocks';
import { audio } from './audio';
import { Game, GameState } from './game';
import { GAME_DECORATORS } from './render/decorators';

// ---- 引擎 ----
const engine = GameEngine.getInstance({
  screenWidth: 960,
  screenHeight: 600,
  debugMode: false,
});

// ---- 元游戏状态 ----
const fsm = new GameStateMachine();
let saveData: SaveData = loadSave();
let isNewBest = false;
let runRecorded = false;
let soulsGained = 0;

let currentState: GameState | null = null;

const game = new Game({
  onStateChange: (s) => {
    currentState = s;
    // 死亡 → 切到结束界面 + 记录存档
    if (s.gameOver && fsm.is(GamePhase.PLAYING)) {
      fsm.set(GamePhase.GAMEOVER);
      if (!runRecorded) {
        const res = recordRun(s.floor, game.getBestCombo());
        saveData = res.save;
        isNewBest = res.isNewBest;
        soulsGained = res.soulsGained;
        runRecorded = true;
      }
      // 死亡：清除中途存档（本局结束）
      clearRunSave();
    }
  },
  // 新一局应用局外解锁
  getUnlocked: () => saveData.unlocked,
  // 清怪 + 升级完毕 → 进入地图选路
  onMapChoice: () => {
    fsm.set(GamePhase.MAP);
    // 进入新一层：自动保存中途存档
    saveRun();
  },
});

// ---- 中途存档（本局进行中的世界状态） ----
function saveRun(): void {
  try {
    writeRunSave(JSON.stringify(game.exportRun()));
  } catch {
    /* 存档失败不影响游戏 */
  }
}

/** 尝试恢复中途存档（返回是否成功） */
function restoreRun(): boolean {
  const json = loadRunSave();
  if (!json) return false;
  let snap: any;
  try {
    snap = JSON.parse(json);
  } catch {
    clearRunSave();
    return false;
  }
  if (!snap || !snap.world) {
    clearRunSave();
    return false;
  }
  const ok = game.importRun(snap);
  if (!ok) clearRunSave();
  return ok;
}

// ---- 渲染系统（装饰器集中在 render/decorators.ts） ----
engine.addSystem(
  createRenderSystem(engine.canvasManager, {
    background: '#141821',
    grid: false,
    decorators: GAME_DECORATORS,
  }),
);

// ---- 小地图（右上角，必须在 RenderSystem 之后） ----
engine.addSystem(createMinimapSystem(engine.canvasManager));

// ---- HUD（画布内绘制，必须在 RenderSystem 之后） ----
const hudSystem = createHudSystem(engine.canvasManager);
engine.addSystem({
  name: 'HudSystem',
  run: (_world, dt) => {
    if (currentState && fsm.is(GamePhase.PLAYING)) hudSystem.run(_world, dt, currentState);
  },
});

// ---- 界面（主菜单 / 暂停 / 结束，画布内绘制） ----
const screenSystem = createScreenSystem(engine.canvasManager);
engine.addSystem({
  name: 'ScreenSystem',
  run: (_world, dt) => {
    screenSystem.run(_world, dt, {
      phase: fsm.current,
      floor: game.getFloor(),
      combo: game.getBestCombo(),
      save: saveData,
      isNewBest,
      soulsGained,
      hasRunSave: hasRunSave(),
    });
  },
});

// ---- 地图选路（画布内绘制，必须在 RenderSystem 之后） ----
const mapScreenSystem = createMapScreenSystem(engine.canvasManager);
engine.addSystem({
  name: 'MapScreenSystem',
  run: (_world, dt) => {
    if (!fsm.isMapChoosing()) return;
    const map = game.getMap();
    if (!map) return;
    mapScreenSystem.run(_world, dt, {
      map,
      currentNode: game.getMapNode(),
      visited: game.getVisited(),
    });
  },
});

// ---- 游戏逻辑系统（仅 PLAYING 时推进） ----
engine.addSystem({
  name: 'GameLogicSystem',
  run: () => {
    if (fsm.is(GamePhase.PLAYING)) game.update();
  },
});

// ---- 交互：界面按钮 + 升级卡片 鼠标点击 ----
function startRun(): void {
  runRecorded = false;
  isNewBest = false;
  soulsGained = 0;
  game.start();
  fsm.set(GamePhase.PLAYING);
  audio.unlock();
}

/** 继续上一局（有中途存档时） */
function continueRun(): void {
  runRecorded = false;
  isNewBest = false;
  soulsGained = 0;
  if (restoreRun()) {
    fsm.set(GamePhase.PLAYING);
  } else {
    startRun();
    return;
  }
  audio.unlock();
}

const canvas = engine.canvasManager.getCanvas();
if (canvas) {
  canvas.addEventListener('click', (e: MouseEvent) => {
    audio.unlock();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 地图选路：点击可达节点前进
    if (fsm.isMapChoosing()) {
      const node = mapScreenSystem.hitNode(mx, my);
      if (node) {
        game.chooseNode(node.id);
        audio.play('upgrade');
      }
      return;
    }

    // 界面按钮（UI 层统一命中检测）
    const hitBtn = screenSystem.getUi().hit(mx, my);
    if (hitBtn) {
      const id = hitBtn.id;
      if (id === 'start' || id === 'restart') startRun();
      else if (id === 'continue') continueRun();
      else if (id === 'resume') fsm.set(GamePhase.PLAYING);
      else if (id === 'menu') fsm.set(GamePhase.MENU);
      else if (id === 'shop') fsm.set(GamePhase.SHOP);
      else if (id === 'back') fsm.set(GamePhase.MENU);
      else if (id.startsWith('unlock:')) {
        // 购买解锁项
        const uid = id.slice('unlock:'.length);
        const def = getUnlockDef(uid);
        if (def) {
          const next = unlockItem(uid, def.cost);
          if (next) {
            saveData = next;
            audio.play('unlock');
          }
        }
      }
      return;
    }

    // 升级卡片 / 面板按钮（UI 层统一命中检测）
    if (fsm.is(GamePhase.PLAYING) && currentState?.upgradeChoosing) {
      const hit = hudSystem.getUi().hit(mx, my);
      if (hit) {
        if (hit.id.startsWith('card:')) {
          game.chooseUpgrade(Number(hit.id.slice(5)));
        } else if (hit.id === 'reroll') {
          game.rerollUpgrade();
        } else if (hit.id === 'skip') {
          game.skipUpgrade();
        }
      }
    }
  });
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  audio.unlock();

  // ESC：暂停 / 继续
  if (k === 'escape') {
    if (fsm.is(GamePhase.PLAYING)) fsm.set(GamePhase.PAUSED);
    else if (fsm.is(GamePhase.PAUSED)) fsm.set(GamePhase.PLAYING);
    return;
  }

  // Enter：主菜单开始（有中途存档则继续）
  if (k === 'enter' && fsm.is(GamePhase.MENU)) {
    if (hasRunSave()) continueRun();
    else startRun();
    return;
  }

  // R：重开（游戏中/结束界面）
  if (k === 'r' && (fsm.is(GamePhase.PLAYING) || fsm.is(GamePhase.GAMEOVER) || fsm.is(GamePhase.PAUSED))) {
    startRun();
    return;
  }

  // 数字键：选升级
  if (fsm.is(GamePhase.PLAYING) && currentState?.upgradeChoosing && (k === '1' || k === '2' || k === '3')) {
    game.chooseUpgrade(parseInt(k, 10) - 1);
    return;
  }

  // Q：刷新升级 / E：跳过升级
  if (fsm.is(GamePhase.PLAYING) && currentState?.upgradeChoosing) {
    if (k === 'q') {
      game.rerollUpgrade();
      return;
    }
    if (k === 'e') {
      game.skipUpgrade();
      return;
    }
  }
});
