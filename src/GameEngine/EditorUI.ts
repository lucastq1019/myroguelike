import GameEngine from "./GameEngine";

class EditorUI {
    private mainCanvas: HTMLCanvasElement;
    private uiCanvas: HTMLCanvasElement;
    private engine: GameEngine;
    private entityTreeRenderer: EntityTreeRenderer;
    private propertyPanel: PropertyPanel;
    private needsRepaint: boolean = true;

    constructor(engine: GameEngine) {
        this.engine = engine;
        this.mainCanvas = this.createCanvas('game-canvas');
        this.uiCanvas = this.createCanvas('editor-ui');
        
        // 初始化UI渲染器
        this.entityTreeRenderer = new EntityTreeRenderer(this.uiCanvas);
        this.propertyPanel = new PropertyPanel(this.uiCanvas);
        
        this.setupCanvasStyles();
        this.setupEventListeners();
        this.startUILoop();
    }

    private setupCanvasStyles() {
        // 确保UI画布覆盖在游戏画布之上
        this.uiCanvas.style.pointerEvents = 'auto';
        this.uiCanvas.style.zIndex = '999';
        this.mainCanvas.style.zIndex = '0';
    }

    private startUILoop() {
        const render = () => {
            if (this.needsRepaint) {
                this.entityTreeRenderer.render(this.engine);
                this.propertyPanel.render(this.engine);
                this.needsRepaint = false;
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    // 新增事件处理方法
    private handleEntitySelect(entityId: string) {
        const entity = this.engine.entityManager.getEntityById(entityId);
        this.propertyPanel.setSelectedEntity(entity);
        this.needsRepaint = true;
    }

    // 修改后的点击处理
    private handleUIClick = (event: MouseEvent) => {
        const entityId = this.entityTreeRenderer.getEntityAtPosition(event.clientX, event.clientY);
        if (entityId) {
            this.handleEntitySelect(entityId);
            event.stopPropagation();
        }
    };

    private createCanvas(id: string): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.id = id;
        canvas.style.position = 'absolute';
        document.body.appendChild(canvas);
        return canvas;
    }

    private setupEventListeners() {
        this.uiCanvas.addEventListener('click', this.handleUIClick.bind(this));
        this.mainCanvas.addEventListener('mousedown', this.handleSceneInteract.bind(this));
    }
}