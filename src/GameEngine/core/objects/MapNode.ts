export default class MapNode {
    id: number;
    name: string;
    nextNodes: Set<MapNode>;
    previousNodes: Set <MapNode>;

    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
        this.nextNodes = new Set();
        this.previousNodes =  new Set();
    }

    addNextNode(node: MapNode) {
        this.nextNodes.add(node);
    }

    addPreviousNode(node: MapNode) {
        this.previousNodes.add(node);
    }
}