import Vector2 from "../common/Vector2";

// ComponentConfig.ts
export interface TextRenderConfig {
    text: string;
    position?: Vector2;
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string;
}