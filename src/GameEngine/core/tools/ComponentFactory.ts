import RenderComponent from "../objects/RenderComponent";
import ButtonRenderComponent from "../../renderer/ButtonRenderComponent";
import GameObject from "../objects/GameObject";
import ComponentConfig from "../objects/ComponentConfig";
import ImageRenderComponent from "../../renderer/ImageRenderComponent";
import ImageRenderConfig from "../objects/ImageRenderConfig";

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
    createPanelRenderComponent(config: { gameObject: GameObject; width: number; height: number; name: string }): PanelRenderComponent {
        return new PanelRenderComponent(config);
    }
}