import type { ComponentConfig } from '../types';  // 更新类型引用路径

export default abstract class Component {
  name: string;
  gameObject: GameObject;

  constructor(config: ComponentConfig = {
    name: '',
    gameObject: new GameObject
  }) {
    this.name = config.name ?? "";
    this.gameObject = config.gameObject ?? "";
  }

  abstract update(dt: number): void;
}