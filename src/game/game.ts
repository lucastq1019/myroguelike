/**
 * 游戏装配（横版动作平台 Roguelike）
 *
 * 用 GameEngine 的 World + Resource + RenderSystem：
 * - 横向卷轴关卡：地面 + 悬浮平台，清空敌人 → 传送门 → 下一层
 * - 重力 + 可变高度跳跃 + 左右移动
 * - 近战为主（远程射击代码保留备用）
 * - 相机跟随、升级 3 选 1、无敌帧、击退
 */
import GameEngine from '../GameEngine/GameEngine';
import { World, Entity } from '../GameEngine/ecs';
import { Camera } from '../GameEngine/resources/Camera';
import { Input } from '../GameEngine/resources/Input';
import { Position, Velocity, Sprite } from '../GameEngine/ecs/components';
import {
  Health, Collider, PlayerTag, EnemyTag, Portal, Invincible, Knockback,
  RigidBody, dynamicBody, Circle, Facing, Locomotion, JumpState, MeleeAttack, DashState,
  ComboState, ComboCounter, Weapon, Lifesteal, CritChance, Buff,
} from './components';
import { rollUpgrades, Upgrade } from './resources/Upgrades';
import { getBuffDef } from './resources/Pickups';
import { applyUnlocks } from './resources/Unlocks';
import { createPlayerControlSystem } from './systems/playerControl';
import { createLocomotionSystem } from './systems/locomotion';
import { createMeleeSystem } from './systems/melee';
import { createRangedSystem } from './systems/ranged';
import { createAfterimageSystem } from './systems/afterimage';
import { FxSystem, resetFxPool } from './systems/fx';
import { EnemyAISystem } from './systems/enemyAI';
import { CollisionSystem } from './systems/collision';
import { KnockbackSystem } from './systems/knockback';
import { InvincibilitySystem } from './systems/invincibility';
import { LifecycleSystem } from './systems/lifecycle';
import { PickupSystem, clearBuffs } from './systems/pickup';
import { generateLevel, spawnPortal } from './systems/level';
import { createPhysicsSystem } from '../GameEngine/physics';
import { audio } from './audio';

/** 重力加速度（像素/秒²），横版平台向下为正 */
const GRAVITY_Y = 2000;

// ============ 升级面板：刷新 / 跳过（数值可调） ============
/** 每层免费刷新次数（第 1 次免费） */
const REROLL_FREE_PER_FLOOR = 1;
/** 付费刷新基准价（第 n 次付费刷新 = REROLL_BASE_COST * n，递增） */
const REROLL_BASE_COST = 10;
/** 跳过升级的回血量（占最大生命比例） */
const SKIP_HEAL_RATIO = 0.25;

/** 第 n 次付费刷新的消耗（n 从 1 起，递增） */
export function rerollCost(paidCount: number): number {
  return REROLL_BASE_COST * paidCount;
}

export interface GameState {
  hp: number;
  maxHp: number;
  floor: number;
  enemiesLeft: number;
  gameOver: boolean;
  upgradeChoosing: boolean;
  upgradeOptions: Upgrade[];
  /** 当前连击数（命中累计） */
  combo: number;
  /** 当前连招段（1/2/3，0=未开始） */
  comboStage: number;
  /** 本局已拾取的金币 */
  coins: number;
  /** 当前生效的增益（id → 剩余秒数），供 HUD 显示 */
  buffs: { id: string; name: string; color: string; timer: number }[];
  /** 本层剩余免费刷新次数 */
  freeRerolls: number;
  /** 下次刷新需要的金币（0 = 免费） */
  rerollCost: number;
  /** 当前金币是否足够刷新 */
  canReroll: boolean;
  /** 跳过升级的回血量 */
  skipHeal: number;
}

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  /** 已解锁项 id 列表（新一局开始时应用） */
  getUnlocked?: () => string[];
}

export class Game {
  private engine: GameEngine;
  private world: World;
  private camera: Camera;
  private input: Input;
  private callbacks: GameCallbacks;

  private playerEntity: Entity | null = null;
  private floor = 0;
  private gameOver = false;

  private roomW = 0;
  private roomH = 0;
  private portalSpawned = false;
  private portalEntity: Entity | null = null;

  private upgradeChoosing = false;
  private upgradeOptions: Upgrade[] = [];
  /** 本层免费刷新剩余次数 */
  private freeRerolls = REROLL_FREE_PER_FLOOR;
  /** 本层已付费刷新次数（用于递增计价） */
  private paidRerolls = 0;
  /** 本局最高连击（用于结算） */
  private bestCombo = 0;

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.engine = GameEngine.getInstance();
    this.world = this.engine.getWorld();
    this.camera = this.engine.getCamera();
    this.input = this.engine.getInput();

    this.registerSystems();
    this.start();
    this.engine.start();
  }

  private registerSystems(): void {
    this.world
      // 1) 玩家控制（水平移动 + 朝向）
      .addSystem(createPlayerControlSystem(this.input))
      // 2) 移动/跳跃（重力约束下的跳跃 + 可变高度 + 终端速度）
      .addSystem(createLocomotionSystem(this.input))
      // 3) 敌人 AI（水平巡逻/追击/射击）
      .addSystem(EnemyAISystem)
      // 4) 近战攻击（生成判定盒，3 段连招）
      .addSystem(createMeleeSystem(this.input))
      // 4.2) 远程武器（按 U 发射子弹，冷却由 Weapon 控制）
      .addSystem(createRangedSystem(this.input))
      // 4.5) 冲刺残影（视觉）
      .addSystem(createAfterimageSystem())
      // 4.6) 打击特效（伤害飘字 / 冲击波 / 爆裂粒子）
      .addSystem(FxSystem)
      // 5) 物理系统：积分 + 碰撞检测 + 冲量解算（含重力、单面平台）
      .addSystem(createPhysicsSystem({ gravityY: GRAVITY_Y }))
      // 6) 击退
      .addSystem(KnockbackSystem)
      // 7) 伤害判定（子弹/近战 × 敌人，敌人 × 玩家）
      .addSystem(CollisionSystem)
      // 7.5) 掉落物（拾取 + 增益计时 + 回收）
      .addSystem(PickupSystem)
      // 8) 无敌帧
      .addSystem(InvincibilitySystem)
      // 9) 生命周期（销毁死亡/过期实体）
      .addSystem(LifecycleSystem);
  }

  /** 开始新一局 */
  start(): void {
    // 清空世界实体（保留资源）
    this.world = this.engine.getWorld();
    this.world.entities.getAllEntities().forEach((e) => this.world.despawn(e));
    // 重置特效对象池（池中索引已失效）
    resetFxPool();
    this.playerEntity = null;
    this.portalEntity = null;

    this.floor = 0;
    this.gameOver = false;
    this.upgradeChoosing = false;
    this.upgradeOptions = [];
    this.bestCombo = 0;
    (globalThis as any).__playerSpeedMul = 1;
    (globalThis as any).__playerMultishot = 1;
    (globalThis as any).__buffDamageMul = 1;
    (globalThis as any).__coins = 0;
    clearBuffs(this.world);

    // 玩家
    const p = this.world.spawn();
    this.world.addComponent(p, Position, new Position(0, 0));
    this.world.addComponent(p, Velocity, new Velocity(0, 0));
    this.world.addComponent(p, Health, new Health(100, 100));
    this.world.addComponent(p, Sprite, new Sprite(28, '#4ec9b0'));
    this.world.addComponent(p, Collider, new Collider(14));
    this.world.addComponent(p, PlayerTag, new PlayerTag());
    this.world.addComponent(p, Knockback, new Knockback(0));
    // 横版平台：朝向 + 移动能力 + 跳跃状态 + 冲刺 + 近战
    this.world.addComponent(p, Facing, new Facing(1));
    this.world.addComponent(p, Locomotion, new Locomotion(240, 720, 0.45, 900, 2, 620, 0.16, 0.5, 380, 620, 90));
    this.world.addComponent(p, JumpState, new JumpState());
    this.world.addComponent(p, DashState, new DashState());
    this.world.addComponent(p, MeleeAttack, new MeleeAttack(0.32, 0.12, 26, 20, 30, 220));
    this.world.addComponent(p, ComboState, new ComboState(3));
    this.world.addComponent(p, ComboCounter, new ComboCounter());
    // 远程副武器：冷却 0.45s，子弹速度 560，伤害 14
    this.world.addComponent(p, Weapon, new Weapon(0.45, 560, 14));
    // 成长词条载体：吸血 / 暴击（初始无加成，由升级词条提升）
    this.world.addComponent(p, Lifesteal, new Lifesteal(0));
    this.world.addComponent(p, CritChance, new CritChance(0));
    // 物理：动态圆形刚体（受重力）
    this.world.addComponent(p, RigidBody, dynamicBody(1, 0.0, 0.0, 1));
    this.world.addComponent(p, Circle, new Circle(14));
    this.playerEntity = p;

    // 应用局外永久解锁（初始词条/角色属性）
    const unlocked = this.callbacks.getUnlocked?.() ?? [];
    if (unlocked.length > 0) applyUnlocks(this.world, p, unlocked);

    this.nextFloor();
    this.emitState();
  }

  private nextFloor(): void {
    this.floor++;

    // 清理上一层遗留的关卡实体（地面 / 平台 / 敌人 / 传送门等），保留玩家
    this.clearFloorEntities();

    this.portalSpawned = false;
    this.portalEntity = null;

    const layout = generateLevel(this.world, this.floor, this.camera.viewportW, this.camera.viewportH);
    this.roomW = layout.width;
    this.roomH = layout.height;

    this.camera.worldW = this.roomW;
    this.camera.worldH = this.roomH;

    if (this.playerEntity) {
      const pos = this.world.getComponent(this.playerEntity, Position);
      const vel = this.world.getComponent(this.playerEntity, Velocity);
      if (pos) {
        // 出生在关卡左侧、地面上方
        pos.x = 80;
        pos.y = layout.groundY - 40;
      }
      if (vel) {
        vel.x = 0;
        vel.y = 0;
      }
      this.world.addComponent(this.playerEntity, Invincible, new Invincible(1.0));
    }
  }

  /**
   * 清理当前关卡的实体（墙壁 / 敌人 / 传送门 / 子弹等），保留玩家实体。
   * 用于进入下一层时回收上一层遗留的实体，避免实体无限堆积。
   */
  private clearFloorEntities(): void {
    const all = this.world.entities.getAllEntities();
    for (const e of all) {
      if (this.playerEntity && e.index === this.playerEntity.index) continue;
      this.world.despawn(e);
    }
  }

  /** 每帧推进（由 GameEngine 的游戏循环调用，这里只做游戏逻辑） */
  update(): void {
    if (this.upgradeChoosing) {
      this.emitState();
      return;
    }
    if (this.gameOver) return;

    // 相机跟随玩家
    if (this.playerEntity) {
      const pPos = this.world.getComponent(this.playerEntity, Position);
      if (pPos) this.camera.follow(pPos.x, pPos.y);
    }
    // 相机震动更新
    this.camera.updateShake(1 / 60);

    // 玩家死亡
    if (this.playerEntity && !this.world.isAlive(this.playerEntity)) {
      this.gameOver = true;
      audio.play('death');
      this.emitState();
      return;
    }

    // 敌人清空 → 在关卡末端生成传送门
    const enemyMask = this.world.maskOf(EnemyTag);
    const enemies = this.world.findEntities(this.world.query().with(enemyMask).build());

    if (enemies.length === 0 && !this.portalSpawned) {
      this.portalSpawned = true;
      this.portalEntity = spawnPortal(this.world, this.roomW - 100, this.roomH - 100);
    }

    // 玩家碰到传送门 → 升级 → 下一层
    if (this.portalEntity && this.playerEntity) {
      const pPos = this.world.getComponent(this.playerEntity, Position);
      const portalPos = this.world.getComponent(this.portalEntity, Position);
      if (pPos && portalPos) {
        const dist = Math.hypot(pPos.x - portalPos.x, pPos.y - portalPos.y);
        if (dist < 40) {
          this.enterUpgrade();
          return;
        }
      }
    }

    // 连击超时递减
    if (this.playerEntity) {
      const combo = this.world.getComponent(this.playerEntity, ComboCounter);
      if (combo) {
        if (combo.count > this.bestCombo) this.bestCombo = combo.count;
        if (combo.timer > 0) {
          combo.timer -= 1 / 60;
          if (combo.timer <= 0) {
            combo.timer = 0;
            combo.count = 0;
          }
        }
      }
    }

    this.input.endFrame();
    this.emitState(enemies.length);
  }

  private enterUpgrade(): void {
    this.upgradeChoosing = true;
    this.upgradeOptions = rollUpgrades(3);
    // 每层重置刷新次数
    this.freeRerolls = REROLL_FREE_PER_FLOOR;
    this.paidRerolls = 0;
    this.emitState();
  }

  /** 当前刷新消耗（0 = 免费） */
  private currentRerollCost(): number {
    if (this.freeRerolls > 0) return 0;
    return rerollCost(this.paidRerolls + 1);
  }

  /** 刷新升级选项：首次免费，之后按递增价消耗金币 */
  rerollUpgrade(): boolean {
    if (!this.upgradeChoosing) return false;
    const cost = this.currentRerollCost();
    const coins = (globalThis as any).__coins ?? 0;
    if (cost > 0 && coins < cost) {
      this.emitState(); // 刷新状态（canReroll 等）
      return false; // 金币不足
    }

    if (cost > 0) {
      (globalThis as any).__coins = coins - cost;
      this.paidRerolls += 1;
    } else {
      this.freeRerolls -= 1;
    }
    this.upgradeOptions = rollUpgrades(3);
    audio.play('reroll');
    this.emitState();
    return true;
  }

  /** 跳过升级：放弃词条，回复一定比例最大生命 */
  skipUpgrade(): boolean {
    if (!this.upgradeChoosing) return false;
    if (this.playerEntity) {
      const hp = this.world.getComponent(this.playerEntity, Health);
      if (hp) {
        const heal = Math.round(hp.max * SKIP_HEAL_RATIO);
        hp.current = Math.min(hp.max, hp.current + heal);
      }
    }
    audio.play('pickup');
    this.upgradeChoosing = false;
    this.upgradeOptions = [];
    this.nextFloor();
    this.emitState();
    return true;
  }

  chooseUpgrade(index: number): void {
    if (!this.upgradeChoosing) return;
    const up = this.upgradeOptions[index];
    if (up && this.playerEntity) {
      up.apply(this.world, this.playerEntity);
      audio.play('upgrade');
    }
    this.upgradeChoosing = false;
    this.upgradeOptions = [];
    this.nextFloor();
    this.emitState();
  }

  /** 本局最高连击（结算用） */
  getBestCombo(): number {
    return this.bestCombo;
  }

  /** 当前层数（结算用） */
  getFloor(): number {
    return this.floor;
  }

  private emitState(enemiesLeft = 0): void {
    const hp = this.playerEntity ? (this.world.getComponent(this.playerEntity, Health)?.current ?? 0) : 0;
    const maxHp = this.playerEntity ? (this.world.getComponent(this.playerEntity, Health)?.max ?? 100) : 100;
    const combo = this.playerEntity ? this.world.getComponent(this.playerEntity, ComboCounter) : undefined;
    const comboState = this.playerEntity ? this.world.getComponent(this.playerEntity, ComboState) : undefined;

    // 当前增益（id → 名称/颜色/剩余时间）
    const buffs: { id: string; name: string; color: string; timer: number }[] = [];
    if (this.playerEntity) {
      const buff = this.world.getComponent(this.playerEntity, Buff);
      if (buff) {
        const def = getBuffDef(buff.id);
        buffs.push({
          id: buff.id,
          name: def?.name ?? buff.id,
          color: def?.color ?? '#c678dd',
          timer: Math.max(0, buff.timer),
        });
      }
    }

    const coins = (globalThis as any).__coins ?? 0;
    const cost = this.upgradeChoosing ? this.currentRerollCost() : 0;

    this.callbacks.onStateChange({
      hp: Math.max(0, Math.round(hp)),
      maxHp,
      floor: this.floor,
      enemiesLeft,
      gameOver: this.gameOver,
      upgradeChoosing: this.upgradeChoosing,
      upgradeOptions: this.upgradeOptions,
      combo: combo?.count ?? 0,
      comboStage: comboState?.comboIndex ?? 0,
      coins,
      buffs,
      freeRerolls: this.freeRerolls,
      rerollCost: cost,
      canReroll: cost === 0 || coins >= cost,
      skipHeal: Math.round(maxHp * SKIP_HEAL_RATIO),
    });
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  isUpgradeChoosing(): boolean {
    return this.upgradeChoosing;
  }
}
