import CanvasManager from './CanvasManager';
import RenderComponent from './RenderComponent';
import GameEngine from '../GameEngine';
import Camera2D from '../camera/Camera2D';
import SceneManager from '../sceneManager/SceneManager';

class RenderingEngine {
    private gameEngine: GameEngine;
    private canvasManager: CanvasManager;
    private renderComponents: RenderComponent[];
    private activeCamera: Camera2D | null = null;

    constructor(gameEngine: GameEngine) {
        this.gameEngine = gameEngine;
        this.canvasManager = new CanvasManager();
        this.renderComponents = [];
        this.activeCamera = this.gameEngine.getActiveCamera();
        console.log(this)
    }

    addRenderComponent(component: RenderComponent) {
        this.renderComponents.push(component);
    }

    removeRenderComponent(component: RenderComponent) {
        const index = this.renderComponents.indexOf(component);
        if (index !== -1) {
            this.renderComponents.splice(index, 1);
        }
    }

    setActiveCamera(camera: Camera2D) {
        this.activeCamera = camera;
    }

    updateViewMatrix(viewMatrix: number[][]) {
        if (this.canvasManager.getCtx() && viewMatrix.length === 3 && viewMatrix[0].length === 3) {
            this.canvasManager.getCtx()!.transform(
                viewMatrix[0][0],
                viewMatrix[1][0],
                viewMatrix[0][1],
                viewMatrix[1][1],
                viewMatrix[0][2],
                viewMatrix[1][2]
            );
        } else {
            console.error('CanvasManager不存在上下文环境或viewMatrix格式不正确');
        }
    }

    render() {
        this.canvasManager.clear();

        if (this.activeCamera) {
            const viewMatrix = this.activeCamera.getViewMatrix();
            this.updateViewMatrix(viewMatrix);
            console.log(this)
            this.gameEngine.getSceneManager().getCurrentScene()?.getRenderComponents().forEach((renderComponent) => {
                if (renderComponent instanceof RenderComponent) {
                    renderComponent.render(this.canvasManager);
                }
            });

             // 绘制相机视野的矩形
             this.drawCameraBounds();
        } else {
            console.warn('No active camera found, rendering skipped.');
        }
    }

    private drawCameraBounds() {
        if (!this.activeCamera) return;

        const ctx = this.canvasManager.getCtx();
        if (!ctx) return;

        const { position, size } = this.activeCamera;

        ctx.strokeStyle = 'red'; // 设置边框颜色
        ctx.lineWidth = 2; // 设置边框宽度

        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(position.x + size.x, position.y);
        ctx.lineTo(position.x + size.x, position.y + size.y);
        ctx.lineTo(position.x, position.y + size.y);
        ctx.closePath();
        ctx.stroke();
    }
}

export default RenderingEngine;