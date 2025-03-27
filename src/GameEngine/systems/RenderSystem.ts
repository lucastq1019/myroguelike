import CanvasManager from '../renderer/CanvasManager';
import EntityManager from '../ecs/EntityManager';
import System from '../ecs/System';
import Camera2D from '../camera/Camera2D';
import IRenderable from '../core/ability/IRenderable';
import EcsComponent from '../ecs/EcsComponent';

class RenderSystem extends System {
    private canvasManager: CanvasManager;
    private activeCamera: Camera2D | null = null;

    constructor(entityManager: EntityManager) {
        super(entityManager);
        this.canvasManager = new CanvasManager();
    }

    setActiveCamera(camera: Camera2D): void {
        this.activeCamera = camera;
    }

    update(dt: number): void {
        this.render();
    }

    private render(): void {
        this.canvasManager.clear();
        
        if (!this.activeCamera) {
            console.warn('No active camera found, rendering skipped.');
            return;
        }

        this.applyCameraTransform(this.activeCamera);
        this.renderEntities();
    }

    private applyCameraTransform(camera: Camera2D): void {
        const ctx = this.canvasManager.getCtx();
        if (!ctx) return;

        ctx.setTransform(
            camera.scale, 0, 0, camera.scale,
            -camera.position.x * camera.scale + this.canvasManager.width / 2,
            -camera.position.y * camera.scale + this.canvasManager.height / 2
        );
    }

    private renderEntities(): void {
        const entities = this.entityManager.getAllEntities();
        entities.forEach(entity => {
            const renderComponents = entity.getAllComponents<IRenderable & EcsComponent>();
            
            renderComponents.forEach(component => {
                if (component.enabled) {
                    component.render(this.canvasManager);
                }
            });
        });
    }
}

export default RenderSystem;