/**
 * RigidBody —— 刚体组件（纯数据）
 *
 * 描述实体在物理世界中的「体」属性：
 *   - mass        质量（0 或 Infinity 表示静态物体，如墙）
 *   - restitution 恢复系数（弹性，0=完全非弹性，1=完全弹性）
 *   - friction    摩擦系数（0~1）
 *   - isStatic    是否静态（静态物体不受力、不移动）
 *   - gravityScale 重力缩放（1=受标准重力，0=不受重力，如俯视射击游戏）
 *
 * 位置 / 速度复用通用组件 Position / Velocity。
 * 该组件只存数据，不存行为。
 */
export class RigidBody {
  constructor(
    public mass: number = 1,
    public restitution: number = 0.2,
    public friction: number = 0.1,
    public isStatic: boolean = false,
    public gravityScale: number = 0,
  ) {}
}

/** 静态刚体快捷构造（墙、地形） */
export function staticBody(): RigidBody {
  return new RigidBody(0, 0.1, 0.2, true, 0);
}

/** 动态刚体快捷构造 */
export function dynamicBody(mass = 1, restitution = 0.2, friction = 0.1, gravityScale = 0): RigidBody {
  return new RigidBody(mass, restitution, friction, false, gravityScale);
}
