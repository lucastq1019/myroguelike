/**
 * 核心类型定义
 */

// 组件配置类型（改造：移除 GameObject 依赖）
export interface ComponentConfig {
  name: string;
  [key: string]: any;
}

// ECS 系统类型
export type SystemUpdate = (dt: number) => void;

// 游戏配置
export interface GameConfig {
  screenWidth?: number;
  screenHeight?: number;
  fpsLimit?: number;
  debugMode?: boolean;
  defaultScene?: string;
  [key: string]: any;
}
