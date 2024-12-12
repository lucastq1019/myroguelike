import GameObject from "../GameEngine/core/objects/GameObject";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import RenderComponentFactory from "../GameEngine/core/objects/tools/ComponentFactory";
import GameEngine from "../GameEngine/GameEngine"; // 引入GameEngine
import Player from "src/assets/code/Player";
import MapNode from "../GameEngine/core/objects/MapNode";
import NodeGraphRenderComponent from "../GameEngine/core/objects/NodeGraphRenderComponent";

export default class MapScene extends Scene {
    startNode: MapNode;
    endNode: MapNode;
    nodes: MapNode[];
    layers: MapNode[][]; // 存储每一层的节点

    constructor(config: any) {
        super(config);
        this.nodes = [];
        this.layers = [];
        this.startNode = this.createNode(0, "Start");
        this.endNode = this.createNode(-1, "End");
        this.generateMap();
        this.printMap();

        // 创建并添加 NodeGraphRenderComponent
        const nodeGraphRenderComponent = new NodeGraphRenderComponent(this);
        this.addComponent(nodeGraphRenderComponent);
    }

    private createNode(id: number, name: string): MapNode {
        const node = new MapNode(id, name);
        this.nodes.push(node);
        return node;
    }

    private generateMap() {
        let currentNode = this.startNode;
        let currentLayer = 1;
        const maxDepth = Math.floor(Math.random() * 3) + 5; // 随机生成路径深度，范围在3到10之间
        const layers: MapNode[][] = [[this.startNode]]; // 存储每一层的节点

        while (currentLayer <= maxDepth) {
            const numberOfNodesInLayer = Math.floor(Math.random() * 4) + 2; // 每层节点数量在2到5之间
            const nextNodes: MapNode[] = [];

            for (let i = 0; i < numberOfNodesInLayer; i++) {
                const newNode = this.createNode(this.nodes.length, `Node_${currentLayer}_${i}`);
                nextNodes.push(newNode);
            }

            // 每个新节点最多有两个前驱节点
            for (const node of nextNodes) {
                const numPredecessors = Math.min(Math.floor(Math.random() * 2) + 1, nextNodes.length);
                const predecessors = nextNodes.slice(0, numPredecessors);

                for (const predecessor of predecessors) {
                    predecessor.addNextNode(node);
                }
            }

            if (currentLayer === maxDepth) {
                for (const node of nextNodes) {
                    node.addNextNode(this.endNode);
                }
            }

            layers.push(nextNodes);
            currentNode = nextNodes[Math.floor(Math.random() * nextNodes.length)];
            currentLayer++;
        }

        // 将 endNode 添加到最后一层
        layers[layers.length - 1].push(this.endNode);

        // 保存每一层的节点
        this.layers = layers;
    }

    printMap() {
        if (!this.layers) {
            console.log("Map has not been generated yet.");
            return;
        }

        for (let level = 0; level < this.layers.length; level++) {
            const nodesInLayer = this.layers[level];
            console.log(`Level ${level}:`);
            for (const node of nodesInLayer) {
                console.log(`  Node ID: ${node.id}, Name: ${node.name}`);
                console.log(`    Next Nodes:`, node.nextNodes.map(n => n.id));
                console.log(`    Previous Nodes:`, node.previousNodes.map(n => n.id));
            }
        }
        console.log("End of Map");
    }
}