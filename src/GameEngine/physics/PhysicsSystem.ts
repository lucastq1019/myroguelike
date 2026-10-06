/**
 * PhysicsSystem —— 轻量物理系统
 *
 * 每帧流程：
 *   1. 积分（integrate）：Position += Velocity * dt，并施加重力
 *   2. 宽相（broadphase）：空间网格粗筛可能碰撞的刚体对
 *   3. 窄相（narrowphase）：精确检测（collision.detect / detectPlatform）
 *   4. 解算（resolve）：位置分离 + 冲量（反弹 + 摩擦）
 *   5. 记录接触（contacts）：写入 PhysicsContacts 资源，供「着地检测」等使用
 *
 * 设计原则：
 *   - 纯 ECS 系统（无状态对象 `{ name, run(world, dt) }`）。
 *   - 只依赖组件：Position / Velocity / RigidBody / Shape。
 *   - 可通过 options 逐步增强（重力、迭代次数、是否启用摩擦等）。
 *
 * 平台游戏支持：
 *   - gravityY > 0 表示重力向下。
 *   - Platform 形状为单面平台：从上方落下可站立，从下方可穿过。
 *   - 接触法线写入 PhysicsContacts 资源（isGrounded 用于跳跃）。
 *
 * 后续可完善：旋转、连续碰撞检测（CCD）、约束关节、休眠等。
 */
import { World } from '../ecs';
import { Position, Velocity } from '../ecs/components';
import { RigidBody } from './RigidBody';
import { Shape, Circle, Box, Platform, boundingRadius } from './Shapes';
import { detect, detectPlatform, Manifold } from './collision';
import { PhysicsContacts } from './PhysicsContacts';
import { IgnorePlatforms } from './IgnorePlatforms';

export interface PhysicsOptions {
  /** 全局重力（像素/秒²），横版平台游戏取正值（向下） */
  gravityX?: number;
  gravityY?: number;
  /** 位置修正的松弛系数（0~1），避免抖动 */
  correctionPercent?: number;
  /** 穿透允许的容差（像素），小于该值不修正，防止抖动 */
  slop?: number;
  /** 空间网格单元大小（像素），用于宽相 */
  cellSize?: number;
  /** 是否启用摩擦 */
  enableFriction?: boolean;
  /** 最大子步数（防止高速物体穿透薄壁；越大越稳但越慢） */
  maxSubSteps?: number;
  /** 着地探测距离（像素）：物体下方该距离内有地形即视为着地。0 = 关闭 */
  groundProbe?: number;
}

const DEFAULTS: Required<PhysicsOptions> = {
  gravityX: 0,
  gravityY: 0,
  correctionPercent: 0.8,
  slop: 0.01,
  cellSize: 64,
  enableFriction: true,
  maxSubSteps: 8,
  groundProbe: 4,
};

interface BodyEntry {
  index: number;
  pos: Position;
  vel: Velocity | undefined;
  body: RigidBody;
  shape: Shape;
  /** 上一帧位置（平台单向判定用） */
  prevX: number;
  prevY: number;
}

/** 取形状的半高（用于平台判定） */
function halfHeight(shape: Shape): number {
  if (shape.kind === 'circle') return (shape as Circle).radius;
  return (shape as Box | Platform).halfH;
}

export function createPhysicsSystem(options: PhysicsOptions = {}) {
  const opt = { ...DEFAULTS, ...options };

  return {
    name: 'PhysicsSystem',
    run(world: World, dt: number): void {
      // 0) 接触记录：每帧清空
      let contacts = world.getResource(PhysicsContacts);
      if (!contacts) {
        contacts = new PhysicsContacts();
        world.insertResource(PhysicsContacts, contacts);
      }
      contacts.clear();

      // 1) 收集刚体
      const bodies = collectBodies(world);
      if (bodies.length === 0) return;

      // 2) 子步进（sub-stepping）：高速物体一帧内可能穿透薄壁，
      //    按「最大位移 / 安全步长」把本帧拆成多个子步，逐步积分+求解。
      const steps = computeSubSteps(bodies, dt, opt);
      const subDt = dt / steps;

      for (let s = 0; s < steps; s++) {
        // 记录积分前的位置（平台单向判定用）
        for (const b of bodies) {
          b.prevX = b.pos.x;
          b.prevY = b.pos.y;
        }

        // 积分：速度 → 位置（含重力）
        integrate(bodies, subDt, opt);

        // 宽相：空间网格粗筛候选对
        const pairs = broadphase(bodies, opt.cellSize);

        // 窄相 + 解算
        for (const [ia, ib] of pairs) {
          const a = bodies[ia];
          const b = bodies[ib];
          if (a.body.isStatic && b.body.isStatic) continue;

          // 平台特殊处理：只有「从上方落下」才碰撞
          if (a.shape.kind === 'platform' || b.shape.kind === 'platform') {
            const mover = a.shape.kind === 'platform' ? b : a;
            const platform = (a.shape.kind === 'platform' ? a : b).shape as Platform;
            const platPos = a.shape.kind === 'platform' ? a.pos : b.pos;

            // 下穿：mover 带 IgnorePlatforms 且计时 > 0 → 跳过平台碰撞
            const ignore = world.storage.get(mover.index, IgnorePlatforms);
            if (ignore && ignore.timer > 0) continue;

            const m = detectPlatform(
              mover.shape,
              mover.pos.x,
              mover.pos.y,
              mover.prevY + halfHeight(mover.shape),
              mover.vel?.y ?? 0,
              platform,
              platPos.x,
              platPos.y,
            );
            if (!m) continue;
            // 站在平台上：把 mover 顶回平台顶面，并清零向下速度
            const top = platPos.y - platform.halfH;
            mover.pos.y = top - halfHeight(mover.shape);
            if (mover.vel && mover.vel.y > 0) mover.vel.y = 0;
            contacts.addContact(mover.index, 0, -1); // 法线朝上 → 着地
            continue;
          }

          const manifold = detect(a.shape, a.pos.x, a.pos.y, b.shape, b.pos.x, b.pos.y);
          if (!manifold) continue;

          resolve(a, b, manifold, opt);

          // 记录接触（法线从 A 指向 B，故 A 的接触方向为 -normal，B 为 +normal）
          contacts.addContact(a.index, -manifold.nx, -manifold.ny);
          contacts.addContact(b.index, manifold.nx, manifold.ny);
        }
      }

      // 3) 着地探测（ground probe）：
      //    物体静止在地面上时，穿透量可能小于 slop 而「恰好不接触」，
      //    导致 isGrounded 时真时假。这里在物体下方探一小段距离，
      //    只要下方有实心/平台地形，就补记一次「着地」接触。
      groundProbe(world, bodies, contacts, opt);
    },
  };
}

/** 着地探测：检查每个动态物体正下方 probeDist 内是否有地形 */
function groundProbe(
  world: World,
  bodies: BodyEntry[],
  contacts: PhysicsContacts,
  opt: Required<PhysicsOptions>,
): void {
  const probe = opt.groundProbe; // 探测距离（像素）
  if (probe <= 0) return;

  for (const b of bodies) {
    if (b.body.isStatic) continue;
    // 只有「不是明显上升」的物体才探测着地（跳跃上升中不算着地）
    if (b.vel && b.vel.y < -1) continue;

    // 下穿中的物体：忽略平台地形
    const ignore = world.storage.get(b.index, IgnorePlatforms);
    const ignoring = !!(ignore && ignore.timer > 0);

    const hh = halfHeight(b.shape);
    const hw = b.shape.kind === 'circle' ? (b.shape as Circle).radius : (b.shape as Box | Platform).halfW;
    const bottom = b.pos.y + hh;

    for (const other of bodies) {
      if (other === b) continue;
      if (!other.body.isStatic) continue; // 只探测静态地形
      if (ignoring && other.shape.kind === 'platform') continue; // 下穿中跳过平台

      const oShape = other.shape;
      const oTop = other.pos.y - halfHeight(oShape);
      const oLeft = other.pos.x - (oShape.kind === 'circle' ? (oShape as Circle).radius : (oShape as Box | Platform).halfW);
      const oRight = other.pos.x + (oShape.kind === 'circle' ? (oShape as Circle).radius : (oShape as Box | Platform).halfW);

      // 水平重叠？
      if (b.pos.x + hw < oLeft || b.pos.x - hw > oRight) continue;

      // 物体底部在「地形顶面之上」且距离 <= probe → 视为着地
      const gap = oTop - bottom;
      if (gap >= -1 && gap <= probe) {
        contacts.addContact(b.index, 0, -1);
        break;
      }
    }
  }
}

/**
 * 计算本帧需要的子步数：
 * 取所有动态物体中「单帧位移」的最大值，除以安全步长（约最小形状尺寸的一半），
 * 向上取整，并限制在 [1, maxSteps]。
 */
function computeSubSteps(bodies: BodyEntry[], dt: number, opt: Required<PhysicsOptions>): number {
  let maxMove = 0;
  let minSize = Infinity;
  for (const b of bodies) {
    if (b.body.isStatic || !b.vel) continue;
    const move = Math.hypot(b.vel.x, b.vel.y) * dt;
    if (move > maxMove) maxMove = move;
    const size = 2 * Math.min(
      b.shape.kind === 'circle' ? (b.shape as Circle).radius : (b.shape as Box | Platform).halfH,
      b.shape.kind === 'circle' ? (b.shape as Circle).radius : (b.shape as Box | Platform).halfW,
    );
    if (size < minSize) minSize = size;
  }
  if (maxMove <= 0 || minSize === Infinity) return 1;
  const safeStep = Math.max(minSize * 0.5, 4); // 安全步长（像素）
  const steps = Math.ceil(maxMove / safeStep);
  return Math.max(1, Math.min(steps, opt.maxSubSteps));
}

/** 收集所有同时具备 Position + RigidBody + Shape 的实体 */
function collectBodies(world: World): BodyEntry[] {
  const posMask = world.maskOf(Position);
  const bodyMask = world.maskOf(RigidBody);

  // 注意：Circle / Box / Platform 各自是独立的组件类型（各自占一个位掩码），
  // 无法用基类 Shape 的掩码一次性查询，因此分别查询后合并去重。
  const shapeTypes: Array<abstract new (...args: any[]) => Shape> = [Circle, Box, Platform];
  const seen = new Set<number>();
  const result: BodyEntry[] = [];

  for (const shapeType of shapeTypes) {
    const shapeMask = world.maskOf(shapeType);
    const idxs = world.findEntities(world.query().with(posMask, bodyMask, shapeMask).build());
    for (const idx of idxs) {
      if (seen.has(idx)) continue;
      seen.add(idx);

      const pos = world.storage.get(idx, Position);
      const body = world.storage.get(idx, RigidBody);
      const shape = world.storage.get(idx, shapeType);
      if (!pos || !body || !shape) continue;
      result.push({
        index: idx,
        pos,
        vel: world.storage.get(idx, Velocity),
        body,
        shape,
        prevX: pos.x,
        prevY: pos.y,
      });
    }
  }
  return result;
}

/** 积分：施加重力 + 位置更新 */
function integrate(bodies: BodyEntry[], dt: number, opt: Required<PhysicsOptions>): void {
  for (const b of bodies) {
    if (b.body.isStatic) continue;

    if (b.vel) {
      // 重力
      if (b.body.gravityScale !== 0) {
        b.vel.x += opt.gravityX * b.body.gravityScale * dt;
        b.vel.y += opt.gravityY * b.body.gravityScale * dt;
      }
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
    }
  }
}

/**
 * 宽相：空间哈希网格。
 * 只对「落在同一或相邻网格」的刚体对做窄相，避免 O(n²)。
 */
function broadphase(bodies: BodyEntry[], cellSize: number): [number, number][] {
  const grid = new Map<string, number[]>();

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const r = boundingRadius(b.shape);
    const minX = Math.floor((b.pos.x - r) / cellSize);
    const maxX = Math.floor((b.pos.x + r) / cellSize);
    const minY = Math.floor((b.pos.y - r) / cellSize);
    const maxY = Math.floor((b.pos.y + r) / cellSize);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        let cell = grid.get(key);
        if (!cell) {
          cell = [];
          grid.set(key, cell);
        }
        cell.push(i);
      }
    }
  }

  const pairs: [number, number][] = [];
  const seen = new Set<number>();
  for (const cell of grid.values()) {
    for (let a = 0; a < cell.length; a++) {
      for (let b = a + 1; b < cell.length; b++) {
        const i = cell[a];
        const j = cell[b];
        const key = i < j ? i * 1e6 + j : j * 1e6 + i;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

/**
 * 解算：位置分离 + 冲量（反弹 + 摩擦）。
 * 静态物体视为质量无穷大（invMass = 0）。
 */
function resolve(a: BodyEntry, b: BodyEntry, m: Manifold, opt: Required<PhysicsOptions>): void {
  const invMassA = a.body.isStatic ? 0 : 1 / a.body.mass;
  const invMassB = b.body.isStatic ? 0 : 1 / b.body.mass;
  const invSum = invMassA + invMassB;
  if (invSum === 0) return;

  // --- 位置修正（分离穿透） ---
  const correction = Math.max(m.penetration - opt.slop, 0) * opt.correctionPercent / invSum;
  a.pos.x -= m.nx * correction * invMassA;
  a.pos.y -= m.ny * correction * invMassA;
  b.pos.x += m.nx * correction * invMassB;
  b.pos.y += m.ny * correction * invMassB;

  // --- 速度冲量（反弹） ---
  if (!a.vel && !b.vel) return;

  const avx = a.vel?.x ?? 0;
  const avy = a.vel?.y ?? 0;
  const bvx = b.vel?.x ?? 0;
  const bvy = b.vel?.y ?? 0;

  // 相对速度沿法线的分量
  const rvx = bvx - avx;
  const rvy = bvy - avy;
  const velAlongNormal = rvx * m.nx + rvy * m.ny;

  // 已经在分离，不处理
  if (velAlongNormal > 0) return;

  const e = Math.min(a.body.restitution, b.body.restitution);
  const j = -(1 + e) * velAlongNormal / invSum;

  if (a.vel && invMassA > 0) {
    a.vel.x -= (j * m.nx) * invMassA;
    a.vel.y -= (j * m.ny) * invMassA;
  }
  if (b.vel && invMassB > 0) {
    b.vel.x += (j * m.nx) * invMassB;
    b.vel.y += (j * m.ny) * invMassB;
  }

  // --- 摩擦（切向冲量） ---
  if (opt.enableFriction) {
    const tx = rvx - velAlongNormal * m.nx;
    const ty = rvy - velAlongNormal * m.ny;
    const tLen = Math.hypot(tx, ty);
    if (tLen > 1e-6) {
      const txn = tx / tLen;
      const tyn = ty / tLen;
      const mu = Math.sqrt(a.body.friction * b.body.friction);
      let jt = -(rvx * txn + rvy * tyn) / invSum;
      // 库仑摩擦：切向冲量不超过 μ × 法向冲量
      const maxFriction = Math.abs(j) * mu;
      jt = Math.max(-maxFriction, Math.min(maxFriction, jt));

      if (a.vel && invMassA > 0) {
        a.vel.x -= (jt * txn) * invMassA;
        a.vel.y -= (jt * tyn) * invMassA;
      }
      if (b.vel && invMassB > 0) {
        b.vel.x += (jt * txn) * invMassB;
        b.vel.y += (jt * tyn) * invMassB;
      }
    }
  }
}
