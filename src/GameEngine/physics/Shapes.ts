/**
 * 碰撞形状（纯数据）
 *
 * 轻量物理内核支持三种基础形状：
 *   - Circle  ：圆形（radius）
 *   - Box     ：轴对齐矩形 AABB（halfW / halfH，半宽半高）—— 实心，四面都碰撞
 *   - Platform：单面平台（halfW / halfH）—— 只有「顶面」碰撞：
 *               从上方落下可站立，从下方/侧面可穿过（横版平台游戏常用）
 *
 * 形状作为组件挂在实体上，由 PhysicsSystem 读取。
 * 注意：ECS 的组件类型必须是「运行时构造函数」，因此这里用抽象基类
 * Shape（而非 interface），子类 Circle / Box / Platform 才能作为组件 key。
 *
 * 后续可扩展：多边形、胶囊等。
 */

/** 形状基类（作为组件类型使用；abstract 类可被 ComponentStorage 接受） */
export abstract class Shape {
  /** 形状种类标识，用于窄相分派 */
  abstract readonly kind: 'circle' | 'box' | 'platform';
}

/** 圆形碰撞体 */
export class Circle extends Shape {
  readonly kind = 'circle' as const;
  constructor(public radius: number) {
    super();
  }
}

/** 轴对齐矩形碰撞体（半宽半高）—— 实心，四面碰撞 */
export class Box extends Shape {
  readonly kind = 'box' as const;
  constructor(
    public halfW: number,
    public halfH: number,
  ) {
    super();
  }
}

/**
 * 单面平台（半宽半高）—— 只与「从上方落下」的物体碰撞。
 * 实现：仅当物体底部位于平台顶面之上（含少量容差）且正在下落时才判定碰撞。
 * 由 PhysicsSystem 特殊处理（见 collision.detectPlatform）。
 */
export class Platform extends Shape {
  readonly kind = 'platform' as const;
  constructor(
    public halfW: number,
    public halfH: number,
  ) {
    super();
  }
}

/** 取形状的「包围半径」，用于宽相快速剔除 */
export function boundingRadius(shape: Shape): number {
  if (shape.kind === 'circle') return (shape as Circle).radius;
  const b = shape as Box | Platform;
  return Math.hypot(b.halfW, b.halfH);
}
