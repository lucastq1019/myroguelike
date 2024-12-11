import Vector2 from "../common/Vector2";
import ComponentConfig from "./ComponentConfig";

export default interface ImageRenderConfig extends ComponentConfig {
    imageUrl: string;
    position?: Vector2;
    size?: Vector2;
}