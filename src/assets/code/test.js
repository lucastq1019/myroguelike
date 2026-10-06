import Render from './Render'; // 假设 Render 类在 ./Render.js 文件中

class ExampleApplication {
    constructor() {
        this.render = new Render(this); // 创建一个 Render 实例
        this.init();
    }

    init() {
        this.render.initCanvas();

        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 9; col++) {
                const x = col * 50;
                const y = row * 50;
                const width = 40;
                const height = 40;

                this.drawRectangle(x, y, width, height);
            }
        }
    }

    drawRectangle(x, y, width, height) {
        this.render.drawRect(x, y, width, height, "black");
    }
}

export default ExampleApplication