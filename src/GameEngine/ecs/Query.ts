/**
 * Query —— 按组件组合查询（改造版新增）
 *
 * 用组件位掩码筛选实体：
 *   实体掩码 & 条件掩码 === 条件掩码 → 命中
 *
 * 位掩码用 BigInt（支持任意多种组件，不再受 31 种限制）。
 */

export class Query {
  readonly allMask: bigint;
  readonly noneMask: bigint;

  constructor(allMask: bigint, noneMask: bigint) {
    this.allMask = allMask;
    this.noneMask = noneMask;
  }

  matches(entityMask: bigint): boolean {
    return (entityMask & this.allMask) === this.allMask && (entityMask & this.noneMask) === 0n;
  }
}

export class QueryBuilder {
  private allBits: bigint[] = [];
  private noneBits: bigint[] = [];

  with(...bits: bigint[]): this {
    this.allBits.push(...bits);
    return this;
  }

  without(...bits: bigint[]): this {
    this.noneBits.push(...bits);
    return this;
  }

  build(): Query {
    const allMask = this.allBits.reduce((acc, b) => acc | b, 0n);
    const noneMask = this.noneBits.reduce((acc, b) => acc | b, 0n);
    return new Query(allMask, noneMask);
  }
}
