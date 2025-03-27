import CanvasManager from '../../renderer/CanvasManager';
import IRenderable from '../ability/IRenderable';
import EcsComponent from 'src/GameEngine/ecs/EcsComponent';

export default abstract class RenderComponent extends EcsComponent implements IRenderable {
  constructor(name: string, public zIndex: number = 0) {
    super();  // 明确传递name参数给父类Component
  }

  abstract render(canvasManager: CanvasManager): void;
}