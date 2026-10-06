import ComponentConfig from '../core/objects/ComponentConfig';
import CanvasManager from './CanvasManager';
import RenderComponent from '../core/objects/RenderComponent';

export default class TextRenderer extends RenderComponent {
    render(canvasManager: CanvasManager): void {
        canvasManager.getCtx()?.fillText(this.name, this.gameObject.transform.position.x, this.gameObject.transform.position.y);
    }
    constructor(config: ComponentConfig) {
        super(config);
    }

    update(dt: number): void {
        // 更新逻辑
        console.log(`Updating TextRenderer for ${this.name} with dt: ${dt}`);
    }
}
