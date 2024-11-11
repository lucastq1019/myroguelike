import RenderComponent from "../../GameEngine/renderer/RenderComponent";
import ButtonRenderComponent from "../../GameEngine/renderer/ButtonRenderComponent";
import GameObject from "../../GameEngine/core/objects/GameObject";
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
        return new ButtonRenderComponent(config);
    }
}