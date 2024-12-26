// BattleEngine.ts
import { BattleMessage, Entity as EntityType, Action } from './Types';

export default class BattleEngine {
    private worker: Worker;
    private isInputPhase: boolean = false;
    private inputPhaseCallback: ((entityId: number) => void) | null = null;

    constructor() {
        // 使用 worker-loader 处理的 Worker 文件
        this.worker = new Worker(new URL('./Worker.ts', import.meta.url));

        this.worker.onmessage = (event) => {
            const message: BattleMessage = event.data;
            switch (message.type) {
                case 'update':
                    this.handleUpdate(message.data);
                    break;
                case 'action':
                    this.handleAction(message.data);
                    break;
                case 'end':
                    this.handleEnd(message.data);
                    break;
                case 'inputPhase':
                    this.enterInputPhase(message.data);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        };
    }

    startBattle() {
        this.worker.postMessage({ type: 'startBattle' });
    }

    init(entities: EntityType[]) {
        this.worker.postMessage({ type: 'init', data: entities });
    }

    update(entities: EntityType[]) {
        if (!this.isInputPhase) {
            this.worker.postMessage({ type: 'update', data: entities });
        }
    }

    private handleUpdate(state: any) {
        console.log('Battle state updated:', state);
        // 更新 UI 或其他逻辑
    }

    private handleAction(action: any) {
        console.log('Action performed:', action);
        // 处理动作
    }

    private handleEnd(result: any) {
        console.log('Battle ended with result:', result);
        // 处理战斗结束逻辑
    }

    private enterInputPhase(entityId: number) {
        this.isInputPhase = true;
        if (this.inputPhaseCallback) {
            this.inputPhaseCallback(entityId);
        }
    }

    endInputPhase(actions: Action[]) {
        this.isInputPhase = false;
        // 根据玩家选择的技能执行相应的动作
        for (const action of actions) {
            this.worker.postMessage({ type: 'action', data: action });
        }
        // 恢复战斗引擎
        this.worker.postMessage({ type: 'update', data: state.entities });
        this.worker.postMessage({ type: 'resumeBattle', data: {} });
    }

    setInputPhaseCallback(callback: (entityId: number) => void) {
        this.inputPhaseCallback = callback;
    }
}