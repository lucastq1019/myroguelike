import StartScene from "./Scene/impl/StartScene";
import MainScene from "./Scene/impl/MainScene";

class Game {
    constructor() {
        // 创建canvas元素
        this.canvas = document.createElement("canvas");
        // 初始化游戏的宽度和高度
        this.width = 0;
        this.height = 0;
        // 获取canvas的上下文
        this.ctx = null;
        // 创建默认场景对象
        this.scene = new MainScene(this); // 默认场景为MainScene
        // 初始化canvas
        this.initCanvas();
        // 初始化事件
        this.initEvent();
    }

    // 初始化canvas
    initCanvas() {
        // 获取canvas元素
        const canvas = this.canvas;
        // 获取设备像素比
        const devicePixelRatio = window.devicePixelRatio;
        // 获取body元素
        const body = document.body;

        // 根据设备像素比设置canvas的宽度和高度
        canvas.width = document.documentElement.clientWidth * devicePixelRatio;
        canvas.height = document.documentElement.clientHeight * devicePixelRatio;
        // 根据设备像素比设置canvas的样式
        canvas.style.width = `${canvas.width / devicePixelRatio}px`;
        canvas.style.height = `${canvas.height / devicePixelRatio}px`;
        // 将canvas添加到body元素中
        body.appendChild(canvas);

        // 获取canvas的上下文
        this.ctx = canvas.getContext("2d");
        // 根据设备像素比进行缩放
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        // 更新游戏的宽度和高度
        this.width = canvas.width / devicePixelRatio;
        this.height = canvas.height / devicePixelRatio;
    }

    // 初始化事件
    initEvent() {
        // 监听点击事件
        document.addEventListener("click", (event) => {
            this.scene.onclick(event);
        });
    }

    // 渲染一帧
    frameRun(deltaTime) {
        // 执行逻辑更新
        this.logic(deltaTime);
        // 清除画布
        this.clear();
        // 绘制场景
        this.draw();
    }

    // 清除画布
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    // 执行逻辑更新
    logic(deltaTime) {
        this.scene.logic(deltaTime);
    }

    // 绘制场景
    draw() {
        this.scene.draw();
    }
}

// 创建游戏对象
const game = new Game();
// 导出游戏对象
export default game;