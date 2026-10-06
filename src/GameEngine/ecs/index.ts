/** GameEngine ECS 内核统一导出 */
export { default as Entity } from './Entity';
export type { EntityHost } from './Entity';
export { default as EntityManager } from './EntityManager';
export { ComponentStorage } from './ComponentStorage';
export type { ComponentType } from './ComponentStorage';
export { ComponentRegistry } from './ComponentRegistry';
export { EntityPool } from './EntityPool';
export { Query, QueryBuilder } from './Query';
export { default as System } from './System';
export { default as SystemManager } from './SystemManager';
export type { RunnableSystem } from './SystemManager';
export { World } from './World';

// 通用组件
export { Position, Velocity, Sprite } from './components';
