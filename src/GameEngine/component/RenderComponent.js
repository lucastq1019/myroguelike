class RenderComponent {
    constructor(gameEngine, gameObject, color = "black") {
        this.gameEngine = gameEngine;
        this.gameObject = gameObject;
        this.color = color;
    }

    render(renderer) {
        // 获取游戏对象和摄像机的位置和大小
        const { x, y, width, height } = this.gameObject;
        const camera = this.gameEngine.camera;
        const viewLeft = camera.x - camera.width / 2;
        const viewRight = camera.x + camera.width / 2;
        const viewTop = camera.y - camera.height / 2;
        const viewBottom = camera.y + camera.height / 2;

        // 检查游戏对象是否在摄像机的视野内
        if (x + width >= viewLeft && x <= viewRight && y + height >= viewTop && y <= viewBottom) {
            // 在视野内，进行渲染
            renderer.drawRect(x, y, width, height, this.color);
        }
    }
}
export default RenderComponent