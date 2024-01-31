// renderer/RenderingEngine.js

import CanvasManager from './CanvasManager';
import RenderComponent from '../../assets/code/RenderComponent';
import ImageRenderer from './ImageRenderer';
import TextRenderer from './TextRenderer';
import RectangleRenderer from './RectangleRenderer';

class RenderingEngine {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.canvasManager = new CanvasManager();
        this.renderComponents = [];
    }

    addRenderComponent(component) {
        if (component instanceof RenderComponent) {
            this.renderComponents.push(component);
        } else {
            throw new Error('Component must be an instance of RenderComponent');
        }
    }

    removeRenderComponent(component) {
        const index = this.renderComponents.indexOf(component);
        if (index !== -1) {
            this.renderComponents.splice(index, 1);
        }
    }

    updateViewMatrix(viewMatrix) {
        this.canvasManager.ctx.transform(...viewMatrix.flat());
    }

    render() {
        this.canvasManager.clear();

        // 更新视图矩阵（假设是从游戏引擎获取）
        const viewMatrix = this.gameEngine.camera.getViewMatrix();
        this.updateViewMatrix(viewMatrix);

        this.renderComponents.forEach(component => {
            component.render(this.canvasManager);
        });
    }
}

export default RenderingEngine;