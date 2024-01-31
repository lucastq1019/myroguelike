class GameObject{
    constructor() {
        this.components = {};
    }
    
    addComponent(component) {
        this.components[component.constructor.name] = component
    }
    
    getComponent(name) {
        return this.components[name];
    }
    update(dt){

    }
}

export default GameObject