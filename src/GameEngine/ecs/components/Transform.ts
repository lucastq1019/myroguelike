/**
 * Transform —— 变换组件（纯数据）
 *
 * 在 Position 之外补充 **旋转** 与 **缩放**：
 *   - Position：位置（高频更新，渲染/物理热路径，保持独立便于 SoA 遍历）
 *   - Transform：rotation（弧度）+ scale（x/y 缩放）
 *
 * 设计说明：
 * - 与 Position 分离，是为了不破坏现有 `dense(Position)` 热路径的缓存友好性。
 * - 实体若同时有 Position + Transform，渲染时施加旋转/缩放；无 Transform 则按原样绘制。
 * - `serialize()/deserialize()` 用于「中途存档」（行动项 H）。
 *
 * 注意：组件是**纯数据**，行为在 System 中。
 */

export interface TransformData {
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export class Transform {
  constructor(
    /** 旋转弧度（顺时针为正，与 Canvas rotate 一致） */
    public rotation: number = 0,
    /** 水平缩放（1 = 原始大小） */
    public scaleX: number = 1,
    /** 垂直缩放（1 = 原始大小） */
    public scaleY: number = 1,
  ) {}

  /** 设置旋转角度（弧度） */
  setRotation(rad: number): this {
    this.rotation = rad;
    return this;
  }

  /** 设置统一缩放 */
  setScale(s: number): this;
  setScale(x: number, y: number): this;
  setScale(x: number, y?: number): this {
    this.scaleX = x;
    this.scaleY = y ?? x;
    return this;
  }

  /** 是否为单位变换（无旋转无缩放）—— 渲染时可跳过 ctx.save/rotate/scale */
  isIdentity(): boolean {
    return this.rotation === 0 && this.scaleX === 1 && this.scaleY === 1;
  }

  /** 旋转角转成角度制（调试用） */
  get degrees(): number {
    return (this.rotation * 180) / Math.PI;
  }

  /** 序列化（存档用） */
  serialize(): TransformData {
    return { rotation: this.rotation, scaleX: this.scaleX, scaleY: this.scaleY };
  }

  /** 反序列化（读档用） */
  deserialize(data: Partial<TransformData>): this {
    if (data.rotation !== undefined) this.rotation = data.rotation;
    if (data.scaleX !== undefined) this.scaleX = data.scaleX;
    if (data.scaleY !== undefined) this.scaleY = data.scaleY;
    return this;
  }

  /** 从普通对象克隆 */
  clone(): Transform {
    return new Transform(this.rotation, this.scaleX, this.scaleY);
  }

  /** 从任意（可能为空的）数据构造，用于读档容错 */
  static from(data?: Partial<TransformData> | null): Transform {
    return new Transform().deserialize(data ?? {});
  }
}

export default Transform;
