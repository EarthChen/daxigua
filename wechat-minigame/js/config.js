/**
 * 游戏配置常量
 */

// 使用 IIFE 避免全局变量冲突
(function() {
'use strict';

// 开发环境标识 - 发布前设为 false
var __DEV__ = false;

// 水果配置（11种水果）- 包含差异化物理材质
var FRUITS = [
    { id: 0, name: '葡萄', radius: 26, color: '#9b59b6', score: 1, friction: 0.25, restitution: 0.15 },   // 轻盈、弹性略高
    { id: 1, name: '樱桃', radius: 33, color: '#e74c3c', score: 2, friction: 0.20, restitution: 0.20 },   // 光滑、高弹性
    { id: 2, name: '橘子', radius: 40, color: '#e67e22', score: 3, friction: 0.35, restitution: 0.08 },   // 皮厚、中等摩擦
    { id: 3, name: '柠檬', radius: 48, color: '#f1c40f', score: 4, friction: 0.30, restitution: 0.10 },   // 略滑
    { id: 4, name: '猕猴桃', radius: 56, color: '#27ae60', score: 5, friction: 0.50, restitution: 0.03 }, // 毛茸茸、高摩擦、低弹性
    { id: 5, name: '番茄', radius: 64, color: '#c0392b', score: 6, friction: 0.35, restitution: 0.05 },   // 软、低弹性
    { id: 6, name: '桃子', radius: 72, color: '#fd79a8', score: 7, friction: 0.40, restitution: 0.04 },   // 绒毛表面
    { id: 7, name: '菠萝', radius: 82, color: '#fdcb6e', score: 8, friction: 0.55, restitution: 0.02 },   // 粗糙、最高摩擦
    { id: 8, name: '椰子', radius: 92, color: '#dfe6e9', score: 9, friction: 0.25, restitution: 0.12 },   // 硬壳、中等弹性
    { id: 9, name: '半西瓜', radius: 102, color: '#00b894', score: 10, friction: 0.30, restitution: 0.06 }, // 重、稳定
    { id: 10, name: '西瓜', radius: 115, color: '#55a630', score: 100, friction: 0.35, restitution: 0.04 }  // 最重、最稳定
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
    skip: { initial: 5, adReward: 2, name: '跳过', icon: '⏭️' },
    shake: { initial: 1, type: 'cooldown', cooldown: 10000, name: '震动', icon: '📳' }, // 10秒冷却
    gust: { initial: 1, type: 'cooldown', cooldown: 15000, name: '吹风', icon: '💨' }  // 15秒冷却
};

// 混沌模式配置
var CHAOS = {
    enabled: true,
    artifactThreshold: 500, // 每500分触发一次神器选择
    livingJar: true,        // 呼吸墙壁
    fruitSlice: true        // 切水果模式
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
            probability: 0.25
        },
        slippery: {
            name: '梅雨',
            icon: '🌧️',
            friction: 0.01,   // 降低摩擦力
            probability: 0.25
        },
        icy: {
            name: '霜冻',
            icon: '❄️',
            restitution: 0.01, // 降低弹性
            probability: 0.25
        },
        antiGravity: {
            name: '反重力',
            icon: '🔮',
            gravityMultiplier: -0.3,  // 重力变为负值（向上）
            duration: 1500,           // 持续 1.5 秒（短暂漂浮）
            probability: 0.25
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

// 合成震感配置（根据水果等级）
var MERGE_FEEDBACK = {
    enabled: true,
    // 震动强度 = baseIntensity + level * levelMultiplier
    baseIntensity: 2,
    levelMultiplier: 1.5,
    baseDuration: 100,
    durationMultiplier: 30,
    // 高等级合成（7级以上）额外效果
    highLevelThreshold: 7,
    highLevelIntensityBonus: 5,
    // Combo 色调偏移配置
    comboHueShift: {
        enabled: true,
        baseShift: 0,           // 基础色调偏移
        shiftPerCombo: 5,       // 每次连击增加的色调偏移度
        maxShift: 60,           // 最大偏移
        saturationBoost: 0.05,  // 每次连击饱和度增加
        maxSaturation: 1.4      // 最大饱和度倍率
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

// 引力场（微型黑洞）配置
var GRAVITY_FIELD = {
    enabled: true,
    spawnChance: 0.02,        // 盲盒中 2% 概率出现
    radius: 40,               // 显示半径
    attractRadius: 150,       // 吸引半径
    attractForce: 0.5,        // 吸引力强度
    duration: 8000,           // 持续时间 8秒
    visualPulse: true,        // 视觉脉冲效果
    destroyOnContact: false,  // 接触是否销毁水果（改为吸引）
    centerForce: 2.0          // 中心区域强化吸引力
};

// 炸弹配置（增强版）
var BOMB = {
    fuseTime: 3000,           // 引爆时间
    blastRadius: 180,         // 爆炸影响半径（扩大）
    blastForce: 20,           // 爆炸冲量（增强）
    destroyRadius: 90,        // 直接销毁半径（扩大）
    scoreBonus: 50,           // 每销毁一个水果的分数
    radius: 35,               // 炸弹显示半径
    chainReaction: true,      // 是否引发连锁（炸到炸弹会立即引爆）
    screenShake: {            // 爆炸震动
        intensity: 15,
        duration: 400
    }
};

// 冰封果实配置
var ICE_BLOCK = {
    enabled: true,            // 是否启用冰封
    spawnChance: 0.08,        // 出现概率
    thawRadius: 80,           // 解冻触发半径
    visualAlpha: 0.6,         // 冰层透明度
    // 连锁解冻配置
    chainReaction: {
        enabled: true,        // 是否启用连锁解冻
        chainRadius: 100,     // 连锁解冻半径
        chainProbability: 0.6, // 连锁解冻概率 60%
        shockwaveForce: 3,    // 冲击波力度
        shockwaveRadius: 60,  // 冲击波半径
        maxChainDepth: 3      // 最大连锁深度
    }
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
    },
    piercing: {
        id: 'piercing',
        name: '穿透弹',
        icon: '🎯',
        description: '下次投放穿透销毁1个水果',
        effect: { type: 'piercingShot', charges: 1 },
        stackable: true,
        maxStacks: 3,
        consumable: true  // 使用后消耗
    },
    vaporize: {
        id: 'vaporize',
        name: '蒸发',
        icon: '💨',
        description: '消除所有0-2级水果',
        effect: { type: 'vaporize', maxLevel: 2 },
        stackable: false,
        immediate: true  // 立即生效
    },
    shuffle: {
        id: 'shuffle',
        name: '洗牌',
        icon: '🔀',
        description: '随机重排所有水果位置',
        effect: { type: 'shuffle' },
        stackable: false,
        immediate: true
    }
};

// 统计项配置
var STATS = {
    // 单局统计
    maxCombo: { key: 'maxCombo', name: '最大连击', icon: '🔥' },
    totalMerges: { key: 'totalMerges', name: '总合成次数', icon: '🔄' },
    totalWatermelons: { key: 'totalWatermelons', name: '合成西瓜数', icon: '🍉' },
    totalGames: { key: 'totalGames', name: '游戏局数', icon: '🎮' },
    totalPlayTime: { key: 'totalPlayTime', name: '总游戏时间(秒)', icon: '⏱️' },
    fastestWatermelon: { key: 'fastestWatermelon', name: '最快合成西瓜(秒)', icon: '⚡' },
    highestScore: { key: 'highestScore', name: '最高分', icon: '🏆' },
    // 水果统计
    fruitMerges: { key: 'fruitMerges', name: '各水果合成次数', icon: '🍇' }
};

// 成就配置
var ACHIEVEMENTS = [
    // 合成成就
    { id: 'first_watermelon', name: '初次合成', icon: '🍉', description: '首次合成大西瓜', condition: { stat: 'totalWatermelons', value: 1 } },
    { id: 'watermelon_10', name: '西瓜大师', icon: '🍉', description: '累计合成10个大西瓜', condition: { stat: 'totalWatermelons', value: 10 } },
    { id: 'watermelon_50', name: '西瓜传奇', icon: '👑', description: '累计合成50个大西瓜', condition: { stat: 'totalWatermelons', value: 50 } },
    
    // 连击成就
    { id: 'combo_5', name: '连击新手', icon: '🔥', description: '达成5连击', condition: { stat: 'maxCombo', value: 5 } },
    { id: 'combo_10', name: '连击达人', icon: '🔥', description: '达成10连击', condition: { stat: 'maxCombo', value: 10 } },
    { id: 'combo_20', name: '连击之王', icon: '👑', description: '达成20连击', condition: { stat: 'maxCombo', value: 20 } },
    
    // 分数成就
    { id: 'score_1000', name: '千分大关', icon: '📈', description: '单局得分超过1000', condition: { stat: 'highestScore', value: 1000 } },
    { id: 'score_5000', name: '高分玩家', icon: '📈', description: '单局得分超过5000', condition: { stat: 'highestScore', value: 5000 } },
    { id: 'score_10000', name: '分数王者', icon: '👑', description: '单局得分超过10000', condition: { stat: 'highestScore', value: 10000 } },
    
    // 速度成就
    { id: 'fast_30', name: '闪电手', icon: '⚡', description: '30秒内合成大西瓜', condition: { stat: 'fastestWatermelon', value: 30, compare: 'lte' } },
    
    // 游戏次数成就
    { id: 'games_10', name: '初来乍到', icon: '🎮', description: '游玩10局', condition: { stat: 'totalGames', value: 10 } },
    { id: 'games_100', name: '老玩家', icon: '🎮', description: '游玩100局', condition: { stat: 'totalGames', value: 100 } }
];

// 皮肤配置
var SKINS = {
    classic: {
        id: 'classic',
        name: '经典',
        icon: '🍉',
        background: {
            topColor: '#fef3c7',
            bottomColor: '#f5deb3'
        },
        ground: {
            topColor: '#8B4513',
            midColor: '#654321',
            bottomColor: '#3d2914'
        },
        fruits: null,  // 使用默认配置
        unlocked: true
    },
    space: {
        id: 'space',
        name: '星球',
        icon: '🌍',
        background: {
            topColor: '#0a0a2a',
            bottomColor: '#1a1a4a'
        },
        ground: {
            topColor: '#2a2a4a',
            midColor: '#1a1a3a',
            bottomColor: '#0a0a2a'
        },
        fruits: [
            { color: '#8b5cf6' },  // 冥王星 - 紫色
            { color: '#ef4444' },  // 火星 - 红色
            { color: '#f97316' },  // 金星 - 橙色
            { color: '#eab308' },  // 土星 - 黄色
            { color: '#22c55e' },  // 地球 - 绿色
            { color: '#14b8a6' },  // 海王星 - 青色
            { color: '#3b82f6' },  // 天王星 - 蓝色
            { color: '#f59e0b' },  // 木星 - 琥珀色
            { color: '#94a3b8' },  // 水星 - 灰色
            { color: '#06b6d4' },  // 半太阳 - 青色
            { color: '#fbbf24' }   // 太阳 - 金色
        ],
        unlocked: true
    },
    food: {
        id: 'food',
        name: '美食',
        icon: '🍔',
        background: {
            topColor: '#fef2f2',
            bottomColor: '#fee2e2'
        },
        ground: {
            topColor: '#78350f',
            midColor: '#92400e',
            bottomColor: '#451a03'
        },
        fruits: [
            { color: '#dc2626' },  // 番茄 - 红色
            { color: '#f59e0b' },  // 芝士 - 橙黄
            { color: '#84cc16' },  // 生菜 - 绿色
            { color: '#eab308' },  // 鸡蛋 - 黄色
            { color: '#a16207' },  // 牛肉 - 棕色
            { color: '#f97316' },  // 培根 - 橙色
            { color: '#fcd34d' },  // 面包 - 浅黄
            { color: '#fb923c' },  // 薯条 - 橙色
            { color: '#fef3c7' },  // 洋葱 - 米色
            { color: '#22c55e' },  // 黄瓜 - 绿色
            { color: '#b91c1c' }   // 汉堡 - 深红
        ],
        unlocked: true
    },
    dark: {
        id: 'dark',
        name: '暗黑',
        icon: '🌙',
        background: {
            topColor: '#1f2937',
            bottomColor: '#111827'
        },
        ground: {
            topColor: '#374151',
            midColor: '#1f2937',
            bottomColor: '#111827'
        },
        fruits: [
            { color: '#6366f1' },  // 紫罗兰
            { color: '#ec4899' },  // 粉红
            { color: '#f97316' },  // 橙色
            { color: '#fbbf24' },  // 金色
            { color: '#10b981' },  // 翠绿
            { color: '#f43f5e' },  // 玫瑰
            { color: '#8b5cf6' },  // 紫色
            { color: '#06b6d4' },  // 青色
            { color: '#64748b' },  // 灰色
            { color: '#14b8a6' },  // 青绿
            { color: '#a855f7' }   // 亮紫
        ],
        unlocked: true
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
    CHAOS: CHAOS,
    AD_CONFIG: AD_CONFIG,
    SHARE_CONFIG: SHARE_CONFIG,
    DEBUG_CONFIG: DEBUG_CONFIG,
    STATS: STATS,
    ACHIEVEMENTS: ACHIEVEMENTS,
    SKINS: SKINS,
    COLORS: COLORS,
    COMBO: COMBO,
    FEVER: FEVER,
    WEATHER: WEATHER,
    EARTHQUAKE: EARTHQUAKE,
    MERGE_FEEDBACK: MERGE_FEEDBACK,
    MYSTERY_BOX: MYSTERY_BOX,
    GRAVITY_FIELD: GRAVITY_FIELD,
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
