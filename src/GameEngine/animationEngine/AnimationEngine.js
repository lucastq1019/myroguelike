import Component from "../Component";
class AnimationEngine extends Component {

    update(dt) {
         // 遍历场景图中的所有游戏角色对象
         for (let object of this.gameEngine.sceneManager.currentScene.elements) {
            // 获取游戏角色对象的动画组件
            let animationComponent = object.getComponent("AnimationComponent");
            
            // 如果游戏角色对象有动画组件，则调用其 update 方法更新动画状态
            if (animationComponent) {
                animationComponent.update(dt);
            }
        }
    }
}

export default AnimationEngine