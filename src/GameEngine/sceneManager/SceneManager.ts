import Component from "../core/objects/Component";
import RenderComponent from '../renderer/RenderComponent';
import GameEngine from "../GameEngine";
import Scene from "./Scene";
import RenderingEngine from "../renderer/RenderingEngine";

class SceneManager {
    private currentScene: Scene | null;
    private scenes: { [name: string]: Scene };
    private eventDispatcher: any;
    private renderingEngine: RenderingEngine;

    constructor(gameEngine: GameEngine) {
        this.currentScene = null;
        this.scenes = {};
        this.eventDispatcher = gameEngine.getEventDispatcher();
        this.renderingEngine = gameEngine.getRenderingEngine(); // 假设GameEngine提供渲染器实例
    }

    registerScene(scene: Scene): void {
        this.scenes[scene.name] = scene;
        scene.getComponents().forEach((component) => {
            if (component instanceof RenderComponent) {
                this.renderingEngine.addRenderComponent(component);
            }
        });
    }
    registerScenesFromConfig(scenesConfig: any[]): void {
        scenesConfig.forEach(sceneConfig => {
          const scene = new Scene(sceneConfig.name); // 假设Scene构造函数接受配置参数
          this.registerScene(scene);
        });
      }

    switchScene(sceneName: string): void {
        if (!sceneName) {
            console.error("Scene name cannot be empty.");
            return;
        }

        try {
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
        } catch (error) {
            console.error(`Error switching scenes: ${error}`);
        }
    }

    private unloadCurrentScene(): void {
        if (this.currentScene) {
            const renderComponents = this.currentScene.getComponents().filter((component) => component instanceof RenderComponent);
            renderComponents.forEach((component) => this.renderingEngine.removeRenderComponent(component));

            if (typeof this.currentScene.onUnload === 'function') {
                this.currentScene.onUnload();
            }

            this.eventDispatcher.dispatchEvent({
                type: 'sceneSwitchStart',
                oldScene: this.currentScene,
            });
        }
    }

    private loadNewScene(newScene: Scene): void {
        if (typeof newScene.load === 'function') {
            newScene.load();
        }
    }

    private updateCurrentScene(newScene: Scene): void {
        const renderComponents = newScene.getComponents().filter((component) => component instanceof RenderComponent);
        renderComponents.forEach((component) => this.renderingEngine.addRenderComponent(component));

        this.currentScene = newScene;
    }

    update(dt: number): void {
        if (this.currentScene && typeof this.currentScene.update === 'function') {
            (this.currentScene.update as Scene['update'])(dt);
        }
    }
}

export default SceneManager;