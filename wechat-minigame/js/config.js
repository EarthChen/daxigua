/**
 * 游戏配置常量
 */

// 开发环境标识 - 发布前设为 false
const __DEV__ = true;

// 水果配置（11种水果）
const FRUITS = [
    { id: 0, name: '葡萄', radius: 26, color: '#9b59b6', score: 1 },
    { id: 1, name: '樱桃', radius: 33, color: '#e74c3c', score: 2 },
    { id: 2, name: '橘子', radius: 40, color: '#e67e22', score: 3 },
    { id: 3, name: '柠檬', radius: 48, color: '#f1c40f', score: 4 },
    { id: 4, name: '猕猴桃', radius: 56, color: '#27ae60', score: 5 },
    { id: 5, name: '番茄', radius: 64, color: '#c0392b', score: 6 },
    { id: 6, name: '桃子', radius: 72, color: '#fd79a8', score: 7 },
    { id: 7, name: '菠萝', radius: 82, color: '#fdcb6e', score: 8 },
    { id: 8, name: '椰子', radius: 92, color: '#dfe6e9', score: 9 },
    { id: 9, name: '半西瓜', radius: 102, color: '#00b894', score: 10 },
    { id: 10, name: '西瓜', radius: 115, color: '#55a630', score: 100 }
];

// 物理引擎配置
const PHYSICS = {
    gravity: { x: 0, y: 1.2 },           // 重力（降低）
    friction: 0.3,                        // 摩擦力（增加）
    frictionStatic: 0.6,                  // 静摩擦力
    restitution: 0.05,                    // 弹性系数（降低，减少反弹）
    frictionAir: 0.02,                    // 空气阻力（增加）
    sleepThreshold: 30,                   // 休眠阈值（降低，更快进入休眠）
    sleepVelocityLimit: 0.5,              // 休眠速度阈值
    positionIterations: 4,                // 位置修正迭代次数
    velocityDamping: 0.98                 // 速度阻尼
};

// 游戏区域配置
const GAME_AREA = {
    // 相对于设计尺寸的比例
    topMargin: 0.15,      // 顶部边距（生成区域）
    bottomMargin: 0.12,   // 底部边距（地面）
    sideMargin: 0.02,     // 左右边距
    groundHeight: 80,     // 地面高度
    wallThickness: 20     // 墙壁厚度
};

// 游戏规则配置
const RULES = {
    maxFruitLevel: 4,        // 随机生成的最大水果等级（0-4）
    mergeDelay: 100,         // 合成延迟（毫秒）
    gameOverLineY: 0.18,     // 游戏结束线位置（相对高度）
    gameOverDelay: 2000,     // 超过线后的判定延迟
    dropCooldown: 300        // 投放冷却时间（毫秒）
};

// 道具配置
const TOOLS = {
    hammer: { initial: 3, adReward: 1, name: '锤子', icon: '🔨' },
    selectFruit: { initial: 2, adReward: 1, name: '选果', icon: '🍇' },
    skip: { initial: 5, adReward: 2, name: '跳过', icon: '⏭️' }
};

// 广告配置
const AD_CONFIG = {
    rewardedVideoAdUnitId: 'adunit-xxxxxxxxxx',  // 替换为实际广告位ID
    cooldown: 30000  // 广告冷却时间
};

// 分享配置
const SHARE_CONFIG = {
    cooldown: 5 * 60 * 1000,  // 分享冷却时间（5分钟）
    reward: 1  // 分享奖励数量
};

// 调试配置 - 仅开发环境生效
const DEBUG_CONFIG = {
    enabled: __DEV__,  // 通过编译时变量控制
    showDebugPanel: true,  // 显示调试面板
    addToolsAmount: 5  // 每次添加道具数量
};

// UI 颜色配置
const COLORS = {
    background: '#f5deb3',      // 背景色
    ground: '#8b4513',          // 地面色
    groundTop: '#654321',       // 地面顶部色
    wall: '#8b4513',            // 墙壁色
    dropLine: '#ffcc00',        // 投放线颜色
    gameOverLine: '#ff0000',    // 游戏结束线
    scoreText: '#333333',       // 分数文字
    toolbarBg: 'rgba(0,0,0,0.8)', // 工具栏背景
    buttonBg: '#ffecd2',        // 按钮背景
    adButtonBg: '#4CAF50'       // 广告按钮背景
};

module.exports = {
    __DEV__,
    FRUITS,
    PHYSICS,
    GAME_AREA,
    RULES,
    TOOLS,
    AD_CONFIG,
    SHARE_CONFIG,
    DEBUG_CONFIG,
    COLORS
};
