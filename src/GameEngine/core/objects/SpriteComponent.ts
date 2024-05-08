import Component from "./Component";
import { SpriteComponentConfig } from "./SpriteComponentConfig";

export class SpriteComponent extends Component {
  sprite: any; // 图片、纹理或其他图形资源

  constructor(config: SpriteComponentConfig) {
    super(config);
    this.sprite = config.sprite;
  }

  update() {
    // 在这里实现组件的更新逻辑，例如根据Transform更新精灵的位置
    const transform = this.gameObject.transform;
    // 更新精灵的位置、旋转等
    
  }
}