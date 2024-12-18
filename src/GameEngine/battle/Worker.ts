// worker.ts
import { BattleMessage, Entity as EntityType, Action } from './Types';

let state: { entities: EntityType[], actionQueue: EntityType[] } = {
    entities: [],
    actionQueue: []
};

self.onmessage = (event) => {
    const message: BattleMessage = event.data;
    switch (message.type) {
        case 'init':
            initializeState(message.data);
            break;
        case 'update':
            updateState(message.data);
            break;
        default:
            console.warn('Unknown message type:', message.type);
    }
};

function initializeState(entities: EntityType[]) {
    state.entities = entities;
    state.actionQueue = [...entities];
    state.actionQueue.sort((a, b) => b.speed - a.speed); // 按速度排序
    startBattle();
}

function startBattle() {
    setInterval(updateActions, 1000 / 60); // 每秒60帧
}

function updateActions() {
    for (let entity of state.actionQueue) {
        if (entity.health <= 0) continue; // 跳过已死亡的角色

        entity.actionBar += entity.speed / 60; // 更新行动条

        if (entity.actionBar >= 1) {
            entity.actionBar = 0; // 重置行动条
            performAction(entity);
        }
    }

    self.postMessage({ type: 'update', data: state });
}

function performAction(entity: EntityType) {
    // 示例动作：随机攻击一个敌人
    let target = state.entities.find(e => !e.isPlayer && e.health > 0);
    if (target) {
        target.health -= 10; // 假设每次攻击减少10点血量
        const action: Action = { type: 'attack', sourceId: entity.id, targetId: target.id, damage: 10 };
        self.postMessage({ type: 'action', data: action });
    }

    // 检查战斗结束条件
    if (state.entities.every(e => !e.isPlayer || e.health <= 0)) {
        self.postMessage({ type: 'end', data: 'enemies win' });
    } else if (state.entities.every(e => e.isPlayer && e.health <= 0)) {
        self.postMessage({ type: 'end', data: 'players win' });
    }
}

function updateState(entities: EntityType[]) {
    // 更新状态，例如角色移动、技能释放等
    state.entities = entities;
}