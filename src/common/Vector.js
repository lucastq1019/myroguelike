class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    // 加上另一个向量
    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }
    // 加上另一个向量
    sub(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }
    static add(a, b) {
        return new Vector(a.x + b.x, a.y + b.y)
    }

    // 除以一个标量，反向不变
    div(scale) {
        this.x /= scale;
        this.y /= scale;
        return this;
    }
    mul(scale) {
        this.x *=scale
        this.y *=scale
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
        return new Vector(this.x, this.y)
    }
}

export default Vector