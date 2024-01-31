class CanvasManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.initCanvas();
    }

    initCanvas() {
        const canvas = document.createElement("canvas");
        canvas.width = window.innerWidth * this.devicePixelRatio;
        canvas.height = window.innerHeight * this.devicePixelRatio;
        canvas.style.width = `${canvas.width / this.devicePixelRatio}px`;
        canvas.style.height = `${canvas.height / this.devicePixelRatio}px`;
        document.body.appendChild(canvas);

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
        this.width = canvas.width / this.devicePixelRatio;
        this.height = canvas.height / this.devicePixelRatio;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}

export default CanvasManager;