import Vector2 from "../core/common/Vector2";
import EcsComponent from "../ecs/EcsComponent";
import Entity from "../ecs/Entity";

interface Camera2DConfig {
  position?: Vector2;
  scale?: number;
  size?: Vector2;
  targetEntityId?: string; // 改为使用实体ID跟踪目标
}

class Camera2D extends EcsComponent {
  position: Vector2;
  scale: number;
  size: Vector2;
  viewMatrix: number[][];
  private targetEntityId: string | null = null;

  constructor(config: Camera2DConfig = {}) {
    super('Camera2D'); // 添加组件名称
    this.position = config.position ?? new Vector2(0, 0);
    this.scale = config.scale ?? 1;
    this.size = config.size ?? new Vector2(800, 600);
    this.targetEntityId = config.targetEntityId ?? null;
    this.viewMatrix = this.calculateViewMatrix();
  }

  // 改为通过实体ID设置目标
  setTargetEntity(entity: Entity | null): void {
    this.targetEntityId = entity?.id ?? null;
  }

  // 添加ECS组件必需的update方法
  update(dt: number): void {
    if (this.targetEntityId) {
      const target = this.entity?.manager?.getEntity(this.targetEntityId);
      if (target) {
        const transform = target.getComponent<Transform>('Transform');
        if (transform) {
          this.setPosition(transform.position);
        }
      }
    }
    this.updateViewMatrix();
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

  // 添加序列化方法用于ECS系统
  serialize(): any {
    return {
      position: this.position.serialize(),
      scale: this.scale,
      size: this.size.serialize(),
      targetEntityId: this.targetEntityId
    };
  }

  // 添加反序列化方法
  deserialize(data: any): void {
    this.position.deserialize(data.position);
    this.scale = data.scale;
    this.size.deserialize(data.size);
    this.targetEntityId = data.targetEntityId;
  }
}

export default Camera2D;