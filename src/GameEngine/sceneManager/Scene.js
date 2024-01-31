class Scene {
    constructor(name){
        this.name  = name
        this.elements = [];
    }

    load() {
        // 加在资源
    }

    addElement(element) {
        this.elements.push(element);
    }

    removeElement(element) {
        const index = this.elements.indexOf(element);
        if (index !== -1) {
            this.elements.splice(index, 1);
        }
    }
    clearElement(){
        this.elements = []
    }

    handleKeyboardEvent(event) {
        // handle keyboard event here
    }

    handleMouseEvent(event) {
        // handle mouse event here
    }
    update(dt) {
        for (const item of this.elements) {
            item.update(dt)
        }
    }
}
export default Scene;