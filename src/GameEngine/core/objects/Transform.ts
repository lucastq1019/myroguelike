import Vector2 from "../common/Vector2";

interface TransformOptions {
    position?: Vector2;
    rotation?: number;
    scale?: Vector2;
}

export default class Transform {
    position: Vector2;
    rotation: number;
    scale: Vector2;

    constructor(options: TransformOptions = {}) {
        this.position = options.position ?? new Vector2();
        this.rotation = options.rotation ?? 0;
        this.scale = options.scale ?? new Vector2(1, 1);
    }

    // 移动变换
    translate(offset: Vector2): void {
        this.position = this.position.add(offset);
    }

    // 旋转（简化版，仅示例）
    rotate(amount: number): void {
        this.rotation += amount;
    }

    // 缩放
    scaleBy(factor: Vector2): void {
        this.scale = new Vector2(this.scale.x * factor.x, this.scale.y * factor.y);
    }

    // 获取当前变换矩阵（简化版，仅示例）
    getTransformMatrix(): number[][] {
        const cosTheta = Math.cos(this.rotation);
        const sinTheta = Math.sin(this.rotation);
        const scaleX = this.scale.x;
        const scaleY = this.scale.y;

        return [
            [cosTheta * scaleX, -sinTheta * scaleX, this.position.x],
            [sinTheta * scaleY, cosTheta * scaleY, this.position.y],
            [0, 0, 1]
        ];
    }
}