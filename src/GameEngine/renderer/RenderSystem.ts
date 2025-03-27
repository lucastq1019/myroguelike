import CanvasManager from './CanvasManager';
import RenderComponent from '../core/objects/RenderComponent';
import EntityManager from '../ecs/EntityManager';
import System from '../ecs/System';
import GameEngine from '../GameEngine';
import Camera2D from '../core/objects/Camera2D';

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

    update(dt: number): void {
        this.render();
    }

    private render(): void {
        this.canvasManager.clear();
        
        const activeCamera = GameEngine.getInstance().getActiveCamera();
        if (!activeCamera) {
            console.warn('No active camera found, rendering skipped.');
            return;
        }

        // 应用相机变换
        this.applyCameraTransform(activeCamera);

        // 渲染所有实体
        this.renderEntities();

        // 调试渲染
        if (GameEngine.getInstance().isDebugMode()) {
            this.debugRender(activeCamera);
        }
    }

    private applyCameraTransform(camera: Camera2D): void {
        const ctx = this.canvasManager.getCtx();
        if (!ctx) return;

        ctx.setTransform(
            camera.scale, 0, 0, camera.scale,
            -camera.position.x * camera.scale + this.screenWidth / 2,
            -camera.position.y * camera.scale + this.screenHeight / 2
        );
    }

    private renderEntities(): void {
        const entities = this.entityManager.getAllEntities();
        entities.forEach(entity => {
            const renderComponent = entity.getComponent<RenderComponent>('RenderComponent');
            if (renderComponent) {
                renderComponent.render(this.canvasManager);
            }
        });
    }

    private debugRender(camera: Camera2D): void {
        const ctx = this.canvasManager.getCtx();
        if (!ctx) return;

        // 保存当前状态
        ctx.save();
        
        // 重置变换
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 绘制相机边界
        this.drawCameraBounds(camera);
        
        // 恢复状态
        ctx.restore();
    }

    private drawCameraBounds(camera: Camera2D): void {
        const ctx = this.canvasManager.getCtx();
        if (!ctx) return;

        const screenPos = {
            x: this.screenWidth / 2 - camera.size.x * camera.scale / 2,
            y: this.screenHeight / 2 - camera.size.y * camera.scale / 2
        };

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            screenPos.x, screenPos.y,
            camera.size.x * camera.scale,
            camera.size.y * camera.scale
        );
    }
}

export default RenderSystem;