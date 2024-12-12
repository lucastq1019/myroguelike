import Component from "../core/objects/Component";
import Vector2 from "../core/common/Vector2";
import ComponentConfig from "../core/objects/ComponentConfig";
import GameObject from "../core/objects/GameObject";

/**
 * 相机组件配置 
 */
interface Camera2DConfig extends ComponentConfig {
  position?: Vector2;
  scale?: number;
  size?: Vector2;
  target?: GameObject; // 跟踪的目标对象
}

/**
 * 2D 相机组件
 */
class Camera2D extends Component {
  position: Vector2;
  scale: number;
  size: Vector2;
  target: GameObject | null; // 跟踪的目标对象
  viewMatrix: number[][]; // 缓存的视图矩阵

  constructor(config: Camera2DConfig = {
    onClick: function (): void {
    },
    name: "",
    gameObject: null
  }) {
    super(config);
    this.position = config.position ?? new Vector2(0, 0);
    this.scale = config.scale ?? 1;
    this.size = config.size ?? new Vector2(800, 600);
    this.target = config.target ?? null;
    this.viewMatrix = this.calculateViewMatrix();
  }

  /**
   * 设置相机的位置
   * @param position 新的位置
   */
  setPosition(position: Vector2): void {
    this.position.set(position);
    this.updateViewMatrix();
  }

  /**
   * 设置相机的缩放比例
   * @param scale 新的缩放比例
   */
  setScale(scale: number): void {
    this.scale = scale;
    this.updateViewMatrix();
  }

  /**
   * 设置相机跟踪的目标对象
   * @param target 跟踪的目标对象
   */
  setTarget(target: GameObject | null): void {
    this.target = target;
  }

  /**
   * 平滑移动到指定位置
   * @param targetPosition 目标位置
   * @param duration 移动时间（毫秒）
   */
  smoothMoveTo(targetPosition: Vector2, duration: number): void {
    const startTime = Date.now();
    const startPosition = this.position.clone();

    const move = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        this.setPosition(targetPosition);
        return;
      }
      const t = elapsed / duration;
      const newPosition = startPosition.lerp(targetPosition, t);
      this.setPosition(newPosition);
      requestAnimationFrame(move);
    };

    move();
  }

  /**
   * 更新相机状态
   * @param dt 时间间隔
   */
  update(dt: number): void {
    if (this.target) {
      this.setPosition(this.target.position);
    }
    this.updateViewMatrix();
  }

  /**
   * 获取相机的视图矩阵
   * @returns 视图矩阵
   */
  getViewMatrix(): number[][] {
    return this.viewMatrix;
  }

  private calculateViewMatrix(): number[][] {
    const x = this.position.x;
    const y = this.position.y;
    const scale = this.scale;

    return [
      [scale, 0, -x * scale], // 第一行
      [0, scale, -y * scale], // 第二行
      [0, 0, 1],              // 第三行
    ];
  }

  private updateViewMatrix(): void {
    this.viewMatrix = this.calculateViewMatrix();
  }
}

export default Camera2D;