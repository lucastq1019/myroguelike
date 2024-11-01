export default class DynamicComponentFactory {
  private static instance: DynamicComponentFactory;

  private constructor() { }

  public static getInstance(): DynamicComponentFactory {
    if (!DynamicComponentFactory.instance) {
      DynamicComponentFactory.instance = new DynamicComponentFactory();
    }
    return DynamicComponentFactory.instance;
  }

  async createComponent(componentName: string, config: any): Promise<InstanceType<any> | null> {
    try {
      // 使用 ES6 动态导入组件
      const module = await import(`${componentName}.ts`);

      if (!module.default) {
        console.error(`Component ${componentName} not found.`);
        return null;
      }

      const ComponentClass = module.default as new (config: any) => InstanceType<any>;
      return new ComponentClass(config);
    } catch (error) {
      console.error(`Error creating component ${componentName}:`, error);
      return null;
    }
  }
}