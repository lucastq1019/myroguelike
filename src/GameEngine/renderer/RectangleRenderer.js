import RenderComponent from '../core/objects/RenderComponent';

class RectangleRenderer extends RenderComponent {
    constructor(position, size, color = 'black') {
        super(position);
        this.size = size;
        this.color = color;
    }

    render(renderer) {
        renderer.drawRect(this.position.x, this.position.y, this.size.x, this.size.y, this.color);
    }
}

export default RectangleRenderer;