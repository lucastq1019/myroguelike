// ColliderComponent.ts
import Component from './Component';
import Collider from './Collider';
import ColliderComponentConfig from './ColliderComponentConfig';

export default class ColliderComponent extends Component {
  collider: Collider;

  constructor(config: ColliderComponentConfig) {
    super(config);
    this.collider = config.collider;
  }

  update() {
    // 检测与其他碰撞器的碰撞
    for (const other of this.gameObject.scene.colliders) {
      if (other !== this.collider && this.collider.checkCollision(other)) {
        // 处理碰撞事件
        this.gameObject.onCollisionDetected(other);
      }
    }
  }

  onCollisionDetected(other: Collider) {
    // 处理碰撞事件
    this.gameObject.transform.position.x += 10;
    this.gameObject.transform.position.y += 10;
  }
}