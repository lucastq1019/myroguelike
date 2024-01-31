import Component from "../Component";
import World2d from "./box2d/World2d"
import Vec2 from './box2d/common/Vec2';
class PhysicsEngine extends Component {
    constructor(gameEngine) {
        super(gameEngine)
        // 创建 Box2D 世界
        // this.world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, -10), true);
        // this.world = new World2d(new Vec2(0,.98))
        // this.world.addPlayer({})
    }

    update(dt) {
        // 更新 Box2D 世界
        // this.world.step(dt);
    }
}

export default PhysicsEngine