/**
 * 合成大西瓜 - 主游戏类
 * 包含游戏主循环、水果管理、合成逻辑、触摸控制
 */

const { Vector, Circle, Rectangle, World } = require('./physics');
const Renderer = require('./renderer');
const SoundSystem = require('./soundSystem');
const { FRUITS, PHYSICS, GAME_AREA, RULES, TOOLS, __DEV__, DEBUG_CONFIG } = require('./config');

class Game {
    constructor(config) {
        this.config = config;
        this.canvas = config.canvas;
        this.ctx = config.ctx;
        this.width = config.width;
        this.height = config.height;
        this.scale = config.scale;
        this.pixelRatio = config.pixelRatio;

        // 游戏状态
        this.isRunning = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.score = 0;
        this.bestScore = this.loadBestScore();

        // 物理世界
        this.world = new World({ gravity: PHYSICS.gravity });
        
        // 渲染器
        this.renderer = new Renderer(config);
        
        // 音效系统
        this.sound = new SoundSystem();
        
        // 游戏区域
        this.gameArea = {
            left: this.width * GAME_AREA.sideMargin + 20,
            right: this.width * (1 - GAME_AREA.sideMargin) - 20,
            top: this.height * GAME_AREA.topMargin,
            bottom: this.height * (1 - GAME_AREA.bottomMargin),
            groundY: this.height * (1 - GAME_AREA.bottomMargin),
            gameOverLineY: this.height * RULES.gameOverLineY
        };

        // 当前水果
        this.currentFruit = null;
        this.currentFruitLevel = 0;
        this.dropX = this.width / 2;
        this.canDrop = true;
        this.lastDropTime = 0;

        // 道具
        this.tools = this.loadTools();
        this.hammerMode = false;

        // 特效
        this.mergeEffects = [];
        this.toasts = [];

        // UI 点击区域
        this.toolbarHitAreas = [];
        this.rankButtonArea = null;
        this.gameOverButtons = null;
        this.fruitSelectorHitAreas = [];
        this.adPanelHitAreas = [];
        this.rankPanelButtons = null;

        // UI 状态
        this.showingFruitSelector = false;
        this.showingAdPanel = false;
        this.showingSharePanel = false;
        this.showingRankList = false;
        this.showingDebugPanel = false;
        this.sharePanelHitAreas = [];
        this.debugPanelHitAreas = [];

        // 游戏结束检测
        this.gameOverCheckTimer = null;
        this.fruitsAboveLine = new Set();

        // 初始化
        this.init();
    }

    init() {
        // 创建墙壁
        this.createWalls();
        
        // 绑定触摸事件
        this.bindEvents();
        
        // 生成第一个水果
        this.generateNextFruit();

        // 设置分享配置
        this.setupShare();

        console.log('[游戏] 初始化完成');
    }

    setupShare() {
        // 设置默认分享内容
        try {
            wx.showShareMenu({
                withShareTicket: true,
                menus: ['shareAppMessage', 'shareTimeline']
            });

            // 被动分享（右上角菜单分享）
            wx.onShareAppMessage(() => {
                return {
                    title: '🍉 合成大西瓜！我已经得了' + this.score + '分，你来挑战吗？',
                    imageUrl: 'res/images/share.png',
                    query: 'from=share'
                };
            });

            // 分享到朋友圈
            if (wx.onShareTimeline) {
                wx.onShareTimeline(() => {
                    return {
                        title: '合成大西瓜 - 我得了' + this.score + '分！',
                        query: 'from=timeline'
                    };
                });
            }

            console.log('[游戏] 分享配置完成');
        } catch (e) {
            console.log('[游戏] 分享配置失败:', e);
        }
    }

    createWalls() {
        const ga = this.gameArea;
        const wallThickness = GAME_AREA.wallThickness;

        // 地面
        const ground = new Rectangle(
            this.width / 2,
            ga.groundY + wallThickness / 2,
            this.width,
            wallThickness,
            { label: 'ground' }
        );
        this.world.add(ground);

        // 左墙
        const leftWall = new Rectangle(
            ga.left - wallThickness / 2,
            this.height / 2,
            wallThickness,
            this.height,
            { label: 'leftWall' }
        );
        this.world.add(leftWall);

        // 右墙
        const rightWall = new Rectangle(
            ga.right + wallThickness / 2,
            this.height / 2,
            wallThickness,
            this.height,
            { label: 'rightWall' }
        );
        this.world.add(rightWall);
    }

    bindEvents() {
        // 触摸开始
        wx.onTouchStart((e) => {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;

            // 处理水果选择面板点击
            if (this.showingFruitSelector) {
                this.handleFruitSelectorClick(x, y);
                return;
            }

            // 处理广告面板点击
            if (this.showingAdPanel) {
                this.handleAdPanelClick(x, y);
                return;
            }

            // 处理分享面板点击
            if (this.showingSharePanel) {
                this.handleSharePanelClick(x, y);
                return;
            }

            // 处理调试面板点击
            if (this.showingDebugPanel) {
                this.handleDebugPanelClick(x, y);
                return;
            }

            // 处理排行榜面板点击
            if (this.showingRankList) {
                this.handleRankPanelClick(x, y);
                return;
            }

            // 处理调试按钮点击（仅开发环境）
            if (__DEV__ && this.debugButtonArea && this.isInRect(x, y, this.debugButtonArea)) {
                this.showDebugPanel();
                return;
            }

            if (this.isGameOver) {
                this.handleGameOverTouch(e);
                return;
            }

            // 检查工具栏点击
            if (this.handleToolbarClick(x, y)) {
                return;
            }

            // 检查排行榜按钮
            if (this.rankButtonArea && this.isInRect(x, y, this.rankButtonArea)) {
                this.showRankList();
                return;
            }

            // 锤子模式 - 检查是否点击了水果
            if (this.hammerMode) {
                this.handleHammerClick(x, y);
                return;
            }

            // 更新投放位置
            this.updateDropPosition(x);
        });

        // 触摸移动
        wx.onTouchMove((e) => {
            if (this.isGameOver || this.hammerMode || this.isPaused) return;
            
            const touch = e.touches[0];
            this.updateDropPosition(touch.clientX);
        });

        // 触摸结束 - 投放水果
        wx.onTouchEnd((e) => {
            if (this.isGameOver || this.hammerMode) return;
            
            // 检查是否点击了 UI
            if (e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const y = touch.clientY;
                
                // 如果点击在工具栏区域，不投放
                if (y > this.height - 100) return;
            }

            this.dropFruit();
        });
    }

    updateDropPosition(x) {
        const ga = this.gameArea;
        const fruit = FRUITS[this.currentFruitLevel];
        const radius = fruit ? fruit.radius : 30;
        
        // 限制在游戏区域内
        this.dropX = Math.max(ga.left + radius, Math.min(x, ga.right - radius));
    }

    generateNextFruit() {
        // 随机生成 0-4 级水果
        this.currentFruitLevel = Math.floor(Math.random() * (RULES.maxFruitLevel + 1));
    }

    dropFruit() {
        if (!this.canDrop || this.isPaused) return;
        
        const now = Date.now();
        if (now - this.lastDropTime < RULES.dropCooldown) return;

        const fruit = FRUITS[this.currentFruitLevel];
        if (!fruit) return;

        // 创建水果刚体
        const body = new Circle(
            this.dropX,
            this.gameArea.gameOverLineY - fruit.radius - 10,
            fruit.radius,
            {
                restitution: PHYSICS.restitution,
                friction: PHYSICS.friction,
                frictionAir: PHYSICS.frictionAir,
                label: 'fruit',
                fruitLevel: this.currentFruitLevel
            }
        );

        this.world.add(body);
        
        // 更新状态
        this.canDrop = false;
        this.lastDropTime = now;

        // 短暂延迟后可以再次投放
        setTimeout(() => {
            this.canDrop = true;
            this.generateNextFruit();
        }, RULES.dropCooldown);
    }

    handleCollisions() {
        const pairs = this.world.getCollisionPairs();
        const toMerge = [];

        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;

            // 检查是否是两个水果碰撞
            if (bodyA.label !== 'fruit' || bodyB.label !== 'fruit') continue;
            if (bodyA.isRemoved || bodyB.isRemoved) continue;
            if (bodyA.justCreated || bodyB.justCreated) continue;

            // 检查是否是相同等级
            if (bodyA.fruitLevel === bodyB.fruitLevel && bodyA.fruitLevel < 10) {
                toMerge.push({ bodyA, bodyB });
            }
        }

        // 处理合成
        for (const { bodyA, bodyB } of toMerge) {
            if (bodyA.isRemoved || bodyB.isRemoved) continue;
            this.mergeFruits(bodyA, bodyB);
        }
    }

    mergeFruits(bodyA, bodyB) {
        const level = bodyA.fruitLevel;
        const newLevel = level + 1;

        if (newLevel > 10) return;

        // 计算新位置（两个水果的中点）
        const newX = (bodyA.position.x + bodyB.position.x) / 2;
        const newY = (bodyA.position.y + bodyB.position.y) / 2;

        // 移除旧水果
        this.world.remove(bodyA);
        this.world.remove(bodyB);

        // 创建新水果
        const newFruit = FRUITS[newLevel];
        const newBody = new Circle(
            newX, newY,
            newFruit.radius,
            {
                restitution: PHYSICS.restitution,
                friction: PHYSICS.friction,
                frictionAir: PHYSICS.frictionAir,
                label: 'fruit',
                fruitLevel: newLevel
            }
        );
        
        // 继承一部分速度
        newBody.velocity = bodyA.velocity.add(bodyB.velocity).mult(0.3);
        
        this.world.add(newBody);

        // 加分
        this.score += newFruit.score;

        // 添加合成特效
        this.mergeEffects.push({
            x: newX,
            y: newY,
            radius: newFruit.radius,
            startTime: Date.now(),
            duration: 300
        });

        // 播放音效
        this.playSound('merge');

        // 如果合成了西瓜
        if (newLevel === 10) {
            this.score += 100; // 额外奖励
            this.showToast('🍉 合成大西瓜！+100');
            this.playSound('success');
        }
    }

    checkGameOver() {
        const gameOverY = this.gameArea.gameOverLineY;
        let hasAboveLine = false;

        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isRemoved) continue;
            if (body.justCreated) continue;

            // 检查水果顶部是否超过游戏结束线
            const fruitTop = body.position.y - body.radius;
            if (fruitTop < gameOverY && body.velocity.lengthSq() < 1) {
                hasAboveLine = true;
                this.fruitsAboveLine.add(body.id);
            } else {
                this.fruitsAboveLine.delete(body.id);
            }
        }

        if (hasAboveLine) {
            if (!this.gameOverCheckTimer) {
                this.gameOverCheckTimer = setTimeout(() => {
                    if (this.fruitsAboveLine.size > 0) {
                        this.gameOver();
                    }
                    this.gameOverCheckTimer = null;
                }, RULES.gameOverDelay);
            }
        } else {
            if (this.gameOverCheckTimer) {
                clearTimeout(this.gameOverCheckTimer);
                this.gameOverCheckTimer = null;
            }
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.isRunning = false;

        // 更新最高分
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }

        // 上传分数到排行榜
        this.uploadScore();

        console.log('[游戏] 游戏结束，分数:', this.score);
    }

    restart() {
        // 清空物理世界
        this.world.clear();
        
        // 重置状态
        this.score = 0;
        this.isGameOver = false;
        this.isRunning = true;
        this.canDrop = true;
        this.hammerMode = false;
        this.mergeEffects = [];
        this.toasts = [];
        this.fruitsAboveLine.clear();

        // 重新创建墙壁
        this.createWalls();
        
        // 生成新水果
        this.generateNextFruit();

        console.log('[游戏] 重新开始');
    }

    // ==================== 道具系统 ====================

    handleToolbarClick(x, y) {
        for (const area of this.toolbarHitAreas) {
            if (this.isInRect(x, y, area)) {
                this.useTool(area.id);
                return true;
            }
        }
        return false;
    }

    useTool(toolId) {
        switch (toolId) {
            case 'hammer':
                this.activateHammer();
                break;
            case 'selectFruit':
                this.showFruitSelector();
                break;
            case 'skip':
                this.useSkip();
                break;
            case 'share':
                this.showSharePanel();
                break;
            case 'ad':
                this.showAdRewardPanel();
                break;
        }
    }

    activateHammer() {
        if (this.tools.hammer <= 0) {
            this.showToast('锤子已用完！');
            return;
        }

        if (this.world.bodies.filter(b => b.label === 'fruit').length === 0) {
            this.showToast('没有可销毁的水果');
            return;
        }

        this.hammerMode = !this.hammerMode;
        if (this.hammerMode) {
            this.showToast('🔨 点击水果销毁它');
        }
    }

    handleHammerClick(x, y) {
        // 查找点击位置的水果
        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isRemoved) continue;

            const dx = x - body.position.x;
            const dy = y - body.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < body.radius) {
                // 销毁水果
                this.world.remove(body);
                this.tools.hammer--;
                this.saveTools();
                this.hammerMode = false;
                
                const fruitName = FRUITS[body.fruitLevel].name;
                this.showToast(`🔨 销毁了 ${fruitName}！`);
                this.playSound('destroy');
                return;
            }
        }
    }

    showFruitSelector() {
        if (this.tools.selectFruit <= 0) {
            this.showToast('选果道具已用完！');
            return;
        }
        
        // 显示水果选择面板
        this.showingFruitSelector = true;
        this.isPaused = true;
    }

    selectFruit(level) {
        this.currentFruitLevel = level;
        this.tools.selectFruit--;
        this.saveTools();
        this.showingFruitSelector = false;
        this.isPaused = false;
        this.showToast(`🍇 已选择 ${FRUITS[level].name}！`);
    }

    hideFruitSelector() {
        this.showingFruitSelector = false;
        this.isPaused = false;
    }

    useSkip() {
        if (this.tools.skip <= 0) {
            this.showToast('跳过道具已用完！');
            return;
        }

        this.tools.skip--;
        this.saveTools();
        this.generateNextFruit();
        this.showToast('⏭️ 已跳过当前水果！');
    }

    showAdRewardPanel() {
        // 显示广告奖励选择面板
        this.showingAdPanel = true;
        this.isPaused = true;
    }

    hideAdPanel() {
        this.showingAdPanel = false;
        this.isPaused = false;
    }

    watchAd(toolType) {
        this.hideAdPanel();
        
        // 创建激励视频广告
        if (typeof wx.createRewardedVideoAd !== 'function') {
            // 模拟器环境直接发放奖励
            const reward = TOOLS[toolType].adReward;
            this.tools[toolType] += reward;
            this.saveTools();
            this.showToast(`🎉 获得 ${TOOLS[toolType].name} x${reward}！`);
            return;
        }

        try {
            const ad = wx.createRewardedVideoAd({
                adUnitId: 'adunit-xxxxxxxxxx' // 需要替换为实际广告位ID
            });

            ad.onClose((res) => {
                if (res && res.isEnded) {
                    // 发放奖励
                    const reward = TOOLS[toolType].adReward;
                    this.tools[toolType] += reward;
                    this.saveTools();
                    this.showToast(`🎉 获得 ${TOOLS[toolType].name} x${reward}！`);
                }
            });

            ad.onError((err) => {
                console.log('[广告] 加载失败:', err);
                this.showToast('广告加载失败，请稍后再试');
            });

            ad.show().catch(() => {
                ad.load().then(() => ad.show()).catch(() => {
                    this.showToast('广告暂不可用');
                });
            });
        } catch (e) {
            console.log('[广告] 创建失败:', e);
            this.showToast('广告功能暂不可用');
        }
    }

    // ==================== 分享系统 ====================

    showSharePanel() {
        // 显示分享奖励选择面板
        this.showingSharePanel = true;
        this.isPaused = true;
    }

    hideSharePanel() {
        this.showingSharePanel = false;
        this.isPaused = false;
    }

    shareForReward(toolType) {
        this.hideSharePanel();
        
        // 检查分享冷却
        const now = Date.now();
        const lastShareTime = this.loadLastShareTime();
        const cooldown = 5 * 60 * 1000; // 5分钟冷却
        
        if (now - lastShareTime < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastShareTime)) / 1000);
            this.showToast(`分享冷却中，${remaining}秒后可再次分享`);
            return;
        }

        // 主动分享
        wx.shareAppMessage({
            title: '🍉 合成大西瓜！我已经得了' + this.score + '分，你来挑战吗？',
            imageUrl: 'res/images/share.png',
            query: 'from=share&reward=' + toolType
        });

        // 分享成功后发放奖励（微信不提供分享成功回调，直接发放）
        const reward = TOOLS[toolType].adReward;
        this.tools[toolType] += reward;
        this.saveTools();
        this.saveLastShareTime(now);
        this.showToast(`📤 分享成功！获得 ${TOOLS[toolType].name} x${reward}！`);
    }

    loadLastShareTime() {
        try {
            return wx.getStorageSync('daxigua_lastShare') || 0;
        } catch (e) {
            return 0;
        }
    }

    saveLastShareTime(time) {
        try {
            wx.setStorageSync('daxigua_lastShare', time);
        } catch (e) {
            console.log('[分享] 保存时间失败');
        }
    }

    // ==================== 排行榜 ====================

    showRankList() {
        // 显示排行榜
        this.showingRankList = true;
        this.isPaused = true;
        
        try {
            const openDataContext = wx.getOpenDataContext();
            openDataContext.postMessage({
                type: 'showRankList'
            });
        } catch (e) {
            console.log('[排行榜] 获取开放数据域失败:', e);
        }
    }

    hideRankList() {
        this.showingRankList = false;
        this.isPaused = false;
        
        try {
            const openDataContext = wx.getOpenDataContext();
            openDataContext.postMessage({
                type: 'hideRankList'
            });
        } catch (e) {
            console.log('[排行榜] 关闭失败:', e);
        }
    }

    handleFruitSelectorClick(x, y) {
        for (const area of this.fruitSelectorHitAreas) {
            if (this.isInRect(x, y, area)) {
                if (area.action === 'close') {
                    this.hideFruitSelector();
                } else if (area.level !== undefined) {
                    this.selectFruit(area.level);
                }
                return;
            }
        }
    }

    handleAdPanelClick(x, y) {
        for (const area of this.adPanelHitAreas) {
            if (this.isInRect(x, y, area)) {
                if (area.action === 'close') {
                    this.hideAdPanel();
                } else if (area.toolType) {
                    this.watchAd(area.toolType);
                }
                return;
            }
        }
    }

    handleRankPanelClick(x, y) {
        if (this.rankPanelButtons && this.isInRect(x, y, this.rankPanelButtons.closeBtn)) {
            this.hideRankList();
        }
    }

    handleSharePanelClick(x, y) {
        for (const area of this.sharePanelHitAreas) {
            if (this.isInRect(x, y, area)) {
                if (area.action === 'close') {
                    this.hideSharePanel();
                } else if (area.toolType) {
                    this.shareForReward(area.toolType);
                }
                return;
            }
        }
    }

    // ==================== 调试面板（仅开发环境） ====================

    showDebugPanel() {
        if (!__DEV__) return;
        this.showingDebugPanel = true;
        this.isPaused = true;
    }

    hideDebugPanel() {
        this.showingDebugPanel = false;
        this.isPaused = false;
    }

    handleDebugPanelClick(x, y) {
        for (const area of this.debugPanelHitAreas) {
            if (this.isInRect(x, y, area)) {
                if (area.action === 'close') {
                    this.hideDebugPanel();
                } else if (area.action === 'addTool') {
                    this.tools[area.toolType] += DEBUG_CONFIG.addToolsAmount;
                    this.saveTools();
                    this.showToast(`🔧 已添加 ${area.toolType} x${DEBUG_CONFIG.addToolsAmount}`);
                } else if (area.action === 'clearTools') {
                    this.tools = { hammer: 0, selectFruit: 0, skip: 0 };
                    this.saveTools();
                    this.showToast('🔧 已清空所有道具');
                } else if (area.action === 'addScore') {
                    this.score += 100;
                    this.showToast('🔧 分数 +100');
                }
                return;
            }
        }
    }

    uploadScore() {
        try {
            const openDataContext = wx.getOpenDataContext();
            openDataContext.postMessage({
                type: 'updateScore',
                score: this.score
            });
        } catch (e) {
            console.log('[游戏] 上传分数失败:', e);
        }
    }

    // ==================== 游戏循环 ====================

    start() {
        this.isRunning = true;
        this.lastTime = Date.now();
        this.loop();
        console.log('[游戏] 开始运行');
    }

    loop() {
        if (!this.isRunning && !this.isGameOver) return;

        const now = Date.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        // 更新物理
        if (!this.isGameOver && !this.isPaused) {
            this.world.update(dt);
            this.handleCollisions();
            this.checkGameOver();
        }

        // 更新特效
        this.updateEffects();

        // 渲染
        this.render();

        // 下一帧
        requestAnimationFrame(() => this.loop());
    }

    updateEffects() {
        const now = Date.now();

        // 更新合成特效
        this.mergeEffects = this.mergeEffects.filter(effect => {
            return now - effect.startTime < effect.duration;
        });

        // 更新提示消息
        this.toasts = this.toasts.filter(toast => {
            return now - toast.startTime < toast.duration;
        });
    }

    render() {
        const renderer = this.renderer;

        // 清空画布
        renderer.clear();

        // 绘制背景
        renderer.drawBackground();

        // 绘制墙壁和地面
        renderer.drawWalls();

        // 绘制游戏结束线
        renderer.drawGameOverLine(this.gameArea.gameOverLineY);

        if (!this.isGameOver) {
            // 绘制投放线
            renderer.drawDropLine(this.dropX, FRUITS[this.currentFruitLevel], this.gameArea.gameOverLineY);

            // 绘制待投放水果
            renderer.drawPendingFruit(
                this.dropX,
                this.gameArea.gameOverLineY - FRUITS[this.currentFruitLevel].radius - 10,
                this.currentFruitLevel
            );
        }

        // 绘制所有水果
        renderer.drawFruits(this.world.bodies);

        // 绘制合成特效
        const now = Date.now();
        for (const effect of this.mergeEffects) {
            const progress = (now - effect.startTime) / effect.duration;
            renderer.drawMergeEffect(effect.x, effect.y, effect.radius, progress);
        }

        // 绘制分数
        renderer.drawScore(this.score, this.bestScore);

        // 绘制排行榜按钮
        this.rankButtonArea = renderer.drawRankButton();

        // 绘制道具栏
        this.toolbarHitAreas = renderer.drawToolbar(this.tools);

        // 绘制提示消息
        for (const toast of this.toasts) {
            const progress = (now - toast.startTime) / toast.duration;
            renderer.drawToast(toast.message, progress);
        }

        // 绘制游戏结束画面
        if (this.isGameOver) {
            this.gameOverButtons = renderer.drawGameOver(this.score, this.bestScore);
        }

        // 绘制水果选择面板
        if (this.showingFruitSelector) {
            this.fruitSelectorHitAreas = renderer.drawFruitSelector();
        }

        // 绘制广告奖励面板
        if (this.showingAdPanel) {
            this.adPanelHitAreas = renderer.drawAdPanel();
        }

        // 绘制分享奖励面板
        if (this.showingSharePanel) {
            this.sharePanelHitAreas = renderer.drawSharePanel();
        }

        // 绘制调试面板（仅开发环境）
        if (__DEV__ && this.showingDebugPanel) {
            this.debugPanelHitAreas = renderer.drawDebugPanel();
        }

        // 绘制调试按钮（仅开发环境）
        if (__DEV__ && !this.showingDebugPanel && !this.showingFruitSelector && 
            !this.showingAdPanel && !this.showingSharePanel && !this.showingRankList && !this.isGameOver) {
            this.debugButtonArea = renderer.drawDebugButton();
        }

        // 绘制排行榜面板
        if (this.showingRankList) {
            this.rankPanelButtons = renderer.drawRankPanel();
        }
    }

    handleGameOverTouch(e) {
        if (!this.gameOverButtons) return;

        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;

        if (this.isInRect(x, y, this.gameOverButtons.restartBtn)) {
            this.restart();
        }
    }

    // ==================== 辅助方法 ====================

    isInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }

    showToast(message) {
        this.toasts.push({
            message,
            startTime: Date.now(),
            duration: 1500
        });
    }

    playSound(type) {
        if (this.sound) {
            this.sound.play(type);
        }
    }

    // ==================== 数据存储 ====================

    loadBestScore() {
        try {
            return wx.getStorageSync('daxigua_bestScore') || 0;
        } catch (e) {
            return 0;
        }
    }

    saveBestScore() {
        try {
            wx.setStorageSync('daxigua_bestScore', this.bestScore);
        } catch (e) {
            console.log('[游戏] 保存最高分失败');
        }
    }

    loadTools() {
        try {
            const saved = wx.getStorageSync('daxigua_tools');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        return {
            hammer: TOOLS.hammer.initial,
            selectFruit: TOOLS.selectFruit.initial,
            skip: TOOLS.skip.initial
        };
    }

    saveTools() {
        try {
            wx.setStorageSync('daxigua_tools', JSON.stringify(this.tools));
        } catch (e) {
            console.log('[游戏] 保存道具失败');
        }
    }
}

module.exports = Game;
