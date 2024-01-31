class RenderComponent {
    constructor(position = new Vec2(), options = {}) {
        this.position = position;
        this.options = options;
    }

    render(renderer) {
        // 子类中具体实现渲染逻辑
        throw new Error('render method must be implemented in subclasses');
    }
}
export default RenderComponent