/**
 * PhysicsContacts —— 物理接触记录（Resource）
 *
 * 物理系统每帧写入：每个实体在各方向上的接触状态。
 * 供游戏逻辑读取（如「是否着地」用于跳跃判定）。
 *
 * 作为 Resource 存在（全局单例），不参与组件查询。
 */
export class PhysicsContacts {
  /** entityIndex -> 接触位标志 */
  private flags = new Map<number, number>();

  /** 每帧开始前清空 */
  clear(): void {
    this.flags.clear();
  }

  /** 记录某实体在法线方向上的接触 */
  addContact(entityIndex: number, nx: number, ny: number): void {
    let f = this.flags.get(entityIndex) ?? 0;
    // ny < 0 表示法线朝上（实体在下方被顶住 → 站在地面）
    if (ny < -0.5) f |= ContactDir.Up;
    if (ny > 0.5) f |= ContactDir.Down;
    if (nx < -0.5) f |= ContactDir.Left;
    if (nx > 0.5) f |= ContactDir.Right;
    this.flags.set(entityIndex, f);
  }

  has(entityIndex: number, dir: ContactDir): boolean {
    return ((this.flags.get(entityIndex) ?? 0) & dir) !== 0;
  }

  /** 是否着地（下方有支撑） */
  isGrounded(entityIndex: number): boolean {
    return this.has(entityIndex, ContactDir.Up);
  }
}

export enum ContactDir {
  Up = 1,
  Down = 2,
  Left = 4,
  Right = 8,
}
