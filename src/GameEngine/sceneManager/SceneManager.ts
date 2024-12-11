// 导入核心对象Component
import Component from "../core/objects/Component";
// 导入渲染组件RenderComponent
import RenderComponent from '../core/objects/RenderComponent';
// 导入游戏引擎GameEngine
import GameEngine from "../GameEngine";
// 导入场景类Scene
import Scene from "./Scene";
// 导入渲染引擎RenderingEngine
import RenderingEngine from "../renderer/RenderingEngine";
import DynamicComponentFactory from '../../services/DynamicComponentFactory';

// 场景管理器类，用于处理场景的注册、切换和更新
class SceneManager {
    // 当前场景
    private currentScene: Scene | null;
    // 所有场景的集合
    private scenes: { [name: string]: Scene };
    // 事件调度器
    private eventDispatcher: any;
    // 渲染引擎实例
    private renderingEngine: RenderingEngine;

    // 构造函数，初始化SceneManager
    constructor(gameEngine: GameEngine) {
        this.currentScene = null;
        this.scenes = {};
        this.eventDispatcher = gameEngine.getEventDispatcher();
        this.renderingEngine = gameEngine.getRenderingEngine(); // 假设GameEngine提供渲染器实例
        console.log(this)
    }
    getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    // 注册一个场景
    registerScene(scene: Scene): void {
        this.scenes[scene.name] = scene;
        console.log(`Scene "${scene.name}" registered.`)
    }


    // 根据配置注册多个场景
    async registerScenesFromConfig(scenesConfig: any[]) {
        const factory = DynamicComponentFactory.getInstance();

        // for (const sceneConfig of scenesConfig) {
        //     // 验证配置项
        //     if (!sceneConfig.name || !Array.isArray(sceneConfig.components)) {
        //         console.error('Invalid scene configuration:', sceneConfig);
        //         continue;
        //     }

        //     try {
        //         const scene = new Scene(sceneConfig.name); // 假设Scene构造函数接受配置参数
        //         for (const componentName of sceneConfig.components) {
        //             const component = await factory.createComponent(componentName, {});
        //             if (component) {
        //                 scene.addComponent(component);
        //             }
        //         }

        //         this.registerScene(scene);
        //     } catch (error) {
        //         // 异常处理
        //         console.error(`Error registering scene ${sceneConfig.name}:`, error);
        //     }
        // }
    }

    // 切换到指定场景
    switchScene(sceneName: string): void {
        if (!sceneName) {
            console.error("Scene name[{sceneName}] cannot be empty.");
            return;
        }

        try {
            // 增加对 this.scenes 的检查
            if (!this.scenes) {
                console.error("Scenes collection is not initialized.");
                return;
            }

            const newScene = this.scenes[sceneName];
            if (!newScene) {
                console.error(`Scene with name ${sceneName} not found.`);
                return;
            }

            this.unloadCurrentScene();
            this.loadNewScene(newScene);
            this.updateCurrentScene(newScene);

            this.eventDispatcher.dispatchEvent({
                type: 'sceneSwitchEnd',
                newScene,
            });
        } catch (error: any) {
            // 改进异常处理
            console.error(`Error switching scenes: ${error.message}`);
            console.error(`Stack trace: ${error.stack}`);

            // 考虑是否需要重新抛出异常
            throw error;
        }
    }

    // 卸载当前场景
    private unloadCurrentScene(): void {
        if (this.currentScene) {
            const renderComponents = this.currentScene.getComponents().filter((component) => component instanceof RenderComponent);
            // renderComponents.forEach((component) => this.renderingEngine.removeRenderComponent(component));

            if (typeof this.currentScene.onUnload === 'function') {
                this.currentScene.onUnload();
            }

            this.eventDispatcher.dispatchEvent({
                type: 'sceneSwitchStart',
                oldScene: this.currentScene,
            });
        }
    }

    // 加载新场景
    private loadNewScene(newScene: Scene): void {
        if (typeof newScene.load === 'function') {
            newScene.load();
        }
    }

    // 更新当前场景
    private updateCurrentScene(newScene: Scene): void {
        const renderComponents = newScene.getComponents().filter((component) => component instanceof RenderComponent);
        // renderComponents.forEach((component) => this.renderingEngine.addRenderComponent(component));

        this.currentScene = newScene;
    }

    // 更新场景，每帧调用
    update(dt: number): void {
        if (this.currentScene && typeof this.currentScene.update === 'function') {
            (this.currentScene.update as Scene['update'])(dt);
        }
    }
}

export default SceneManager;