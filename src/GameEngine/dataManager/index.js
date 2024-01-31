import Component from "../Component";

// 假设我们有一个简单数据结构来表示游戏数据
class GameData {
    constructor(data) {
        this.data = data;
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
    }
}

class DataManager extends Component {
    constructor(gameEngine) {
        super(gameEngine);
        this.gameData = new GameData({}); // 初始化空的数据对象
    }

    /**
     * 加载数据
     * @param {string} filePath 数据文件路径（例如JSON文件）
     * @returns {Promise<GameData>} 返回一个Promise，在数据加载完成后解析为GameData实例
     */
    async loadData(filePath) {
        try {
            const response = await fetch(filePath); // 假设使用fetch API从服务器获取数据
            const data = await response.json(); // 将响应体转换为JSON格式
            this.gameData = new GameData(data);
            return this.gameData;
        } catch (error) {
            console.error("Failed to load data:", error);
            throw error;
        }
    }

    /**
     * 保存数据到本地存储或服务器
     * @param {string} key 数据键名
     * @param {*} value 数据值
     * @param {boolean} [toServer=false] 是否将数据保存到服务器，默认保存到浏览器本地存储
     * @returns {Promise<void>} 返回一个Promise，在数据保存完成时解决
     */
    async saveData(key, value, toServer = false) {
        if (!toServer) {
            localStorage.setItem(key, JSON.stringify(value)); // 假设使用localStorage进行本地存储
        } else {
            // 这里可以添加向服务器发送数据并保存的方法，具体实现取决于后端API设计
        }
        
        this.gameData.set(key, value); // 更新内存中的数据
    }

    /**
     * 获取特定键对应的数据
     * @param {string} key 数据键名
     * @returns {*|undefined} 返回数据值或未找到时返回undefined
     */
    getData(key) {
        return this.gameData.get(key);
    }
}

export default DataManager;