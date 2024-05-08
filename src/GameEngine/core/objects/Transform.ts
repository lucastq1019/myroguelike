import Vector2 from "../common/Vector2";

export default class Transform {
    position: Vector2; // 根据需要选择Vector2或Vector3
    rotation: number; // 通常用于表示角度，单位可能是度或弧度
    scale: Vector2; // 缩放因子

    constructor(position: Vector2 = new Vector2(), rotation: number = 0, scale: Vector2 = new Vector2(1, 1)) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }

    // 移动变换
    translate(offset: Vector2): void {
        if (this.position instanceof Vector2 && offset instanceof Vector2) {
            this.position = this.position.add(offset);
        } else {
            throw new Error("Incompatible vector types.");
        }
    }

    // 旋转（简化版，仅示例）
    rotate(amount: number): void {
    }

    // 缩放
    scaleBy(factor: Vector2): void {
        if (this.scale instanceof Vector2 && factor instanceof Vector2) {
            this.scale = new Vector2(this.scale.x * factor.x, this.scale.y * factor.y);
        } else {
            throw new Error("Incompatible vector types.");
        }
    }
}