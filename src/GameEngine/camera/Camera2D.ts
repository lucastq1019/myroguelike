import Component from "../core/objects/Component";
import Vector2 from "../core/common/Vector2";
import ComponentConfig from "../core/objects/ComponentConfig";

/**
 * 相机组件配置 
 */
interface Camera2DConfig extends ComponentConfig {
  position?: Vector2;
  scale?: number;
  size?: Vector2;
}
/**
 * 2D 相机组件
 */
class Camera2D extends Component {
  position: Vector2;
  scale: number;
  size: Vector2;

  constructor(config: Camera2DConfig={}) {
    super(config);
    this.position = config.position ?? new Vector2(0, 0);
    this.scale = config.scale ?? 1;
    this.size = config.size ?? new Vector2(800, 600);
  }

  /**
   * 设置相机的位置
   * @param position 新的位置
   */
  setPosition(position: Vector2): void {
    this.position.set(position);
  }

  /**
   * 设置相机的缩放比例
   * @param scale 新的缩放比例
   */
  setScale(scale: number): void {
    this.scale = scale;
  }

  /**
   * 更新相机状态
   * @param dt 时间间隔
   */
  update(dt: number): void {
    // 可能需要在这里添加一些动态相机行为，如跟随特定对象
  }

  /**
   * 获取相机的视图矩阵
   * @returns 视图矩阵
   */
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