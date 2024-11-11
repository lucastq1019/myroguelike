import ComponentConfig from './ComponentConfig';
import GameObject from './GameObject';

/**
 * 抽象类 Component 表示游戏中的组件
 */
export default abstract class Component {
  name: string;
  gameObject: GameObject;

  constructor(config: ComponentConfig) {
    this.name = config.name;
    this.gameObject = config.gameObject;
  }

  abstract update(dt: number): void;


}