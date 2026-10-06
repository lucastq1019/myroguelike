import EcsComponent from '../EcsComponent';
import Vector2 from '../../core/common/Vector2';

/**
 * 变换组件
 * 负责实体的位置、旋转和缩放
 */
class Transform extends EcsComponent {
    position: Vector2;
    rotation: number;
    scale: Vector2;

    constructor() {
        super();
        this.position = new Vector2(0, 0);
        this.rotation = 0;
        this.scale = new Vector2(1, 1);
    }

    /**
     * 更新变换组件
     * @param dt 时间步长
     */
    update(dt: number): void {
        // Transform组件通常不需要复杂的更新逻辑
        // 主要是提供数据给其他系统使用
    }

    /**
     * 设置位置
     * @param x 横坐标
     * @param y 纵坐标
     */
    setPosition(x: number, y: number): void {
        this.position.set({x, y});
    }

    /**
     * 设置旋转角度
     * @param angle 角度（弧度）
     */
    setRotation(angle: number): void {
        this.rotation = angle;
    }

    /**
     * 设置缩放
     * @param x 水平缩放
     * @param y 垂直缩放
     */
    setScale(x: number, y: number): void {
        this.scale.set({x, y});
    }

    /**
     * 序列化组件数据
     * @returns 序列化后的数据
     */
    serialize(): {position: {x: number, y: number}, rotation: number, scale: {x: number, y: number}} {
        return {
            position: this.position.serialize(),
            rotation: this.rotation,
            scale: this.scale.serialize()
        };
    }

    /**
     * 反序列化组件数据
     * @param data 序列化的数据
     */
    deserialize(data: any): void {
        if (data.position) {
            this.position.deserialize(data.position);
        }
        if (data.rotation !== undefined) {
            this.rotation = data.rotation;
        }
        if (data.scale) {
            this.scale.deserialize(data.scale);
        }
    }
}

export default Transform;