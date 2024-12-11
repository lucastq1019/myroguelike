import Vector2 from "../core/common/Vector2";
import ComponentConfig from "../core/objects/ComponentConfig";
import CanvasManager from "./CanvasManager";
import RenderComponent from "../core/objects/RenderComponent";
import Clickable from "../core/objects/Clickable";

export default class ButtonRenderer extends RenderComponent implements Clickable {
    render(canvasManager: CanvasManager): void {
        const ctx = canvasManager.getCtx();
        if (ctx) {
            const position = this.gameObject.transform.position;
            ctx.fillStyle = "blue";
            ctx.fillRect(position.x, position.y, 100, 50);
            ctx.fillStyle = "white";
            ctx.fillText(this.name, position.x + 50, position.y + 25);
        }
    }

    constructor(config: ComponentConfig & { onClick?: () => void }) {
        super(config);
        this.onClick = config.onClick ?? (() => { });
    }
    onClick() {

    }
    isInside(position: { x: number, y: number }): boolean {
        const transform = this.gameObject.transform;
        const pos = transform.position;
        const width = 200; // 假设按钮宽度为200
        const height = 50; // 假设按钮高度为50

        return (
            position.x >= pos.x &&
            position.x <= pos.x + width &&
            position.y >= pos.y &&
            position.y <= pos.y + height
        );
    }
    triggerClick(): void {
        if (this.onClick) {
            this.onClick();
        }
    }

    update(dt: number): void {

    }
}