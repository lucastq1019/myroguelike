import Component from "../core/objects/Component";
import GameEngine from "../GameEngine";
import Scene from "./Scene";

class SceneManager extends Component {
    private currentScene: Scene | null;
    private scenes: { [name: string]: Scene };
    private eventDispatcher: any;

    constructor(gameEngine: GameEngine) {
        super(gameEngine);
        this.currentScene = null;
        this.scenes = {};
        this.eventDispatcher = gameEngine.getEventDispatcher(); // 假设引擎提供了事件分发器
    }

    registerScene(scene: Scene): void {
        // scene.sceneManager = this; // 将场景管理器引用传递给场景，便于场景内部操作
        this.scenes[scene.name] = scene;
    }

    switchScene(sceneName: string): void {
        const newScene = this.scenes[sceneName];
        if (newScene) {
            if (this.currentScene) {
                if (typeof this.currentScene.onUnload === 'function') {
                    this.currentScene.onUnload(); // 卸载当前场景
                }
                this.eventDispatcher.dispatchEvent({
                    type: 'sceneSwitchStart',
                    oldScene: this.currentScene,
                    newScene,
                });
            }

            if (typeof newScene.load === 'function') {
                newScene.load();
            }
            this.currentScene = newScene;
            this.eventDispatcher.dispatchEvent({ type: 'sceneSwitchEnd', newScene });
        } else {
            console.error(`Scene with name ${sceneName} not found.`);
        }
    }

    update(dt: number): void {
        if (this.currentScene && typeof this.currentScene.update === 'function') {
          (this.currentScene.update as Scene['update'])(dt);
        }
      }
}

export default SceneManager;