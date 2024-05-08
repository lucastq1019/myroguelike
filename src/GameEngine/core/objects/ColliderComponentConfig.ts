import Collider from './Collider';
import ComponentConfig from './ComponentConfig';


export default interface ColliderComponentConfig extends ComponentConfig {
  collider: Collider;
}
