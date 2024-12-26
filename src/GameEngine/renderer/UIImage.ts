// ImageRenderComponent.ts
import RenderComponent from '../core/objects/RenderComponent';
import CanvasManager from './CanvasManager';
import Vector2 from '../core/common/Vector2';
import  ImageRenderConfig  from '../core/objects/ComponentConfig';
import GameObject from '../core/objects/GameObject'; // 添加 GameObject 导入
import IRenderable from '../core/ability/IRenderable'; // 添加 IRenderable 导入

export default class UIImage extends GameObject implements IRenderable { // 修改继承关系并实现 IRenderable 接口
    private imageUrl: string;
    private position: Vector2;
    private size: Vector2;
    private image: HTMLImageElement;

    constructor(config: ImageRenderConfig) {
        super({ id: config.name, gameObject: config.gameObject }); // 修改构造函数以继承 GameObject
        this.imageUrl = config.imageUrl;
        this.position = config.position ?? new Vector2(0, 0);
        this.size = config.size ?? new Vector2(100, 100); // 默认大小
        this.image = new Image();
        this.image.src = this.imageUrl;
        this.image.onload = () => {
            console.log('Image loaded:', this.imageUrl);
        };
        this.image.onerror = (error) => {
            console.error('Failed to load image:', this.imageUrl, error);
        };
    }

    render(canvasManager: CanvasManager): void { // 实现 IRenderable 接口的 render 方法
        const context = canvasManager.getCtx();
        if (context && this.image.complete) {
            // console.log('Image rendered:', this.imageUrl);
            context.drawImage(this.image, this.position.x, this.position.y, this.size.x, this.size.y);
        }
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