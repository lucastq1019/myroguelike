// 导入 GameEngine 类
import GameEngine from "./GameEngine/GameEngine";

// 导入 main.css 样式文件
import "./main.css";

// 创建一个新的 GameEngine 实例
const gameEngine = GameEngine.getInstance();

// 初始化场景管理器
gameEngine.init();

// 加载场景配置
gameEngine.loadScenesFromConfig().catch(error => {
    console.error("Failed to load scenes configuration:", error);
});

// 初始化动画循环的上一帧时间戳
let lastTime = performance.now();

