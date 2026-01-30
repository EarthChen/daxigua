/**
 * 游戏配置常量
 * React 版本 - 从 shared/js/config.js 适配
 */

// 开发环境标识
export const __DEV__ = import.meta.env.DEV;

// 水果配置（11种水果）- 优化大小，整体缩小约15%
export const FRUITS = [
  { id: 0, name: '葡萄', radius: 22, color: '#9b59b6', score: 1 },
  { id: 1, name: '樱桃', radius: 28, color: '#e74c3c', score: 2 },
  { id: 2, name: '橘子', radius: 34, color: '#e67e22', score: 3 },
  { id: 3, name: '柠檬', radius: 41, color: '#f1c40f', score: 4 },
  { id: 4, name: '猕猴桃', radius: 48, color: '#27ae60', score: 5 },
  { id: 5, name: '番茄', radius: 55, color: '#c0392b', score: 6 },
  { id: 6, name: '桃子', radius: 62, color: '#fd79a8', score: 7 },
  { id: 7, name: '菠萝', radius: 70, color: '#fdcb6e', score: 8 },
  { id: 8, name: '椰子', radius: 78, color: '#dfe6e9', score: 9 },
  { id: 9, name: '半西瓜', radius: 87, color: '#00b894', score: 10 },
  { id: 10, name: '西瓜', radius: 98, color: '#55a630', score: 100 },
];

// 物理引擎配置 - 优化版本，更自然的碰撞和下落
export const PHYSICS = {
  gravity: { x: 0, y: 0.45 },      // 进一步降低重力，下落更缓慢
  friction: 0.45,                   // 摩擦力
  frictionStatic: 0.85,             // 静摩擦，水果更稳定
  restitution: 0.25,                // 弹性，碰撞有弹跳感
  frictionAir: 0.012,               // 空气阻力
  sleepThreshold: 35,               // 休眠阈值
  sleepVelocityLimit: 0.25,         // 休眠速度限制
  positionIterations: 8,            // 增加迭代次数，碰撞更精确
  velocityDamping: 0.985,           // 速度阻尼
  // 碰撞解决参数
  collisionSlop: 0.25,              // 允许的穿透深度
  collisionPercent: 0.6,            // 位置修正比例
};

// 游戏区域配置
export const GAME_AREA = {
  topMargin: 0.15,
  bottomMargin: 0.12,
  sideMargin: 0.02,
  groundHeight: 80,
  wallThickness: 20,
};

// 游戏规则配置
export const RULES = {
  maxFruitLevel: 4,
  mergeDelay: 100,
  gameOverLineY: 0.18,
  gameOverDelay: 2000,
  dropCooldown: 300,
  // 自动下落配置
  autoDropEnabled: true,
  autoDropTime: 5,           // 5秒自动下落（降低时间增加难度）
  autoDropWarningTime: 3,    // 最后3秒显示警告
};

// 道具配置
export const TOOLS = {
  hammer: { initial: 3, adReward: 1, name: '锤子', icon: '🔨' },
  selectFruit: { initial: 2, adReward: 1, name: '选果', icon: '🍇' },
  skip: { initial: 5, adReward: 2, name: '跳过', icon: '⏭️' },
};

// Combo 连击配置
export const COMBO = {
  windowMs: 2000,             // 延长连击窗口
  scoreMultiplier: 0.8,       // 提高分数倍率
  maxCombo: 30,               // 提高最大连击
  feverThreshold: 6,          // 稍微提高触发狂热的阈值
  resetOnDrop: false,
  // 连击特效
  effects: {
    shakeIntensity: 3,        // 震动强度（每次连击）
    flashDuration: 200,       // 闪烁持续时间
    textScale: 1.5,           // 文字放大倍数
  },
};

// Fever 狂热模式配置
export const FEVER = {
  duration: 6000,
  radiusShrink: 0.85,
  dropCooldown: 0,
  bgEffect: 'pulse',
  particleCount: 30,
};

// 天气系统配置
export const WEATHER = {
  enabled: true,
  interval: 30000,
  duration: 15000,
  firstDelay: 10000,
  types: {
    windy: {
      name: '大风',
      icon: '🌪️',
      forceX: 0.3,
      forceY: 0,
      probability: 0.33,
    },
    slippery: {
      name: '梅雨',
      icon: '🌧️',
      friction: 0.01,
      probability: 0.33,
    },
    icy: {
      name: '霜冻',
      icon: '❄️',
      restitution: 0.01,
      probability: 0.34,
    },
  },
};

// 地震配置
export const EARTHQUAKE = {
  enabled: true,
  triggerDelay: 1500,
  impulseStrength: 10,
  cooldown: 8000,
  screenShake: {
    duration: 600,
    intensity: 12,
  },
};

// 盲盒果实配置
export const MYSTERY_BOX = {
  enabled: true,
  spawnChance: 0.08,           // 提高出现几率
  resolveOnLanding: true,      // 落地后立即揭示
  landingVelocityThreshold: 2, // 速度低于此值视为落地
  landingTimeThreshold: 800,   // 落地后等待时间
  results: {
    evolve: { chance: 0.08, levelBonus: 2 },   // 进化：提高几率，降低等级
    bomb: { chance: 0.12, fuseTime: 3000 },    // 炸弹：提高几率
    lucky: { chance: 0.10, scoreBonus: 20 },   // 幸运：直接加分
    random: { chance: 0.70, levelRange: [0, 4] }, // 随机：扩大范围
  },
  animation: {
    shakeDuration: 500,        // 揭示前震动时间
    revealDuration: 300,       // 揭示动画时间
  },
};

// 炸弹配置
export const BOMB = {
  fuseTime: 3000,
  blastRadius: 120,
  blastForce: 15,
  destroyRadius: 60,
  scoreBonus: 50,
  radius: 35,
};

// 冰封果实配置
export const ICE_BLOCK = {
  enabled: true,
  spawnChance: 0.08,
  thawRadius: 80,
  visualAlpha: 0.6,
};

// Buff 系统配置
export const BUFFS = {
  expand: {
    id: 'expand',
    name: '扩容',
    icon: '📐',
    description: '容器宽度 +10px',
    effect: { type: 'containerWidth', value: 10 },
    stackable: true,
    maxStacks: 5,
  },
  soften: {
    id: 'soften',
    name: '软化',
    icon: '🪶',
    description: '重力 -15%',
    effect: { type: 'gravity', multiplier: 0.85 },
    stackable: true,
    maxStacks: 3,
  },
  precision: {
    id: 'precision',
    name: '精准',
    icon: '🎯',
    description: '显示投影辅助线',
    effect: { type: 'dropGuide', enabled: true },
    stackable: false,
  },
};

// UI 颜色配置
export const COLORS = {
  background: '#f5deb3',
  ground: '#8b4513',
  groundTop: '#654321',
  wall: '#8b4513',
  dropLine: '#ffcc00',
  gameOverLine: '#ff0000',
  scoreText: '#333333',
  toolbarBg: 'rgba(0,0,0,0.8)',
  buttonBg: '#ffecd2',
  adButtonBg: '#4CAF50',
};
