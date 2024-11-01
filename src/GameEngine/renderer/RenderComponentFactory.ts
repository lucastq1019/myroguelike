import RenderComponent from "src/GameEngine/renderer/RenderComponent";
import ButtonRenderComponent from "src/GameEngine/renderer/ButtonRenderComponent";
import GameObject from "src/GameEngine/core/objects/GameObject";
import ComponentConfig from "../core/objects/ComponentConfig";

export default class RenderComponentFactory {
    private static instance: RenderComponentFactory;

    private constructor() { }

    static getInstance(): RenderComponentFactory {
        if (!RenderComponentFactory.instance) {
            RenderComponentFactory.instance = new RenderComponentFactory();
        }
        return RenderComponentFactory.instance;
    }

    createRenderComponent(config: ComponentConfig): RenderComponent {
        switch (type) {
            case 'button':
                return new ButtonRenderComponent(text, gameObject);
            // 可以在这里添加更多类型的组件
            default:
                throw new Error(`Unknown render component type: ${type}`);
        }
    }
}