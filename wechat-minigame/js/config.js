/**
 * 游戏配置常量
 */

// 使用 IIFE 避免全局变量冲突
(function() {
'use strict';

// 开发环境标识 - 发布前设为 false
var __DEV__ = true;

// 水果配置（11种水果）
var FRUITS = [
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
var PHYSICS = {
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
var GAME_AREA = {
    // 相对于设计尺寸的比例
    topMargin: 0.15,      // 顶部边距（生成区域）
    bottomMargin: 0.12,   // 底部边距（地面）
    sideMargin: 0.02,     // 左右边距
    groundHeight: 80,     // 地面高度
    wallThickness: 20     // 墙壁厚度
};

// 游戏规则配置
var RULES = {
    maxFruitLevel: 4,        // 随机生成的最大水果等级（0-4）
    mergeDelay: 100,         // 合成延迟（毫秒）
    gameOverLineY: 0.18,     // 游戏结束线位置（相对高度）
    gameOverDelay: 2000,     // 超过线后的判定延迟
    dropCooldown: 300        // 投放冷却时间（毫秒）
};

// 道具配置
var TOOLS = {
    hammer: { initial: 3, adReward: 1, name: '锤子', icon: '🔨' },
    selectFruit: { initial: 2, adReward: 1, name: '选果', icon: '🍇' },
    skip: { initial: 5, adReward: 2, name: '跳过', icon: '⏭️' }
};

// 广告配置
var AD_CONFIG = {
    rewardedVideoAdUnitId: 'adunit-xxxxxxxxxx',  // 替换为实际广告位ID
    cooldown: 30000  // 广告冷却时间
};

// 分享配置
var SHARE_CONFIG = {
    cooldown: 5 * 60 * 1000,  // 分享冷却时间（5分钟）
    reward: 1  // 分享奖励数量
};

// 调试配置 - 仅开发环境生效
var DEBUG_CONFIG = {
    enabled: __DEV__,  // 通过编译时变量控制
    showDebugPanel: true,  // 显示调试面板
    addToolsAmount: 5  // 每次添加道具数量
};

// Combo 连击配置
var COMBO = {
    windowMs: 1500,           // Combo 有效窗口时间（毫秒）
    scoreMultiplier: 0.5,     // 每次连击增加的分数倍率
    maxCombo: 20,             // 最大连击数上限
    feverThreshold: 5,        // 触发 Fever 模式的连击数
    resetOnDrop: false        // 投放新水果时是否重置连击
};

// Fever 狂热模式配置
var FEVER = {
    duration: 6000,           // 持续时间（毫秒）
    radiusShrink: 0.85,       // 碰撞体缩小比例
    dropCooldown: 0,          // 投放冷却时间
    bgEffect: 'pulse',        // 背景特效类型
    particleCount: 30         // 粒子数量
};

// 天气系统配置
var WEATHER = {
    enabled: true,            // 是否启用天气系统
    interval: 30000,          // 天气切换间隔（毫秒）- 30秒
    duration: 15000,          // 单次天气持续时间
    firstDelay: 10000,        // 首次天气触发延迟（毫秒）- 10秒
    types: {
        windy: {
            name: '大风',
            icon: '🌪️',
            forceX: 0.3,      // 水平恒力
            forceY: 0,
            probability: 0.33
        },
        slippery: {
            name: '梅雨',
            icon: '🌧️',
            friction: 0.01,   // 降低摩擦力
            probability: 0.33
        },
        icy: {
            name: '霜冻',
            icon: '❄️',
            restitution: 0.01, // 降低弹性
            probability: 0.34
        }
    }
};

// 地震配置
var EARTHQUAKE = {
    enabled: true,            // 是否启用地震系统
    triggerDelay: 1500,       // 超线后触发延迟（毫秒）- 1.5秒
    impulseStrength: 10,      // 向上冲量强度
    cooldown: 8000,           // 两次震动间隔
    screenShake: {
        duration: 600,
        intensity: 12
    }
};

// 盲盒果实配置
var MYSTERY_BOX = {
    enabled: true,            // 是否启用盲盒
    spawnChance: 0.05,        // 每次生成水果时的出现概率
    results: {
        evolve: { chance: 0.05, levelBonus: 3 },
        bomb: { chance: 0.10, fuseTime: 3000 },
        random: { chance: 0.85, levelRange: [0, 3] }
    },
    triggerDelay: 500         // 落地后判定延迟
};

// 炸弹配置
var BOMB = {
    fuseTime: 3000,           // 引爆时间
    blastRadius: 120,         // 爆炸半径
    blastForce: 15,           // 爆炸冲量
    destroyRadius: 60,        // 销毁半径
    scoreBonus: 50,           // 每销毁一个水果的分数
    radius: 35                // 炸弹显示半径
};

// 冰封果实配置
var ICE_BLOCK = {
    enabled: true,            // 是否启用冰封
    spawnChance: 0.08,        // 出现概率
    thawRadius: 80,           // 解冻触发半径
    visualAlpha: 0.6          // 冰层透明度
};

// Buff 系统配置
var BUFFS = {
    expand: {
        id: 'expand',
        name: '扩容',
        icon: '📐',
        description: '容器宽度 +10px',
        effect: { type: 'containerWidth', value: 10 },
        stackable: true,
        maxStacks: 5
    },
    soften: {
        id: 'soften',
        name: '软化',
        icon: '🪶',
        description: '重力 -15%',
        effect: { type: 'gravity', multiplier: 0.85 },
        stackable: true,
        maxStacks: 3
    },
    precision: {
        id: 'precision',
        name: '精准',
        icon: '🎯',
        description: '显示投影辅助线',
        effect: { type: 'dropGuide', enabled: true },
        stackable: false
    }
};

// UI 颜色配置
var COLORS = {
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

var GameConfig = {
    __DEV__: __DEV__,
    FRUITS: FRUITS,
    PHYSICS: PHYSICS,
    GAME_AREA: GAME_AREA,
    RULES: RULES,
    TOOLS: TOOLS,
    AD_CONFIG: AD_CONFIG,
    SHARE_CONFIG: SHARE_CONFIG,
    DEBUG_CONFIG: DEBUG_CONFIG,
    COLORS: COLORS,
    COMBO: COMBO,
    FEVER: FEVER,
    WEATHER: WEATHER,
    EARTHQUAKE: EARTHQUAKE,
    MYSTERY_BOX: MYSTERY_BOX,
    BOMB: BOMB,
    ICE_BLOCK: ICE_BLOCK,
    BUFFS: BUFFS
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
} else if (typeof window !== 'undefined') {
    window.GameConfig = GameConfig;
}

})(); // 关闭 IIFE
