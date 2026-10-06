import GameObject from '@/GameEngine/GameObject';
import ComponentFactory from '@/GameEngine/component/ComponentFactory';

class Player extends GameObject {
    constructor(gameEngine, x, y) {
        super(gameEngine);
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        

        // 创建并添加渲染组件
        this.addComponent(ComponentFactory.createRenderComponent(this,"blue"));
    }
}


export default Player