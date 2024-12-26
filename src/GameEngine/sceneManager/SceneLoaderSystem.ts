import System from '../ecs/System';
import EntityManager from '../ecs/EntityManager';
import SceneComponent from '../ecs/SceneComponent';

export default class SceneLoaderSystem extends System {
    constructor(entityManager: EntityManager) {
        super(entityManager);
    }

    update(dt: number): void {
        // 这里可以添加场景加载和卸载的逻辑
    }

    getRequiredComponents(): string[] {
        return ['SceneComponent'];
    }

    loadScene(sceneComponent: SceneComponent): void {
        sceneComponent.getScene().load();
    }

    unloadScene(sceneComponent: SceneComponent): void {
        sceneComponent.getScene().onUnload();
    }
}