// types.ts
export interface Entity {
    id: string;
    speed: number;
    health: number;
    actionBar: number;
    isPlayer: boolean;
}

export interface BattleState {
    entities: Entity[];
    actionQueue: Entity[];
}

export interface Action {
    type: 'attack' | 'skill' | 'heal';
    sourceId: string;
    targetId: string;
    damage?: number;
    heal?: number;
}

export interface BattleMessage {
    type: 'init' | 'update' | 'action' | 'end';
    data?: any;
}