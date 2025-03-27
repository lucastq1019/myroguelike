import Vector2 from '../core/common/Vector2';

interface CustomRenderConfig {
    position: Vector2;
    size: Vector2;
    color: string;
}

export default class CustomRenderComponent {
    constructor(public config: CustomRenderConfig) {}
}