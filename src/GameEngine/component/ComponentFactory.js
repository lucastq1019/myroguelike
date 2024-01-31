import RenderComponent  from "./RenderComponent";
class ComponentFactory {
    static createRenderComponent(gameEngine,gameObject, color = "black") {
        return new RenderComponent(gameEngine,gameObject, color);
    }
    // 添加其他类型的组件工厂方法...
}

export default ComponentFactory