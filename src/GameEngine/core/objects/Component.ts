import ComponentConfig from './ComponentConfig';
import GameObject from './GameObject';

/**
 * 抽象类 Component 表示游戏中的组件
 */
export default abstract class Component {
  name: string;
  gameObject: GameObject;
  onClick: () => void;

  constructor(config: ComponentConfig) {
    this.name = config.name;
    this.gameObject = config.gameObject;
    this.onClick = config.onClick || (() => {});
  }

  abstract update(dt: number): void;

  /**
   * 触发点击事件
   */
  triggerClick(): void {
    if (this.onClick) {
      this.onClick();
    }
  }
}