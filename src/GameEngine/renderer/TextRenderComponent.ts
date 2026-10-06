// TextRenderComponent.ts
import RenderComponent from '../core/objects/RenderComponent';
import CanvasManager from '../renderer/CanvasManager';
import Vector2 from '../core/common/Vector2';
import TextRenderConfig from '../core/objects/ComponentConfig';

export default class TextRenderComponent extends RenderComponent {
    private text: string;
    private position: Vector2;
    private fontSize: number;
    private fontColor: string;
    private fontFamily: string;

    constructor(config: TextRenderConfig) {
        super(config);
        this.text = config.text;
        this.position = config.position ?? new Vector2(0, 0);
        this.fontSize = config.fontSize ?? 16; // 默认字体大小
        this.fontColor = config.fontColor ?? 'black'; // 默认字体颜色
        this.fontFamily = config.fontFamily ?? 'Arial'; // 默认字体
    }

    render(canvasManager: CanvasManager): void {
        const context = canvasManager.getCtx();
        if (context) {
            context.font = `${this.fontSize}px ${this.fontFamily}`;
            context.fillStyle = this.fontColor;
            context.fillText(this.text, this.position.x, this.position.y);
        }
    }

    setText(text: string): void {
        this.text = text;
    }

    setPosition(position: Vector2): void {
        this.position = position;
    }

    setFontSize(fontSize: number): void {
        this.fontSize = fontSize;
    }

    setFontColor(fontColor: string): void {
        this.fontColor = fontColor;
    }

    setFontFamily(fontFamily: string): void {
        this.fontFamily = fontFamily;
    }

    getText(): string {
        return this.text;
    }

    getPosition(): Vector2 {
        return this.position;
    }

    getFontSize(): number {
        return this.fontSize;
    }

    getFontColor(): string {
        return this.fontColor;
    }

    getFontFamily(): string {
        return this.fontFamily;
    }

    update(dt: number): void {
        // 可以在这里添加更新逻辑，例如动态文本效果
    }
}