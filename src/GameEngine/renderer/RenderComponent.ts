// 假设这里存在一些基础库或接口定义，例如：
import Component  from '../core/objects/Component';
import GameObject from '../core/objects/GameObject';
import CanvasManager from './CanvasManager';


/**
 * 渲染组件接口，定义了所有渲染组件应具备的基本方法。
 */
export default abstract class RenderComponent extends Component{
  /**
   * 渲染当前组件到指定的 CanvasManager 上。
   * @param {CanvasManager} canvasManager - 渲染目标的 CanvasManager 实例。
   */
  abstract render(canvasManager: CanvasManager): void;
}

