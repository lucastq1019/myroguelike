class PropertyPanel {
    private selectedEntity: Entity | null = null;

    render(engine: GameEngine) {
        if (!this.selectedEntity) return;
        
        // 绘制属性面板背景
        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
        this.ctx.fillRect(300, 0, 300, this.canvas.height);
        
        // 绘制属性字段
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`属性编辑 - ${this.selectedEntity.name}`, 320, 30);
        
        // 实现具体属性编辑控件...
    }

    setSelectedEntity(entity: Entity) {
        this.selectedEntity = entity;
    }
}