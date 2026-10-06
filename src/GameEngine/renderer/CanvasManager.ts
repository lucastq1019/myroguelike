/**
 * CanvasManager —— 画布管理
 *
 * 改造：支持指定宽高（默认全屏），便于固定尺寸的游戏。
 */
export default class CanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  public width: number;
  public height: number;
  private devicePixelRatio: number;

  constructor(width?: number, height?: number) {
    this.devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this.width = width ?? (typeof window !== 'undefined' ? window.innerWidth : 960);
    this.height = height ?? (typeof window !== 'undefined' ? window.innerHeight : 600);
    this.initCanvas(width, height);
  }

  private initCanvas(width?: number, height?: number): void {
    const canvas = document.createElement('canvas');
    const dpr = this.devicePixelRatio;

    // 若指定了尺寸，用固定尺寸；否则全屏
    const cssW = width ?? window.innerWidth;
    const cssH = height ?? window.innerHeight;

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    if (width === undefined) {
      // 全屏模式：铺满
      canvas.style.display = 'block';
    } else {
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.background = '#181818';
      canvas.style.border = '1px solid #333';
      canvas.style.cursor = 'crosshair';
    }

    document.body.appendChild(canvas);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.width = cssW;
    this.height = cssH;
  }

  public clear(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  getCtx(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
}
