// RenderSystem.ts
import CanvasManager from './CanvasManager';
import RenderComponent from '../core/objects/RenderComponent';
import EntityManager from '../ecs/EntityManager';
import System from '../ecs/System';
import GameEngine from '../GameEngine';

class RenderSystem extends System {
    private canvasManager: CanvasManager;
    private screenWidth: number;
    private screenHeight: number;

    constructor(entityManager: EntityManager) {
        super(entityManager);
        this.canvasManager = new CanvasManager();
        this.screenWidth = GameEngine.getScreenWidth();
        this.screenHeight = GameEngine.getScreenHeight();
    }

    getRequiredComponents(): string[] {
        return ['RenderComponent'];
    }

    updateViewMatrix(viewMatrix: number[][]): void {
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

    // 添加编辑器渲染开关
    private editorRenderFlags = {
        showBoundingBoxes: true,
        showTransformGizmos: true,
        showPhysicsDebug: false
    };

    render(): void {
        this.canvasManager.clear();

        const activeCamera = GameEngine.getInstance().getActiveCamera();
        if (activeCamera) {
            const viewMatrix = activeCamera.getViewMatrix();
            this.updateViewMatrix(viewMatrix);

            this.entityManager.getAllEntities().forEach(entity => {
                const renderComponent = entity.getComponent<RenderComponent>('RenderComponent');
                if (renderComponent) {
                    renderComponent.render(this.canvasManager);
                }
            });

            const size = this.screenHeight * 0.45;
            const offsetX = (this.screenWidth * 0.5 - size * 2) / 6;
            const offsetY = (this.screenWidth * 0.5 - size * 2) / 6;
            this.drawLines(2, size, offsetX, offsetY);

            const offsetX2 = (this.screenWidth * 0.5 - size * 2) / 6 * 5 + this.screenWidth * 0.5;
            const offsetY2 = (this.screenWidth * 0.5 - size * 2) / 6;
            this.drawLines(2, size, offsetX2, offsetY2);

            // 绘制相机视野的矩形
            this.drawCameraBounds();
        } else {
            console.warn('No active camera found, rendering skipped.');
        }
    }

    private drawLines(gridSize: number, cellSize: number, offsetX: number = 0, offsetY: number = 0): void {
        gridSize = gridSize || 10;
        const activeCamera = GameEngine.getInstance().getActiveCamera();
        if (!activeCamera) return;

        const ctx = this.canvasManager.getCtx();
        if (!ctx) return;

        ctx.save(); // 保存当前画布状态

        ctx.strokeStyle = 'black'; // 设置边框颜色
        ctx.lineWidth = 2; // 设置边框宽度

        // 绘制水平线
        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + i * cellSize);
            ctx.lineTo(offsetX + gridSize * cellSize, offsetY + i * cellSize);
            ctx.stroke();
        }

        // 绘制垂直线
        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX + i * cellSize, offsetY);
            ctx.lineTo(offsetX + i * cellSize, offsetY + gridSize * cellSize);
            ctx.stroke();
        }

        ctx.restore(); // 恢复画布状态
    }

    private drawCameraBounds(): void {
        const activeCamera = GameEngine.getInstance().getActiveCamera();
        if (!activeCamera) return;

        const ctx = this.canvasManager.getCtx();
        if (!ctx) return;

        const { position, size } = activeCamera;

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

    update(dt: number): void {
        this.render();
    }
}

export default RenderSystem;