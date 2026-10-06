/**
 * Camera —— 相机资源
 *
 * 相机是「全局视角状态」，不是游戏实体，因此作为 Resource 存在。
 * 负责「世界坐标 ↔ 屏幕坐标」转换，实现地图卷轴（跟随目标）。
 *
 * 用法：
 *   world.insertResource(Camera, new Camera(viewportW, viewportH, worldW, worldH));
 *   const cam = world.getResource(Camera)!;
 */
export class Camera {
  /** 相机中心（世界坐标） */
  x = 0;
  y = 0;
  /** 缩放 */
  zoom = 1;
  /** 视口尺寸（屏幕像素） */
  viewportW: number;
  viewportH: number;
  /** 世界边界（限制相机不越界） */
  worldW: number;
  worldH: number;

  /** 屏幕震动：剩余时间（秒） */
  private shakeTime = 0;
  /** 屏幕震动：强度（像素） */
  private shakeMag = 0;
  /** 屏幕震动：当前帧的随机偏移 */
  shakeOffsetX = 0;
  shakeOffsetY = 0;

  constructor(viewportW: number, viewportH: number, worldW: number, worldH: number) {
    this.viewportW = viewportW;
    this.viewportH = viewportH;
    this.worldW = worldW;
    this.worldH = worldH;
  }

  /** 触发屏幕震动（取较大者，避免叠加过猛） */
  shake(magnitude: number, duration: number): void {
    this.shakeMag = Math.max(this.shakeMag, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  /** 每帧更新震动偏移（由渲染前调用） */
  updateShake(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const t = Math.max(0, this.shakeTime);
      const mag = this.shakeMag * t;
      this.shakeOffsetX = (Math.random() * 2 - 1) * mag;
      this.shakeOffsetY = (Math.random() * 2 - 1) * mag;
      if (this.shakeTime <= 0) {
        this.shakeTime = 0;
        this.shakeMag = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  /** 跟随目标（带边界钳制） */
  follow(targetX: number, targetY: number): void {
    this.x = targetX;
    this.y = targetY;

    const halfW = this.viewportW / 2;
    const halfH = this.viewportH / 2;
    if (this.worldW > this.viewportW) {
      this.x = Math.max(halfW, Math.min(this.worldW - halfW, this.x));
    } else {
      this.x = this.worldW / 2;
    }
    if (this.worldH > this.viewportH) {
      this.y = Math.max(halfH, Math.min(this.worldH - halfH, this.y));
    } else {
      this.y = this.worldH / 2;
    }
  }

  /** 世界坐标 → 屏幕坐标（含屏幕震动偏移） */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * this.zoom + this.viewportW / 2 + this.shakeOffsetX,
      y: (wy - this.y) * this.zoom + this.viewportH / 2 + this.shakeOffsetY,
    };
  }

  /** 屏幕坐标 → 世界坐标（鼠标瞄准用） */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.viewportW / 2) / this.zoom + this.x,
      y: (sy - this.viewportH / 2) / this.zoom + this.y,
    };
  }

  /** 判断世界坐标是否在视口内（剔除优化） */
  isVisible(wx: number, wy: number, margin = 64): boolean {
    const halfW = this.viewportW / 2 + margin;
    const halfH = this.viewportH / 2 + margin;
    return Math.abs(wx - this.x) <= halfW && Math.abs(wy - this.y) <= halfH;
  }
}
