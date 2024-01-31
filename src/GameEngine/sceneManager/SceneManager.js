// 场景管理器（SceneManager.js）
import Component from "../Component";

class SceneManager extends Component {
    constructor(gameEngine) {
        super(gameEngine);
        this.currentScene = null;
        this.scenes = {};
        this.eventDispatcher = gameEngine.getEventDispatcher(); // 假设引擎提供了事件分发器
    }

    registerScene(scene) {
        scene.sceneManager = this; // 将场景管理器引用传递给场景，便于场景内部操作
        this.scenes[scene.name] = scene;
    }

    switchScene(sceneName) {
        const newScene = this.scenes[sceneName];
        if (newScene) {
            if (this.currentScene) {
                this.currentScene.onUnload(); // 卸载当前场景
                this.eventDispatcher.dispatchEvent({ type: 'sceneSwitchStart', oldScene: this.currentScene, newScene });
            }

            newScene.load();
            this.currentScene = newScene;
            this.eventDispatcher.dispatchEvent({ type: 'sceneSwitchEnd', newScene });

            // 确保更新当前场景
            this.update(dt => this.currentScene.update(dt));
        } else {
            console.error(`Scene with name ${sceneName} not found.`);
        }
    }

    update(dt) {
        if (this.currentScene) {
            this.currentScene.update(dt);
        }
    }
}
export default SceneManager;