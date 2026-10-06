/**
 * 横版动作平台 Roguelike 入口
 *
 * 用 GameEngine 启动：注册渲染系统 + 游戏逻辑系统，然后 engine.start()。
 */
import GameEngine from '../GameEngine/GameEngine';
import { Camera } from '../GameEngine/resources/Camera';
import { createRenderSystem, SpriteDecorator } from '../GameEngine/renderer/RenderSystem';
import { Sprite, Position, Velocity } from '../GameEngine/ecs/components';
import {
  Invincible, Portal, Box, Platform, PlayerTag, Facing, Afterimage, DashState,
  MeleeHitbox, BulletTag, EnemyTag, HitFlash, Collider,
  DamageNumber, HitSpark, DeathBurst,
} from './components';
import { PhysicsContacts, ContactDir } from '../GameEngine/physics';
import { createMinimapSystem } from './systems/minimap';
import { createHudSystem } from './systems/hud';
import { createScreenSystem } from './systems/screen';
import { GamePhase, GameStateMachine } from './state';
import { loadSave, recordRun, SaveData } from './save';
import { audio } from './audio';
import { Game, GameState } from './game';

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
        runRecorded = true;
      }
    }
  },
});

// ---- 渲染系统（引擎提供，含传送门/无敌的自定义绘制） ----
const portalDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world, time) => {
  if (world.storage.has(idx, Portal)) {
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, (sprite.size / 2) * pulse, 0, Math.PI * 2);
    ctx.fillStyle = sprite.color;
    ctx.fill();
    ctx.strokeStyle = '#9ecbff';
    ctx.lineWidth = 3;
    ctx.stroke();
    return true;
  }
  return false;
};

const invincibleDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world, time) => {
  if (world.storage.has(idx, Invincible)) {
    if (Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.4;
    // 不返回 true，继续走默认绘制（只是设置了 alpha）
  }
  return false;
};

/** 地形（墙 / 地面 / 平台）：按 Box 或 Platform 形状绘制为矩形 */
const terrainDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world) => {
  const box = world.storage.get(idx, Box);
  const plat = world.storage.get(idx, Platform);
  const shape = box ?? plat;
  if (!shape) return false;
  ctx.globalAlpha = 1;
  ctx.fillStyle = sprite.color;
  ctx.fillRect(screen.x - shape.halfW, screen.y - shape.halfH, shape.halfW * 2, shape.halfH * 2);
  // 平台画一条顶面高光，提示「可站立」
  if (plat) {
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(screen.x - shape.halfW, screen.y - shape.halfH, shape.halfW * 2, 3);
  }
  return true;
};

/** 残影：按寿命比例淡出（半透明，不参与默认绘制） */
const afterimageDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world) => {
  const ghost = world.storage.get(idx, Afterimage);
  if (!ghost) return false;
  const alpha = Math.max(0, ghost.life / ghost.maxLife) * 0.5;
  const half = ghost.size / 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ghost.color;
  ctx.fillRect(screen.x - half, screen.y - half, ghost.size, ghost.size);
  ctx.globalAlpha = 1;
  return true;
};

/** 近战判定盒轮廓：半透明填充 + 实线描边，按连招段变色 */
const meleeHitboxDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world) => {
  const hitbox = world.storage.get(idx, MeleeHitbox);
  if (!hitbox) return false;
  // 判定盒用 Collider 半径作为半高，宽度固定（8px 视觉宽度 → 画成矩形）
  const col = world.storage.get(idx, Collider) as { radius: number } | undefined;
  const halfH = col?.radius ?? 20;
  const halfW = 14;
  const color = sprite.color;
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;
  ctx.fillRect(screen.x - halfW, screen.y - halfH, halfW * 2, halfH * 2);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(screen.x - halfW, screen.y - halfH, halfW * 2, halfH * 2);
  ctx.globalAlpha = 1;
  return true;
};

/** 子弹：圆 + 描边 + 发光（玩家/敌人区分颜色） */
const bulletDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world) => {
  const bullet = world.storage.get(idx, BulletTag);
  if (!bullet) return false;
  const r = sprite.size / 2;
  const glow = bullet.fromEnemy ? '#c678dd' : '#ffd166';
  ctx.globalAlpha = 1;
  // 发光
  ctx.shadowColor = glow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = sprite.color;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 描边
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return true;
};

/** 敌人：矩形 + 描边轮廓 + 受击闪白 */
const enemyDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world) => {
  if (!world.storage.has(idx, EnemyTag)) return false;
  const flash = world.storage.get(idx, HitFlash);
  const half = sprite.size / 2;

  ctx.globalAlpha = 1;
  if (sprite.shape === 'circle') {
    ctx.fillStyle = flash ? '#ffffff' : sprite.color;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, half, 0, Math.PI * 2);
    ctx.fill();
    // 描边轮廓
    ctx.strokeStyle = flash ? '#ffffff' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = flash ? '#ffffff' : sprite.color;
    ctx.fillRect(screen.x - half, screen.y - half, sprite.size, sprite.size);
    ctx.strokeStyle = flash ? '#ffffff' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(screen.x - half, screen.y - half, sprite.size, sprite.size);
  }
  return true;
};

/** 玩家：按朝向绘制（面朝左时镜像）+ 滑墙倾斜/火花 + 冲刺拉伸 + 描边 + 受击闪白 */
const playerDecorator: SpriteDecorator = (ctx, screen, sprite, idx, world, time) => {
  if (!world.storage.has(idx, PlayerTag)) return false;
  const facing = world.storage.get(idx, Facing);
  const dir = facing?.dir ?? 1;
  const half = sprite.size / 2;

  // 滑墙检测：贴墙 + 下落中
  const contacts = world.getResource(PhysicsContacts);
  const vel = world.storage.get(idx, Velocity) as { x: number; y: number } | undefined;
  const onWall = contacts ? contacts.has(idx, ContactDir.Left) || contacts.has(idx, ContactDir.Right) : false;
  const sliding = onWall && !!vel && vel.y > 20;

  // 冲刺拉伸（水平拉长）
  const dash = world.storage.get(idx, DashState);
  const dashing = !!dash && dash.timer > 0;

  // 受击闪白
  const flash = world.storage.get(idx, HitFlash);

  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(screen.x, screen.y);
  // 滑墙时轻微倾斜（朝墙方向）
  if (sliding) {
    const wallRight = contacts!.has(idx, ContactDir.Left); // 被向左推 → 墙在右
    ctx.rotate((wallRight ? -1 : 1) * 0.18);
  }
  // 冲刺时水平拉伸
  const sx = dashing ? 1.5 : 1;
  const sy = dashing ? 0.7 : 1;
  ctx.scale(sx, sy);

  // 身体 + 描边轮廓
  ctx.fillStyle = flash ? '#ffffff' : sprite.color;
  ctx.fillRect(-half, -half, sprite.size, sprite.size);
  ctx.strokeStyle = flash ? '#ffffff' : '#a8f0e0';
  ctx.lineWidth = 2;
  ctx.strokeRect(-half, -half, sprite.size, sprite.size);

  // 朝向指示：面朝方向画一个小三角
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  const tipX = dir * (half + 6);
  ctx.moveTo(tipX, 0);
  ctx.lineTo(dir * half, -5);
  ctx.lineTo(dir * half, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 滑墙火花粒子
  if (sliding) {
    const wallRight = contacts!.has(idx, ContactDir.Left);
    const edgeX = screen.x + (wallRight ? half : -half);
    for (let i = 0; i < 3; i++) {
      const t = (time * 8 + i * 0.37) % 1;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(edgeX - 1.5, screen.y - half + t * sprite.size, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  return true;
};

/** 伤害飘字：向上飘 + 淡出 */
const damageNumberDecorator: SpriteDecorator = (ctx, screen, _sprite, idx, world) => {
  const d = world.storage.get(idx, DamageNumber);
  if (!d) return false;
  const alpha = Math.max(0, d.life / d.maxLife);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = d.color;
  ctx.font = 'bold 16px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 描边增强可读性
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeText(`${d.value}`, screen.x, screen.y);
  ctx.fillText(`${d.value}`, screen.x, screen.y);
  ctx.globalAlpha = 1;
  return true;
};

/** 命中冲击波：扩散圆环 + 淡出 */
const hitSparkDecorator: SpriteDecorator = (ctx, screen, _sprite, idx, world) => {
  const s = world.storage.get(idx, HitSpark);
  if (!s) return false;
  const t = 1 - s.life / s.maxLife; // 0 → 1
  const radius = s.startRadius + (s.endRadius - s.startRadius) * t;
  ctx.globalAlpha = Math.max(0, 1 - t) * 0.9;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 3 * (1 - t) + 1;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  return true;
};

/** 击杀爆裂粒子：小方块 + 淡出 */
const deathBurstDecorator: SpriteDecorator = (ctx, screen, _sprite, idx, world) => {
  const b = world.storage.get(idx, DeathBurst);
  if (!b) return false;
  const alpha = Math.max(0, b.life / b.maxLife);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = b.color;
  const half = b.size / 2;
  ctx.fillRect(screen.x - half, screen.y - half, b.size, b.size);
  ctx.globalAlpha = 1;
  return true;
};

engine.addSystem(
  createRenderSystem(engine.canvasManager, {
    background: '#141821',
    grid: false,
    decorators: [
      terrainDecorator,
      afterimageDecorator,
      deathBurstDecorator,
      enemyDecorator,
      playerDecorator,
      meleeHitboxDecorator,
      bulletDecorator,
      hitSparkDecorator,
      damageNumberDecorator,
      portalDecorator,
      invincibleDecorator,
    ],
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
  game.start();
  fsm.set(GamePhase.PLAYING);
  audio.unlock();
}

const canvas = engine.canvasManager.getCanvas();
if (canvas) {
  canvas.addEventListener('click', (e: MouseEvent) => {
    audio.unlock();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 界面按钮
    for (const b of screenSystem.getButtons()) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (b.id === 'start' || b.id === 'restart') startRun();
        else if (b.id === 'resume') fsm.set(GamePhase.PLAYING);
        else if (b.id === 'menu') fsm.set(GamePhase.MENU);
        return;
      }
    }

    // 升级卡片
    if (fsm.is(GamePhase.PLAYING) && currentState?.upgradeChoosing) {
      for (const c of hudSystem.getUpgradeCardRects()) {
        if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
          game.chooseUpgrade(c.index);
          return;
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

  // Enter：主菜单开始
  if (k === 'enter' && fsm.is(GamePhase.MENU)) {
    startRun();
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
  }
});
