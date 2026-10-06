/**
 * Time —— 时间资源
 *
 * 记录每帧时间步长与累计时间，供系统读取。
 */
export class Time {
  /** 本帧时间步长（秒） */
  dt = 0;
  /** 累计时间（秒） */
  elapsed = 0;
  /** 帧计数 */
  frame = 0;

  /** 每帧开始时更新 */
  tick(dt: number): void {
    this.dt = dt;
    this.elapsed += dt;
    this.frame++;
  }
}
