/**
 * 碰撞检测（窄相 narrowphase）
 *
 * 给定两个形状 + 位置，返回碰撞结果（法线 + 穿透深度），无碰撞返回 null。
 * 支持：圆-圆、圆-矩形、矩形-矩形（AABB）、单面平台。
 *
 * 约定：
 *   - 法线 normal 从 A 指向 B（单位向量）。
 *   - penetration 为穿透深度（>0）。
 *
 * 单面平台（Platform）：
 *   - 只与「从上方落下」的物体碰撞（顶面站立）。
 *   - 需要传入运动物体的速度 vy，仅当 vy >= 0（下落/静止）且物体底部在平台顶面之上时才判定。
 */
import { Shape, Circle, Box, Platform } from './Shapes';

export interface Manifold {
  /** 从 A 指向 B 的单位法线 */
  nx: number;
  ny: number;
  /** 穿透深度 */
  penetration: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** 检测两个形状的碰撞（不含平台；平台请用 detectPlatform） */
export function detect(
  a: Shape,
  ax: number,
  ay: number,
  b: Shape,
  bx: number,
  by: number,
): Manifold | null {
  if (a.kind === 'platform' || b.kind === 'platform') return null; // 平台走 detectPlatform
  if (a.kind === 'circle' && b.kind === 'circle') {
    return circleCircle(a as Circle, ax, ay, b as Circle, bx, by);
  }
  if (a.kind === 'circle' && b.kind === 'box') {
    return circleBox(a as Circle, ax, ay, b as Box, bx, by);
  }
  if (a.kind === 'box' && b.kind === 'circle') {
    const m = circleBox(b as Circle, bx, by, a as Box, ax, ay);
    if (m) {
      // 反转法线方向（原结果从 B 指向 A）
      m.nx = -m.nx;
      m.ny = -m.ny;
    }
    return m;
  }
  if (a.kind === 'box' && b.kind === 'box') {
    return boxBox(a as Box, ax, ay, b as Box, bx, by);
  }
  return null;
}

/**
 * 检测「运动物体 A」与「单面平台 B」的碰撞。
 *
 * @param aShape 运动物体的形状（circle 或 box）
 * @param ax,ay  运动物体位置
 * @param aBottom A 的底部 y 坐标（上一帧位置，用于判断是否从上方落下）
 * @param vy     A 的垂直速度（向下为正）
 * @param b      平台
 * @param bx,by  平台位置
 *
 * 规则：仅当 A 正在下落（vy >= 0）且 A 的「上一帧底部」在平台顶面之上时，才判定为站在平台上。
 */
export function detectPlatform(
  aShape: Shape,
  ax: number,
  ay: number,
  aPrevBottom: number,
  vy: number,
  b: Platform,
  bx: number,
  by: number,
): Manifold | null {
  if (vy < 0) return null; // 上升中，穿过平台

  const top = by - b.halfH;
  const left = bx - b.halfW;
  const right = bx + b.halfW;

  // A 的水平范围
  const aHalfW = aShape.kind === 'circle' ? (aShape as Circle).radius : (aShape as Box).halfW;
  const aHalfH = aShape.kind === 'circle' ? (aShape as Circle).radius : (aShape as Box).halfH;

  // 水平不重叠 → 无碰撞
  if (ax + aHalfW < left || ax - aHalfW > right) return null;

  // A 当前底部
  const aBottom = ay + aHalfH;

  // 当前底部在平台顶面之下 → 已经穿过去了（不处理，避免把穿过的物体又顶上来）
  if (aBottom < top) return null;

  // 上一帧底部必须在平台顶面之上（含容差），才算「从上方落下」
  const tolerance = 6;
  if (aPrevBottom > top + tolerance) return null;

  // 穿透深度 = 当前底部超出平台顶面的量
  const penetration = aBottom - top;
  // 法线从 A 指向 B：A 在平台上方 → 法线向上（A 需要被推回上方）
  return { nx: 0, ny: -1, penetration };
}

/** 圆 × 圆 */
function circleCircle(a: Circle, ax: number, ay: number, b: Circle, bx: number, by: number): Manifold | null {
  const dx = bx - ax;
  const dy = by - ay;
  const distSq = dx * dx + dy * dy;
  const rSum = a.radius + b.radius;
  if (distSq >= rSum * rSum) return null;

  const dist = Math.sqrt(distSq);
  if (dist < 1e-6) {
    // 完全重叠，随便取一个方向
    return { nx: 1, ny: 0, penetration: rSum };
  }
  return {
    nx: dx / dist,
    ny: dy / dist,
    penetration: rSum - dist,
  };
}

/** 圆 × 矩形（AABB） */
function circleBox(c: Circle, cx: number, cy: number, b: Box, bx: number, by: number): Manifold | null {
  // 矩形上离圆心最近的点
  const closestX = clamp(cx, bx - b.halfW, bx + b.halfW);
  const closestY = clamp(cy, by - b.halfH, by + b.halfH);

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq > c.radius * c.radius) return null;

  if (distSq > 1e-12) {
    const dist = Math.sqrt(distSq);
    // 法线从圆指向矩形（A=圆 → B=矩形）
    return {
      nx: -dx / dist,
      ny: -dy / dist,
      penetration: c.radius - dist,
    };
  }

  // 圆心在矩形内部：沿最浅的轴推出
  const overlapX = b.halfW - Math.abs(cx - bx);
  const overlapY = b.halfH - Math.abs(cy - by);
  if (overlapX < overlapY) {
    const sign = cx < bx ? -1 : 1;
    return { nx: sign, ny: 0, penetration: c.radius + overlapX };
  }
  const sign = cy < by ? -1 : 1;
  return { nx: 0, ny: sign, penetration: c.radius + overlapY };
}

/** 矩形 × 矩形（AABB） */
function boxBox(a: Box, ax: number, ay: number, b: Box, bx: number, by: number): Manifold | null {
  const dx = bx - ax;
  const px = a.halfW + b.halfW - Math.abs(dx);
  if (px <= 0) return null;

  const dy = by - ay;
  const py = a.halfH + b.halfH - Math.abs(dy);
  if (py <= 0) return null;

  // 取穿透较小的轴作为分离方向
  if (px < py) {
    return { nx: dx < 0 ? -1 : 1, ny: 0, penetration: px };
  }
  return { nx: 0, ny: dy < 0 ? -1 : 1, penetration: py };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
