import Scene from "../GameEngine/sceneManager/Scene";
import MapNode from "../GameEngine/core/objects/MapNode";
import NodeGraphRenderComponent from "../GameEngine/core/objects/NodeGraphRenderComponent";
import ImageRenderComponent from "../GameEngine/renderer/ImageRenderComponent";
import ImageRenderConfig from "../GameEngine/core/objects/ImageRenderConfig";
import Vector2 from "../GameEngine/core/common/Vector2";
import GameObject from "../GameEngine/core/objects/GameObject";
import GameEngine from "../GameEngine/GameEngine";

export default class MapScene extends Scene {
    startNode: MapNode;
    endNode: MapNode;
    nodes: MapNode[];
    layers: MapNode[][]; // 存储每一层的节点

    backgroundComponent: ImageRenderComponent; // 添加背景组件属性

    constructor(config: any) {
        super(config);
        this.nodes = [];
        this.layers = [];
        this.startNode = this.createNode(0, "Start");
        this.endNode = this.createNode(-1, "End");
        this.generateMap();
        this.printMap();

        // 创建并添加 ImageRenderComponent 作为背景
        const backgroundConfig: ImageRenderConfig = {
            imageUrl: 'assets/2.jpeg', // 替换为你的背景图像路径
            position: new Vector2(0, 0), // 背景位置
            size: new Vector2(GameEngine.getScreenWidth(), GameEngine.getScreenHeight()), // 背景大小
            name: "mapBackground",
            gameObject: new GameObject(),
        };
        this.backgroundComponent = new ImageRenderComponent(backgroundConfig);
        this.addComponent(this.backgroundComponent);

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
        let currentLayer = 1;
        const maxDepth = Math.floor(Math.random() * 8) + 3; // 随机生成路径深度，范围在3到10之间
        const layers: MapNode[][] = [[this.startNode]]; // 存储每一层的节点

        let previousLayerNodes = [this.startNode];

        while (currentLayer <= maxDepth) {
            const numberOfNodesInLayer = Math.floor(Math.random() * 3) + 3;
            const nextNodes: MapNode[] = [];

            for (let i = 0; i < numberOfNodesInLayer; i++) {
                const newNode = this.createNode(this.nodes.length, `N_${currentLayer}_${i}`);
                nextNodes.push(newNode);
            }
            let index = previousLayerNodes.length - 1;
            // 根据前驱节点的个数进行多次遍历
            for (let j = 0; j < Math.max(previousLayerNodes.length, nextNodes.length); j++) {
                const node = nextNodes[j % (nextNodes.length)];
                // 随机前驱节点是一个的还是多个的
                const randomBinary = this.getRandomBinary();
                // 如果是多个前驱节点则循环一下逻辑
                for (let k = 0; k <= randomBinary; k++) {
                    // 从前驱节点挑选一个节点
                    const predecessorIndex = Math.floor(Math.random() * (index + 1));
                    const predecessor = previousLayerNodes[predecessorIndex];
                    // 使用 Set 来避免重复添加后继节点
                    if (!node.previousNodes.has(predecessor)) {
                        // 对前驱节点添加后继节点，以及本节点的前驱节点
                        predecessor.addNextNode(node);
                        node.addPreviousNode(predecessor);
                    }
                    // 通过交换位置的方式来避免一个节点被赋值多个后继，减少每个节点的后继节点组的差值
                    if (index !== predecessorIndex) {
                        const temp = previousLayerNodes[predecessorIndex];
                        previousLayerNodes[predecessorIndex] = previousLayerNodes[index];
                        previousLayerNodes[index] = temp;
                    }
                    index = index - 1;
                    if (index < 0) {
                        index = previousLayerNodes.length - 1;
                    }
                }
            }

            layers.push(nextNodes);
            previousLayerNodes = nextNodes;
            currentLayer++;
        }

        // 将 endNode 添加到最后一层
        for (const node of previousLayerNodes) {
            node.addNextNode(this.endNode);
            this.endNode.addPreviousNode(node);
        }

        layers.push([this.endNode]);

        // 保存每一层的节点
        this.layers = layers;
    }

    private getRandomBinary(): number {
        return Math.floor(Math.random() * 2);
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
                console.log(`    Next Nodes:`, node.nextNodes.values());
                console.log(`    Previous Nodes:`, node.previousNodes.values());
            }
        }
        console.log("End of Map");
    }
}