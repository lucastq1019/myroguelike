export default class MapNode {
    id: number;
    name: string;
    nextNodes: MapNode[];
    previousNodes: MapNode[];

    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
        this.nextNodes = [];
        this.previousNodes = [];
    }

    addNextNode(node: MapNode) {
        if (this.nextNodes.length < 2) {
            this.nextNodes.push(node);
            node.addPreviousNode(this);
        }
    }

    addPreviousNode(node: MapNode) {
        if (this.previousNodes.length < 2) {
            this.previousNodes.push(node);
        }
    }
}