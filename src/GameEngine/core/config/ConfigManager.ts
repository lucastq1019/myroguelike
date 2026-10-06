// ConfigManager.ts
import { GameConfig } from '../types';

/**
 * 配置管理器类
 * 负责管理游戏的所有配置信息
 */
export class ConfigManager {
    private config: GameConfig;

    /**
     * 构造函数
     * @param defaultConfig 默认配置
     */
    constructor(defaultConfig: Partial<GameConfig> = {}) {
        // 设置默认配置
        this.config = {
            screenWidth: 800,
            screenHeight: 600,
            fpsLimit: 60,
            debugMode: false,
            ...defaultConfig
        } as GameConfig;
    }

    /**
     * 获取配置
     * @returns {GameConfig} 当前配置对象
     */
    public getConfig(): GameConfig {
        return { ...this.config };
    }

    /**
     * 更新配置
     * @param newConfig 新的配置对象
     */
    public updateConfig(newConfig: Partial<GameConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 获取指定配置项
     * @param key 配置项键名
     * @returns {any} 配置项值
     */
    public get<T extends keyof GameConfig>(key: T): GameConfig[T] {
        return this.config[key];
    }

    /**
     * 设置指定配置项
     * @param key 配置项键名
     * @param value 配置项值
     */
    public set<T extends keyof GameConfig>(key: T, value: GameConfig[T]): void {
        this.config[key] = value;
    }
}