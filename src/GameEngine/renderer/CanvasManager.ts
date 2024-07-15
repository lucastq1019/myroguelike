export default class CanvasManager {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    public width: number;
    public height: number;
    private devicePixelRatio: number;

    constructor() {
        this.width = 0;
        this.height = 0;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.initCanvas();
    }

    private initCanvas(): void {
        const canvas = document.createElement("canvas");
        canvas.width = window.innerWidth * this.devicePixelRatio;
        canvas.height = window.innerHeight * this.devicePixelRatio;
        canvas.style.width = `${canvas.width / this.devicePixelRatio}px`;
        canvas.style.height = `${canvas.height / this.devicePixelRatio}px`;
        document.body.appendChild(canvas);

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
        this.width = canvas.width / this.devicePixelRatio;
        this.height = canvas.height / this.devicePixelRatio;
    }

    public clear(): void {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    getCtx(): CanvasRenderingContext2D | null {
        return this.ctx;
    }

    getCanvas(): HTMLCanvasElement | null {
        return this.canvas;
    }
}