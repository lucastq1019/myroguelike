// ErrorHandler.ts

/**
 * 错误处理器类
 * 负责统一处理游戏中的错误
 */
export class ErrorHandler {
    /**
     * 处理错误
     * @param message 错误消息
     * @param error 错误对象
     * @param context 错误上下文信息
     */
    public handleError(message: string, error: Error, context: Record<string, any> = {}): void {
        // 记录错误信息到控制台
        console.error(`[ERROR] ${message}:`, error);

        // 如果有上下文信息，也一并输出
        if (Object.keys(context).length > 0) {
            console.error('[ERROR CONTEXT]:', context);
        }

        // 在开发模式下，可以显示更详细的错误信息
        // 改造：用 import.meta.env（Vite）替代 process.env，浏览器安全
        const isDev = (import.meta as any)?.env?.DEV ?? true;
        if (isDev) {
            console.trace('[ERROR STACK]:');
        }

        // 在实际项目中，还可以添加错误上报机制
        // this.reportErrorToServer(message, error, context);
    }

    /**
     * 处理警告
     * @param message 警告消息
     * @param context 警告上下文信息
     */
    public handleWarning(message: string, context: Record<string, any> = {}): void {
        console.warn(`[WARNING] ${message}`);

        if (Object.keys(context).length > 0) {
            console.warn('[WARNING CONTEXT]:', context);
        }
    }

    /**
     * 报告错误到服务器
     * @param message 错误消息
     * @param error 错误对象
     * @param context 错误上下文信息
     */
    private reportErrorToServer(message: string, error: Error, context: Record<string, any>): void {
        // 在实际项目中实现错误上报逻辑
        // 例如：使用fetch或axios发送错误信息到服务器
        /*
        fetch('/api/error-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                },
                context,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            })
        });
        */
    }
}