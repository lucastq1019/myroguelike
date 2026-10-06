/**
 * 游戏组件（纯数据）
 *
 * 复用引擎通用组件（Position / Velocity / Sprite），补充横版动作平台需要的组件。
 * 所有组件都是**纯数据**，不含任何行为方法。
 */

export { Position, Velocity, Sprite } from '../../GameEngine/ecs/components';

// 物理内核组件（刚体 + 形状）
export { RigidBody, staticBody, dynamicBody } from '../../GameEngine/physics/RigidBody';
export { Shape, Circle, Box, Platform } from '../../GameEngine/physics/Shapes';

/** 生命值 */
export class Health {
  constructor(
    public current: number,
    public max: number,
  ) {}
}

/** 碰撞体（圆形半径）—— 用于伤害判定，与物理形状解耦 */
export class Collider {
  constructor(public radius: number) {}
}

/** 玩家标记 */
export class PlayerTag {}

/** 敌人标记 */
export class EnemyTag {}

/** 子弹标记（远程射击，保留备用） */
export class BulletTag {
  constructor(
    public damage: number,
    public life: number,
    public fromEnemy: boolean = false,
  ) {}
}

/** 接触伤害 */
export class ContactDamage {
  constructor(public damage: number) {}
}

/** 追踪目标：敌人朝玩家移动（水平方向） */
export class Chase {
  constructor(public speed: number) {}
}

/** 武器：远程攻击冷却（保留备用） */
export class Weapon {
  constructor(
    public cooldown: number,
    public bulletSpeed: number,
    public damage: number,
  ) {}
  public timer: number = 0;
}

/** 墙壁标记（实心地形） */
export class Wall {}

/** 传送门 */
export class Portal {}

/** 敌人种类 */
export type EnemyKind = 'chaser' | 'charger' | 'shooter' | 'flyer' | 'splitter';

/** 敌人类型标记 */
export class EnemyType {
  constructor(public kind: EnemyKind) {}
}

/** 远程敌人：射击冷却 */
export class Shooter {
  constructor(
    public cooldown: number,
    public range: number,
    public bulletSpeed: number,
    public damage: number,
  ) {}
  public timer: number = 0;
}

/** 冲锋敌人：蓄力/冲锋状态机 */
export class Charger {
  constructor(
    public windup: number,
    public dashSpeed: number,
    public dashTime: number,
  ) {}
  public state: 'idle' | 'windup' | 'dash' | 'recover' = 'idle';
  public timer: number = 0;
}

/** 无敌帧 */
export class Invincible {
  public timer: number;
  constructor(public duration: number) {
    this.timer = duration;
  }
}

/** 受击闪白：命中时短暂变白（视觉反馈） */
export class HitFlash {
  public timer: number;
  constructor(public duration: number = 0.1) {
    this.timer = duration;
  }
}

/** 击退 */
export class Knockback {
  constructor(public force: number) {}
  public vx: number = 0;
  public vy: number = 0;
  public timer: number = 0;
}

/** 攻击前摇/后摇（保留备用） */
export class AttackTiming {
  constructor(
    public windup: number,
    public active: number,
    public recover: number,
  ) {}
  public phase: 'idle' | 'windup' | 'active' | 'recover' = 'idle';
  public timer: number = 0;
}

// ============ 横版动作平台新增组件 ============

/** 朝向：1 = 面朝右，-1 = 面朝左 */
export class Facing {
  constructor(public dir: 1 | -1 = 1) {}
}

/** 移动能力（玩家 / 敌人通用）：水平速度、跳跃初速、重力缩放由 RigidBody 控制 */
export class Locomotion {
  constructor(
    public moveSpeed: number,
    public jumpSpeed: number,
    /** 可变高度跳跃：松开跳跃键时，若仍在上升，则把上升速度乘以该系数（0~1） */
    public jumpCutMultiplier: number = 0.45,
    /** 最大下落速度（终端速度），防止穿透 */
    public maxFallSpeed: number = 900,
    /** 最大跳跃次数（1 = 单段跳，2 = 二段跳） */
    public maxJumps: number = 2,
    /** 冲刺速度（像素/秒） */
    public dashSpeed: number = 620,
    /** 冲刺持续时间（秒） */
    public dashDuration: number = 0.16,
    /** 冲刺冷却（秒） */
    public dashCooldown: number = 0.5,
    /** 蹬墙跳：水平蹬出速度 */
    public wallJumpX: number = 380,
    /** 蹬墙跳：垂直向上速度 */
    public wallJumpY: number = 620,
    /** 蹬墙滑落时的最大下落速度（贴墙减速） */
    public wallSlideSpeed: number = 90,
  ) {}
}

/**
 * 跳跃状态（玩家）：
 *   - 可变高度跳跃（rising）
 *   - 二段跳（jumpsLeft）
 *   - 蹬墙跳（wallJumpLock：蹬墙后短暂锁定水平输入，避免立刻贴回墙）
 *   - 蹬墙奖励（wallJumpRewardUsed：每次滞空仅一次，蹬墙时额外 +1 跳跃）
 */
export class JumpState {
  constructor() {}
  /** 是否正在上升（可变高度跳跃用） */
  public rising: boolean = false;
  /** 剩余跳跃次数（**只有着地时重置**为 maxJumps；蹬墙跳/冲刺只消耗不补充） */
  public jumpsLeft: number = 2;
  /** 蹬墙跳后的水平输入锁定时长（秒） */
  public wallJumpLock: number = 0;
  /** 锁定期间的水平方向（蹬墙跳方向） */
  public wallJumpDir: 1 | -1 = 1;
  /** 本次滞空是否已用过「蹬墙奖励」（落地重置；每次滞空仅一次） */
  public wallJumpRewardUsed: boolean = false;
}

/** 冲刺状态（玩家） */
export class DashState {
  constructor() {}
  /** 冲刺剩余时间（>0 表示正在冲刺） */
  public timer: number = 0;
  /** 冷却剩余时间 */
  public cooldown: number = 0;
  /** 冲刺方向（1 右 / -1 左） */
  public dir: 1 | -1 = 1;
}

/** 忽略单面平台（下穿用）：计时 > 0 期间，该实体不与 Platform 碰撞 */
export { IgnorePlatforms } from '../../GameEngine/physics/IgnorePlatforms';

/** 近战攻击：前摇 → 判定 → 后摇 */
export class MeleeAttack {
  constructor(
    /** 攻击冷却（两次挥砍间隔） */
    public cooldown: number,
    /** 判定生效时长 */
    public activeTime: number,
    /** 攻击范围（前方矩形半宽） */
    public rangeX: number,
    /** 攻击范围（半高） */
    public rangeY: number,
    /** 伤害 */
    public damage: number,
    /** 击退力度 */
    public knockback: number,
  ) {}
  public timer: number = 0;
  public state: 'idle' | 'active' = 'idle';
  public activeTimer: number = 0;
}

/**
 * 连招状态（玩家）：
 *   - comboIndex：当前连招段（0 表示未开始，1/2/3 表示第几段）
 *   - comboTimer：连招窗口剩余时间（超时重置回第 1 段）
 *   - 在窗口内再次按攻击键 → 进入下一段（最多 maxCombo 段）
 */
export class ComboState {
  constructor(public maxCombo: number = 3) {}
  /** 当前连招段（0 = 未开始） */
  public comboIndex: number = 0;
  /** 连招窗口剩余时间（秒） */
  public comboTimer: number = 0;
  /** 本段是否已经挥出（防止一次按键触发多段） */
  public swung: boolean = false;
}

/** 命中连击计数（玩家）：命中敌人时 +1，超时重置 */
export class ComboCounter {
  constructor() {}
  /** 当前连击数 */
  public count: number = 0;
  /** 连击超时剩余时间（秒），归零则重置 */
  public timer: number = 0;
  /** 连击超时窗口（秒） */
  public window: number = 1.5;
}

/** 冲刺残影（视觉）：寿命到期淡出销毁 */
export class Afterimage {
  constructor(
    public life: number,
    public maxLife: number,
    public size: number,
    public color: string,
  ) {}
}

// ============ 打击手感（Juice）特效 ============

/** 伤害飘字：命中时显示伤害数值，向上飘 + 淡出 */
export class DamageNumber {
  constructor(
    public value: number,
    public life: number,
    public maxLife: number,
    public color: string,
    /** 向上飘的初速度（像素/秒） */
    public vy: number = -60,
    /** 水平随机漂移 */
    public vx: number = 0,
  ) {}
}

/** 命中冲击波：命中点扩散的圆环 */
export class HitSpark {
  constructor(
    public life: number,
    public maxLife: number,
    public startRadius: number,
    public endRadius: number,
    public color: string,
  ) {}
}

/** 击杀爆裂粒子：一个粒子（向外飞散） */
export class DeathBurst {
  constructor(
    public life: number,
    public maxLife: number,
    public vx: number,
    public vy: number,
    public size: number,
    public color: string,
  ) {}
}

/** 近战判定盒标记（攻击生效期间生成的临时实体） */
export class MeleeHitbox {
  constructor(
    public damage: number,
    public knockback: number,
    public fromPlayer: boolean,
  ) {}
}

/** 近战判定盒寿命（到期销毁） */
export class MeleeLifetime {
  constructor(public life: number) {}
}

/** 巡逻 AI（地面敌人）：在左右边界之间来回走 */
export class Patrol {
  constructor(
    public speed: number,
    public leftBound: number,
    public rightBound: number,
  ) {}
  public dir: 1 | -1 = 1;
}

/** 地面敌人跳跃 AI：接近玩家时跳跃追击 */
export class Jumper {
  constructor(
    public jumpSpeed: number,
    public interval: number,
  ) {}
  public timer: number = 0;
}

// ============ 阶段1 新增敌人组件 ============

/**
 * 飞行敌人：无视重力，水平朝玩家靠近 + 垂直正弦漂浮。
 * 物理刚体设为无重力（gravityScale = 0），本组件只控制漂浮与追踪。
 */
export class Flying {
  constructor(
    /** 水平追踪速度（像素/秒） */
    public speed: number,
    /** 正弦漂浮振幅（像素） */
    public amplitude: number,
    /** 正弦漂浮角频率（弧度/秒） */
    public frequency: number,
    /** 与玩家保持的理想水平距离（小于则后退） */
    public idealDist: number = 180,
  ) {}
  /** 漂浮相位（随时间累加） */
  public phase: number = Math.random() * Math.PI * 2;
  /** 基准 y（生成时的 y，漂浮围绕它上下摆动） */
  public baseY: number = 0;
}

/**
 * 分裂敌人：死亡时分裂出 N 个小怪（由 LifecycleSystem 在销毁前触发）。
 * generation 用于防止无限分裂（>=1 的小怪不再携带 Splitter）。
 */
export class Splitter {
  constructor(
    /** 分裂出的小怪数量 */
    public count: number,
    /** 小怪生命值 */
    public childHp: number,
    /** 小怪半径 */
    public childRadius: number,
    /** 小怪接触伤害 */
    public childDamage: number,
    /** 分裂代数（0 = 母体；子代不再分裂） */
    public generation: number = 0,
  ) {}
}

// ============ 阶段3 成长词条组件 ============

/** 吸血：每次命中敌人回复的生命值（0 = 无吸血） */
export class Lifesteal {
  constructor(public perHit: number = 0) {}
}

/** 暴击：造成伤害时的暴击概率（0~1），暴击造成双倍伤害 */
export class CritChance {
  constructor(public chance: number = 0) {}
}
