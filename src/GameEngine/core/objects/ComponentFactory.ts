import RenderComponent from "./RenderComponent";
import ButtonRenderComponent from "../../renderer/ButtonRenderComponent";
import GameObject from "./GameObject";
import ComponentConfig from "./ComponentConfig";
import ImageRenderComponent from "src/GameEngine/renderer/ImageRenderComponent";
import ImageRenderConfig from "./ImageRenderConfig";

export default class ComponentFactory {
    private static instance: ComponentFactory;

    private constructor() { }

    static getInstance(): ComponentFactory {
        if (!ComponentFactory.instance) {
            ComponentFactory.instance = new ComponentFactory();
        }
        return ComponentFactory.instance;
    }

    createButtonRenderComponent(config: ComponentConfig): ButtonRenderComponent {
        return new ButtonRenderComponent(config);
    }

    createImageRenderComponent(config: ImageRenderConfig): ImageRenderComponent {
        return new ImageRenderComponent(config);
    }
}