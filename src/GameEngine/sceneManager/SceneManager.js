import Component from "../Component";
import Scene from "./Scene";
class SceneManager extends Component{
    constructor(gameEngine) {
        super(gameEngine)
        this.currentScene = new Scene("main");
        this.scenes = {};
        // this.objects=[]
    }

    registerScene(scene) {
        this.scenes[scene.name] = scene;
    }

    switchScene(sceneName) {
        const newScene = this.scenes[sceneName];
        if (newScene) {
            if (this.currentScene) {
                // 清除所有元素
                this.currentScene.clearElement()
            }

            // 新场景的加载工作
            newScene.load();

            this.currentScene = newScene;
        }
    }
    update(dt){
        this.currentScene.update(dt)
    }
}

export default SceneManager