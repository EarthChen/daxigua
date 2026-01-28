/**
 * Canvas 渲染器
 * 绘制游戏画面、水果、UI元素
 */

const { COLORS, FRUITS, GAME_AREA, RULES, __DEV__ } = require('./config');

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
        
        // 缓存水果图像
        this.fruitImages = {};
        this.loadFruitImages();
    }

    loadFruitImages() {
        // 加载水果图片
        for (let i = 0; i <= 10; i++) {
            const img = wx.createImage();
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

        // 背景渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#fef3c7');
        gradient.addColorStop(1, '#f5deb3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 绘制墙壁和地面
    drawWalls() {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const ga = this.gameArea;

        // 地面
        const groundGradient = ctx.createLinearGradient(
            0, ga.groundY * pr,
            0, this.canvas.height
        );
        groundGradient.addColorStop(0, '#8B4513');
        groundGradient.addColorStop(0.1, '#654321');
        groundGradient.addColorStop(1, '#3d2914');
        
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, ga.groundY * pr, this.canvas.width, (this.height - ga.groundY) * pr);

        // 地面纹理
        ctx.fillStyle = '#654321';
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
    drawPendingFruit(x, y, fruitLevel) {
        const fruit = FRUITS[fruitLevel];
        if (!fruit) return;

        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 绘制水果
        this.drawFruit(x, y, fruit.radius, fruitLevel, 0.8);
    }

    // 绘制自动下落倒计时
    drawAutoDropCountdown(x, y, countdown, fruitLevel) {
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

        // 倒计时进度圆环
        const progress = countdown / 10;
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

    // 使用渐变绘制水果（增强版）
    drawFruitGradient(x, y, radius, level) {
        const ctx = this.ctx;
        const pr = this.pixelRatio;
        const fruit = FRUITS[level];

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
        gradient.addColorStop(0, this.lightenColor(fruit.color, 50));
        gradient.addColorStop(0.3, this.lightenColor(fruit.color, 20));
        gradient.addColorStop(0.6, fruit.color);
        gradient.addColorStop(0.9, this.darkenColor(fruit.color, 15));
        gradient.addColorStop(1, this.darkenColor(fruit.color, 30));

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
        ctx.strokeStyle = this.darkenColor(fruit.color, 35);
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
            if (body.isRemoved || body.fruitLevel === undefined) continue;
            
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
    drawDebugPanel() {
        if (!__DEV__) return [];
        
        const ctx = this.ctx;
        const pr = this.pixelRatio;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 面板
        const panelWidth = 280;
        const panelHeight = 380;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = (this.height - panelHeight) / 2;

        ctx.fillStyle = '#2c3e50';
        this.roundRect(ctx, panelX * pr, panelY * pr, panelWidth * pr, panelHeight * pr, 20 * pr);
        ctx.fill();

        // 标题
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${18 * pr}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('🔧 调试面板', (this.width / 2) * pr, (panelY + 35) * pr);

        // 提示
        ctx.font = `${11 * pr}px Arial`;
        ctx.fillStyle = '#f39c12';
        ctx.fillText('⚠️ 仅开发环境可用', (this.width / 2) * pr, (panelY + 58) * pr);

        const hitAreas = [];
        const btnWidth = 120;
        const btnHeight = 40;
        const gap = 10;
        const startY = panelY + 80;

        // 道具按钮组
        const toolButtons = [
            { label: '🔨 +5 锤子', toolType: 'hammer' },
            { label: '🍇 +5 选果', toolType: 'selectFruit' },
            { label: '⏭️ +5 跳过', toolType: 'skip' }
        ];

        toolButtons.forEach((btn, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = panelX + 20 + col * (btnWidth + gap);
            const y = startY + row * (btnHeight + gap);

            ctx.fillStyle = '#3498db';
            this.roundRect(ctx, x * pr, y * pr, btnWidth * pr, btnHeight * pr, 8 * pr);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = `${13 * pr}px Arial`;
            ctx.fillText(btn.label, (x + btnWidth / 2) * pr, (y + btnHeight / 2) * pr);

            hitAreas.push({
                action: 'addTool',
                toolType: btn.toolType,
                x, y, width: btnWidth, height: btnHeight
            });
        });

        // 清空道具按钮
        const clearY = startY + 2 * (btnHeight + gap);
        ctx.fillStyle = '#e74c3c';
        this.roundRect(ctx, (panelX + 20) * pr, clearY * pr, (panelWidth - 40) * pr, btnHeight * pr, 8 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${13 * pr}px Arial`;
        ctx.fillText('🗑️ 清空所有道具', (this.width / 2) * pr, (clearY + btnHeight / 2) * pr);

        hitAreas.push({
            action: 'clearTools',
            x: panelX + 20,
            y: clearY,
            width: panelWidth - 40,
            height: btnHeight
        });

        // 加分按钮
        const scoreY = clearY + btnHeight + gap;
        ctx.fillStyle = '#27ae60';
        this.roundRect(ctx, (panelX + 20) * pr, scoreY * pr, (panelWidth - 40) * pr, btnHeight * pr, 8 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.fillText('📈 分数 +100', (this.width / 2) * pr, (scoreY + btnHeight / 2) * pr);

        hitAreas.push({
            action: 'addScore',
            x: panelX + 20,
            y: scoreY,
            width: panelWidth - 40,
            height: btnHeight
        });

        // 关闭按钮
        const closeY = panelY + panelHeight - 55;
        const closeWidth = 100;
        const closeX = (this.width - closeWidth) / 2;

        ctx.fillStyle = '#7f8c8d';
        this.roundRect(ctx, closeX * pr, closeY * pr, closeWidth * pr, 40 * pr, 20 * pr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${14 * pr}px Arial`;
        ctx.fillText('关闭', (this.width / 2) * pr, (closeY + 20) * pr);

        hitAreas.push({
            action: 'close',
            x: closeX,
            y: closeY,
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
}

module.exports = Renderer;
