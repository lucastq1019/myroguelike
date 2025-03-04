export default class SceneComponent {
    // 增加属性变更回调
    public onPropertyChange: (key: string, value: any) => void = () => {};
    
    setProperty(key: string, value: any) {
        this.editableProperties[key] = value;
        this.onPropertyChange(key, value);
    }
}