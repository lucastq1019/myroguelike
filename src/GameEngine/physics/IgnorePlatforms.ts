/**
 * IgnorePlatforms —— 忽略单面平台（组件，纯数据）
 *
 * 计时 > 0 期间，该实体不与 Platform 形状碰撞（用于「下穿平台」）。
 * 放在物理内核里，供 PhysicsSystem 读取，避免引擎依赖游戏层。
 */
export class IgnorePlatforms {
  constructor(public timer: number = 0) {}
}
