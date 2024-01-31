import Component from "../Component";
class Camera2D extends Component {
    constructor(x = 0, y = 0, scale = 1,width = 800, height = 600) {
        super({})
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.width = width;  // 添加宽度属性
        this.height = height;  // 添加高度属性
    }
  
    
    // 设置摄像机的位置
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    // 设置摄像机的缩放级别
    setScale(scale) {
        this.scale = scale;
    }

    // 更新摄像机的位置
    update(dt) {

    }

    // 获取摄像机的视图矩阵
    getViewMatrix() {
        return [
            [this.scale, 0, -this.x * this.scale],  // 第一行
            [0, this.scale, -this.y * this.scale],  // 第二行
            [0, 0, 1]                               // 第三行
        ];
    }
}
export default Camera2D