import Component from "../Component";
import GameEngine from "../GameEngine";

interface Camera2DConfig {
  x?: number;
  y?: number;
  scale?: number;
  width?: number;
  height?: number;
}

class Camera2D extends Component {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;

  constructor(gameEngine: GameEngine,x:number,y:number,scale:number,width:number,height:number) {
    super(gameEngine);
    this.x = x ;
    this.y= y ;
    this.scale = scale ;
    this.width = width ;
    this.height = height ;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  update(dt: number): void {}

  getViewMatrix(): number[][] {
    return [
      [this.scale, 0, -this.x * this.scale], // 第一行
      [0, this.scale, -this.y * this.scale], // 第二行
      [0, 0, 1],                            // 第三行
    ];
  }
}

export default Camera2D;