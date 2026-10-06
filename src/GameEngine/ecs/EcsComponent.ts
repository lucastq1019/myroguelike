/**
 * EcsComponent —— 组件基类（改造版）
 *
 * 改造要点：
 * - 保留旧接口（`enabled`、`entityId`、可选 `update`），以兼容外壳代码。
 * - 但**推荐组件为纯数据**：新代码不应依赖 `update()`（行为属于 System）。
 * - `update()` 保留为可选，默认空实现，仅为兼容旧组件（Camera2D 等）。
 */
abstract class EcsComponent {
  private _enabled: boolean = true;
  public entityId: number = -1;

  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * 兼容旧接口的 update（默认空实现）。
   * 注意：新 ECS 中行为应放在 System 里，组件应尽量保持纯数据。
   */
  update(_dt: number): void {
    // 默认空实现
  }
}

export default EcsComponent;
