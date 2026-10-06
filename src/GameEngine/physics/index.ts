/** GameEngine 轻量物理内核统一导出 */
export { RigidBody, staticBody, dynamicBody } from './RigidBody';
export { Shape, Circle, Box, Platform, boundingRadius } from './Shapes';
export { detect, detectPlatform } from './collision';
export type { Manifold, Vec2 } from './collision';
export { createPhysicsSystem } from './PhysicsSystem';
export type { PhysicsOptions } from './PhysicsSystem';
export { PhysicsContacts, ContactDir } from './PhysicsContacts';
export { IgnorePlatforms } from './IgnorePlatforms';
