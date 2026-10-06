/**
 * 关卡生成系统（横版卷轴）
 *
 * 生成一个「比视口宽」的横向关卡：
 *   - 地面（实心，贯穿底部）
 *   - 左右边界墙（实心）
 *   - 悬浮平台（单面：可跳上、可从下穿过）
 *   - 敌人（地面巡逻 / 远程）
 *
 * 相机水平跟随玩家，实现横向卷轴。
 */
import { World, Entity } from '../../GameEngine/ecs';
import {
  Position, Velocity, Health, Sprite, Collider, Wall, Portal,
  EnemyTag, EnemyType, ContactDamage, Chase, Shooter, Charger, EnemyKind,
  RigidBody, staticBody, dynamicBody, Circle, Box, Platform,
  Patrol, Flying, Splitter,
} from '../components';

export interface LevelLayout {
  width: number;
  height: number;
  /** 地面顶面 y 坐标（玩家出生/站立基准） */
  groundY: number;
}

/** 生成横版关卡（返回布局） */
export interface LevelOptions {
  /** 敌人数量倍率（0 = 无敌人；休息层用） */
  enemyScale?: number;
  /** 是否精英层（敌人更强） */
  elite?: boolean;
}

export function generateLevel(
  world: World,
  floor: number,
  viewportW: number,
  viewportH: number,
  opts: LevelOptions = {},
): LevelLayout {
  const enemyScale = opts.enemyScale ?? 1;
  const elite = opts.elite ?? false;
  // 关卡比视口宽 2~3 倍，实现横向卷轴
  const width = Math.round(viewportW * (2 + Math.random() * 1));
  const height = viewportH;
  const groundThickness = 40;
  const groundY = height - groundThickness; // 地面顶面

  // --- 地面（实心 Box，贯穿底部） ---
  const ground = world.spawn();
  world.addComponent(ground, Position, new Position(width / 2, groundY + groundThickness / 2));
  world.addComponent(ground, Sprite, new Sprite(groundThickness, '#2f2f2f'));
  world.addComponent(ground, Collider, new Collider(groundThickness / 2));
  world.addComponent(ground, Wall, new Wall());
  world.addComponent(ground, RigidBody, staticBody());
  world.addComponent(ground, Box, new Box(width / 2, groundThickness / 2));

  // --- 左右边界墙（实心） ---
  const wallThickness = 24;
  for (const wx of [wallThickness / 2, width - wallThickness / 2]) {
    const w = world.spawn();
    world.addComponent(w, Position, new Position(wx, height / 2));
    world.addComponent(w, Sprite, new Sprite(wallThickness, '#2f2f2f'));
    world.addComponent(w, Collider, new Collider(wallThickness / 2));
    world.addComponent(w, Wall, new Wall());
    world.addComponent(w, RigidBody, staticBody());
    world.addComponent(w, Box, new Box(wallThickness / 2, height / 2));
  }

  // --- 悬浮平台（单面） ---
  const platformCount = 3 + floor;
  for (let i = 0; i < platformCount; i++) {
    const pw = 100 + Math.random() * 120; // 平台宽度
    const ph = 16;
    const px = 120 + Math.random() * (width - 240);
    const py = groundY - (90 + Math.random() * 200); // 悬空高度
    const p = world.spawn();
    world.addComponent(p, Position, new Position(px, py));
    world.addComponent(p, Sprite, new Sprite(ph, '#4a4a4a'));
    world.addComponent(p, Collider, new Collider(ph / 2));
    world.addComponent(p, Wall, new Wall()); // 标记为地形（不参与伤害）
    world.addComponent(p, RigidBody, staticBody());
    world.addComponent(p, Platform, new Platform(pw / 2, ph / 2));
  }

  // --- 敌人 ---
  const enemyCount = Math.round((3 + floor) * enemyScale);
  for (let i = 0; i < enemyCount; i++) {
    const ex = 200 + Math.random() * (width - 400);
    // 站在地面或随机平台上
    const ey = groundY - 30;
    spawnEnemy(world, floor, ex, ey, groundY, elite);
  }

  return { width, height, groundY };
}

/** 生成一个敌人（种类随层数解锁） */
export function spawnEnemy(
  world: World,
  floor: number,
  x: number,
  y: number,
  groundY: number,
  elite = false,
): Entity {
  const roll = Math.random();
  let kind: EnemyKind = 'chaser';
  if (floor >= 2 && roll < 0.35) kind = 'charger';
  if (floor >= 3 && roll > 0.75) kind = 'shooter';
  // 阶段1：飞行敌人（floor>=2 解锁）、分裂敌人（floor>=3 解锁）
  if (floor >= 2 && roll >= 0.35 && roll < 0.5) kind = 'flyer';
  if (floor >= 3 && roll >= 0.5 && roll < 0.62) kind = 'splitter';

  // 飞行敌人生成在空中，其余贴地
  const spawnY = kind === 'flyer' ? groundY - 140 - Math.random() * 120 : y;

  const e = world.spawn();
  world.addComponent(e, Position, new Position(x, spawnY));
  world.addComponent(e, Velocity, new Velocity(0, 0));
  world.addComponent(e, EnemyTag, new EnemyTag());
  world.addComponent(e, EnemyType, new EnemyType(kind));

  if (kind === 'chaser') {
    world.addComponent(e, Health, new Health(50, 50));
    world.addComponent(e, Sprite, new Sprite(24, '#e06c75', 'circle'));
    world.addComponent(e, Collider, new Collider(12));
    world.addComponent(e, ContactDamage, new ContactDamage(0.6));
    world.addComponent(e, Chase, new Chase(70 + floor * 5));
    world.addComponent(e, RigidBody, dynamicBody(1, 0.0, 0.6, 1));
    world.addComponent(e, Circle, new Circle(12));
    // 地面巡逻（无玩家接近时来回走）
    world.addComponent(e, Patrol, new Patrol(50, x - 120, x + 120));
  } else if (kind === 'charger') {
    world.addComponent(e, Health, new Health(80, 80));
    world.addComponent(e, Sprite, new Sprite(30, '#d19a66', 'rect'));
    world.addComponent(e, Collider, new Collider(15));
    world.addComponent(e, ContactDamage, new ContactDamage(1.2));
    world.addComponent(e, Charger, new Charger(0.7, 420, 0.35));
    world.addComponent(e, RigidBody, dynamicBody(2, 0.0, 0.6, 1));
    world.addComponent(e, Circle, new Circle(15));
  } else if (kind === 'flyer') {
    world.addComponent(e, Health, new Health(45, 45));
    world.addComponent(e, Sprite, new Sprite(22, '#56b6c2', 'circle'));
    world.addComponent(e, Collider, new Collider(11));
    world.addComponent(e, ContactDamage, new ContactDamage(0.8));
    world.addComponent(e, Flying, new Flying(90 + floor * 6, 40 + Math.random() * 30, 1.6 + Math.random() * 0.6));
    // 无重力刚体：不受重力影响，仅被击退时移动
    world.addComponent(e, RigidBody, dynamicBody(1, 0.0, 0.0, 0));
    world.addComponent(e, Circle, new Circle(11));
  } else if (kind === 'splitter') {
    world.addComponent(e, Health, new Health(60, 60));
    world.addComponent(e, Sprite, new Sprite(34, '#98c379', 'rect'));
    world.addComponent(e, Collider, new Collider(17));
    world.addComponent(e, ContactDamage, new ContactDamage(0.5));
    world.addComponent(e, Splitter, new Splitter(3, 18, 9, 0.4, 0));
    world.addComponent(e, Chase, new Chase(55 + floor * 4));
    world.addComponent(e, RigidBody, dynamicBody(1, 0.0, 0.6, 1));
    world.addComponent(e, Circle, new Circle(17));
    world.addComponent(e, Patrol, new Patrol(40, x - 100, x + 100));
  } else {
    world.addComponent(e, Health, new Health(35, 35));
    world.addComponent(e, Sprite, new Sprite(22, '#c678dd', 'circle'));
    world.addComponent(e, Collider, new Collider(11));
    world.addComponent(e, ContactDamage, new ContactDamage(0.3));
    world.addComponent(e, Shooter, new Shooter(1.6, 380, 300, 8));
    world.addComponent(e, RigidBody, dynamicBody(1, 0.0, 0.6, 1));
    world.addComponent(e, Circle, new Circle(11));
  }

  // 精英层：血量 / 伤害 / 体型放大，颜色改为金色
  if (elite) {
    const hp = world.getComponent(e, Health);
    if (hp) {
      hp.max = Math.round(hp.max * 2);
      hp.current = hp.max;
    }
    const dmg = world.getComponent(e, ContactDamage);
    if (dmg) dmg.damage *= 1.5;
    const sprite = world.getComponent(e, Sprite);
    if (sprite) {
      sprite.size = Math.round(sprite.size * 1.35);
      sprite.color = '#e5c07b';
    }
    const col = world.getComponent(e, Collider);
    if (col) col.radius = Math.round(col.radius * 1.35);
  }

  return e;
}

/** 在关卡末端生成传送门（清怪后出现） */
export function spawnPortal(world: World, cx: number, cy: number): Entity {
  const e = world.spawn();
  world.addComponent(e, Position, new Position(cx, cy));
  world.addComponent(e, Sprite, new Sprite(44, '#61afef', 'circle'));
  world.addComponent(e, Collider, new Collider(22));
  world.addComponent(e, Portal, new Portal());
  return e;
}
