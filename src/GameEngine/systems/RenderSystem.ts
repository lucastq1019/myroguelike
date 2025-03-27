import Entity from '../core/objects/Entity';
import CustomRenderComponent from '../core/objects/CustomRenderComponent';
import CanvasManager from '../renderer/CanvasManager';

export default class RenderSystem {
    constructor(private canvasManager: CanvasManager) {}

    update(entities: Entity[]): void {
        for (const entity of entities) {
            const renderComponent = entity.getComponent(CustomRenderComponent);
            if (renderComponent) {
                const context = this.canvasManager.getCtx();
                if (context) {
                    const { position, size, color } = renderComponent.config;
                    context.fillStyle = color;
                    context.fillRect(position.x, position.y, size.x, size.y);
                }
            }
        }
    }
}