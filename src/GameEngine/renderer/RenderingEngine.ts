// renderer/RenderingEngine.ts

import CanvasManager from './CanvasManager';
import RenderComponent from './RenderComponent';
import GameEngine from '../GameEngine';
import Camera2D from '../camera/Camera2D';

class RenderingEngine {
  private gameEngine: GameEngine; // 替换为实际的游戏引擎类型
  private canvasManager: CanvasManager;
  private renderComponents: RenderComponent[];
  private activeCamera: Camera2D | null = null;

  constructor(gameEngine: GameEngine) { // 替换为实际的游戏引擎类型
    this.gameEngine = gameEngine;
    this.canvasManager = new CanvasManager();
    this.renderComponents = [];
    this.activeCamera = gameEngine.getActiveCamera(); // 假设GameEngine有一个方法来获取当前活动的相机
  }

  /**
   * 向引擎添加渲染组件。
   * @param {RenderComponent} component - 待添加的组件。
   * @throws {Error} 如果组件不是 RenderComponent 类的实例。
   */
  addRenderComponent(component: RenderComponent) { // 替换为实际的组件类型
    this.renderComponents.push(component);
  }

  /**
   * 从引擎中移除渲染组件。
   * @param {RenderComponent} component - 待移除的组件。
   */
  removeRenderComponent(component: RenderComponent) { // 替换为实际的组件类型
    const index = this.renderComponents.indexOf(component);
    if (index !== -1) {
      this.renderComponents.splice(index, 1);
    }
  }

  /**
  * 更新用于渲染的视图矩阵。
  * @param {number[][]} viewMatrix - 新的视图矩阵，应为一个 3x3 数组，代表 2D 变换矩阵。
  */
  updateViewMatrix(viewMatrix: number[][]) {
    if (this.canvasManager.ctx && viewMatrix.length === 3 && viewMatrix[0].length === 3) {
      this.canvasManager.ctx.transform(
        viewMatrix[0][0], // a
        viewMatrix[1][0], // b
        viewMatrix[0][1], // c
        viewMatrix[1][1], // d
        viewMatrix[0][2], // e
        viewMatrix[1][2]  // f
      );
    } else {
      console.error('CanvasManager不存在上下文环境或viewMatrix格式不正确');
    }
  }

  /**
   * 渲染所有已注册的渲染组件。
   */
  render() {
    this.canvasManager.clear();

    if (this.activeCamera) {
      const viewMatrix = this.activeCamera.getViewMatrix();
      this.updateViewMatrix(viewMatrix);

      this.renderComponents.forEach((component: RenderComponent) => {
        component.render(this.canvasManager);
      });
    } else {
      console.warn('No active camera found, rendering skipped.');
    }
  }
}

export default RenderingEngine;