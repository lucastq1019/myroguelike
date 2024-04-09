// 导入 GameEngine 类
import GameEngine from "./GameEngine/GameEngine";

// 导入 main.css 样式文件
import "./main.css";

// 创建一个新的 GameEngine 实例
let gameEngine = new GameEngine();

// 初始化动画循环的上一帧时间戳
let lastTime = 1;

// 定义并启动动画循环函数
(function animloop(timestamp) {
    // 计算当前帧与上一帧的时间差（deltalTime，用于游戏逻辑和渲染的更新速度控制）
    const deltaTime = timestamp - lastTime;

    // 更新上一帧时间戳为当前帧时间戳
    lastTime = timestamp;

    // 调用 GameEngine 的 update 方法，传入时间差以进行游戏逻辑更新
    gameEngine.update(deltaTime);

    // 调用 GameEngine 的 render 方法进行画面渲染
    gameEngine.render();

    // 使用 requestAnimationFrame 进行下一帧动画的调度
    window.requestAnimationFrame(animloop);
})(0); // 立即执行一次 animloop 函数作为动画循环的起点，传入初始时间戳 0