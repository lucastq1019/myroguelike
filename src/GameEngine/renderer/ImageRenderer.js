import Vec2 from "@/common/Vector.js";
import RenderComponent from "../core/objects/RenderComponent";

class ImageRenderer extends RenderComponent {
    constructor(image, position, width, height) {
        super(position);
        this.image = image;
        this.size = new Vec2(width, height);
    }

    render(renderer) {
        renderer.drawImage(this.image, this.position.x, this.position.y, this.size.x, this.size.y);
    }
}

export default ImageRenderer;