import GameEngine from './GameEngine'; // 假设 GameEngine 类型已定义

// 定义 Component 类
abstract class Component {
  // 使用 readonly 修饰符确保 gameEngine 属性只读
  readonly gameEngine: GameEngine;

  // 构造函数接受 GameEngine 类型参数和组件配置
  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
  }

  // 更新方法添加返回值类型 void，并使用抽象方法（abstract）要求子类必须实现
  abstract update(deltaTime: number): void;
}

export default Component;