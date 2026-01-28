/**
 * 合成大西瓜 - 微信小游戏入口
 * 使用 Matter.js 物理引擎重写
 */

// 加载游戏模块
const Game = require('./js/game');

// 获取系统信息
const systemInfo = wx.getSystemInfoSync();
console.log('[游戏] 系统信息:', systemInfo.model, systemInfo.system);

// 创建主画布
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 设置画布尺寸
canvas.width = systemInfo.windowWidth * systemInfo.pixelRatio;
canvas.height = systemInfo.windowHeight * systemInfo.pixelRatio;

// 游戏配置
const gameConfig = {
    canvas: canvas,
    ctx: ctx,
    width: systemInfo.windowWidth,
    height: systemInfo.windowHeight,
    pixelRatio: systemInfo.pixelRatio,
    designWidth: 375,  // 设计宽度（iPhone 6/7/8）
    designHeight: 667  // 设计高度
};

// 计算缩放比例
gameConfig.scale = Math.min(
    gameConfig.width / gameConfig.designWidth,
    gameConfig.height / gameConfig.designHeight
);

console.log('[游戏] 画布尺寸:', gameConfig.width, 'x', gameConfig.height);
console.log('[游戏] 缩放比例:', gameConfig.scale.toFixed(2));

// 创建并启动游戏
const game = new Game(gameConfig);
game.start();

// 导出游戏实例供其他模块使用
module.exports = game;
