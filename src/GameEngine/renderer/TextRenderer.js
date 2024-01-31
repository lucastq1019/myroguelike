import RenderComponent from './RenderComponent';

class TextRenderer extends RenderComponent {
    constructor(text, position, font = '16px Arial', color = 'black') {
        super(position);
        this.text = text;
        this.font = font;
        this.color = color;
    }

    render(renderer) {
        renderer.drawText(this.text, this.position.x, this.position.y, this.font, this.color);
    }
}

export default TextRenderer;