import ComponentConfig from "../core/objects/ComponentConfig";
import CanvasManager from "./CanvasManager";
import RenderComponent from "./RenderComponent";

export default class ButtonRenderer extends RenderComponent {
    render(canvasManager: CanvasManager): void {
        const ctx = canvasManager.getCtx();
        if (ctx) {
            const position= this.gameObject.transform.position;
            ctx.fillStyle = "blue";
            ctx.fillRect(position.x, position.y, 100, 50);
            ctx.fillStyle = "white";
            ctx.fillText(this.name, position.x+50, position.y+25);
        }
    }

    constructor(config: ComponentConfig) {
        super(config);
    }

    update(dt: number): void {
        // 更新逻辑
        console.log(`Updating TextRenderer for ${this.name} with dt: ${dt}`);
    }
}