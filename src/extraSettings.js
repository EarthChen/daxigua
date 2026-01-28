/**
 * 声明，本项目仅帮助大家学习技术及娱乐，切勿将修改后的网站大规模传播及商用，以避免侵权！
 */

// 额外分数：修改数字
let extraScore = 1;

// 无敌模式：true 改为 false
let wuDi = true;

// 第一个水果：修改数字为 0-10, 0 为葡萄，9 为半个西瓜
let firstFruit = 0;

// 水果合成反转：false 改为 true
let reverseLevelUp = false;

// 指定生成的水果：默认值: 不开启反转 0-5 开启反转 6-11，修改对应数字即可控制随机生成的水果范围
const minRandomFruitNum = reverseLevelUp ? 6 : 0; // 生成随机水果最小值（0-10）0 为葡萄，9 为半个西瓜
const maxRandomFruitNum = reverseLevelUp ? 11 : 5; // 生成随机水果最大值（1-11）0 为葡萄，9 为半个西瓜
let setFruits = {
  // 指定前几次生成的水果，可填入任意数量的数字，0 为葡萄，9 为半个西瓜
  startFruits: reverseLevelUp ? [10, 10, 9, 8, 8, 7] : [0, 0, 1, 2, 2, 3],
  randomFunction: () => {
    return minRandomFruitNum + Math.floor(Math.random() * (maxRandomFruitNum - minRandomFruitNum));
  }
}

// 让水果更 Q 弹：false 改为大于 0 小于 1 的任意小数（推荐 0.9）
let fruitQTan = false;

// 让水果下落缓慢：false 改为大于 0 的任意数，值越大阻力越大，下落越慢（推荐 5）
let fruitSlowDown = false;

// 点击右上方图标更换水果：false 改为 true 即可
let clickChangeFruit = true;

// 广告链接：false 或为空字符串表示不会跳转到广告
let adLink = 'https://636f-codenav-8grj8px727565176-1256524210.tcb.qcloud.la/yupi_wechat.png';

// 修改网页标题：将 "合成大西瓜" 进行替换
document.getElementsByTagName("title")[0].innerText = '合成大西瓜';

// 开启选分弹窗：将 false 改为 true
let selectModal = false;

// ==================== 道具系统 ====================

/**
 * 道具系统配置
 */
const TOOL_CONFIG = {
    // 道具初始数量
    initialCount: {
        hammer: 3,      // 锤子
        selectFruit: 2, // 任意水果
        skip: 5         // 跳过
    },
    // 水果名称映射
    fruitNames: ['葡萄', '樱桃', '橘子', '柠檬', '猕猴桃', '番茄', '桃子', '菠萝', '椰子', '半西瓜', '西瓜']
};

/**
 * 道具系统类
 */
class ToolSystem {
    constructor() {
        // 从 localStorage 加载道具数量，如果没有则使用初始值
        this.toolCount = this.loadToolCount();
        // 锤子模式状态
        this.hammerMode = false;
        // 原始触摸处理函数引用
        this.originalTouchHandler = null;
        // 初始化
        this.init();
    }

    /**
     * 初始化道具系统
     */
    init() {
        // 等待游戏加载完成后初始化
        const checkGame = setInterval(() => {
            if (typeof cc !== 'undefined' && cc.game && cc.game._isCloning === false) {
                clearInterval(checkGame);
                this.updateUI();
                console.log('[道具系统] 初始化完成');
            }
        }, 500);
    }

    /**
     * 从 localStorage 加载道具数量
     */
    loadToolCount() {
        const saved = localStorage.getItem('daxigua_tools');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('[道具系统] 加载存档失败，使用默认值');
            }
        }
        return { ...TOOL_CONFIG.initialCount };
    }

    /**
     * 保存道具数量到 localStorage
     */
    saveToolCount() {
        localStorage.setItem('daxigua_tools', JSON.stringify(this.toolCount));
    }

    /**
     * 更新 UI 显示
     */
    updateUI() {
        const hammerCount = document.getElementById('hammerCount');
        const selectFruitCount = document.getElementById('selectFruitCount');
        const skipCount = document.getElementById('skipCount');

        if (hammerCount) hammerCount.textContent = this.toolCount.hammer;
        if (selectFruitCount) selectFruitCount.textContent = this.toolCount.selectFruit;
        if (skipCount) skipCount.textContent = this.toolCount.skip;

        // 更新按钮禁用状态
        const hammerBtn = document.getElementById('hammerTool');
        const selectBtn = document.getElementById('selectFruitTool');
        const skipBtn = document.getElementById('skipTool');

        if (hammerBtn) hammerBtn.disabled = this.toolCount.hammer <= 0;
        if (selectBtn) selectBtn.disabled = this.toolCount.selectFruit <= 0;
        if (skipBtn) skipBtn.disabled = this.toolCount.skip <= 0;
    }

    /**
     * 显示提示消息
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'tool-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
    }

    /**
     * 获取游戏实例
     */
    getGameInstance() {
        try {
            // 尝试多种方式获取游戏实例
            if (typeof gameFunction !== 'undefined' && gameFunction.default && gameFunction.default.Instance) {
                return gameFunction.default.Instance;
            }
            // 通过 cc.find 获取
            const gameNode = cc.find('Canvas/gameFunction');
            if (gameNode) {
                const comp = gameNode.getComponent('GameFunction');
                if (comp) return comp;
            }
            // 通过全局查找
            const allNodes = cc.director.getScene().children;
            for (let node of allNodes) {
                const comp = node.getComponentInChildren('GameFunction');
                if (comp) return comp;
            }
        } catch (e) {
            console.warn('[道具系统] 获取游戏实例失败:', e);
        }
        return null;
    }

    /**
     * 获取水果容器节点
     */
    getFruitNode() {
        try {
            const gameInstance = this.getGameInstance();
            if (gameInstance && gameInstance.fruitNode) {
                return gameInstance.fruitNode;
            }
        } catch (e) {
            console.warn('[道具系统] 获取水果节点失败:', e);
        }
        return null;
    }

    // ==================== 锤子道具 ====================

    /**
     * 激活锤子模式 - 让水果可点击销毁
     */
    activateHammer() {
        if (this.toolCount.hammer <= 0) {
            this.showToast('锤子已用完！');
            return;
        }

        try {
            const fruitNode = this.getFruitNode();
            if (!fruitNode || fruitNode.children.length === 0) {
                this.showToast('没有可销毁的水果');
                return;
            }

            // 如果已经在锤子模式，则取消
            if (this.hammerMode) {
                this.cancelHammer();
                return;
            }

            this.hammerMode = true;

            // 高亮锤子按钮
            const hammerBtn = document.getElementById('hammerTool');
            if (hammerBtn) hammerBtn.classList.add('active');

            // 显示锤子模式指示器
            const indicator = document.getElementById('hammerModeIndicator');
            if (indicator) indicator.classList.remove('hidden');

            // 为每个水果添加点击事件
            this.enableFruitClickHandlers();

            this.showToast('🔨 点击水果销毁它');
        } catch (e) {
            console.error('[道具系统] 激活锤子失败:', e);
        }
    }

    /**
     * 为所有水果启用点击事件
     */
    enableFruitClickHandlers() {
        try {
            const fruitNode = this.getFruitNode();
            if (!fruitNode) return;

            // 给每个水果添加点击事件
            for (let i = 0; i < fruitNode.children.length; i++) {
                const fruit = fruitNode.children[i];
                if (!fruit.active) continue;

                // 标记水果 ID
                fruit._hammerIndex = i;

                // 添加点击事件监听器（如果还没有添加）
                if (!fruit._hammerClickHandler) {
                    fruit._hammerClickHandler = () => {
                        if (this.hammerMode) {
                            this.destroyFruit(fruit);
                        }
                    };
                    // 使用 Cocos 的触摸事件
                    fruit.on(cc.Node.EventType.TOUCH_END, fruit._hammerClickHandler, this);
                }
            }

            // 同时监听新创建的水果（使用定时检查）
            this.hammerCheckInterval = setInterval(() => {
                if (!this.hammerMode) {
                    clearInterval(this.hammerCheckInterval);
                    return;
                }
                this.enableFruitClickHandlers();
            }, 500);
        } catch (e) {
            console.error('[道具系统] 启用水果点击失败:', e);
        }
    }

    /**
     * 移除所有水果的点击事件
     */
    disableFruitClickHandlers() {
        try {
            const fruitNode = this.getFruitNode();
            if (!fruitNode) return;

            // 移除每个水果的点击事件
            for (let i = 0; i < fruitNode.children.length; i++) {
                const fruit = fruitNode.children[i];
                if (fruit._hammerClickHandler) {
                    fruit.off(cc.Node.EventType.TOUCH_END, fruit._hammerClickHandler, this);
                    fruit._hammerClickHandler = null;
                }
            }

            // 停止定时检查
            if (this.hammerCheckInterval) {
                clearInterval(this.hammerCheckInterval);
                this.hammerCheckInterval = null;
            }
        } catch (e) {
            console.error('[道具系统] 禁用水果点击失败:', e);
        }
    }

    /**
     * 销毁指定水果
     */
    destroyFruit(targetFruit) {
        try {
            if (!targetFruit || !targetFruit.active) {
                return;
            }

            // 获取水果编号用于显示
            const fruitData = targetFruit.getComponent('fruitData');
            const fruitNum = fruitData ? fruitData.fruitNumber : 0;
            const fruitName = TOOL_CONFIG.fruitNames[fruitNum] || '水果';

            // 播放销毁特效
            const gameInstance = this.getGameInstance();
            if (gameInstance && gameInstance.createFruitL) {
                gameInstance.createFruitL(fruitNum, targetFruit.position, targetFruit.width);
            }

            // 销毁水果
            targetFruit.destroy();

            // 扣除道具
            this.toolCount.hammer--;
            this.saveToolCount();
            this.updateUI();

            this.showToast(`🔨 销毁了 ${fruitName}！`);
            this.cancelHammer();
        } catch (e) {
            console.error('[道具系统] 销毁水果失败:', e);
            this.cancelHammer();
        }
    }

    /**
     * 显示锤子选择面板
     */
    showHammerPanel() {
        try {
            const fruitNode = this.getFruitNode();
            if (!fruitNode) return;

            // 收集所有水果信息
            const fruits = [];
            for (let i = 0; i < fruitNode.children.length; i++) {
                const fruit = fruitNode.children[i];
                if (!fruit.active) continue;
                
                const fruitData = fruit.getComponent('fruitData');
                const fruitNum = fruitData ? fruitData.fruitNumber : 0;
                fruits.push({
                    index: i,
                    fruitNum: fruitNum,
                    name: TOOL_CONFIG.fruitNames[fruitNum] || '水果'
                });
            }

            if (fruits.length === 0) return;

            // 生成水果列表 HTML
            const listContainer = document.getElementById('hammerFruitList');
            if (listContainer) {
                listContainer.innerHTML = fruits.map(f => `
                    <div class="fruit-option" onclick="window.toolSystem.destroyFruitByIndex(${f.index})">
                        ${this.getFruitEmoji(f.fruitNum)}<br><small>${f.name}</small>
                    </div>
                `).join('');
            }

            // 显示选择面板
            const panel = document.getElementById('hammerSelectPanel');
            if (panel) panel.classList.remove('hidden');
        } catch (e) {
            console.error('[道具系统] 显示锤子面板失败:', e);
        }
    }

    /**
     * 获取水果 emoji
     */
    getFruitEmoji(fruitNum) {
        const emojis = ['🍇', '🍒', '🍊', '🍋', '🥝', '🍅', '🍑', '🍍', '🥥', '🍉', '🍉'];
        return emojis[fruitNum] || '🍇';
    }

    /**
     * 取消锤子模式
     */
    cancelHammer() {
        this.hammerMode = false;

        // 移除水果点击事件
        this.disableFruitClickHandlers();

        // 隐藏选择面板
        const panel = document.getElementById('hammerSelectPanel');
        if (panel) panel.classList.add('hidden');

        // 隐藏指示器
        const indicator = document.getElementById('hammerModeIndicator');
        if (indicator) indicator.classList.add('hidden');

        // 取消高亮
        const hammerBtn = document.getElementById('hammerTool');
        if (hammerBtn) hammerBtn.classList.remove('active');
    }

    /**
     * 通过索引销毁水果（保留用于面板选择）
     */
    destroyFruitByIndex(index) {
        try {
            const fruitNode = this.getFruitNode();
            if (!fruitNode || index >= fruitNode.children.length) {
                this.showToast('水果不存在');
                this.cancelHammer();
                return;
            }

            const targetFruit = fruitNode.children[index];
            this.destroyFruit(targetFruit);
        } catch (e) {
            console.error('[道具系统] 销毁水果失败:', e);
            this.cancelHammer();
        }
    }

    // ==================== 任意水果道具 ====================

    /**
     * 显示水果选择面板
     */
    showFruitPanel() {
        if (this.toolCount.selectFruit <= 0) {
            this.showToast('选果道具已用完！');
            return;
        }

        const panel = document.getElementById('fruitSelectPanel');
        if (panel) panel.classList.remove('hidden');
    }

    /**
     * 隐藏水果选择面板
     */
    hideFruitPanel() {
        const panel = document.getElementById('fruitSelectPanel');
        if (panel) panel.classList.add('hidden');
    }

    /**
     * 选择指定水果
     */
    selectFruit(fruitNum) {
        if (this.toolCount.selectFruit <= 0) {
            this.showToast('选果道具已用完！');
            this.hideFruitPanel();
            return;
        }

        try {
            const gameInstance = this.getGameInstance();
            if (!gameInstance) {
                this.showToast('游戏未就绪');
                this.hideFruitPanel();
                return;
            }

            // 销毁当前待掉落的水果
            if (gameInstance.targetFruit) {
                gameInstance.targetFruit.destroy();
                gameInstance.targetFruit = null;
            }

            // 创建指定水果
            if (gameInstance.createOneFruit) {
                gameInstance.createOneFruit(fruitNum);
            }

            // 扣除道具
            this.toolCount.selectFruit--;
            this.saveToolCount();
            this.updateUI();

            const fruitName = TOOL_CONFIG.fruitNames[fruitNum] || '水果';
            this.showToast(`🍇 已选择 ${fruitName}！`);

            this.hideFruitPanel();
        } catch (e) {
            console.error('[道具系统] 选择水果失败:', e);
            this.hideFruitPanel();
        }
    }

    // ==================== 跳过道具 ====================

    /**
     * 使用跳过道具
     */
    useSkip() {
        if (this.toolCount.skip <= 0) {
            this.showToast('跳过道具已用完！');
            return;
        }

        try {
            const gameInstance = this.getGameInstance();
            if (!gameInstance) {
                this.showToast('游戏未就绪');
                return;
            }

            // 销毁当前待掉落的水果
            if (gameInstance.targetFruit) {
                gameInstance.targetFruit.destroy();
                gameInstance.targetFruit = null;
            }

            // 创建新的随机水果
            const randomFruit = minRandomFruitNum + Math.floor(Math.random() * (maxRandomFruitNum - minRandomFruitNum));
            if (gameInstance.createOneFruit) {
                gameInstance.createOneFruit(randomFruit);
            }

            // 扣除道具
            this.toolCount.skip--;
            this.saveToolCount();
            this.updateUI();

            this.showToast('⏭️ 已跳过当前水果！');
        } catch (e) {
            console.error('[道具系统] 跳过失败:', e);
        }
    }

    // ==================== 重置道具 ====================

    /**
     * 重置道具数量（用于调试或新游戏）
     */
    resetTools() {
        this.toolCount = { ...TOOL_CONFIG.initialCount };
        this.saveToolCount();
        this.updateUI();
        this.showToast('道具已重置！');
    }
}

// 创建全局道具系统实例
window.toolSystem = new ToolSystem();

// 暴露重置方法供外部调用
window.resetTools = () => window.toolSystem.resetTools();
