import System from '../ecs/System';
import EntityManager from '../ecs/EntityManager';
import SceneComponent from '../ecs/SceneComponent';
import Scene from './Scene';

export default class SceneManagerSystem extends System {
    private currentSceneComponent: SceneComponent | null;

    constructor(entityManager: EntityManager) {
        super(entityManager);
        this.currentSceneComponent = null;
    }

    update(dt: number): void {
        if (this.currentSceneComponent && this.currentSceneComponent.getScene()) {
            this.currentSceneComponent.getScene().update(dt);
        }
    }

    getRequiredComponents(): string[] {
        return ['SceneComponent'];
    }

    registerScene(scene: Scene): void {
        const sceneComponent = new SceneComponent(scene);
        this.entityManager.getAllEntities().forEach(entity => {
            if (entity.hasComponent('SceneComponent')) {
                entity.removeComponent('SceneComponent');
            }
        });
        const entity = this.entityManager.createEntity();
        entity.addComponent(sceneComponent);
        this.currentSceneComponent = sceneComponent;
    }

    switchScene(sceneName: string): void {
        if (this.currentSceneComponent) {
            const scene = this.currentSceneComponent.getScene();
            if (scene && scene.name === sceneName) {
                return;
            }
        }

        this.entityManager.getAllEntities().forEach(entity => {
            if (entity.hasComponent('SceneComponent')) {
                const sceneComponent = entity.getComponent<SceneComponent>('SceneComponent');
                if (sceneComponent) {
                    const scene = sceneComponent.getScene();
                    if (scene) {
                        this.getSceneLoaderSystem().unloadScene(sceneComponent);
                    }
                }
                entity.removeComponent('SceneComponent');
            }
        });

        const entity = this.entityManager.createEntity();
        const newScene = this.entityManager.getSceneByName(sceneName);
        if (newScene) {
            const sceneComponent = new SceneComponent(newScene);
            entity.addComponent(sceneComponent);
            this.getSceneLoaderSystem().loadScene(sceneComponent);
            this.currentSceneComponent = sceneComponent;
        } else {
            console.error(`Scene with name ${sceneName} not found.`);
        }
    }

    private getSceneLoaderSystem(): SceneLoaderSystem {
        return this.systemManager.getSystem<SceneLoaderSystem>(SceneLoaderSystem);
    }
}