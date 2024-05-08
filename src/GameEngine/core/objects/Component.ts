import ComponentConfig from './ComponentConfig';
import GameObject from './GameObject';

export default abstract class Component {
  name: string;
  gameObject: GameObject;

  constructor(config: ComponentConfig) {
    this.name = config.name;
    this.gameObject = config.gameObject;
  }

  abstract update(dt: number): void;


}