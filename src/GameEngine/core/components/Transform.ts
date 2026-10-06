import EcsComponent from "src/GameEngine/ecs/EcsComponent";
import Vector2 from "../common/Vector2";

export class Transform extends EcsComponent {
  update(dt: number): void {
    throw new Error("Method not implemented.");
  }
  position: Vector2 | undefined;
  rotation: number  | undefined;
  scale: Vector2  | undefined;
  // ... 实现细节 ...
}