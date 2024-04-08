// 假设这里存在一些基础库或接口定义，例如：
import Component  from '../Component';
import CanvasManager from './CanvasManager';


/**
 * 渲染组件接口，定义了所有渲染组件应具备的基本方法。
 */
export default interface RenderComponent extends Component{
  // ... 可能存在的属性定义 ...

  /**
   * 渲染当前组件到指定的 CanvasManager 上。
   * @param {CanvasManager} canvasManager - 渲染目标的 CanvasManager 实例。
   */
  render(canvasManager: CanvasManager): void;
}

