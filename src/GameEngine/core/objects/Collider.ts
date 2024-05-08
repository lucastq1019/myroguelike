// Collider.ts
export default class Collider {
  shape: any; // 这里可能是BoxCollider、CircleCollider或其他形状
  // ...其他碰撞器属性和方法

  checkCollision(otherCollider: Collider): boolean {
    // 实现碰撞检测逻辑
    return false
  }
}