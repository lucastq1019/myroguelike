export default class Vector2 {

    x: number;
    y: number;
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    // 加上另一个向量
    add(vector: Vector2) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }
    // 加上另一个向量
    sub(vector: Vector2) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }
    static add(a: Vector2, b: Vector2) {
        return new Vector2(a.x + b.x, a.y + b.y)
    }

    // 除以一个标量，反向不变
    div(scale: number) {
        this.x /= scale;
        this.y /= scale;
        return this;
    }
    mul(scale: number) {
        this.x *= scale
        this.y *= scale
        return this
    }

    // 计算向量的长度
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // 求单位向量
    normalize() {
        let m = this.mag();
        if (m !== 0) {
            return this.div(m);
        }
        return this;
    }
    clone() {
        return new Vector2(this.x, this.y)
    }

    /**
     * 设置向量的x和y值
     * @param position 包含x和y属性的对象或Vector2实例
     */
    set(position: Vector2|{x: number, y: number}) {
        this.x = position.x
        this.y = position.y
    }

    /**
     * 序列化向量
     * @returns 包含x和y属性的普通对象
     */
    serialize(): {x: number, y: number} {
        return {x: this.x, y: this.y};
    }

    /**
     * 反序列化向量
     * @param data 包含x和y属性的普通对象
     */
    deserialize(data: {x: number, y: number}): void {
        if (data) {
            this.x = data.x || 0;
            this.y = data.y || 0;
        }
    }
}