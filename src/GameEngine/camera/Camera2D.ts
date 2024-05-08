import Component from "../core/objects/Component";
import Vector2 from "../core/common/Vector2";
import ComponentConfig from "../core/objects/ComponentConfig";

interface Camera2DConfig  extends ComponentConfig{
  position?: Vector2;
  scale?: number;
  size?: Vector2;
}

class Camera2D extends Component {
  position: Vector2;
  scale: number;
  size: Vector2;

  constructor(config: Camera2DConfig ) {
    super(config);
    this.position = config.position || new Vector2(0, 0);
    this.scale = config.scale || 1;
    this.size = config.size || new Vector2(800, 600);
  }

  setPosition(position: Vector2): void {
    this.position.set(position);
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  update(dt: number): void {
    // 可能需要在这里添加一些动态相机行为，如跟随特定对象
  }

  getViewMatrix(): number[][] {
    const x = this.position.x;
    const y = this.position.y;
    const scale = this.scale;

    return [
      [scale, 0, -x * scale], // 第一行
      [0, scale, -y * scale], // 第二行
      [0, 0, 1],              // 第三行
    ];
  }
}

export default Camera2D;