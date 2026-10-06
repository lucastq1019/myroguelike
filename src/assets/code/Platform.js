import GameObject from '@/GameEngine/GameObject';
import ComponentFactory from '@/GameEngine/component/ComponentFactory';

class Platform extends GameObject {
    constructor(gameEngine, x, y, width, height) {
        super(gameEngine);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 0.01   

        // 创建并添加渲染组件
        this.addComponent(ComponentFactory.createRenderComponent(gameEngine, this, "black"));

        // 添加移动脚本
        this.moveScript = `
         this.x += this.speed * dt;
         if (this.x <= 0 || this.x + this.width >= 300) {
             this.speed = -this.speed;
         }`
         ;
    }
    update(dt) {
        eval(this.moveScript)

       // 更新碰撞检测和显示分数
    //    this.getComponent('collision').update();
    //    this.getComponent('score').update();
    }
}

export default Platform