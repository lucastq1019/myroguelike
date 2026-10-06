// src/GameEngine/core/objects/RenderComponent/NodeGraphRenderComponent.ts
import RenderComponent from './RenderComponent';
import MapNode from '../objects/MapNode';
import MapScene from '../../../scenes/MapScene';
import CanvasManager from '../../../GameEngine/renderer/CanvasManager';

class NodeGraphRenderComponent extends RenderComponent {
    update(dt: number): void {
    }
    private mapScene: MapScene;

    constructor(mapScene: MapScene) {
        super();
        this.mapScene = mapScene;
    }

    render(canvasManager: CanvasManager) {
        const ctx = canvasManager.getCtx();
        if (!ctx) return;

        const scale = 50; // 缩放比例
        const offsetX = 28; // X轴偏移量
        const offsetY = 28; // Y轴偏移量

        // 清除画布
        // ctx.clearRect(0, 0, canvasManager.getWidth(), canvasManager.getHeight());

        // 存储每个节点的位置
        const nodePositions: { [key: string]: { x: number, y: number } } = {};

        // 绘制节点和计算位置
        this.mapScene.layers.forEach((layer, layerIndex) => {
            const layerHeight = layer.length;
            const verticalSpacing = (layerHeight > 1) ? (scale * (layerHeight - 1)) / (layerHeight - 1) : scale;

            layer.forEach((node, nodeIndex) => {
                const x = offsetX + layerIndex * scale * 2;
                const y = offsetY + nodeIndex * verticalSpacing;

                // 存储节点位置
                nodePositions[node.id] = { x, y };

                // 绘制节点
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(node.name, x, y + 4);
            });
        });
        

        // 绘制连接线
        this.mapScene.layers.forEach((layer) => {
            layer.forEach((node) => {
                // console.log(node,node.nextNodes);
                node.nextNodes.forEach((nextNode) => {
                    const startPos = nodePositions[node.id];
                    const endPos = nodePositions[nextNode.id];
                    // console.log(startPos);
                    // console.log(endPos);

                        ctx.strokeStyle = 'black';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(startPos.x, startPos.y);
                        ctx.lineTo(endPos.x, endPos.y);
                        ctx.closePath()
                        ctx.stroke();
                });
            });
        });
    }
}

export default NodeGraphRenderComponent;