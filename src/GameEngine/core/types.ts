// 组件配置类型
export interface ComponentConfig {
  name: string;
  gameObject: GameObject;
}

// ECS 系统类型
export type SystemUpdate = (dt: number) => void;