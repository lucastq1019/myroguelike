// 导入System类，用于继承和实现系统功能
import System from '../ecs/System';
// 导入EntityManager类，用于管理实体
import EntityManager from '../ecs/EntityManager';
// 导入SceneComponent类，用于表示场景组件
import SceneComponent from '../ecs/SceneComponent';
// 导入Scene类，用于表示场景
import Scene from './Scene';
// 导入SceneLoaderSystem类，用于加载和卸载场景
import SceneLoaderSystem from './SceneLoaderSystem';

/**
 * SceneManagerSystem类负责管理游戏中的场景。
 * 它继承自System类，用于处理场景的更新、注册和切换。
 */
export default class SceneManagerSystem extends System {
    // 当前激活的场景组件
    private currentSceneComponent: SceneComponent | null;

    /**
     * 构造函数，初始化场景管理系统。
     * @param entityManager - 实体管理器，用于管理游戏中的实体。
     */
    constructor(entityManager: EntityManager) {
        // 调用父类的构造函数
        super(entityManager);
        // 初始化当前场景组件为null
        this.currentSceneComponent = null;
    }

    /**
     * 更新当前场景。
     * @param dt - 时间间隔，用于更新场景的逻辑。
     */
    update(dt: number): void {
        // 检查当前场景组件是否存在，并且该组件的场景是否存在
        if (this.currentSceneComponent && this.currentSceneComponent.getScene()) {
            // 调用当前场景的更新方法
            this.currentSceneComponent.getScene().update(dt);
        }
    }

    /**
     * 获取系统所需的组件列表。
     * @returns 所需组件的名称数组。
     */
    getRequiredComponents(): string[] {
        return ['SceneComponent'];
    }

    // 新增场景组件创建方法
    private createNewSceneComponent(scene: Scene): SceneComponent {
        const sceneComponent = new SceneComponent(scene);
        const entity = this.entityManager.createEntity();
        entity.addComponent(sceneComponent);
        return sceneComponent;
    }

    // 修改后的 registerScene 方法
    registerScene(scene: Scene): void {
        if (this.currentSceneComponent?.getScene() === scene) return;

        // 提取卸载逻辑到独立方法
        this.unloadCurrentScene();

        const sceneComponent = this.createNewSceneComponent(scene);
        this.getSceneLoaderSystem().loadScene(sceneComponent);
        this.currentSceneComponent = sceneComponent;
    }

    // 新增私有方法处理卸载逻辑
    private unloadCurrentScene(): void {
        if (!this.currentSceneComponent) return;

        const currentScene = this.currentSceneComponent.getScene();
        if (currentScene) {
            this.getSceneLoaderSystem().unloadScene(this.currentSceneComponent);
        }

        this.entityManager.getAllEntities().forEach(entity => {
            if (entity.hasComponent('SceneComponent')) {
                entity.removeComponent('SceneComponent');
            }
        });
    }

    /**
     * 切换到指定名称的场景。
     * @param sceneName - 要切换到的场景名称。
     */
    switchScene(sceneName: string): void {
        // 检查当前场景组件是否存在
        if (this.currentSceneComponent) {
            // 获取当前场景
            const scene = this.currentSceneComponent.getScene();
            // 检查当前场景是否已经是目标场景
            if (scene && scene.name === sceneName) {
                // 如果是，直接返回，不进行切换
                return;
            }
        }

        // 遍历所有实体
        this.entityManager.getAllEntities().forEach(entity => {
            // 检查实体是否包含场景组件
            if (entity.hasComponent('SceneComponent')) {
                // 获取实体的场景组件
                const sceneComponent = entity.getComponent<SceneComponent>('SceneComponent');
                if (sceneComponent) {
                    // 获取场景组件的场景
                    const scene = sceneComponent.getScene();
                    if (scene) {
                        // 卸载当前场景
                        this.getSceneLoaderSystem().unloadScene(sceneComponent);
                    }
                }
                // 移除实体的场景组件
                entity.removeComponent('SceneComponent');
            }
        });

        // 创建一个新的实体
        const entity = this.entityManager.createEntity();
        // 根据场景名称获取新的场景
        const newScene = this.entityManager.getSceneByName(sceneName);
        if (newScene) {
            // 创建一个新的场景组件
            const sceneComponent = new SceneComponent(newScene);
            // 为新实体添加场景组件
            entity.addComponent(sceneComponent);
            // 加载新场景
            this.getSceneLoaderSystem().loadScene(sceneComponent);
            // 设置当前场景组件为新的场景组件
            this.currentSceneComponent = sceneComponent;
        } else {
            // 如果未找到指定名称的场景，输出错误信息
            console.error(`Scene with name ${sceneName} not found.`);
        }
    }

    /**
     * 获取场景加载系统。
     * @returns 场景加载系统的实例。
     */
    private getSceneLoaderSystem(): SceneLoaderSystem {
        // 从系统管理器中获取场景加载系统
        return this.systemManager.getSystem<SceneLoaderSystem>(SceneLoaderSystem);
    }
}