// BattleEngine.ts
import { BattleMessage, Entity as EntityType } from './Types';

export class BattleEngine {
    private worker: Worker;

    constructor() {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url));

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
                default:
                    console.warn('Unknown message type:', message.type);
            }
        };
    }

    init(entities: EntityType[]) {
        this.worker.postMessage({ type: 'init', data: entities });
    }

    update(entities: EntityType[]) {
        this.worker.postMessage({ type: 'update', data: entities });
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
}