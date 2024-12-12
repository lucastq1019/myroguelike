// 导入 GameEngine 类
import GameEngine from "./GameEngine/GameEngine";

// 导入 main.css 样式文件
import "./main.css";

// 创建一个新的 GameEngine 实例
const gameEngine = GameEngine.getInstance();


// 加载场景配置
// gameEngine.loadScenesFromConfig().catch(error => {
//     console.error("Failed to load scenes configuration:", error);
// });

console.log(gameEngine)