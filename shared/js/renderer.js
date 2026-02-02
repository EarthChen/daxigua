/**
 * Canvas 渲染器
 * 绘制游戏画面、水果、UI元素
 * 支持微信小程序和 Web 环境
 */

(function() {
'use strict';

// 环境适配导入
var Platform, Config;

if (typeof require !== 'undefined') {
    Platform = require('./platform');
    Config = require('./config');
} else {
    Platform = window.Platform;
    Config = window.GameConfig;
}

var COLORS = Config ? Config.COLORS : {};
var FRUITS = Config ? Config.FRUITS : [];
var GAME_AREA = Config ? Config.GAME_AREA : {};
var RULES = Config ? Config.RULES : {};
var __DEV__ = Config ? Config.__DEV__ : false;
var COMBO = Config ? Config.COMBO : {};
var FEVER = Config ? Config.FEVER : {};
var WEATHER = Config ? Config.WEATHER : {};
var BOMB = Config ? Config.BOMB : {};
var ICE_BLOCK = Config ? Config.ICE_BLOCK : {};
var BUFFS = Config ? Config.BUFFS : {};
var SKINS = Config ? Config.SKINS : {};

class Renderer {
    constructor(config) {
        this.canvas = config.canvas;
        this.ctx = config.ctx;
        this.width = config.width;
        this.height = config.height;
        this.pixelRatio = config.pixelRatio;
        this.scale = config.scale;
        
        // 游戏区域计算
        this.gameArea = {
            left: this.width * GAME_AREA.sideMargin,
            right: this.width * (1 - GAME_AREA.sideMargin),
            top: this.height * GAME_AREA.topMargin,
            bottom: this.height * (1 - GAME_AREA.bottomMargin),
            groundY: this.height * (1 - GAME_AREA.bottomMargin)
        };
        
        // 皮肤系统
        this.currentSkin = this.loadSkin() || 'classic';
        this.skinConfig = SKINS[this.currentSkin] || SKINS.classic;
        
        // 缓存水果图像
        this.fruitImages = {};
        this.loadFruitImages();
    }

    /**
     * 加载保存的皮肤选择
     */
    loadSkin() {
        try {
            return Platform.getStorageSync('daxigua_skin') || 'classic';
        } catch (e) {
            return 'classic';
        }
    }

    /**
     * 切换皮肤
     */
    setSkin(skinId) {
        if (SKINS[skinId]) {
            this.currentSkin = skinId;
            this.skinConfig = SKINS[skinId];
            try {
                Platform.setStorageSync('daxigua_skin', skinId);
            } catch (e) {}
            console.log(`[皮肤] 切换到: ${SKINS[skinId].name}`);
        }
    }

    /**
     * 获取当前皮肤的水果颜色
     */
    getSkinFruitColor(level) {
        if (this.skinConfig.fruits && this.skinConfig.fruits[level]) {
            return this.skinConfig.fruits[level].color;
        }
        return FRUITS[level]?.color || '#888888';
    }

    loadFruitImages() {
        // 加载水果图片
        for (let i = 0; i <= 10; i++) {
            const img = Platform.createImage();
            img.src = `res/images/fruit_${i}.png`;
            img.onload = () => {
                console.log(`[渲染器] 水果图片 ${i} 加载完成`);
            };
            img.onerror = (err) => {
                console.log(`[渲染器] 水果图片 ${i} 加载失败:`, err);
            };
            this.fruitImages[i] = img;
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 绘制背景
    drawBackground() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 使用皮肤配置的背景颜色
        const bgConfig = this.skinConfig.background || { topColor: '#fef3c7', bottomColor: '#f5deb3' };
        
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, bgConfig.topColor);
        gradient.addColorStop(1, bgConfig.bottomColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 绘制墙壁和地面
    drawWalls() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const ga = this.gameArea;

        // 使用皮肤配置的地面颜色
        const groundConfig = this.skinConfig.ground || { 
            topColor: '#8B4513', 
            midColor: '#654321', 
            bottomColor: '#3d2914' 
        };

        // 地面
        const groundGradient = ctx.createLinearGradient(
            0, ga.groundY * pr,
            0, this.canvas.height
        );
        groundGradient.addColorStop(0, groundConfig.topColor);
        groundGradient.addColorStop(0.1, groundConfig.midColor);
        groundGradient.addColorStop(1, groundConfig.bottomColor);
        
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, ga.groundY * pr, this.canvas.width, (this.height - ga.groundY) * pr);

        // 地面纹理
        ctx.fillStyle = groundConfig.midColor;
        const stripeHeight = 10 * pr;
        ctx.fillRect(0, ga.groundY * pr, this.canvas.width, stripeHeight);
    }

    // 绘制游戏结束线
    drawGameOverLine(y) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const ga = this.gameArea;

        ctx.save();
        ctx.setLineDash([10 * pr, 10 * pr]);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2 * pr;
        ctx.beginPath();
        ctx.moveTo(ga.left * pr, y * pr);
        ctx.lineTo(ga.right * pr, y * pr);
        ctx.stroke();
        ctx.restore();
    }

    // 绘制当前水果预览线（已禁用竖线绘制）
    drawDropLine(x, fruit, gameOverLineY) {
        // 不再绘制下落竖线，直接返回
        return;
    }

    // 绘制待投放的水果
    drawPendingFruit(x, y, fruitLevel, isMysteryBox = false, isIceBlock = false, isFeverMode = false) {
        const fruit = FRUITS[fruitLevel];
        if (!fruit) return;

        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // Fever 模式下半径缩小
        const radius = isFeverMode ? fruit.radius * FEVER.radiusShrink : fruit.radius;

        ctx.save();
        ctx.globalAlpha = 0.8;
        
        if (isMysteryBox) {
            // 绘制盲盒预览
            this.drawMysteryBox(x, y, radius);
        } else if (isIceBlock) {
            // 绘制冰封水果预览
            this.drawIceFruit(x, y, radius, fruitLevel, 0);
        } else {
            // 绘制普通水果
            this.drawFruit(x, y, radius, fruitLevel, 1);
        }
        
        ctx.restore();
    }

    // 绘制自动下落倒计时
    drawAutoDropCountdown(x, y, countdown, fruitLevel, maxCountdown = 15) {
        if (countdown <= 0) return;
        
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const fruit = FRUITS[fruitLevel];
        if (!fruit) return;

        const radius = fruit.radius;

        // 在水果下方绘制倒计时圆环
        ctx.save();

        // 倒计时背景圆
        ctx.beginPath();
        ctx.arc(x * pr, (y + radius + 25) * pr, 18 * pr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();

        // 倒计时进度圆环（使用动态最大值）
        const progress = countdown / maxCountdown;
        ctx.beginPath();
        ctx.arc(x * pr, (y + radius + 25) * pr, 18 * pr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.strokeStyle = countdown <= 3 ? '#ff4444' : '#ffcc00';
        ctx.lineWidth = 3 * pr;
        ctx.stroke();

        // 倒计时数字
        ctx.fillStyle = countdown <= 3 ? '#ff4444' : '#fff';
        ctx.font = `bold ${14 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.ceil(countdown)), x * pr, (y + radius + 25) * pr);

        ctx.restore();
    }

    // 绘制单个水果
    drawFruit(x, y, radius, level, alpha = 1) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const fruit = FRUITS[level];

        if (!fruit) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 加载水果图片或使用渐变绘制
        const img = this.fruitImages[level];
        if (img && img.complete) {
            // 使用图片绘制
            ctx.drawImage(
                img,
                (x - radius) * pr,
                (y - radius) * pr,
                radius * 2 * pr,
                radius * 2 * pr
            );
        } else {
            // 使用增强的渐变效果绘制
            this.drawFruitGradient(x, y, radius, level);
        }

        ctx.restore();
    }

    // 使用渐变绘制水果（增强版，支持皮肤）
    drawFruitGradient(x, y, radius, level) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const fruit = FRUITS[level];
        
        // 使用皮肤颜色
        const fruitColor = this.getSkinFruitColor(level);

        // 水果阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10 * pr;
        ctx.shadowOffsetX = 3 * pr;
        ctx.shadowOffsetY = 5 * pr;

        // 水果主体渐变
        const gradient = ctx.createRadialGradient(
            (x - radius * 0.3) * pr, (y - radius * 0.4) * pr, 0,
            x * pr, y * pr, radius * pr * 1.1
        );
        gradient.addColorStop(0, this.lightenColor(fruitColor, 50));
        gradient.addColorStop(0.3, this.lightenColor(fruitColor, 20));
        gradient.addColorStop(0.6, fruitColor);
        gradient.addColorStop(0.9, this.darkenColor(fruitColor, 15));
        gradient.addColorStop(1, this.darkenColor(fruitColor, 30));

        ctx.beginPath();
        ctx.arc(x * pr, y * pr, radius * pr, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 边框
        ctx.strokeStyle = this.darkenColor(fruitColor, 35);
        ctx.lineWidth = 2.5 * pr;
        ctx.stroke();

        // 主高光
        ctx.beginPath();
        ctx.ellipse(
            (x - radius * 0.28) * pr,
            (y - radius * 0.32) * pr,
            radius * 0.35 * pr,
            radius * 0.25 * pr,
            -Math.PI / 6,
            0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();

        // 小高光点
        ctx.beginPath();
        ctx.arc(
            (x - radius * 0.4) * pr,
            (y - radius * 0.45) * pr,
            radius * 0.1 * pr,
            0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        // 底部反光
        ctx.beginPath();
        ctx.ellipse(
            x * pr,
            (y + radius * 0.5) * pr,
            radius * 0.4 * pr,
            radius * 0.15 * pr,
            0,
            0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();

        // 水果表情（可选，增加可爱度）
        if (level >= 0) {
            // 眼睛
            const eyeY = y - radius * 0.05;
            const eyeSpacing = radius * 0.25;
            const eyeSize = radius * 0.12;
            
            // 左眼
            ctx.beginPath();
            ctx.arc((x - eyeSpacing) * pr, eyeY * pr, eyeSize * pr, 0, Math.PI * 2);
            ctx.fillStyle = '#333';
            ctx.fill();
            
            // 右眼
            ctx.beginPath();
            ctx.arc((x + eyeSpacing) * pr, eyeY * pr, eyeSize * pr, 0, Math.PI * 2);
            ctx.fill();
            
            // 眼睛高光
            ctx.beginPath();
            ctx.arc((x - eyeSpacing + eyeSize * 0.3) * pr, (eyeY - eyeSize * 0.3) * pr, eyeSize * 0.4 * pr, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc((x + eyeSpacing + eyeSize * 0.3) * pr, (eyeY - eyeSize * 0.3) * pr, eyeSize * 0.4 * pr, 0, Math.PI * 2);
            ctx.fill();
            
            // 微笑
            ctx.beginPath();
            ctx.arc(
                x * pr,
                (y + radius * 0.15) * pr,
                radius * 0.2 * pr,
                0.1 * Math.PI,
                0.9 * Math.PI
            );
            ctx.strokeStyle = '#333';
            ctx.lineWidth = radius * 0.06 * pr;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    // 绘制所有水果
    drawFruits(bodies) {
        for (const body of bodies) {
            if (body.isRemoved) continue;
            
            // 绘制炸弹
            if (body.isBomb) {
                const elapsed = Date.now() - body.fuseStartTime;
                const fuseProgress = Math.min(elapsed / BOMB.fuseTime, 1);
                this.drawBomb(body.position.x, body.position.y, body.radius, fuseProgress);
                continue;
            }
            
            // 绘制盲盒
            if (body.isMysteryBox) {
                this.drawMysteryBox(body.position.x, body.position.y, body.radius);
                continue;
            }
            
            if (body.fruitLevel === undefined) continue;
            
            // 绘制冰封水果
            if (body.iceState === 'frozen' || body.iceState === 'thawing') {
                const thawProgress = body.iceState === 'thawing' ? 0.5 : 0;
                this.drawIceFruit(
                    body.position.x,
                    body.position.y,
                    body.radius,
                    body.fruitLevel,
                    thawProgress
                );
                continue;
            }
            
            // 绘制普通水果
            this.drawFruit(
                body.position.x,
                body.position.y,
                body.radius,
                body.fruitLevel
            );
        }
    }

    // 绘制分数
    drawScore(score, bestScore) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 当前分数
        ctx.fillStyle = '#333';
        ctx.font = `bold ${24 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${score}`, 20 * pr, 20 * pr);

        // 最高分
        ctx.font = `${14 * pr}px Arial`;
        ctx.fillStyle = '#666';
        ctx.fillText(`最高: ${bestScore}`, 20 * pr, 50 * pr);
    }

    // 绘制道具栏
    drawToolbar(tools, onToolClick) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        const toolbarY = this.height - 75;
        const buttonWidth = 52;
        const buttonHeight = 65;
        const gap = 6;
        const buttonCount = 5;
        const totalWidth = buttonCount * buttonWidth + (buttonCount - 1) * gap;
        const startX = (this.width - totalWidth) / 2;

        // 工具栏背景
        ctx.fillStyle = COLORS.toolbarBg;
        const bgPadding = 8;
        this.roundRect(
            ctx,
            (startX - bgPadding) * pr,
            (toolbarY - bgPadding) * pr,
            (totalWidth + bgPadding * 2) * pr,
            (buttonHeight + bgPadding * 2) * pr,
            20 * pr
        );
        ctx.fill();

        // 绘制按钮（添加分享按钮）
        const buttons = [
            { id: 'hammer', icon: '🔨', name: '锤子', count: tools.hammer, color: COLORS.buttonBg },
            { id: 'selectFruit', icon: '🍇', name: '选果', count: tools.selectFruit, color: COLORS.buttonBg },
            { id: 'skip', icon: '⏭️', name: '跳过', count: tools.skip, color: COLORS.buttonBg },
            { id: 'share', icon: '📤', name: '分享', count: null, color: '#2196F3' },
            { id: 'ad', icon: '🎬', name: '广告', count: null, color: COLORS.adButtonBg }
        ];

        const hitAreas = [];

        buttons.forEach((btn, index) => {
            const x = startX + index * (buttonWidth + gap);
            const y = toolbarY;

            // 按钮背景
            ctx.fillStyle = btn.color;
            this.roundRect(ctx, x * pr, y * pr, buttonWidth * pr, buttonHeight * pr, 10 * pr);
            ctx.fill();

            // 图标
            ctx.font = `${24 * pr}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.icon, (x + buttonWidth / 2) * pr, (y + 22) * pr);

            // 名称
            ctx.font = `${11 * pr}px Arial`;
            ctx.fillStyle = btn.id === 'ad' ? '#fff' : '#333';
            ctx.fillText(btn.name, (x + buttonWidth / 2) * pr, (y + 48) * pr);

            // 数量标签
            if (btn.count !== null) {
                const countX = x + buttonWidth - 8;
                const countY = y + 8;
                ctx.fillStyle = '#ff6347';
                ctx.beginPath();
                ctx.arc(countX * pr, countY * pr, 10 * pr, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${10 * pr}px Arial`;
                ctx.fillText(String(btn.count), countX * pr, countY * pr);
            } else {
                // 免费标签
                ctx.fillStyle = '#ffeb3b';
                ctx.font = `${10 * pr}px Arial`;
                ctx.fillText('免费', (x + buttonWidth / 2) * pr, (y + 8) * pr);
            }

            // 保存点击区域
            hitAreas.push({
                id: btn.id,
                x: x,
                y: y,
                width: buttonWidth,
                height: buttonHeight
            });
        });

        return hitAreas;
    }

    // 绘制排行榜按钮
    drawRankButton() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        const x = this.width - 50;
        const y = 45;
        const size = 40;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, (size / 2) * pr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f99f0a';
        ctx.lineWidth = 2 * pr;
        ctx.stroke();

        ctx.font = `${20 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏆', x * pr, y * pr);

        return { x: x - size / 2, y: y - size / 2, width: size, height: size };
    }

    // 绘制游戏结束画面
    drawGameOver(score, bestScore) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 面板
        const panelWidth = 280;
        const panelHeight = 300;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = (this.height - panelHeight) / 2;

        ctx.fillStyle = '#fff';
        this.roundRect(ctx, panelX * pr, panelY * pr, panelWidth * pr, panelHeight * pr, 20 * pr);
        ctx.fill();

        // 标题
        ctx.fillStyle = '#333';
        ctx.font = `bold ${28 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', (this.width / 2) * pr, (panelY + 50) * pr);

        // 分数
        ctx.font = `bold ${48 * pr}px Arial`;
        ctx.fillStyle = '#f99f0a';
        ctx.fillText(String(score), (this.width / 2) * pr, (panelY + 120) * pr);

        ctx.font = `${16 * pr}px Arial`;
        ctx.fillStyle = '#666';
        ctx.fillText(`最高分: ${bestScore}`, (this.width / 2) * pr, (panelY + 160) * pr);

        // 重新开始按钮
        const btnY = panelY + 200;
        const btnWidth = 160;
        const btnHeight = 50;
        const btnX = (this.width - btnWidth) / 2;

        ctx.fillStyle = '#4CAF50';
        this.roundRect(ctx, btnX * pr, btnY * pr, btnWidth * pr, btnHeight * pr, 25 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${18 * pr}px Arial`;
        ctx.fillText('再来一局', (this.width / 2) * pr, (btnY + btnHeight / 2) * pr);

        return {
            restartBtn: { x: btnX, y: btnY, width: btnWidth, height: btnHeight }
        };
    }

    // 绘制合成特效
    drawMergeEffect(x, y, radius, progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        ctx.save();
        ctx.globalAlpha = 1 - progress;

        // 光环效果
        const effectRadius = radius * (1 + progress * 2);
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 4 * pr * (1 - progress);
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, effectRadius * pr, 0, Math.PI * 2);
        ctx.stroke();

        // 粒子
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const dist = radius * (1 + progress * 3);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const pSize = 5 * (1 - progress);

            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(px * pr, py * pr, pSize * pr, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // 绘制提示消息
    drawToast(message, progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        ctx.save();
        ctx.globalAlpha = 1 - progress;

        const y = this.height / 2 - 50 - progress * 30;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const textWidth = ctx.measureText(message).width / pr + 40;
        this.roundRect(
            ctx,
            ((this.width - textWidth) / 2) * pr,
            (y - 20) * pr,
            textWidth * pr,
            40 * pr,
            20 * pr
        );
        ctx.fill();

        // 文字
        ctx.fillStyle = '#fff';
        ctx.font = `${16 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, (this.width / 2) * pr, y * pr);

        ctx.restore();
    }

    // 绘制水果选择面板
    drawFruitSelector() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 面板（更大以容纳更多水果）
        const panelWidth = 320;
        const panelHeight = 480;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = (this.height - panelHeight) / 2;

        ctx.fillStyle = '#fff';
        this.roundRect(ctx, panelX * pr, panelY * pr, panelWidth * pr, panelHeight * pr, 20 * pr);
        ctx.fill();

        // 标题
        ctx.fillStyle = '#333';
        ctx.font = `bold ${18 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('🍇 选择水果', (this.width / 2) * pr, (panelY + 30) * pr);

        // 水果选项（显示全部11种）
        const hitAreas = [];
        const cols = 4;
        const btnSize = 55;
        const gap = 10;
        const startX = panelX + (panelWidth - cols * btnSize - (cols - 1) * gap) / 2;
        const startY = panelY + 50;

        for (let i = 0; i <= 10; i++) {
            const fruit = FRUITS[i];
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = startX + col * (btnSize + gap);
            const y = startY + row * (btnSize + gap + 8);

            // 按钮背景
            ctx.fillStyle = '#ffecd2';
            this.roundRect(ctx, x * pr, y * pr, btnSize * pr, (btnSize + 18) * pr, 8 * pr);
            ctx.fill();

            // 水果
            const displayRadius = Math.min(fruit.radius * 0.4, 22);
            this.drawFruit(x + btnSize / 2, y + btnSize / 2 - 5, displayRadius, i, 1);

            // 名称
            ctx.fillStyle = '#333';
            ctx.font = `${9 * pr}px Arial`;
            ctx.fillText(fruit.name, (x + btnSize / 2) * pr, (y + btnSize + 8) * pr);

            hitAreas.push({
                level: i,
                x: x,
                y: y,
                width: btnSize,
                height: btnSize + 18
            });
        }

        // 关闭按钮
        const closeY = panelY + panelHeight - 50;
        const closeWidth = 100;
        const closeX = (this.width - closeWidth) / 2;
        
        ctx.fillStyle = '#999';
        this.roundRect(ctx, closeX * pr, closeY * pr, closeWidth * pr, 40 * pr, 20 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${14 * pr}px Arial`;
        ctx.fillText('取消', (this.width / 2) * pr, (closeY + 20) * pr);

        hitAreas.push({
            action: 'close',
            x: closeX,
            y: closeY,
            width: closeWidth,
            height: 40
        });

        return hitAreas;
    }

    // 绘制广告奖励选择面板
    drawAdPanel() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 面板
        const panelWidth = 280;
        const panelHeight = 280;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = (this.height - panelHeight) / 2;

        ctx.fillStyle = '#fff';
        this.roundRect(ctx, panelX * pr, panelY * pr, panelWidth * pr, panelHeight * pr, 20 * pr);
        ctx.fill();

        // 标题
        ctx.fillStyle = '#333';
        ctx.font = `bold ${18 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('🎬 选择奖励', (this.width / 2) * pr, (panelY + 35) * pr);

        // 选项
        const hitAreas = [];
        const options = [
            { id: 'hammer', icon: '🔨', name: '锤子 x1' },
            { id: 'selectFruit', icon: '🍇', name: '选果 x1' },
            { id: 'skip', icon: '⏭️', name: '跳过 x2' }
        ];

        const btnWidth = 220;
        const btnHeight = 45;
        const startY = panelY + 60;

        options.forEach((opt, i) => {
            const y = startY + i * (btnHeight + 10);
            const x = (this.width - btnWidth) / 2;

            ctx.fillStyle = '#4CAF50';
            this.roundRect(ctx, x * pr, y * pr, btnWidth * pr, btnHeight * pr, 22 * pr);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = `${16 * pr}px Arial`;
            ctx.fillText(`${opt.icon} ${opt.name}`, (this.width / 2) * pr, (y + btnHeight / 2) * pr);

            hitAreas.push({
                toolType: opt.id,
                x: x,
                y: y,
                width: btnWidth,
                height: btnHeight
            });
        });

        // 关闭按钮
        const closeY = panelY + panelHeight - 50;
        const closeWidth = 80;
        const closeX = (this.width - closeWidth) / 2;
        
        ctx.fillStyle = '#999';
        this.roundRect(ctx, closeX * pr, closeY * pr, closeWidth * pr, 35 * pr, 17 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${13 * pr}px Arial`;
        ctx.fillText('取消', (this.width / 2) * pr, (closeY + 18) * pr);

        hitAreas.push({
            action: 'close',
            x: closeX,
            y: closeY,
            width: closeWidth,
            height: 35
        });

        return hitAreas;
    }

    // 绘制分享奖励面板
    drawSharePanel() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 面板
        const panelWidth = 280;
        const panelHeight = 300;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = (this.height - panelHeight) / 2;

        ctx.fillStyle = '#fff';
        this.roundRect(ctx, panelX * pr, panelY * pr, panelWidth * pr, panelHeight * pr, 20 * pr);
        ctx.fill();

        // 标题
        ctx.fillStyle = '#333';
        ctx.font = `bold ${18 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('📤 分享获得道具', (this.width / 2) * pr, (panelY + 35) * pr);

        // 提示
        ctx.font = `${12 * pr}px Arial`;
        ctx.fillStyle = '#666';
        ctx.fillText('分享给好友，选择想要的道具', (this.width / 2) * pr, (panelY + 58) * pr);

        // 选项
        const hitAreas = [];
        const options = [
            { id: 'hammer', icon: '🔨', name: '锤子 x1' },
            { id: 'selectFruit', icon: '🍇', name: '选果 x1' },
            { id: 'skip', icon: '⏭️', name: '跳过 x2' }
        ];

        const btnWidth = 220;
        const btnHeight = 45;
        const startY = panelY + 80;

        options.forEach((opt, i) => {
            const y = startY + i * (btnHeight + 10);
            const x = (this.width - btnWidth) / 2;

            ctx.fillStyle = '#2196F3';
            this.roundRect(ctx, x * pr, y * pr, btnWidth * pr, btnHeight * pr, 22 * pr);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = `${16 * pr}px Arial`;
            ctx.fillText(`${opt.icon} ${opt.name}`, (this.width / 2) * pr, (y + btnHeight / 2) * pr);

            hitAreas.push({
                toolType: opt.id,
                x: x,
                y: y,
                width: btnWidth,
                height: btnHeight
            });
        });

        // 关闭按钮
        const closeY = panelY + panelHeight - 50;
        const closeWidth = 80;
        const closeX = (this.width - closeWidth) / 2;
        
        ctx.fillStyle = '#999';
        this.roundRect(ctx, closeX * pr, closeY * pr, closeWidth * pr, 35 * pr, 17 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${13 * pr}px Arial`;
        ctx.fillText('取消', (this.width / 2) * pr, (closeY + 18) * pr);

        hitAreas.push({
            action: 'close',
            x: closeX,
            y: closeY,
            width: closeWidth,
            height: 35
        });

        return hitAreas;
    }

    // 绘制调试按钮（仅开发环境）
    drawDebugButton() {
        if (!__DEV__) return null;
        
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        const btnWidth = 40;
        const btnHeight = 40;
        const x = this.width - btnWidth - 10;
        const y = 120;

        // 按钮背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.roundRect(ctx, x * pr, y * pr, btnWidth * pr, btnHeight * pr, 8 * pr);
        ctx.fill();

        // 图标
        ctx.font = `${22 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('🔧', (x + btnWidth / 2) * pr, (y + btnHeight / 2) * pr);

        return { x, y, width: btnWidth, height: btnHeight };
    }

    // 绘制调试面板（仅开发环境）
    drawDebugPanel(debugState = {}) {
        if (!__DEV__) return [];
        
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 面板 - 扩大高度以容纳更多按钮
        const panelWidth = 340;
        const panelHeight = 850;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = Math.max(10, (this.height - panelHeight) / 2);

        ctx.fillStyle = '#1a1a2e';
        this.roundRect(ctx, panelX * pr, panelY * pr, panelWidth * pr, panelHeight * pr, 20 * pr);
        ctx.fill();

        // 标题
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${18 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('🔧 调试面板', (this.width / 2) * pr, (panelY + 30) * pr);

        // 提示
        ctx.font = `${10 * pr}px Arial`;
        ctx.fillStyle = '#f39c12';
        ctx.fillText('⚠️ 仅开发环境可用', (this.width / 2) * pr, (panelY + 48) * pr);

        const hitAreas = [];
        const btnWidth = 100;
        const btnHeight = 32;
        const gap = 8;
        let currentY = panelY + 65;

        // === 道具区域 ===
        ctx.fillStyle = '#4a5568';
        ctx.font = `bold ${11 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('📦 道具', (panelX + 15) * pr, currentY * pr);
        currentY += 20;

        const toolButtons = [
            { label: '🔨 +5', action: 'addTool', toolType: 'hammer' },
            { label: '🍇 +5', action: 'addTool', toolType: 'selectFruit' },
            { label: '⏭️ +5', action: 'addTool', toolType: 'skip' }
        ];

        toolButtons.forEach((btn, i) => {
            const x = panelX + 15 + i * (btnWidth + gap);
            ctx.fillStyle = '#3498db';
            this.roundRect(ctx, x * pr, currentY * pr, btnWidth * pr, btnHeight * pr, 6 * pr);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${11 * pr}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, (x + btnWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
            hitAreas.push({ action: btn.action, toolType: btn.toolType, x, y: currentY, width: btnWidth, height: btnHeight });
        });
        currentY += btnHeight + gap;

        // 清空道具 + 分数
        const halfWidth = (panelWidth - 40 - gap) / 2;
        ctx.fillStyle = '#e74c3c';
        this.roundRect(ctx, (panelX + 15) * pr, currentY * pr, halfWidth * pr, btnHeight * pr, 6 * pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('🗑️ 清道具', (panelX + 15 + halfWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
        hitAreas.push({ action: 'clearTools', x: panelX + 15, y: currentY, width: halfWidth, height: btnHeight });

        ctx.fillStyle = '#27ae60';
        this.roundRect(ctx, (panelX + 15 + halfWidth + gap) * pr, currentY * pr, halfWidth * pr, btnHeight * pr, 6 * pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('📈 +100分', (panelX + 15 + halfWidth + gap + halfWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
        hitAreas.push({ action: 'addScore', x: panelX + 15 + halfWidth + gap, y: currentY, width: halfWidth, height: btnHeight });
        currentY += btnHeight + 15;

        // === 特效触发区域 ===
        ctx.fillStyle = '#4a5568';
        ctx.font = `bold ${11 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('⚡ 触发效果', (panelX + 15) * pr, currentY * pr);
        currentY += 20;

        const effectButtons = [
            { label: '🔥 Fever', action: 'triggerFever', color: '#ff6b35' },
            { label: '🌤️ 天气', action: 'triggerWeather', color: '#00bcd4' },
            { label: '⚠️ 地震', action: 'triggerEarthquake', color: '#795548' }
        ];

        effectButtons.forEach((btn, i) => {
            const x = panelX + 15 + i * (btnWidth + gap);
            ctx.fillStyle = btn.color;
            this.roundRect(ctx, x * pr, currentY * pr, btnWidth * pr, btnHeight * pr, 6 * pr);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${11 * pr}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, (x + btnWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
            hitAreas.push({ action: btn.action, x, y: currentY, width: btnWidth, height: btnHeight });
        });
        currentY += btnHeight + gap;

        // Combo 按钮
        ctx.fillStyle = '#9c27b0';
        this.roundRect(ctx, (panelX + 15) * pr, currentY * pr, (panelWidth - 30) * pr, btnHeight * pr, 6 * pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('🔥 Combo +5', (this.width / 2) * pr, (currentY + btnHeight / 2) * pr);
        hitAreas.push({ action: 'addCombo', x: panelX + 15, y: currentY, width: panelWidth - 30, height: btnHeight });
        currentY += btnHeight + 15;

        // === 生成实体区域 ===
        ctx.fillStyle = '#4a5568';
        ctx.font = `bold ${11 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('🎲 生成实体', (panelX + 15) * pr, currentY * pr);
        currentY += 20;

        const spawnButtons = [
            { label: '🎁 盲盒', action: 'spawnMysteryBox', color: '#8b4513' },
            { label: '💣 炸弹', action: 'spawnBomb', color: '#2c3e50' },
            { label: '🧊 冰果', action: 'spawnIceFruit', color: '#00acc1' }
        ];

        spawnButtons.forEach((btn, i) => {
            const x = panelX + 15 + i * (btnWidth + gap);
            ctx.fillStyle = btn.color;
            this.roundRect(ctx, x * pr, currentY * pr, btnWidth * pr, btnHeight * pr, 6 * pr);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${11 * pr}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, (x + btnWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
            hitAreas.push({ action: btn.action, x, y: currentY, width: btnWidth, height: btnHeight });
        });
        currentY += btnHeight + gap;

        // 生成水果 + 清空水果
        ctx.fillStyle = '#4caf50';
        this.roundRect(ctx, (panelX + 15) * pr, currentY * pr, halfWidth * pr, btnHeight * pr, 6 * pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('🍇 随机果', (panelX + 15 + halfWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
        hitAreas.push({ action: 'spawnFruit', x: panelX + 15, y: currentY, width: halfWidth, height: btnHeight });

        ctx.fillStyle = '#f44336';
        this.roundRect(ctx, (panelX + 15 + halfWidth + gap) * pr, currentY * pr, halfWidth * pr, btnHeight * pr, 6 * pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('🗑️ 清水果', (panelX + 15 + halfWidth + gap + halfWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
        hitAreas.push({ action: 'clearAllFruits', x: panelX + 15 + halfWidth + gap, y: currentY, width: halfWidth, height: btnHeight });
        currentY += btnHeight + gap;

        // 引力场
        ctx.fillStyle = '#673ab7';
        this.roundRect(ctx, (panelX + 15) * pr, currentY * pr, (panelWidth - 30) * pr, btnHeight * pr, 6 * pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('🌀 生成引力场', (this.width / 2) * pr, (currentY + btnHeight / 2) * pr);
        hitAreas.push({ action: 'spawnGravityField', x: panelX + 15, y: currentY, width: panelWidth - 30, height: btnHeight });
        currentY += btnHeight + 15;

        // === v2.0 新增功能区域 ===
        ctx.fillStyle = '#4a5568';
        ctx.font = `bold ${11 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('🆕 v2.0 新增功能', (panelX + 15) * pr, currentY * pr);
        currentY += 20;

        const newFeatureButtons = [
            { label: '🎯 穿透+3', action: 'addPiercing', color: '#e91e63' },
            { label: '💨 蒸发', action: 'triggerVaporize', color: '#ff5722' },
            { label: '🔀 洗牌', action: 'triggerShuffle', color: '#009688' }
        ];

        newFeatureButtons.forEach((btn, i) => {
            const x = panelX + 15 + i * (btnWidth + gap);
            ctx.fillStyle = btn.color;
            this.roundRect(ctx, x * pr, currentY * pr, btnWidth * pr, btnHeight * pr, 6 * pr);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${11 * pr}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, (x + btnWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
            hitAreas.push({ action: btn.action, x, y: currentY, width: btnWidth, height: btnHeight });
        });
        currentY += btnHeight + gap;

        const newFeatureButtons2 = [
            { label: '🔮 反重力', action: 'triggerAntiGravity', color: '#9c27b0' },
            { label: '🎨 换皮肤', action: 'cycleSkin', color: '#3f51b5' },
            { label: '📊 统计', action: 'showStats', color: '#607d8b' }
        ];

        newFeatureButtons2.forEach((btn, i) => {
            const x = panelX + 15 + i * (btnWidth + gap);
            ctx.fillStyle = btn.color;
            this.roundRect(ctx, x * pr, currentY * pr, btnWidth * pr, btnHeight * pr, 6 * pr);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${11 * pr}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, (x + btnWidth / 2) * pr, (currentY + btnHeight / 2) * pr);
            hitAreas.push({ action: btn.action, x, y: currentY, width: btnWidth, height: btnHeight });
        });
        currentY += btnHeight + gap;

        // 轨迹预测开关
        ctx.fillStyle = debugState.showDropGuide ? '#4caf50' : '#9e9e9e';
        this.roundRect(ctx, (panelX + 15) * pr, currentY * pr, (panelWidth - 30) * pr, btnHeight * pr, 6 * pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(`🎯 轨迹预测: ${debugState.showDropGuide ? '开' : '关'}`, (this.width / 2) * pr, (currentY + btnHeight / 2) * pr);
        hitAreas.push({ action: 'togglePredictPath', x: panelX + 15, y: currentY, width: panelWidth - 30, height: btnHeight });
        currentY += btnHeight + 15;

        // === 系统开关区域 ===
        ctx.fillStyle = '#4a5568';
        ctx.font = `bold ${11 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('⚙️ 系统开关（点击切换）', (panelX + 15) * pr, currentY * pr);
        currentY += 20;

        const toggleButtons = [
            { label: '🌤️ 天气', action: 'toggleWeather', key: 'weatherEnabled' },
            { label: '⚠️ 地震', action: 'toggleEarthquake', key: 'earthquakeEnabled' },
            { label: '🎁 盲盒', action: 'toggleMysteryBox', key: 'mysteryBoxEnabled' },
            { label: '🧊 冰封', action: 'toggleIceBlock', key: 'iceBlockEnabled' }
        ];

        const toggleWidth = (panelWidth - 30 - gap) / 2;
        toggleButtons.forEach((btn, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = panelX + 15 + col * (toggleWidth + gap);
            const y = currentY + row * (btnHeight + gap);
            
            const isEnabled = debugState[btn.key] !== false;
            ctx.fillStyle = isEnabled ? '#2ecc71' : '#7f8c8d';
            this.roundRect(ctx, x * pr, y * pr, toggleWidth * pr, btnHeight * pr, 6 * pr);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = `${11 * pr}px Arial`;
            ctx.textAlign = 'center';
            const statusText = isEnabled ? '开' : '关';
            ctx.fillText(`${btn.label} ${statusText}`, (x + toggleWidth / 2) * pr, (y + btnHeight / 2) * pr);
            hitAreas.push({ action: btn.action, x, y, width: toggleWidth, height: btnHeight });
        });
        currentY += 2 * (btnHeight + gap) + 10;

        // === 状态信息区域 ===
        ctx.fillStyle = '#4a5568';
        ctx.font = `bold ${11 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('📊 当前状态', (panelX + 15) * pr, currentY * pr);
        currentY += 18;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, (panelX + 15) * pr, currentY * pr, (panelWidth - 30) * pr, 60 * pr, 6 * pr);
        ctx.fill();

        ctx.fillStyle = '#a0aec0';
        ctx.font = `${10 * pr}px Arial`;
        ctx.textAlign = 'left';
        const stateLines = [
            `水果数: ${debugState.fruitCount || 0} | Combo: ${debugState.comboCount || 0}`,
            `Fever: ${debugState.isFeverMode ? '是' : '否'} | 天气: ${debugState.currentWeather || '无'}`,
            `自动下落: ${debugState.autoDropTime || 15}秒`
        ];
        stateLines.forEach((line, i) => {
            ctx.fillText(line, (panelX + 25) * pr, (currentY + 18 + i * 16) * pr);
        });
        currentY += 70;

        // 关闭按钮
        const closeWidth = 120;
        const closeX = (this.width - closeWidth) / 2;

        ctx.fillStyle = '#667eea';
        this.roundRect(ctx, closeX * pr, currentY * pr, closeWidth * pr, 40 * pr, 20 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('关闭', (this.width / 2) * pr, (currentY + 20) * pr);

        hitAreas.push({
            action: 'close',
            x: closeX,
            y: currentY,
            width: closeWidth,
            height: 40
        });

        return hitAreas;
    }

    // 绘制排行榜面板
    drawRankPanel() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 面板
        const panelWidth = 300;
        const panelHeight = 420;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = (this.height - panelHeight) / 2;

        ctx.fillStyle = '#fff';
        this.roundRect(ctx, panelX * pr, panelY * pr, panelWidth * pr, panelHeight * pr, 20 * pr);
        ctx.fill();

        // 开放数据域画布区域
        const sharedCanvasArea = {
            x: panelX + 10,
            y: panelY + 10,
            width: panelWidth - 20,
            height: panelHeight - 70
        };

        // 绘制开放数据域内容
        try {
            const openDataContext = wx.getOpenDataContext();
            const sharedCanvas = openDataContext.canvas;
            ctx.drawImage(
                sharedCanvas,
                sharedCanvasArea.x * pr,
                sharedCanvasArea.y * pr,
                sharedCanvasArea.width * pr,
                sharedCanvasArea.height * pr
            );
        } catch (e) {
            // 开放数据域不可用时显示提示
            ctx.fillStyle = '#999';
            ctx.font = `${14 * pr}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('排行榜加载中...', (this.width / 2) * pr, (panelY + panelHeight / 2) * pr);
        }

        // 关闭按钮
        const closeY = panelY + panelHeight - 50;
        const closeWidth = 100;
        const closeX = (this.width - closeWidth) / 2;
        
        ctx.fillStyle = '#f99f0a';
        this.roundRect(ctx, closeX * pr, closeY * pr, closeWidth * pr, 40 * pr, 20 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('关闭', (this.width / 2) * pr, (closeY + 20) * pr);

        return {
            closeBtn: { x: closeX, y: closeY, width: closeWidth, height: 40 },
            scrollArea: sharedCanvasArea
        };
    }

    // 辅助方法：绘制圆角矩形
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // 辅助方法：加亮颜色
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    // 辅助方法：加暗颜色
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    // ==================== Combo 特效 ====================
    
    drawComboEffect(x, y, comboCount, progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 弹出式 "Combo xN" 动画
        const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
        const alpha = 1 - progress;
        const yOffset = -50 * progress;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${24 * scale * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.getComboColor(comboCount);
        ctx.fillText(`Combo x${comboCount}`, x * pr, (y + yOffset) * pr);
        ctx.restore();
    }

    getComboColor(count) {
        if (count < 3) return '#ffffff';
        if (count < 5) return '#ffeb3b';
        if (count < 8) return '#ff9800';
        return '#f44336';
    }

    drawComboCounter(comboCount, isFeverMode) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        const x = this.width - 60;
        const y = 100;
        
        // 背景
        ctx.fillStyle = isFeverMode ? 'rgba(255, 100, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)';
        this.roundRect(ctx, (x - 30) * pr, (y - 15) * pr, 60 * pr, 30 * pr, 15 * pr);
        ctx.fill();
        
        // Combo 文字
        ctx.fillStyle = this.getComboColor(comboCount);
        ctx.font = `bold ${14 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`x${comboCount}`, x * pr, y * pr);
    }

    // ==================== Fever 模式效果 ====================
    
    drawFeverBackground(progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 脉冲效果
        const pulseAlpha = 0.1 + Math.sin(Date.now() / 100) * 0.05;
        ctx.fillStyle = `rgba(255, 100, 0, ${pulseAlpha})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 边缘光晕
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        gradient.addColorStop(0, 'rgba(255, 100, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // ==================== 天气效果 ====================
    
    drawWeatherOverlay(weatherType) {
        switch (weatherType) {
            case 'windy':
                this.drawWindParticles();
                break;
            case 'slippery':
                this.drawRainDrops();
                break;
            case 'icy':
                this.drawSnowflakes();
                this.drawFrostOverlay();
                break;
            case 'antiGravity':
                this.drawAntiGravityEffect();
                break;
        }
    }

    /**
     * 绘制反重力效果
     */
    drawAntiGravityEffect() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 向上飘浮的粒子
        ctx.fillStyle = 'rgba(200, 150, 255, 0.6)';
        
        const time = Date.now() / 1000;
        for (let i = 0; i < 30; i++) {
            // 粒子从下往上飘
            const x = (Math.sin(time + i * 0.7) * 30 + i * 25) % this.width;
            const y = this.height - ((time * 50 + i * 30) % this.height);
            const size = 2 + Math.sin(i) * 1.5;
            
            ctx.beginPath();
            ctx.arc(x * pr, y * pr, size * pr, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 边缘紫色光晕
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        gradient.addColorStop(0, 'rgba(150, 100, 255, 0)');
        gradient.addColorStop(1, 'rgba(150, 100, 255, 0.15)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawWindParticles() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2 * pr;
        
        const time = Date.now() / 50;
        for (let i = 0; i < 20; i++) {
            const x = ((time + i * 50) % (this.width + 100)) - 50;
            const y = i * 40 + Math.sin(time / 10 + i) * 20;
            ctx.beginPath();
            ctx.moveTo(x * pr, y * pr);
            ctx.lineTo((x - 30) * pr, (y + 15) * pr);
            ctx.stroke();
        }
    }

    drawRainDrops() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.lineWidth = 2 * pr;
        
        const time = Date.now() / 10;
        for (let i = 0; i < 40; i++) {
            const x = (i * 25 + time * 0.3) % this.width;
            const y = (time + i * 30) % this.height;
            ctx.beginPath();
            ctx.moveTo(x * pr, y * pr);
            ctx.lineTo((x - 3) * pr, (y + 15) * pr);
            ctx.stroke();
        }
    }

    drawSnowflakes() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        const time = Date.now() / 1000;
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(time * 0.5 + i) * 30 + i * 15 + time * 20) % this.width;
            const y = (time * 30 + i * 20) % this.height;
            const size = 2 + Math.sin(i) * 1.5;
            ctx.beginPath();
            ctx.arc(x * pr, y * pr, size * pr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFrostOverlay() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 边缘霜冻效果
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        gradient.addColorStop(0, 'rgba(200, 230, 255, 0)');
        gradient.addColorStop(1, 'rgba(200, 230, 255, 0.15)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawWeatherIndicator(weatherType, remainingSeconds) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        const config = WEATHER.types[weatherType];
        if (!config) return;
        
        const x = 20;
        const y = 80;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.roundRect(ctx, x * pr, y * pr, 80 * pr, 30 * pr, 15 * pr);
        ctx.fill();
        
        // 图标和倒计时
        ctx.fillStyle = '#fff';
        ctx.font = `${14 * pr}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${config.icon} ${remainingSeconds}s`, (x + 10) * pr, (y + 15) * pr);
    }

    // ==================== 地震警告效果 ====================
    
    drawWarningLine(y, progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const ga = this.gameArea;
        
        // 闪烁的红色警戒线
        const alpha = 0.3 + Math.sin(progress * Math.PI * 6) * 0.3;
        
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.lineWidth = 4 * pr;
        ctx.setLineDash([15 * pr, 10 * pr]);
        ctx.beginPath();
        ctx.moveTo(ga.left * pr, y * pr);
        ctx.lineTo(ga.right * pr, y * pr);
        ctx.stroke();
        
        // 文字警告
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.font = `bold ${14 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ 危险！', (this.width / 2) * pr, (y - 20) * pr);
        ctx.restore();
    }

    // ==================== 爆炸特效 ====================
    
    drawExplosionEffect(x, y, progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        
        // 爆炸圆环
        const radius = 30 + progress * 100;
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = (10 - progress * 8) * pr;
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, radius * pr, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内圈
        ctx.fillStyle = `rgba(255, 200, 0, ${0.5 - progress * 0.5})`;
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, radius * 0.5 * pr, 0, Math.PI * 2);
        ctx.fill();
        
        // 粒子
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = radius * (0.8 + progress * 0.5);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const pSize = 6 * (1 - progress);
            
            ctx.fillStyle = i % 2 === 0 ? '#ff6600' : '#ffcc00';
            ctx.beginPath();
            ctx.arc(px * pr, py * pr, pSize * pr, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    // ==================== 投影辅助线 ====================
    
    drawDropGuide(x, fruitRadius, gameArea) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        ctx.save();
        ctx.setLineDash([5 * pr, 5 * pr]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2 * pr;
        ctx.beginPath();
        ctx.moveTo(x * pr, gameArea.gameOverLineY * pr);
        ctx.lineTo(x * pr, gameArea.groundY * pr);
        ctx.stroke();
        
        // 落点圆圈
        ctx.beginPath();
        ctx.arc(x * pr, (gameArea.groundY - fruitRadius) * pr, fruitRadius * pr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();
        ctx.restore();
    }

    /**
     * 绘制动态轨迹预测引导线
     * @param {number} x - 投放 X 坐标
     * @param {number} startY - 起始 Y 坐标
     * @param {number} fruitRadius - 水果半径
     * @param {Object} gravity - 重力向量 {x, y}
     * @param {Object} windForce - 风力向量 {x, y} (可选)
     * @param {Object} gameArea - 游戏区域配置
     */
    drawPredictPath(x, startY, fruitRadius, gravity, windForce, gameArea) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 模拟参数
        const dt = 1/60;  // 时间步长
        const steps = 90; // 预测 1.5 秒 (90帧)
        const points = [];
        
        // 初始状态
        let px = x;
        let py = startY;
        let vx = 0;
        let vy = 0;
        
        // 风力（如果存在）
        const wx = windForce ? windForce.x : 0;
        const wy = windForce ? windForce.y : 0;
        
        // 边界
        const leftBound = gameArea.left + fruitRadius;
        const rightBound = gameArea.right - fruitRadius;
        const bottomBound = gameArea.groundY - fruitRadius;
        
        // 模拟轨迹
        for (let i = 0; i < steps; i++) {
            points.push({ x: px, y: py });
            
            // 应用重力和风力
            vx += (gravity.x + wx) * dt * 60;
            vy += (gravity.y + wy) * dt * 60;
            
            // 应用空气阻力
            vx *= 0.98;
            vy *= 0.98;
            
            // 更新位置
            px += vx * dt * 60;
            py += vy * dt * 60;
            
            // 边界碰撞检测
            if (px < leftBound) {
                px = leftBound;
                vx = -vx * 0.3; // 弹性系数
            }
            if (px > rightBound) {
                px = rightBound;
                vx = -vx * 0.3;
            }
            
            // 到达地面停止
            if (py >= bottomBound) {
                py = bottomBound;
                points.push({ x: px, y: py });
                break;
            }
        }
        
        if (points.length < 2) return;
        
        // 绘制轨迹线
        ctx.save();
        
        // 渐变粒子流效果
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const progress = i / points.length;
            
            // 透明度随距离递减
            const alpha = 0.6 * (1 - progress);
            
            ctx.beginPath();
            ctx.moveTo(p1.x * pr, p1.y * pr);
            ctx.lineTo(p2.x * pr, p2.y * pr);
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.lineWidth = (3 - progress * 2) * pr;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        // 绘制轨迹点（粒子效果）
        for (let i = 0; i < points.length; i += 3) {
            const p = points[i];
            const progress = i / points.length;
            const alpha = 0.8 * (1 - progress);
            const size = (4 - progress * 3) * pr;
            
            ctx.beginPath();
            ctx.arc(p.x * pr, p.y * pr, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        }
        
        // 绘制预测落点
        const lastPoint = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(lastPoint.x * pr, lastPoint.y * pr, fruitRadius * pr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2 * pr;
        ctx.setLineDash([8 * pr, 4 * pr]);
        ctx.stroke();
        
        // 落点中心标记
        ctx.beginPath();
        ctx.arc(lastPoint.x * pr, lastPoint.y * pr, 5 * pr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.fill();
        
        ctx.restore();
    }

    // ==================== 特殊实体渲染 ====================
    
    drawMysteryBox(x, y, radius) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 绘制木箱外观
        ctx.fillStyle = '#8B4513';
        this.roundRect(ctx, (x - radius) * pr, (y - radius) * pr, radius * 2 * pr, radius * 2 * pr, 8 * pr);
        ctx.fill();
        
        // 边框
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3 * pr;
        ctx.stroke();
        
        // 木纹
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2 * pr;
        for (let i = 0; i < 2; i++) {
            const lineY = y - radius * 0.3 + radius * 0.6 * i;
            ctx.beginPath();
            ctx.moveTo((x - radius + 5) * pr, lineY * pr);
            ctx.lineTo((x + radius - 5) * pr, lineY * pr);
            ctx.stroke();
        }
        
        // 问号
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${radius * 1.2 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x * pr, y * pr);
        
        // 闪烁光效
        const shimmer = Math.sin(Date.now() / 200) * 0.2 + 0.3;
        ctx.fillStyle = `rgba(255, 215, 0, ${shimmer})`;
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, radius * 1.1 * pr, 0, Math.PI * 2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * 绘制引力场（微型黑洞）
     */
    drawGravityField(x, y, radius, attractRadius, progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 计算脉冲效果
        const pulsePhase = (Date.now() / 100) % (Math.PI * 2);
        const pulseFactor = 1 + Math.sin(pulsePhase) * 0.1;
        
        ctx.save();
        
        // 绘制吸引范围（外圈）
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, attractRadius * pulseFactor * pr, 0, Math.PI * 2);
        const gradientOuter = ctx.createRadialGradient(
            x * pr, y * pr, 0,
            x * pr, y * pr, attractRadius * pr
        );
        gradientOuter.addColorStop(0, 'rgba(128, 0, 255, 0)');
        gradientOuter.addColorStop(0.7, 'rgba(128, 0, 255, 0.05)');
        gradientOuter.addColorStop(1, 'rgba(128, 0, 255, 0.15)');
        ctx.fillStyle = gradientOuter;
        ctx.fill();
        
        // 绘制旋转线条
        const lineCount = 8;
        const rotationSpeed = Date.now() / 500;
        ctx.strokeStyle = 'rgba(200, 100, 255, 0.4)';
        ctx.lineWidth = 2 * pr;
        
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2 + rotationSpeed;
            const innerR = radius * 0.5;
            const outerR = attractRadius * 0.8;
            
            ctx.beginPath();
            // 螺旋线
            for (let t = 0; t <= 1; t += 0.05) {
                const r = innerR + (outerR - innerR) * t;
                const a = angle + t * Math.PI * 0.5;  // 螺旋角度
                const px = x + Math.cos(a) * r;
                const py = y + Math.sin(a) * r;
                if (t === 0) ctx.moveTo(px * pr, py * pr);
                else ctx.lineTo(px * pr, py * pr);
            }
            ctx.stroke();
        }
        
        // 绘制核心（黑洞中心）
        const coreGradient = ctx.createRadialGradient(
            x * pr, y * pr, 0,
            x * pr, y * pr, radius * pr
        );
        coreGradient.addColorStop(0, '#1a0033');
        coreGradient.addColorStop(0.5, '#330066');
        coreGradient.addColorStop(0.8, '#660099');
        coreGradient.addColorStop(1, 'rgba(128, 0, 255, 0.5)');
        
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, radius * pulseFactor * pr, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();
        
        // 核心高光
        ctx.beginPath();
        ctx.arc((x - radius * 0.3) * pr, (y - radius * 0.3) * pr, radius * 0.2 * pr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        
        // 剩余时间指示器
        const remainingRatio = 1 - progress;
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, (radius + 5) * pr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remainingRatio);
        ctx.strokeStyle = `rgba(200, 100, 255, ${0.8 * remainingRatio})`;
        ctx.lineWidth = 3 * pr;
        ctx.stroke();
        
        ctx.restore();
    }

    drawBomb(x, y, radius, fuseProgress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 炸弹主体
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, radius * pr, 0, Math.PI * 2);
        ctx.fill();
        
        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc((x - radius * 0.3) * pr, (y - radius * 0.3) * pr, radius * 0.3 * pr, 0, Math.PI * 2);
        ctx.fill();
        
        // 引信
        const fuseX = x + radius * 0.5;
        const fuseY = y - radius * 0.8;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4 * pr;
        ctx.beginPath();
        ctx.moveTo((x + radius * 0.2) * pr, (y - radius * 0.6) * pr);
        ctx.quadraticCurveTo((fuseX + 10) * pr, (fuseY - 10) * pr, fuseX * pr, fuseY * pr);
        ctx.stroke();
        
        // 火花（闪烁）
        if (fuseProgress > 0.3) {
            const sparkAlpha = Math.sin(Date.now() / 50) * 0.5 + 0.5;
            const sparkSize = 8 + Math.sin(Date.now() / 30) * 3;
            
            // 外层光晕
            ctx.fillStyle = `rgba(255, 100, 0, ${sparkAlpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(fuseX * pr, fuseY * pr, sparkSize * 1.5 * pr, 0, Math.PI * 2);
            ctx.fill();
            
            // 内层火焰
            ctx.fillStyle = `rgba(255, 200, 0, ${sparkAlpha})`;
            ctx.beginPath();
            ctx.arc(fuseX * pr, fuseY * pr, sparkSize * pr, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 倒计时数字
        const remaining = Math.ceil((1 - fuseProgress) * 3);
        ctx.fillStyle = remaining <= 1 ? '#ff0000' : '#ffffff';
        ctx.font = `bold ${radius * 0.8 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(remaining), x * pr, y * pr);
    }

    /**
     * 绘制冰块解冻冲击波特效
     */
    drawIceShockwave(x, y, maxRadius, progress) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        const currentRadius = maxRadius * progress;
        const alpha = 0.6 * (1 - progress);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // 外圈
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, currentRadius * pr, 0, Math.PI * 2);
        ctx.strokeStyle = '#87CEEB';
        ctx.lineWidth = (4 - progress * 3) * pr;
        ctx.stroke();
        
        // 内圈渐变
        const gradient = ctx.createRadialGradient(
            x * pr, y * pr, 0,
            x * pr, y * pr, currentRadius * pr
        );
        gradient.addColorStop(0, 'rgba(135, 206, 250, 0.3)');
        gradient.addColorStop(0.5, 'rgba(135, 206, 250, 0.1)');
        gradient.addColorStop(1, 'rgba(135, 206, 250, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 冰晶粒子
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + progress * Math.PI;
            const dist = currentRadius * 0.7;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const size = 3 * (1 - progress);
            
            ctx.beginPath();
            ctx.arc(px * pr, py * pr, size * pr, 0, Math.PI * 2);
            ctx.fillStyle = '#ADD8E6';
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawIceFruit(x, y, radius, fruitLevel, thawProgress = 0) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 先绘制水果本体（略暗）
        ctx.save();
        ctx.globalAlpha = 0.6;
        this.drawFruit(x, y, radius, fruitLevel);
        ctx.restore();
        
        // 冰层效果
        const iceAlpha = ICE_BLOCK.visualAlpha * (1 - thawProgress);
        
        ctx.save();
        ctx.globalAlpha = iceAlpha;
        
        // 冰的渐变
        const iceGradient = ctx.createRadialGradient(
            x * pr, y * pr, 0,
            x * pr, y * pr, radius * 1.2 * pr
        );
        iceGradient.addColorStop(0, 'rgba(200, 230, 255, 0.3)');
        iceGradient.addColorStop(0.5, 'rgba(150, 200, 255, 0.5)');
        iceGradient.addColorStop(1, 'rgba(100, 180, 255, 0.2)');
        
        ctx.fillStyle = iceGradient;
        ctx.beginPath();
        // 六边形冰晶
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 - Math.PI / 6;
            const px = x + Math.cos(angle) * radius * 1.1;
            const py = y + Math.sin(angle) * radius * 1.1;
            if (i === 0) ctx.moveTo(px * pr, py * pr);
            else ctx.lineTo(px * pr, py * pr);
        }
        ctx.closePath();
        ctx.fill();
        
        // 冰晶纹理
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5 * pr;
        for (let i = 0; i < 3; i++) {
            const angle = i * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(x * pr, y * pr);
            ctx.lineTo((x + Math.cos(angle) * radius * 0.8) * pr, 
                       (y + Math.sin(angle) * radius * 0.8) * pr);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // ==================== Buff 选择面板 ====================
    
    drawBuffSelector(choices, buffStacks) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        
        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 标题
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${28 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍉 大西瓜！选择奖励', (this.width / 2) * pr, 100 * pr);
        
        // 三个选项卡片
        const cardWidth = 90;
        const cardHeight = 140;
        const gap = 15;
        const startX = (this.width - (cardWidth * choices.length + gap * (choices.length - 1))) / 2;
        const startY = 160;
        
        const hitAreas = [];
        
        choices.forEach((buff, i) => {
            const x = startX + i * (cardWidth + gap);
            const y = startY;
            
            // 卡片背景
            const gradient = ctx.createLinearGradient(
                x * pr, y * pr, x * pr, (y + cardHeight) * pr
            );
            gradient.addColorStop(0, '#4a5568');
            gradient.addColorStop(1, '#2d3748');
            ctx.fillStyle = gradient;
            this.roundRect(ctx, x * pr, y * pr, cardWidth * pr, cardHeight * pr, 12 * pr);
            ctx.fill();
            
            // 边框
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2 * pr;
            ctx.stroke();
            
            // 图标
            ctx.font = `${36 * pr}px Arial`;
            ctx.fillStyle = '#fff';
            ctx.fillText(buff.icon, (x + cardWidth / 2) * pr, (y + 40) * pr);
            
            // 名称
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${14 * pr}px Arial`;
            ctx.fillText(buff.name, (x + cardWidth / 2) * pr, (y + 80) * pr);
            
            // 描述
            ctx.fillStyle = '#a0aec0';
            ctx.font = `${11 * pr}px Arial`;
            ctx.fillText(buff.description, (x + cardWidth / 2) * pr, (y + 105) * pr);
            
            // 层数（如果可叠加）
            if (buff.stackable) {
                const stacks = buffStacks[buff.id] || 0;
                ctx.fillStyle = '#68d391';
                ctx.font = `${10 * pr}px Arial`;
                ctx.fillText(`${stacks}/${buff.maxStacks}`, (x + cardWidth / 2) * pr, (y + 125) * pr);
            }
            
            hitAreas.push({
                buffId: buff.id,
                x, y, width: cardWidth, height: cardHeight
            });
        });
        
        // 关闭按钮
        const closeY = startY + cardHeight + 30;
        const closeWidth = 100;
        const closeX = (this.width - closeWidth) / 2;
        
        ctx.fillStyle = '#666';
        this.roundRect(ctx, closeX * pr, closeY * pr, closeWidth * pr, 40 * pr, 20 * pr);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = `${14 * pr}px Arial`;
        ctx.fillText('跳过', (this.width / 2) * pr, (closeY + 20) * pr);
        
        hitAreas.push({
            action: 'close',
            x: closeX,
            y: closeY,
            width: closeWidth,
            height: 40
        });
        
        return hitAreas;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
} else if (typeof window !== 'undefined') {
    window.Renderer = Renderer;
}

})(); // 关闭 IIFE
