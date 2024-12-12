// ButtonRenderComponent.ts
import Vector2 from "../core/common/Vector2";
import ComponentConfig from "../core/objects/ComponentConfig";
import CanvasManager from "./CanvasManager";
import RenderComponent from "../core/objects/RenderComponent";
import Clickable from "../core/objects/Clickable";

export default class ButtonRenderComponent extends RenderComponent implements Clickable {
    private width: number;
    private height: number;

    constructor(config: ComponentConfig & { onClick?: () => void, width?: number, height?: number }) {
        super(config);
        this.onClick = config.onClick ?? (() => { });
        this.width = config.width ?? 200; // 默认宽度
        this.height = config.height ?? 50; // 默认高度
    }

    render(canvasManager: CanvasManager): void {
        const ctx = canvasManager.getCtx();
        if (ctx) {
            const position = this.gameObject.transform.position;
            ctx.fillStyle = "blue";
            ctx.fillRect(position.x, position.y, this.width, this.height);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.name, position.x + this.width / 2, position.y + this.height / 2);
        }
    }

    onClick() {}

    isInside(position: { x: number, y: number }): boolean {
        const transform = this.gameObject.transform;
        const pos = transform.position;

        return (
            position.x >= pos.x &&
            position.x <= pos.x + this.width &&
            position.y >= pos.y &&
            position.y <= pos.y + this.height
        );
    }

    triggerClick(): void {
        if (this.onClick) {
            this.onClick();
        }
    }

    update(dt: number) {}
}