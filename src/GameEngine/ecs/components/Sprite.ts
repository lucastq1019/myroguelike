/**
 * Sprite —— 渲染组件（纯数据）
 *
 * 描述「怎么画」：尺寸、颜色、形状。
 * 由 RenderSystem 读取 Position + Sprite 进行绘制。
 */
export class Sprite {
  constructor(
    public size: number,
    public color: string,
    public shape: 'rect' | 'circle' = 'rect',
  ) {}
}
