// worker.ts
import { BattleMessage, Entity as EntityType, Action } from './Types';

let state: { entities: EntityType[], actionQueue: EntityType[], isInputPhase: boolean, intervalId: NodeJS.Timeout | null, maxLoop: number } = {
    entities: [],
    actionQueue: [],
    isInputPhase: false,
    intervalId: null, // 新增定时器引用
    maxLoop: 100
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
        case 'action':
            performAction(message.data);
            break;
        case 'startBattle':
            startBattle();
            break;
        case 'resumeBattle':
            resumeBattle();
            break;
        default:
            console.warn('Unknown message type:', message.type);
    }
};

function initializeState(entities: EntityType[]) {
    state.entities = entities;
    state.actionQueue = [...entities];
    state.actionQueue.sort((a, b) => b.speed - a.speed); // 按速度排序
}

function startBattle() {
    state.maxLoop = 100;
    console.log('state', state)
    if (!state.intervalId) {
        state.intervalId = setInterval(updateActions, 1000 / 60); // 每秒60帧
    }
}

function updateActions() {
    if (state.maxLoop-- <= 0) {
        console.log('Battle ended');
        endBattle();
        return;
    }
    console.log('state.maxLoop', state.maxLoop);
    if (state.isInputPhase) {
        console.log('Skipping battle logic in input phase');
        return; // 如果是指令输入阶段，则不执行战斗逻辑
    }

    for (let entity of state.actionQueue) {
        if (entity.health <= 0) continue; // 跳过已死亡的角色

        entity.actionBar += entity.speed / 60; // 更新行动条

        if (entity.actionBar >= 1) {
            entity.actionBar = 0; // 重置行动条
            if (entity.isPlayer) {
                self.postMessage({ type: 'inputPhase', data: entity.id }); // 进入指令输入阶段
                state.isInputPhase = true;
            } else {
                performAction(entity);
            }
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
        endBattle();
    } else if (state.entities.every(e => e.isPlayer && e.health <= 0)) {
        self.postMessage({ type: 'end', data: 'players win' });
        endBattle();
    }
}

function endBattle() {
    console.log(state)
    if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
    }
}

function updateState(entities: EntityType[]) {
    // 更新状态，例如角色移动、技能释放等
    state.entities = entities;
}
function resumeBattle() {
   state.isInputPhase = false;
}