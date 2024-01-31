class Render {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.initCanvas()
    }

    render() {
        this.clear()
        // 获取摄像机的视图矩阵
        const viewMatrix = this.gameEngine.camera.getViewMatrix();

        // 设置 canvas 的变换矩阵
        //a	水平旋转绘图。b	水平倾斜绘图。c	垂直倾斜绘图。d	垂直缩放绘图。e	水平移动绘图。f	垂直移动绘图。
        //[a,c,e]
        //[b,d,f]
        //[0,0,1]
        this.ctx.transform(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[0][1], viewMatrix[1][1], viewMatrix[0][2], viewMatrix[1][2]);

        // 遍历场景图中的对象
        for (let object of this.gameEngine.sceneManager.currentScene.elements) {
            // 获取对象的渲染组件
            let renderComponent = object.getComponent("RenderComponent");

            // 如果对象有渲染组件，则调用其 render 方法绘制对象
            if (renderComponent) {
                renderComponent.render(this);
            }
        }

    }
    // 清除画布
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height)
    }

    initCanvas() {
        let canvas = document.createElement("canvas")
        // 获取到全屏的宽高
        canvas.width = document.documentElement.clientWidth
        canvas.height = document.documentElement.clientHeight
        // 进行宽高放大
        canvas.width = canvas.width * window.devicePixelRatio
        canvas.height = canvas.height * window.devicePixelRatio
        // 实际画布大小
        canvas.style.width = canvas.width / window.devicePixelRatio + "px"
        canvas.style.height = canvas.height / window.devicePixelRatio + "px"
        document.body.appendChild(canvas)

        // ctx上下文都进行缩放
        this.ctx = canvas.getContext("2d")
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = canvas.width / window.devicePixelRatio
        this.height = canvas.height / window.devicePixelRatio
    }

    drawImage(image, x, y, width, height) {
        this.ctx.drawImage(image, x, y, width, height);
    }

    drawText(text, x, y, font = "16px Arial", color = "black") {
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }

    drawRect(x, y, width, height, color = "black") {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

}

export default Render