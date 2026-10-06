import Component from "../core/objects/Component";
import AnimationComponent from "../core/objects/AnimationComponent";

class AnimationEngine extends Component {

    update(dt: number) {
        // 遍历场景图中的所有游戏角色对象
        for (let object of this.gameEngine.sceneManager.currentScene.elements) {
            // 获取游戏角色对象的动画组件
            let animationComponent = object.getComponent("AnimationComponent") as AnimationComponent;

            // 如果游戏角色对象有动画组件，则调用其 update 方法更新动画状态
            if (animationComponent) {
                animationComponent.update(dt);
            }
        }
    }
}

export default AnimationEngine;