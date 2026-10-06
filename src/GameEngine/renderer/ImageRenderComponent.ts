import RenderComponent from '../core/objects/RenderComponent';
import CanvasManager from './CanvasManager';
import Vector2 from '../core/common/Vector2';
import ImageRenderConfig from '../core/objects/ComponentConfig';

export default class ImageRenderComponent extends RenderComponent {
  private imageUrl: string;
  private position: Vector2;
  private size: Vector2;
  private image: HTMLImageElement;

  constructor(config: ImageRenderConfig) {
    super('ImageRenderComponent');
    this.imageUrl = config.imageUrl;
    this.position = config.position ?? new Vector2(0, 0);
    this.size = config.size ?? new Vector2(100, 100);
    this.image = new Image();
    this.image.src = this.imageUrl;
  }

  render(canvasManager: CanvasManager): void {
    const context = canvasManager.getCtx();
    if (context && this.image.complete) {
      context.drawImage(this.image, this.position.x, this.position.y, this.size.x, this.size.y);
    }
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  setSize(size: Vector2): void {
    this.size = size;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  getSize(): Vector2 {
    return this.size;
  }

  update(dt: number): void {
    // 可以在这里添加更新逻辑，例如动画效果
  }
}