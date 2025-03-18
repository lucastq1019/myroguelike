import GameEngine from "./GameEngine";

class EntityTreeRenderer {
    private ctx: CanvasRenderingContext2D;
    
    constructor(private uiCanvas: HTMLCanvasElement) {
        this.ctx = uiCanvas.getContext('2d')!;
    }

    private selectedEntity: string | null = null;

    getEntityAtPosition(x: number, y: number): string | null {
        const entities = this.engine.entityManager.getAllEntities();
        const itemHeight = 30;
        
        // 精确计算点击区域
        const index = Math.floor((y - 30) / itemHeight);
        const entity = entities[index];
        
        // 检查有效点击范围
        if (entity && y > 30 + index * itemHeight && y < 30 + (index + 1) * itemHeight) {
            return entity.id;
        }
        return null;
    }

    render(engine: GameEngine) {
        this.ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
        
        // 绘制实体树
        const entities = engine.entityManager.getAllEntities();
        entities.forEach((entity, index) => {
            this.drawEntityNode(entity.id, 10, 30 + index * 30);
        });
    }

    private drawEntityNode(id: string, x: number, y: number) {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Entity ${id}`, x, y);
    }
}