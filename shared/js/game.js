/**
 * 合成大西瓜 - 主游戏类
 * 包含游戏主循环、水果管理、合成逻辑、触摸控制
 * 支持微信小程序和 Web 环境
 */

(function() {
'use strict';

// 环境适配导入
var Platform, Vector, Circle, Rectangle, World, Renderer, SoundSystem, Config;

if (typeof require !== 'undefined') {
    // Node.js / 小程序环境
    Platform = require('./platform');
    var physics = require('./physics');
    Vector = physics.Vector;
    Circle = physics.Circle;
    Rectangle = physics.Rectangle;
    World = physics.World;
    Renderer = require('./renderer');
    SoundSystem = require('./soundSystem');
    Config = require('./config');
} else {
    // Web 浏览器环境
    Platform = window.Platform;
    Vector = window.Vector;
    Circle = window.Circle;
    Rectangle = window.Rectangle;
    World = window.World;
    Renderer = window.Renderer;
    SoundSystem = window.SoundSystem;
    Config = window.GameConfig;
}

var FRUITS = Config ? Config.FRUITS : [];
var PHYSICS = Config ? Config.PHYSICS : {};
var GAME_AREA = Config ? Config.GAME_AREA : {};
var RULES = Config ? Config.RULES : {};
var TOOLS = Config ? Config.TOOLS : {};
var __DEV__ = Config ? Config.__DEV__ : false;
var DEBUG_CONFIG = Config ? Config.DEBUG_CONFIG : {};
var COMBO = Config ? Config.COMBO : {};
var FEVER = Config ? Config.FEVER : {};
var WEATHER = Config ? Config.WEATHER : {};
var EARTHQUAKE = Config ? Config.EARTHQUAKE : {};
var MYSTERY_BOX = Config ? Config.MYSTERY_BOX : {};
var BOMB = Config ? Config.BOMB : {};
var ICE_BLOCK = Config ? Config.ICE_BLOCK : {};
var BUFFS = Config ? Config.BUFFS : {};
var CHAOS = Config ? Config.CHAOS : {};
var MERGE_FEEDBACK = Config ? Config.MERGE_FEEDBACK : {};
var STATS = Config ? Config.STATS : {};
var ACHIEVEMENTS = Config ? Config.ACHIEVEMENTS : [];
var SKINS = Config ? Config.SKINS : {};
var GRAVITY_FIELD = Config ? Config.GRAVITY_FIELD : {};

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

        // 自动下落倒计时（15秒）
        this.autoDropCountdown = 15;
        this.autoDropDefaultTime = 15;  // 默认时间
        this.lastCountdownUpdate = Date.now();
        this.autoDropEnabled = true;

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

        // ==================== Combo 系统 ====================
        this.comboCount = 0;              // 当前连击数
        this.lastMergeTime = 0;           // 上次合成时间戳
        this.comboEffects = [];           // Combo 特效队列

        // ==================== Fever 模式 ====================
        this.isFeverMode = false;         // 是否处于 Fever 模式
        this.feverEndTime = 0;            // Fever 模式结束时间
        this.feverParticles = [];         // Fever 粒子效果
        this._originalDropCooldown = RULES.dropCooldown;

        // ==================== 天气系统 ====================
        this.currentWeather = null;
        this.weatherEndTime = 0;
        this.nextWeatherTime = Date.now() + (WEATHER.firstDelay || 10000); // 首次天气10秒后触发
        this._savedPhysics = {};
        this.weatherParticles = [];
        this.windOffset = 0;

        // ==================== 地震系统 ====================
        this.earthquakeTimer = null;
        this.lastEarthquakeTime = 0;
        this.showWarningLine = false;
        this.screenShake = null;

        // ==================== 特殊实体 ====================
        this.explosionEffects = [];       // 爆炸特效
        this.iceThawEffects = [];         // 冰块解冻特效
        this.gravityFields = [];          // 引力场列表

        // ==================== 合成反馈系统 ====================
        this.mergeShake = null;           // 合成震动
        this.comboHueShift = 0;           // Combo 色调偏移
        this.comboSaturation = 1;         // Combo 饱和度

        // ==================== Buff 系统 ====================
        this.activeBuffs = {};            // 已激活的 Buff
        this.buffStacks = {};             // Buff 层数
        this.showDropGuide = false;       // 是否显示投影辅助线
        this.showingBuffPanel = false;    // 是否显示 Buff 选择面板
        this.buffChoices = [];            // 当前可选的 Buff
        this.buffPanelHitAreas = [];      // Buff 面板点击区域
        this.piercingCharges = 0;         // 穿透弹剩余次数

        // ==================== 统计与成就系统 ====================
        this.gameStartTime = 0;           // 游戏开始时间
        this.sessionMerges = 0;           // 本局合成次数
        this.sessionWatermelons = 0;      // 本局西瓜数
        this.unlockedAchievements = this.loadUnlockedAchievements();
        this.newAchievements = [];        // 新解锁的成就（用于显示）
        this.showingStatsPanel = false;   // 是否显示统计面板
        this.statsPanelHitAreas = [];     // 统计面板点击区域

        // ==================== 混沌模式 ====================
        this.lastArtifactScore = 0;
        this.skillCooldowns = { shake: 0, gust: 0 };
        this.wallPhase = 0;
        this.lastTouchPos = null; // 用于切水果检测

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
        if (Platform.isWechat) {
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
        Platform.onTouchStart((e) => {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            this.lastTouchPos = { x, y };

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

            // 处理 Buff 面板点击
            if (this.showingBuffPanel) {
                this.handleBuffPanelClick(x, y);
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
        }, this.canvas);

        // 触摸移动
        Platform.onTouchMove((e) => {
            if (this.isGameOver || this.hammerMode || this.isPaused) return;
            
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;

            // 切水果检测
            if (CHAOS.fruitSlice && this.lastTouchPos) {
                this.checkFruitSlice(this.lastTouchPos.x, this.lastTouchPos.y, x, y);
            }
            this.lastTouchPos = { x, y };

            this.updateDropPosition(touch.clientX);
        }, this.canvas);

        // 触摸结束 - 投放水果
        Platform.onTouchEnd((e) => {
            this.lastTouchPos = null;
            if (this.isGameOver || this.hammerMode) return;
            
            // 检查是否点击了 UI
            if (e.changedTouches && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const y = touch.clientY;
                
                // 如果点击在工具栏区域，不投放
                if (y > this.height - 100) return;
            }

            this.dropFruit();
        }, this.canvas);
    }

    updateDropPosition(x) {
        const ga = this.gameArea;
        const fruit = FRUITS[this.currentFruitLevel];
        const radius = fruit ? fruit.radius : 30;
        
        // 限制在游戏区域内
        this.dropX = Math.max(ga.left + radius, Math.min(x, ga.right - radius));
    }

    generateNextFruit() {
        // 检查是否生成盲盒
        if (MYSTERY_BOX.enabled && Math.random() < MYSTERY_BOX.spawnChance) {
            this.currentFruitLevel = Math.floor(Math.random() * (RULES.maxFruitLevel + 1));
            this.nextIsMysteryBox = true;
            this.nextIsIceBlock = false;
            return;
        }
        
        // 检查是否生成冰封果实
        if (ICE_BLOCK.enabled && Math.random() < ICE_BLOCK.spawnChance) {
            this.currentFruitLevel = Math.floor(Math.random() * (RULES.maxFruitLevel + 1));
            this.nextIsMysteryBox = false;
            this.nextIsIceBlock = true;
            return;
        }
        
        // 普通水果
        this.currentFruitLevel = Math.floor(Math.random() * (RULES.maxFruitLevel + 1));
        this.nextIsMysteryBox = false;
        this.nextIsIceBlock = false;
    }

    dropFruit() {
        if (!this.canDrop || this.isPaused) return;
        
        const now = Date.now();
        // Fever 模式下冷却时间为 0
        const cooldown = this.isFeverMode ? FEVER.dropCooldown : RULES.dropCooldown;
        if (now - this.lastDropTime < cooldown) return;

        const fruit = FRUITS[this.currentFruitLevel];
        if (!fruit) return;

        // 计算半径（Fever 模式下缩小）
        const radius = this.isFeverMode ? fruit.radius * FEVER.radiusShrink : fruit.radius;

        // 创建水果刚体（使用差异化物理材质）
        const body = new Circle(
            this.dropX,
            this.gameArea.gameOverLineY - radius - 10,
            radius,
            {
                restitution: fruit.restitution !== undefined ? fruit.restitution : PHYSICS.restitution,
                friction: fruit.friction !== undefined ? fruit.friction : PHYSICS.friction,
                frictionAir: PHYSICS.frictionAir,
                label: 'fruit',
                fruitLevel: this.currentFruitLevel
            }
        );

        // 设置特殊实体属性
        if (this.nextIsMysteryBox) {
            body.isMysteryBox = true;
            body.mysteryState = 'falling';
        } else if (this.nextIsIceBlock) {
            body.iceState = 'frozen';
        }

        // Fever 模式下保存原始半径
        if (this.isFeverMode) {
            body._originalRadius = fruit.radius;
        }

        // 穿透弹模式
        if (this.piercingCharges > 0) {
            body.isPiercing = true;
            body.hasPierced = false;
            this.piercingCharges--;
            this.showToast(`🎯 穿透弹发射！剩余: ${this.piercingCharges}`);
        }

        this.world.add(body);
        
        // 更新状态
        this.canDrop = false;
        this.lastDropTime = now;

        // 短暂延迟后可以再次投放
        const nextCooldown = this.isFeverMode ? 100 : RULES.dropCooldown;
        setTimeout(() => {
            this.canDrop = true;
            this.generateNextFruit();
            // 重置自动下落倒计时
            this.resetAutoDropCountdown();
        }, nextCooldown);
    }

    handleCollisions() {
        const pairs = this.world.getCollisionPairs();
        const toMerge = [];
        const toPierce = [];

        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;

            // 检查是否是两个水果碰撞
            if (bodyA.label !== 'fruit' || bodyB.label !== 'fruit') continue;
            if (bodyA.isRemoved || bodyB.isRemoved) continue;
            
            // 处理穿透弹
            if (bodyA.isPiercing && !bodyA.hasPierced && !bodyB.justCreated) {
                toPierce.push({ piercer: bodyA, target: bodyB });
                continue;
            }
            if (bodyB.isPiercing && !bodyB.hasPierced && !bodyA.justCreated) {
                toPierce.push({ piercer: bodyB, target: bodyA });
                continue;
            }
            
            if (bodyA.justCreated || bodyB.justCreated) continue;
            
            // 跳过冰封水果
            if (bodyA.iceState === 'frozen' || bodyB.iceState === 'frozen') continue;
            
            // 跳过盲盒
            if (bodyA.isMysteryBox || bodyB.isMysteryBox) continue;

            // 检查是否是相同等级
            if (bodyA.fruitLevel === bodyB.fruitLevel && bodyA.fruitLevel < 10) {
                toMerge.push({ bodyA, bodyB });
            }
        }

        // 处理穿透
        for (const { piercer, target } of toPierce) {
            if (piercer.isRemoved || target.isRemoved) continue;
            if (piercer.hasPierced) continue;
            this.handlePiercing(piercer, target);
        }

        // 处理合成
        for (const { bodyA, bodyB } of toMerge) {
            if (bodyA.isRemoved || bodyB.isRemoved) continue;
            this.mergeFruits(bodyA, bodyB);
        }
    }

    /**
     * 处理穿透弹效果
     */
    handlePiercing(piercer, target) {
        piercer.hasPierced = true;
        piercer.isPiercing = false;
        
        const targetName = FRUITS[target.fruitLevel]?.name || '水果';
        
        // 添加穿透特效
        this.mergeEffects.push({
            x: target.position.x,
            y: target.position.y,
            radius: target.radius,
            type: 'pierce',
            startTime: Date.now(),
            duration: 300
        });
        
        // 销毁目标
        this.world.remove(target);
        
        // 加分
        const bonus = FRUITS[target.fruitLevel]?.score || 1;
        this.score += bonus * 2;
        
        this.showToast(`🎯 穿透销毁 ${targetName}！+${bonus * 2}`);
        this.playSound('destroy');
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

        // 创建新水果（使用差异化物理材质）
        const newFruit = FRUITS[newLevel];
        // Fever 模式下碰撞体缩小
        const radius = this.isFeverMode ? newFruit.radius * FEVER.radiusShrink : newFruit.radius;
        const newBody = new Circle(
            newX, newY,
            radius,
            {
                restitution: newFruit.restitution !== undefined ? newFruit.restitution : PHYSICS.restitution,
                friction: newFruit.friction !== undefined ? newFruit.friction : PHYSICS.friction,
                frictionAir: PHYSICS.frictionAir,
                label: 'fruit',
                fruitLevel: newLevel
            }
        );
        if (this.isFeverMode) {
            newBody._originalRadius = newFruit.radius;
        }
        
        // 继承一部分速度
        newBody.velocity = bodyA.velocity.add(bodyB.velocity).mult(0.3);
        
        this.world.add(newBody);

        // 更新 Combo
        const comboCount = this.updateCombo();
        
        // 计算带连击加成的分数
        const baseScore = newFruit.score;
        const finalScore = this.calculateMergeScore(baseScore);
        this.score += finalScore;

        // 检查神器阈值 (Roguelike Artifacts)
        if (CHAOS.enabled && this.score - this.lastArtifactScore >= CHAOS.artifactThreshold) {
            this.lastArtifactScore = Math.floor(this.score / CHAOS.artifactThreshold) * CHAOS.artifactThreshold;
            this.showBuffSelector(); // 复用 Buff 选择器作为神器选择
            this.showToast('🔮 神器能量充满！');
        }

        // 记录统计
        this.recordMergeStat(newLevel);
        this.recordComboStat(comboCount);

        // 添加合成特效
        this.mergeEffects.push({
            x: newX,
            y: newY,
            radius: newFruit.radius,
            startTime: Date.now(),
            duration: 300
        });

        // 添加 Combo 特效
        if (comboCount > 1) {
            this.comboEffects.push({
                x: newX,
                y: newY,
                comboCount: comboCount,
                startTime: Date.now(),
                duration: 800
            });
        }

        // 触发合成震感反馈
        this.triggerMergeShake(newLevel, comboCount);

        // 播放音效（带 Pitch 变化）
        this.playMergeSound(comboCount);

        // 检查冰块解冻
        this.checkIceThaw({ x: newX, y: newY });

        // 如果合成了西瓜
        if (newLevel === 10) {
            this.score += 100; // 额外奖励
            this.showToast('🍉 合成大西瓜！+100');
            this.playSound('success');
            // 触发 Buff 选择
            this.showBuffSelector();
        }
    }

    // ==================== Combo 系统方法 ====================

    updateCombo() {
        const now = Date.now();
        if (now - this.lastMergeTime < COMBO.windowMs) {
            this.comboCount = Math.min(this.comboCount + 1, COMBO.maxCombo);
        } else {
            this.comboCount = 1;
        }
        this.lastMergeTime = now;
        
        // 检查 Fever 触发
        if (this.comboCount >= COMBO.feverThreshold && !this.isFeverMode) {
            this.activateFeverMode();
        }
        
        return this.comboCount;
    }

    calculateMergeScore(baseScore) {
        const multiplier = 1 + (this.comboCount - 1) * COMBO.scoreMultiplier;
        return Math.floor(baseScore * multiplier);
    }

    playMergeSound(comboCount) {
        if (this.sound) {
            this.sound.playMerge(comboCount);
        }
    }

    /**
     * 触发合成震感反馈
     * @param {number} fruitLevel - 合成后的水果等级
     * @param {number} comboCount - 当前连击数
     */
    triggerMergeShake(fruitLevel, comboCount) {
        if (!MERGE_FEEDBACK.enabled) return;
        
        // 计算震动强度
        let intensity = MERGE_FEEDBACK.baseIntensity + fruitLevel * MERGE_FEEDBACK.levelMultiplier;
        let duration = MERGE_FEEDBACK.baseDuration + fruitLevel * MERGE_FEEDBACK.durationMultiplier;
        
        // 高等级合成额外加成
        if (fruitLevel >= MERGE_FEEDBACK.highLevelThreshold) {
            intensity += MERGE_FEEDBACK.highLevelIntensityBonus;
            duration += 100;
        }
        
        // Combo 加成
        if (comboCount > 1) {
            intensity *= (1 + comboCount * 0.1);
            duration += comboCount * 20;
        }
        
        // 西瓜特效
        if (fruitLevel === 10) {
            intensity = Math.max(intensity, 20);
            duration = Math.max(duration, 500);
        }
        
        // 触发震动
        this.startMergeShake(intensity, duration);
        
        // 更新 Combo 色调偏移
        this.updateComboHueShift(comboCount);
    }

    /**
     * 启动合成震动效果
     */
    startMergeShake(intensity, duration) {
        // 如果已有地震震动，取更大值
        if (this.screenShake) {
            intensity = Math.max(intensity, this.screenShake.intensity);
            duration = Math.max(duration, this.screenShake.duration - (Date.now() - this.screenShake.startTime));
        }
        
        this.mergeShake = {
            startTime: Date.now(),
            duration: duration,
            intensity: intensity
        };
    }

    /**
     * 获取合成震动偏移
     */
    getMergeShakeOffset() {
        if (!this.mergeShake) return { x: 0, y: 0 };
        
        const elapsed = Date.now() - this.mergeShake.startTime;
        if (elapsed > this.mergeShake.duration) {
            this.mergeShake = null;
            return { x: 0, y: 0 };
        }
        
        const progress = elapsed / this.mergeShake.duration;
        const decay = 1 - progress;
        const intensity = this.mergeShake.intensity * decay;
        
        // 使用正弦波产生更自然的震动
        const frequency = 20; // 震动频率
        return {
            x: Math.sin(elapsed / 1000 * Math.PI * frequency) * intensity,
            y: Math.cos(elapsed / 1000 * Math.PI * frequency * 1.3) * intensity * 0.8
        };
    }

    /**
     * 更新 Combo 色调偏移
     */
    updateComboHueShift(comboCount) {
        if (!MERGE_FEEDBACK.comboHueShift || !MERGE_FEEDBACK.comboHueShift.enabled) return;
        
        const config = MERGE_FEEDBACK.comboHueShift;
        
        // 计算色调偏移
        this.comboHueShift = Math.min(
            config.baseShift + comboCount * config.shiftPerCombo,
            config.maxShift
        );
        
        // 计算饱和度增益
        this.comboSaturation = Math.min(
            1 + comboCount * config.saturationBoost,
            config.maxSaturation
        );
    }

    // ==================== Fever 模式方法 ====================

    activateFeverMode() {
        if (this.isFeverMode) return;
        
        this.isFeverMode = true;
        this.feverEndTime = Date.now() + FEVER.duration;
        
        // 暂存原始物理参数
        this._originalDropCooldown = RULES.dropCooldown;
        RULES.dropCooldown = FEVER.dropCooldown;
        
        // 缩小所有水果碰撞体
        for (const body of this.world.bodies) {
            if (body.label === 'fruit' && !body._originalRadius) {
                body._originalRadius = body.radius;
                body.radius *= FEVER.radiusShrink;
            }
        }
        
        this.showToast('🔥 FEVER MODE!');
        this.playSound('fever_start');
    }

    deactivateFeverMode() {
        if (!this.isFeverMode) return;
        
        this.isFeverMode = false;
        
        // 恢复原始参数
        RULES.dropCooldown = this._originalDropCooldown;
        
        // 恢复水果碰撞体
        for (const body of this.world.bodies) {
            if (body._originalRadius) {
                body.radius = body._originalRadius;
                delete body._originalRadius;
            }
        }
        
        this.showToast('Fever 结束');
    }

    checkFeverExpiry() {
        if (this.isFeverMode && Date.now() > this.feverEndTime) {
            this.deactivateFeverMode();
        }
    }

    // ==================== 天气系统方法 ====================

    updateWeather(now) {
        // 检查是否需要开始新天气
        if (!this.currentWeather && now >= this.nextWeatherTime) {
            this.startRandomWeather();
        }
        
        // 检查当前天气是否结束
        if (this.currentWeather && now >= this.weatherEndTime) {
            this.endWeather();
        }
        
        // 应用天气效果（如持续的风力）
        if (this.currentWeather === 'windy') {
            this.applyWindForce();
        }
    }

    startRandomWeather() {
        const types = Object.keys(WEATHER.types);
        const weatherType = this.weightedRandomWeather(types);
        this.currentWeather = weatherType;
        
        // 反重力天气使用特殊时长
        const config = WEATHER.types[weatherType];
        const duration = config.duration || WEATHER.duration;
        this.weatherEndTime = Date.now() + duration;
        this.nextWeatherTime = this.weatherEndTime + WEATHER.interval;
        
        // 保存原始物理参数
        this._savedPhysics = {
            friction: PHYSICS.friction,
            restitution: PHYSICS.restitution,
            gravityY: this.world.gravity.y
        };
        
        // 应用天气效果
        if (config.friction !== undefined) {
            this.setWeatherFriction(config.friction);
        }
        if (config.restitution !== undefined) {
            this.setWeatherRestitution(config.restitution);
        }
        if (config.gravityMultiplier !== undefined) {
            this.setAntiGravity(config.gravityMultiplier);
        }
        
        this.showToast(`${config.icon} ${config.name}来袭！`);
    }

    /**
     * 设置反重力效果（温和版本）
     */
    setAntiGravity(multiplier) {
        // 保存原始重力
        this._savedPhysics.gravityY = this.world.gravity.y;
        
        // 设置反重力为很小的向上力（-0.1 ~ -0.15）
        // 让水果轻微漂浮而不是飞走
        this.world.gravity.y = Math.abs(this._savedPhysics.gravityY) * multiplier * 0.5;
        
        // 唤醒所有水果，但不给推力
        for (const body of this.world.bodies) {
            if (body.label === 'fruit' && !body.isStatic) {
                body.wake();
                // 减缓当前速度，让效果更可控
                body.velocity = body.velocity.mult(0.3);
            }
        }
    }

    weightedRandomWeather(types) {
        const roll = Math.random();
        let cumulative = 0;
        for (const type of types) {
            cumulative += WEATHER.types[type].probability;
            if (roll < cumulative) return type;
        }
        return types[types.length - 1];
    }

    applyWindForce() {
        const config = WEATHER.types.windy;
        for (const body of this.world.bodies) {
            if (body.label === 'fruit' && !body.isStatic) {
                body.wake();  // 唤醒休眠的刚体
                body.applyForce(new Vector(config.forceX, config.forceY));
            }
        }
    }

    setWeatherFriction(value) {
        for (const body of this.world.bodies) {
            if (body.label === 'fruit') {
                body.friction = value;
            }
        }
    }

    setWeatherRestitution(value) {
        for (const body of this.world.bodies) {
            if (body.label === 'fruit') {
                body.restitution = value;
            }
        }
    }

    endWeather() {
        const wasAntiGravity = this.currentWeather === 'antiGravity';
        
        // 恢复原始物理参数
        this.setWeatherFriction(this._savedPhysics.friction);
        this.setWeatherRestitution(this._savedPhysics.restitution);
        
        // 恢复重力
        if (this._savedPhysics.gravityY !== undefined) {
            if (wasAntiGravity) {
                // 反重力结束：渐进恢复重力 + 保护期
                this.startGravityRecovery(this._savedPhysics.gravityY);
            } else {
                this.world.gravity.y = this._savedPhysics.gravityY;
            }
            
            // 唤醒所有物体，防止悬停
            for (const body of this.world.bodies) {
                if (body.label === 'fruit' && !body.isStatic) {
                    body.wake();
                    body.isSleeping = false;
                    body.sleepCounter = 0;
                }
            }
        }
        
        this.currentWeather = null;
        this.showToast('天气恢复正常');
    }

    /**
     * 渐进恢复重力（反重力结束后）
     * 同时启用临时保护期，防止水果落下时触发 gameOver
     */
    startGravityRecovery(targetGravity) {
        const duration = 1500; // 1.5 秒渐进恢复
        const startGravity = this.world.gravity.y;
        const startTime = Date.now();
        
        // 启用保护期
        this.antiGravityProtection = true;
        this.antiGravityProtectionEndTime = Date.now() + duration + 1000; // 额外 1 秒缓冲
        
        const recover = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数让恢复更平滑
            const eased = 1 - Math.pow(1 - progress, 3);
            this.world.gravity.y = startGravity + (targetGravity - startGravity) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(recover);
            }
        };
        
        recover();
    }

    // ==================== 地震系统方法 ====================

    checkEarthquakeTrigger() {
        const gameOverY = this.gameArea.gameOverLineY;
        let highestFruit = null;
        
        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isRemoved) continue;
            const fruitTop = body.position.y - body.radius;
            if (fruitTop < gameOverY) {
                if (!highestFruit || fruitTop < highestFruit.top) {
                    highestFruit = { body, top: fruitTop };
                }
            }
        }
        
        if (highestFruit) {
            // 开始计时
            if (!this.earthquakeTimer) {
                this.earthquakeTimer = Date.now();
                this.showWarningLine = true;  // 显示警告动画
            } else if (Date.now() - this.earthquakeTimer > EARTHQUAKE.triggerDelay) {
                this.triggerEarthquake();
                this.earthquakeTimer = null;
            }
        } else {
            this.earthquakeTimer = null;
            this.showWarningLine = false;
        }
    }

    triggerEarthquake() {
        // 检查冷却
        if (this.lastEarthquakeTime && 
            Date.now() - this.lastEarthquakeTime < EARTHQUAKE.cooldown) {
            return;
        }
        this.lastEarthquakeTime = Date.now();
        
        // 唤醒并施加冲量
        for (const body of this.world.bodies) {
            if (body.label === 'fruit' && !body.isStatic) {
                body.wake();
                // 向上 + 轻微随机水平方向
                const impulse = new Vector(
                    (Math.random() - 0.5) * 2,
                    -EARTHQUAKE.impulseStrength
                );
                body.velocity = body.velocity.add(impulse);
            }
        }
        
        // 触发屏幕震动效果
        this.startScreenShake();
        this.playSound('earthquake');
        this.showToast('⚠️ 地震！');
    }

    startScreenShake() {
        this.screenShake = {
            startTime: Date.now(),
            duration: EARTHQUAKE.screenShake.duration,
            intensity: EARTHQUAKE.screenShake.intensity
        };
    }

    getScreenShakeOffset() {
        if (!this.screenShake) return { x: 0, y: 0 };
        
        const elapsed = Date.now() - this.screenShake.startTime;
        if (elapsed > this.screenShake.duration) {
            this.screenShake = null;
            return { x: 0, y: 0 };
        }
        
        const progress = elapsed / this.screenShake.duration;
        const decay = 1 - progress;
        const intensity = this.screenShake.intensity * decay;
        
        return {
            x: (Math.random() - 0.5) * intensity * 2,
            y: (Math.random() - 0.5) * intensity * 2
        };
    }

    // ==================== 特殊实体方法 ====================

    // 生成水果时检查是否生成特殊实体
    generateNextFruitWithSpecial() {
        // 检查是否生成盲盒
        if (MYSTERY_BOX.enabled && Math.random() < MYSTERY_BOX.spawnChance) {
            this.currentFruitLevel = Math.floor(Math.random() * (RULES.maxFruitLevel + 1));
            this.nextIsMysteryBox = true;
            return;
        }
        
        // 检查是否生成冰封果实
        if (ICE_BLOCK.enabled && Math.random() < ICE_BLOCK.spawnChance) {
            this.currentFruitLevel = Math.floor(Math.random() * (RULES.maxFruitLevel + 1));
            this.nextIsIceBlock = true;
            return;
        }
        
        // 普通水果
        this.currentFruitLevel = Math.floor(Math.random() * (RULES.maxFruitLevel + 1));
        this.nextIsMysteryBox = false;
        this.nextIsIceBlock = false;
    }

    // 更新盲盒
    updateMysteryBoxes() {
        // 获取碰撞对来检测盲盒是否与其他物体碰撞
        const collisionPairs = this.world.getCollisionPairs();
        const collidingBodies = new Set();
        for (const pair of collisionPairs) {
            collidingBodies.add(pair.bodyA.id);
            collidingBodies.add(pair.bodyB.id);
        }
        
        for (const body of this.world.bodies) {
            if (!body.isMysteryBox) continue;
            if (body.mysteryState === 'resolved' || body.mysteryState === 'revealing') continue;
            
            // 初始化落地检测计时器
            if (!body.groundedTimer) {
                body.groundedTimer = 0;
            }
            
            // 检查是否落地（速度较慢、接近地面、或与其他物体碰撞）
            const isSlowEnough = body.velocity.lengthSq() < 4;
            const isNearGround = body.position.y > this.gameArea.groundY - body.radius * 3;
            const isColliding = collidingBodies.has(body.id);
            
            if (isSlowEnough || isNearGround || isColliding) {
                body.groundedTimer++;
                // 稳定 5 帧后判定为落地（从 10 降低到 5，更快触发）
                if (body.groundedTimer > 5) {
                    body.mysteryState = 'revealing';
                    
                    // 延迟后揭示内容
                    const bodyRef = body;
                    setTimeout(() => {
                        if (!bodyRef.isRemoved && bodyRef.isMysteryBox) {
                            this.resolveMysteryBox(bodyRef);
                        }
                    }, MYSTERY_BOX.triggerDelay);
                }
            } else {
                body.groundedTimer = 0;
            }
        }
    }

    resolveMysteryBox(body) {
        if (body.isRemoved) return;
        
        const roll = Math.random();
        
        // 检查是否生成引力场（最低概率，2%）
        if (GRAVITY_FIELD.enabled && roll < GRAVITY_FIELD.spawnChance) {
            this.createGravityField(body.position.x, body.position.y);
            this.world.remove(body);
            this.showToast('🌀 引力场！');
            return;
        }
        
        if (roll < MYSTERY_BOX.results.evolve.chance) {
            // 进化为高级水果
            const newLevel = Math.min((body.fruitLevel || 0) + MYSTERY_BOX.results.evolve.levelBonus, 10);
            this.transformMysteryBox(body, newLevel);
            this.showToast('🎁 进化！');
        } else if (roll < MYSTERY_BOX.results.evolve.chance + MYSTERY_BOX.results.bomb.chance) {
            // 变成炸弹
            this.createBomb(body.position.x, body.position.y);
            this.world.remove(body);
            this.showToast('💣 炸弹！');
        } else {
            // 随机低级水果
            const [min, max] = MYSTERY_BOX.results.random.levelRange;
            const newLevel = min + Math.floor(Math.random() * (max - min + 1));
            this.transformMysteryBox(body, newLevel);
        }
    }

    transformMysteryBox(body, newLevel) {
        const newFruit = FRUITS[newLevel];
        
        // 更新所有相关属性
        body.radius = newFruit.radius;
        body.fruitLevel = newLevel;
        body.isMysteryBox = false;
        body.mysteryState = 'resolved';
        
        // 更新质量（根据新半径）
        body.mass = Math.PI * newFruit.radius * newFruit.radius * 0.01;
        body.invMass = 1 / body.mass;
        
        // 清理盲盒相关属性
        delete body.groundedTimer;
        
        // 播放转化特效
        this.mergeEffects.push({
            x: body.position.x,
            y: body.position.y,
            radius: newFruit.radius,
            type: 'transform',
            startTime: Date.now(),
            duration: 400
        });
        
        console.log(`[盲盒] 转化为 ${newFruit.name} (等级 ${newLevel})`);
    }

    // 创建炸弹
    createBomb(x, y) {
        const bomb = new Circle(x, y, BOMB.radius, {
            restitution: 0.1,
            friction: 0.5,
            label: 'bomb'
        });
        bomb.isBomb = true;
        bomb.fuseStartTime = Date.now();
        bomb.exploded = false;
        
        this.world.add(bomb);
    }

    // 更新炸弹
    updateBombs() {
        const bombs = this.world.bodies.filter(b => b.isBomb && !b.exploded);
        for (const bomb of bombs) {
            const elapsed = Date.now() - bomb.fuseStartTime;
            if (elapsed >= BOMB.fuseTime) {
                this.explodeBomb(bomb);
            }
        }
    }

    explodeBomb(bomb) {
        bomb.exploded = true;
        const center = { x: bomb.position.x, y: bomb.position.y };
        let destroyedCount = 0;
        const chainBombs = [];  // 需要连锁引爆的炸弹
        
        // 遍历所有物体
        for (const body of this.world.bodies) {
            if (body === bomb) continue;
            
            const dx = body.position.x - center.x;
            const dy = body.position.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 处理其他炸弹的连锁反应
            if (body.isBomb && !body.exploded && BOMB.chainReaction) {
                if (dist < BOMB.blastRadius) {
                    chainBombs.push(body);
                }
                continue;
            }
            
            // 只处理水果
            if (body.label !== 'fruit') continue;
            
            if (dist < BOMB.destroyRadius) {
                // 直接销毁范围内的水果
                // 添加销毁特效
                this.mergeEffects.push({
                    x: body.position.x,
                    y: body.position.y,
                    radius: body.radius,
                    type: 'explosion_destroy',
                    startTime: Date.now(),
                    duration: 300
                });
                this.world.remove(body);
                destroyedCount++;
            } else if (dist < BOMB.blastRadius) {
                // 冲击波范围内的水果受到冲量
                body.wake();
                const force = BOMB.blastForce * (1 - dist / BOMB.blastRadius);
                const direction = new Vector(dx / dist, dy / dist);
                body.velocity = body.velocity.add(direction.mult(force));
            }
        }
        
        // 加分
        this.score += destroyedCount * BOMB.scoreBonus;
        
        // 爆炸特效
        this.explosionEffects.push({
            x: center.x,
            y: center.y,
            startTime: Date.now(),
            duration: 600,
            radius: BOMB.blastRadius
        });
        
        // 触发屏幕震动
        if (BOMB.screenShake) {
            this.startMergeShake(BOMB.screenShake.intensity, BOMB.screenShake.duration);
        }
        
        this.playSound('explosion');
        this.world.remove(bomb);
        
        if (destroyedCount > 0) {
            this.showToast(`💥 炸毁 ${destroyedCount} 个水果！+${destroyedCount * BOMB.scoreBonus}`);
        } else {
            this.showToast(`💥 爆炸！`);
        }
        
        // 处理连锁反应（延迟引爆）
        for (const chainBomb of chainBombs) {
            setTimeout(() => {
                if (!chainBomb.exploded && !chainBomb.isRemoved) {
                    this.explodeBomb(chainBomb);
                }
            }, 100);
        }
    }

    // ==================== 引力场系统 ====================

    /**
     * 创建引力场
     */
    createGravityField(x, y) {
        const field = {
            x: x,
            y: y,
            radius: GRAVITY_FIELD.radius,
            attractRadius: GRAVITY_FIELD.attractRadius,
            startTime: Date.now(),
            duration: GRAVITY_FIELD.duration
        };
        this.gravityFields.push(field);
        this.playSound('fever_start');
    }

    /**
     * 更新所有引力场
     */
    updateGravityFields() {
        const now = Date.now();
        
        // 移除过期的引力场
        this.gravityFields = this.gravityFields.filter(field => {
            return now - field.startTime < field.duration;
        });
        
        // 对每个引力场施加吸引力
        for (const field of this.gravityFields) {
            this.applyGravityFieldForce(field);
        }
    }

    /**
     * 应用引力场吸引力
     */
    applyGravityFieldForce(field) {
        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isStatic || body.isRemoved) continue;
            
            const dx = field.x - body.position.x;
            const dy = field.y - body.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < field.attractRadius && dist > 5) {
                // 唤醒物体
                body.wake();
                
                // 计算吸引力（距离越近越强）
                const distRatio = 1 - (dist / field.attractRadius);
                let force = GRAVITY_FIELD.attractForce * distRatio;
                
                // 中心区域强化吸引
                if (dist < field.radius * 2) {
                    force *= GRAVITY_FIELD.centerForce;
                }
                
                // 应用力
                const direction = new Vector(dx / dist, dy / dist);
                body.velocity = body.velocity.add(direction.mult(force));
            }
        }
    }

    // 检查冰块解冻
    checkIceThaw(mergePosition) {
        for (const body of this.world.bodies) {
            if (body.iceState !== 'frozen') continue;
            
            const dx = body.position.x - mergePosition.x;
            const dy = body.position.y - mergePosition.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < ICE_BLOCK.thawRadius) {
                this.thawIceBlock(body, 0);  // chainDepth = 0
            }
        }
    }

    /**
     * 解冻冰封水果（支持连锁反应）
     * @param {Object} body - 冰封的水果刚体
     * @param {number} chainDepth - 当前连锁深度
     */
    thawIceBlock(body, chainDepth = 0) {
        if (body.iceState !== 'frozen') return;
        body.iceState = 'thawing';
        
        const thawPosition = { x: body.position.x, y: body.position.y };
        
        // 播放解冻动画
        this.iceThawEffects.push({
            body: body,
            x: thawPosition.x,
            y: thawPosition.y,
            startTime: Date.now(),
            duration: 500,
            isChainReaction: chainDepth > 0
        });
        
        // 延迟后完成解冻
        setTimeout(() => {
            if (!body.isRemoved) {
                body.iceState = 'normal';
                
                // 触发冲击波
                if (ICE_BLOCK.chainReaction && ICE_BLOCK.chainReaction.enabled) {
                    this.triggerIceShockwave(thawPosition);
                }
                
                // 检查连锁解冻
                if (ICE_BLOCK.chainReaction && 
                    ICE_BLOCK.chainReaction.enabled && 
                    chainDepth < ICE_BLOCK.chainReaction.maxChainDepth) {
                    this.checkChainThaw(thawPosition, chainDepth);
                }
                
                // 显示提示
                if (chainDepth === 0) {
                    this.showToast('🧊 冰块解冻！');
                } else {
                    this.showToast(`🧊 连锁解冻 x${chainDepth + 1}！`);
                }
            }
        }, 500);
    }

    /**
     * 触发冰块解冻冲击波
     * @param {Object} position - 冲击波中心位置
     */
    triggerIceShockwave(position) {
        const config = ICE_BLOCK.chainReaction;
        
        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isRemoved) continue;
            if (body.iceState === 'frozen' || body.iceState === 'thawing') continue;
            
            const dx = body.position.x - position.x;
            const dy = body.position.y - position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < config.shockwaveRadius && dist > 0) {
                // 唤醒并施加冲量
                body.wake();
                const direction = new Vector(dx / dist, dy / dist);
                const force = config.shockwaveForce * (1 - dist / config.shockwaveRadius);
                body.velocity = body.velocity.add(direction.mult(force));
            }
        }
        
        // 添加冲击波视觉效果
        this.iceThawEffects.push({
            type: 'shockwave',
            x: position.x,
            y: position.y,
            radius: config.shockwaveRadius,
            startTime: Date.now(),
            duration: 400
        });
    }

    /**
     * 检查连锁解冻
     * @param {Object} thawPosition - 解冻位置
     * @param {number} currentDepth - 当前连锁深度
     */
    checkChainThaw(thawPosition, currentDepth) {
        const config = ICE_BLOCK.chainReaction;
        
        for (const body of this.world.bodies) {
            if (body.iceState !== 'frozen') continue;
            
            const dx = body.position.x - thawPosition.x;
            const dy = body.position.y - thawPosition.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 在连锁半径内且通过概率检查
            if (dist < config.chainRadius && Math.random() < config.chainProbability) {
                // 延迟触发连锁解冻（错开时间以产生连锁效果）
                const delay = 200 + currentDepth * 100;
                setTimeout(() => {
                    if (body.iceState === 'frozen' && !body.isRemoved) {
                        this.thawIceBlock(body, currentDepth + 1);
                    }
                }, delay);
            }
        }
    }

    // ==================== Buff 系统方法 ====================

    showBuffSelector() {
        this.isPaused = true;
        this.showingBuffPanel = true;
        
        // 随机选择 3 个 Buff（考虑可叠加性）
        this.buffChoices = this.selectRandomBuffs(3);
    }

    selectRandomBuffs(count) {
        const available = Object.values(BUFFS).filter(buff => {
            if (!buff.stackable && this.activeBuffs[buff.id]) return false;
            if (buff.stackable) {
                const stacks = this.buffStacks[buff.id] || 0;
                if (stacks >= buff.maxStacks) return false;
            }
            return true;
        });
        
        // Fisher-Yates 洗牌后取前 count 个
        return this.shuffleArray([...available]).slice(0, Math.min(count, available.length));
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    applyBuff(buff) {
        const effect = buff.effect;
        
        switch (effect.type) {
            case 'containerWidth':
                this.expandContainer(effect.value);
                break;
            case 'gravity':
                this.modifyGravity(effect.multiplier);
                break;
            case 'dropGuide':
                this.enableDropGuide();
                break;
            case 'piercingShot':
                this.addPiercingCharges(effect.charges);
                break;
            case 'vaporize':
                this.vaporizeSmallFruits(effect.maxLevel);
                break;
            case 'shuffle':
                this.shuffleFruits();
                break;
        }
        
        // 记录 Buff（非即时效果）
        if (!buff.immediate) {
            this.activeBuffs[buff.id] = true;
            this.buffStacks[buff.id] = (this.buffStacks[buff.id] || 0) + 1;
        }
        
        this.hideBuffSelector();
        this.showToast(`${buff.icon} ${buff.name} 已激活！`);
    }

    /**
     * 添加穿透弹次数
     */
    addPiercingCharges(charges) {
        this.piercingCharges += charges;
        console.log(`[Buff] 穿透弹 +${charges}，当前: ${this.piercingCharges}`);
    }

    /**
     * 蒸发小型水果
     * @param {number} maxLevel - 最大等级（包含）
     */
    vaporizeSmallFruits(maxLevel) {
        let count = 0;
        const toRemove = [];
        
        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isRemoved) continue;
            if (body.fruitLevel <= maxLevel) {
                toRemove.push(body);
            }
        }
        
        for (const body of toRemove) {
            // 添加蒸发特效
            this.mergeEffects.push({
                x: body.position.x,
                y: body.position.y,
                radius: body.radius,
                type: 'vaporize',
                startTime: Date.now(),
                duration: 400
            });
            
            this.world.remove(body);
            count++;
        }
        
        if (count > 0) {
            this.showToast(`💨 蒸发了 ${count} 个小水果！`);
            this.playSound('destroy');
        } else {
            this.showToast('💨 没有可蒸发的水果');
        }
    }

    /**
     * 洗牌 - 随机重排所有水果位置
     */
    shuffleFruits() {
        const fruits = this.world.bodies.filter(b => b.label === 'fruit' && !b.isRemoved);
        
        if (fruits.length < 2) {
            this.showToast('🔀 水果太少，无法洗牌');
            return;
        }
        
        // 收集所有位置
        const positions = fruits.map(f => ({ x: f.position.x, y: f.position.y }));
        
        // Fisher-Yates 洗牌算法
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        
        // 应用新位置
        fruits.forEach((fruit, index) => {
            fruit.position.x = positions[index].x;
            fruit.position.y = positions[index].y;
            fruit.velocity = new Vector(0, 0);
            fruit.wake();
        });
        
        // 触发震动效果
        this.startMergeShake(15, 400);
        this.showToast(`🔀 洗牌完成！`);
    }

    hideBuffSelector() {
        this.showingBuffPanel = false;
        this.isPaused = false;
    }

    // 扩容：增加容器宽度
    expandContainer(pixels) {
        this.gameArea.left -= pixels / 2;
        this.gameArea.right += pixels / 2;
        
        // 移动墙壁
        const leftWall = this.world.walls.find(w => w.label === 'leftWall');
        const rightWall = this.world.walls.find(w => w.label === 'rightWall');
        if (leftWall) leftWall.position.x -= pixels / 2;
        if (rightWall) rightWall.position.x += pixels / 2;
    }

    // 软化：降低重力
    modifyGravity(multiplier) {
        this.world.gravity.y *= multiplier;
    }

    // 精准：启用投影辅助线
    enableDropGuide() {
        this.showDropGuide = true;
    }

    // 处理 Buff 面板点击
    handleBuffPanelClick(x, y) {
        for (const area of this.buffPanelHitAreas) {
            if (this.isInRect(x, y, area)) {
                if (area.action === 'close') {
                    this.hideBuffSelector();
                } else if (area.buffId) {
                    const buff = BUFFS[area.buffId];
                    if (buff) {
                        this.applyBuff(buff);
                    }
                }
                return true;
            }
        }
        return false;
    }

    // ==================== 混沌模式方法 ====================

    updateLivingJar(now) {
        // 呼吸效果：周期 5秒，幅度 15px
        const phase = (now / 5000) * Math.PI * 2;
        const breath = Math.sin(phase) * 15;
        
        // 动态调整墙壁位置
        const leftWall = this.world.walls.find(w => w.label === 'leftWall');
        const rightWall = this.world.walls.find(w => w.label === 'rightWall');
        
        if (leftWall && rightWall) {
            // 基础位置
            const baseLeft = this.width * GAME_AREA.sideMargin + 20;
            const baseRight = this.width * (1 - GAME_AREA.sideMargin) - 20;
            
            // 应用呼吸
            leftWall.position.x = baseLeft - breath;
            rightWall.position.x = baseRight + breath;
            
            // 更新游戏区域边界（用于投放限制）
            this.gameArea.left = leftWall.position.x + leftWall.width/2;
            this.gameArea.right = rightWall.position.x - rightWall.width/2;
        }
    }

    checkFruitSlice(x1, y1, x2, y2) {
        // 简单的线段与圆相交检测
        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isRemoved) continue;
            if (body.fruitLevel <= 0) continue; // 最小水果不可切
            if (body.isStatic) continue;
            
            // 只能切下落中的水果（速度向下且未触地）
            // 放宽条件：只要在空中即可，不需要严格速度限制，提升手感
            const isAirborne = body.position.y < this.gameArea.groundY - body.radius * 2;
            if (!isAirborne) continue;

            const dist = this.pointLineDistance(body.position.x, body.position.y, x1, y1, x2, y2);
            if (dist < body.radius) {
                this.splitFruit(body);
                // 每次划动只切一个，避免瞬间清屏
                return;
            }
        }
    }

    pointLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) // in case of 0 length line
            param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    splitFruit(body) {
        if (body.isRemoved) return;
        
        const level = body.fruitLevel;
        if (level <= 0) return;
        
        const newLevel = level - 1;
        const newFruit = FRUITS[newLevel];
        
        this.world.remove(body);
        
        // 分裂成两个小水果
        for (let i = -1; i <= 1; i += 2) {
            const newBody = new Circle(
                body.position.x + i * newFruit.radius * 0.5,
                body.position.y,
                newFruit.radius,
                {
                    restitution: PHYSICS.restitution,
                    friction: PHYSICS.friction,
                    frictionAir: PHYSICS.frictionAir,
                    label: 'fruit',
                    fruitLevel: newLevel
                }
            );
            // 赋予向外的速度
            newBody.velocity = body.velocity.add(new Vector(i * 100, -50));
            this.world.add(newBody);
        }
        
        this.showToast('⚔️ 切开！');
        this.playSound('destroy');
        
        // 特效
        this.mergeEffects.push({
            x: body.position.x,
            y: body.position.y,
            radius: body.radius,
            type: 'pierce',
            startTime: Date.now(),
            duration: 300
        });
    }

    checkGameOver() {
        // 反重力保护期：跳过游戏结束检测
        if (this.antiGravityProtection) {
            if (Date.now() < this.antiGravityProtectionEndTime) {
                return; // 保护期内不检测
            } else {
                // 保护期结束
                this.antiGravityProtection = false;
                this.antiGravityProtectionEndTime = null;
            }
        }
        
        // 反重力天气期间不检测 gameOver
        if (this.currentWeather === 'antiGravity') {
            return;
        }
        
        const gameOverY = this.gameArea.gameOverLineY;

        for (const body of this.world.bodies) {
            if (body.label !== 'fruit' || body.isRemoved) continue;
            if (body.justCreated) continue;

            // 检查水果顶部是否超过游戏结束线
            const fruitTop = body.position.y - body.radius;
            // 当水果顶部超过警戒线且速度较慢时，立即结束游戏
            if (fruitTop < gameOverY && body.velocity.lengthSq() < 1) {
                this.gameOver();
                return; // 立即返回，避免重复调用
            }
        }

        // 清理旧的计时器（如果存在）
        if (this.gameOverCheckTimer) {
            clearTimeout(this.gameOverCheckTimer);
            this.gameOverCheckTimer = null;
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

        // 记录游戏结束统计
        this.onGameEnd();

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

        // 重置 Combo 系统
        this.comboCount = 0;
        this.lastMergeTime = 0;
        this.comboEffects = [];

        // 重置 Fever 模式
        this.isFeverMode = false;
        this.feverEndTime = 0;
        this.feverParticles = [];
        RULES.dropCooldown = this._originalDropCooldown;

        // 重置天气系统
        this.currentWeather = null;
        this.weatherEndTime = 0;
        this.nextWeatherTime = Date.now() + (WEATHER.firstDelay || 10000);
        this._savedPhysics = {};
        this.weatherParticles = [];

        // 重置地震系统
        this.earthquakeTimer = null;
        this.lastEarthquakeTime = 0;
        this.showWarningLine = false;
        this.screenShake = null;

        // 重置特殊实体
        this.explosionEffects = [];
        this.iceThawEffects = [];
        this.gravityFields = [];
        
        // 重置反重力保护期
        this.antiGravityProtection = false;
        this.antiGravityProtectionEndTime = null;

        // 重置合成反馈
        this.mergeShake = null;
        this.comboHueShift = 0;
        this.comboSaturation = 1;

        // 重置 Buff 系统
        this.activeBuffs = {};
        this.buffStacks = {};
        this.showDropGuide = false;
        this.showingBuffPanel = false;
        this.buffChoices = [];
        this.piercingCharges = 0;
        
        // 恢复物理参数
        this.world.gravity = { x: PHYSICS.gravity.x, y: PHYSICS.gravity.y };

        // 重置自动下落默认时间和倒计时
        this.autoDropDefaultTime = 15;
        this.autoDropCountdown = this.autoDropDefaultTime;
        this.lastCountdownUpdate = Date.now();

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
            case 'shake':
                this.useSkill('shake');
                break;
            case 'gust':
                this.useSkill('gust');
                break;
        }
    }

    useSkill(skillId) {
        const now = Date.now();
        const cooldown = TOOLS[skillId].cooldown;
        const lastUsed = this.skillCooldowns[skillId] || 0;
        
        if (now - lastUsed < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000);
            this.showToast(`${TOOLS[skillId].name} 冷却中 (${remaining}s)`);
            return;
        }
        
        // 技能效果
        if (skillId === 'shake') {
            this.triggerEarthquake(); // 复用地震逻辑
            this.showToast('📳 强力震动！');
        } else if (skillId === 'gust') {
            this.applyGust();
            this.showToast('💨 一阵狂风！');
        }
        
        this.skillCooldowns[skillId] = now;
    }

    applyGust() {
        // 向上吹飞所有水果
        for (const body of this.world.bodies) {
            if (body.label === 'fruit' && !body.isStatic) {
                body.wake();
                // 向上 + 随机左右
                body.velocity = body.velocity.add(new Vector((Math.random() - 0.5) * 5, -15));
            }
        }
        this.startRandomWeather(); // 顺便触发一下天气效果（视觉）
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
        
        // Web 环境或模拟器环境直接发放奖励
        if (Platform.isWeb || typeof wx === 'undefined' || typeof wx.createRewardedVideoAd !== 'function') {
            const reward = TOOLS[toolType].adReward;
            this.tools[toolType] += reward;
            this.saveTools();
            this.showToast(`🎉 获得 ${TOOLS[toolType].name} x${reward}！`);
            return;
        }

        // 微信小程序环境创建激励视频广告
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
        if (Platform.isWechat) {
            wx.shareAppMessage({
                title: '🍉 合成大西瓜！我已经得了' + this.score + '分，你来挑战吗？',
                imageUrl: 'res/images/share.png',
                query: 'from=share&reward=' + toolType
            });
        } else {
            // Web 环境使用 Platform 的分享功能
            Platform.shareAppMessage({
                title: '🍉 合成大西瓜！我已经得了' + this.score + '分，你来挑战吗？'
            });
        }

        // 分享成功后发放奖励
        const reward = TOOLS[toolType].adReward;
        this.tools[toolType] += reward;
        this.saveTools();
        this.saveLastShareTime(now);
        this.showToast(`📤 分享成功！获得 ${TOOLS[toolType].name} x${reward}！`);
    }

    loadLastShareTime() {
        try {
            return Platform.getStorageSync('daxigua_lastShare') || 0;
        } catch (e) {
            return 0;
        }
    }

    saveLastShareTime(time) {
        try {
            Platform.setStorageSync('daxigua_lastShare', time);
        } catch (e) {
            console.log('[分享] 保存时间失败');
        }
    }

    // ==================== 排行榜 ====================

    showRankList() {
        // 显示排行榜
        this.showingRankList = true;
        this.isPaused = true;
        
        if (Platform.isWechat) {
            try {
                const openDataContext = wx.getOpenDataContext();
                openDataContext.postMessage({
                    type: 'showRankList'
                });
            } catch (e) {
                console.log('[排行榜] 获取开放数据域失败:', e);
            }
        } else {
            // Web 环境显示本地排行榜提示
            console.log('[排行榜] Web 环境暂不支持好友排行榜');
        }
    }

    hideRankList() {
        this.showingRankList = false;
        this.isPaused = false;
        
        if (Platform.isWechat) {
            try {
                const openDataContext = wx.getOpenDataContext();
                openDataContext.postMessage({
                    type: 'hideRankList'
                });
            } catch (e) {
                console.log('[排行榜] 关闭失败:', e);
            }
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
        this.debugPanelOpenTime = Date.now();  // 防抖：记录打开时间
        this.debugPanelHitAreas = [];  // 清空点击区域，等待下一帧渲染
    }

    hideDebugPanel() {
        this.showingDebugPanel = false;
        this.isPaused = false;
    }

    handleDebugPanelClick(x, y) {
        // 防抖：面板打开后 300ms 内的点击忽略
        if (this.debugPanelOpenTime && Date.now() - this.debugPanelOpenTime < 300) {
            return;
        }
        
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
                } else if (area.action === 'triggerFever') {
                    this.activateFeverMode();
                    this.showToast('🔥 已触发 Fever 模式');
                } else if (area.action === 'triggerWeather') {
                    this.startRandomWeather();
                    this.showToast('🌤️ 已触发随机天气');
                } else if (area.action === 'triggerEarthquake') {
                    this.triggerEarthquake();
                    this.showToast('⚠️ 已触发地震');
                } else if (area.action === 'spawnMysteryBox') {
                    this.debugSpawnMysteryBox();
                } else if (area.action === 'spawnBomb') {
                    this.debugSpawnBomb();
                } else if (area.action === 'spawnIceFruit') {
                    this.debugSpawnIceFruit();
                } else if (area.action === 'toggleWeather') {
                    WEATHER.enabled = !WEATHER.enabled;
                    this.showToast(`🌤️ 天气系统: ${WEATHER.enabled ? '开启' : '关闭'}`);
                } else if (area.action === 'toggleEarthquake') {
                    EARTHQUAKE.enabled = !EARTHQUAKE.enabled;
                    this.showToast(`⚠️ 地震系统: ${EARTHQUAKE.enabled ? '开启' : '关闭'}`);
                } else if (area.action === 'toggleMysteryBox') {
                    MYSTERY_BOX.enabled = !MYSTERY_BOX.enabled;
                    this.showToast(`🎁 盲盒系统: ${MYSTERY_BOX.enabled ? '开启' : '关闭'}`);
                } else if (area.action === 'toggleIceBlock') {
                    ICE_BLOCK.enabled = !ICE_BLOCK.enabled;
                    this.showToast(`🧊 冰封系统: ${ICE_BLOCK.enabled ? '开启' : '关闭'}`);
                } else if (area.action === 'clearAllFruits') {
                    this.debugClearAllFruits();
                } else if (area.action === 'addCombo') {
                    this.comboCount = Math.min(this.comboCount + 5, COMBO.maxCombo);
                    this.lastMergeTime = Date.now();
                    this.showToast(`🔥 Combo +5 (当前: ${this.comboCount})`);
                } else if (area.action === 'spawnFruit') {
                    this.debugSpawnRandomFruit();
                } else if (area.action === 'spawnGravityField') {
                    this.debugSpawnGravityField();
                } else if (area.action === 'addPiercing') {
                    this.piercingCharges += 3;
                    this.showToast(`🎯 穿透弹 +3 (当前: ${this.piercingCharges})`);
                } else if (area.action === 'triggerVaporize') {
                    this.vaporizeSmallFruits(2);
                } else if (area.action === 'triggerShuffle') {
                    this.shuffleFruits();
                } else if (area.action === 'triggerAntiGravity') {
                    this.debugTriggerAntiGravity();
                } else if (area.action === 'cycleSkin') {
                    this.debugCycleSkin();
                } else if (area.action === 'showStats') {
                    this.debugShowStats();
                } else if (area.action === 'togglePredictPath') {
                    this.showDropGuide = !this.showDropGuide;
                    this.showToast(`🎯 轨迹预测: ${this.showDropGuide ? '开启' : '关闭'}`);
                } else if (area.action === 'triggerArtifact') {
                    this.showBuffSelector();
                } else if (area.action === 'triggerShake') {
                    this.useSkill('shake');
                } else if (area.action === 'triggerGust') {
                    this.useSkill('gust');
                } else if (area.action === 'toggleLivingJar') {
                    CHAOS.livingJar = !CHAOS.livingJar;
                    this.showToast(`🔄 呼吸墙: ${CHAOS.livingJar ? '开启' : '关闭'}`);
                } else if (area.action === 'toggleFruitSlice') {
                    CHAOS.fruitSlice = !CHAOS.fruitSlice;
                    this.showToast(`⚔️ 切水果: ${CHAOS.fruitSlice ? '开启' : '关闭'}`);
                }
                return;
            }
        }
    }
    
    // ==================== 新增调试方法 ====================
    
    debugSpawnGravityField() {
        const x = this.gameArea.left + (this.gameArea.right - this.gameArea.left) / 2;
        const y = this.gameArea.gameOverLineY + 100;
        this.createGravityField(x, y);
        this.showToast('🌀 已生成引力场');
    }
    
    debugTriggerAntiGravity() {
        // 临时触发反重力
        const config = WEATHER.types.antiGravity;
        if (config) {
            this.currentWeather = 'antiGravity';
            this.weatherEndTime = Date.now() + (config.duration || 1500);
            this.nextWeatherTime = this.weatherEndTime + WEATHER.interval;
            this._savedPhysics.gravityY = this.world.gravity.y;
            this.setAntiGravity(config.gravityMultiplier);
            this.showToast('🔮 已触发反重力');
        }
    }
    
    debugCycleSkin() {
        const skinIds = Object.keys(SKINS);
        const currentIndex = skinIds.indexOf(this.renderer.currentSkin);
        const nextIndex = (currentIndex + 1) % skinIds.length;
        const nextSkin = skinIds[nextIndex];
        this.renderer.setSkin(nextSkin);
        this.showToast(`🎨 皮肤: ${SKINS[nextSkin].name}`);
    }
    
    debugShowStats() {
        const stats = this.getStatsSummary();
        console.log('[统计]', stats);
        this.showToast(`📊 总游戏: ${stats.totalGames} | 西瓜: ${stats.totalWatermelons}`);
    }
    
    // ==================== 调试辅助方法 ====================
    
    debugSpawnMysteryBox() {
        const x = this.gameArea.left + (this.gameArea.right - this.gameArea.left) / 2;
        const y = this.gameArea.gameOverLineY + 50;
        const level = Math.floor(Math.random() * 5);
        const fruit = FRUITS[level];
        
        const body = new Circle(x, y, fruit.radius, {
            restitution: PHYSICS.restitution,
            friction: PHYSICS.friction,
            frictionAir: PHYSICS.frictionAir,
            label: 'fruit',
            fruitLevel: level
        });
        body.isMysteryBox = true;
        body.mysteryState = 'falling';
        
        this.world.add(body);
        this.showToast('🎁 已生成盲盒');
    }
    
    debugSpawnBomb() {
        const x = this.gameArea.left + (this.gameArea.right - this.gameArea.left) / 2;
        const y = this.gameArea.gameOverLineY + 50;
        this.createBomb(x, y);
        this.showToast('💣 已生成炸弹');
    }
    
    debugSpawnIceFruit() {
        const x = this.gameArea.left + (this.gameArea.right - this.gameArea.left) / 2;
        const y = this.gameArea.gameOverLineY + 50;
        const level = Math.floor(Math.random() * 5);
        const fruit = FRUITS[level];
        
        const body = new Circle(x, y, fruit.radius, {
            restitution: PHYSICS.restitution,
            friction: PHYSICS.friction,
            frictionAir: PHYSICS.frictionAir,
            label: 'fruit',
            fruitLevel: level
        });
        body.iceState = 'frozen';
        
        this.world.add(body);
        this.showToast('🧊 已生成冰封水果');
    }
    
    debugSpawnRandomFruit() {
        const x = this.gameArea.left + (this.gameArea.right - this.gameArea.left) / 2;
        const y = this.gameArea.gameOverLineY + 50;
        const level = Math.floor(Math.random() * 11);  // 0-10
        const fruit = FRUITS[level];
        
        const body = new Circle(x, y, fruit.radius, {
            restitution: PHYSICS.restitution,
            friction: PHYSICS.friction,
            frictionAir: PHYSICS.frictionAir,
            label: 'fruit',
            fruitLevel: level
        });
        
        this.world.add(body);
        this.showToast(`🍇 已生成 ${fruit.name}`);
    }
    
    debugClearAllFruits() {
        const fruits = this.world.bodies.filter(b => b.label === 'fruit');
        for (const fruit of fruits) {
            this.world.remove(fruit);
        }
        this.showToast(`🗑️ 已清空 ${fruits.length} 个水果`);
    }
    
    // 获取调试状态信息
    getDebugState() {
        return {
            weatherEnabled: WEATHER.enabled,
            earthquakeEnabled: EARTHQUAKE.enabled,
            mysteryBoxEnabled: MYSTERY_BOX.enabled,
            iceBlockEnabled: ICE_BLOCK.enabled,
            currentWeather: this.currentWeather,
            isFeverMode: this.isFeverMode,
            comboCount: this.comboCount,
            fruitCount: this.world.bodies.filter(b => b.label === 'fruit').length,
            autoDropTime: this.autoDropDefaultTime,
            showDropGuide: this.showDropGuide,
            piercingCharges: this.piercingCharges,
            currentSkin: this.renderer ? this.renderer.currentSkin : 'classic',
            gravityFieldCount: this.gravityFields ? this.gravityFields.length : 0,
            livingJarEnabled: CHAOS.livingJar,
            fruitSliceEnabled: CHAOS.fruitSlice
        };
    }

    uploadScore() {
        if (Platform.isWechat) {
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
        // Web 环境分数已保存在本地
    }

    // ==================== 游戏循环 ====================

    start() {
        this.isRunning = true;
        this.lastTime = Date.now();
        this.onGameStart();  // 记录游戏开始
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
            
            // 更新自动下落倒计时
            this.updateAutoDropCountdown(now);
            
            // 检查 Fever 模式过期
            this.checkFeverExpiry();
            
            // 更新天气系统
            if (WEATHER.enabled) {
                this.updateWeather(now);
            }
            
            // 检查地震触发
            if (EARTHQUAKE.enabled) {
                this.checkEarthquakeTrigger();
            }
            
            // 更新盲盒
            this.updateMysteryBoxes();
            
            // 更新炸弹
            this.updateBombs();
            
            // 更新引力场
            this.updateGravityFields();

            // 呼吸墙壁
            if (CHAOS.livingJar) {
                this.updateLivingJar(now);
            }
        }

        // 更新特效
        this.updateEffects();

        // 渲染
        this.render();

        // 下一帧
        requestAnimationFrame(() => this.loop());
    }

    // 更新自动下落倒计时
    updateAutoDropCountdown(now) {
        if (!this.autoDropEnabled || !this.canDrop) return;

        const elapsed = (now - this.lastCountdownUpdate) / 1000;
        if (elapsed >= 1) {
            this.autoDropCountdown -= Math.floor(elapsed);
            this.lastCountdownUpdate = now;

            // 倒计时结束，自动投放
            if (this.autoDropCountdown <= 0) {
                this.dropFruit();
            }
        }
    }

    // 重置自动下落倒计时（根据 combo 调整）
    resetAutoDropCountdown() {
        // 基础时间 15 秒，combo 时略微缩短，最低 10 秒
        // 每次 combo 减少 0.5 秒，最多减少 5 秒
        const comboReduction = Math.min(this.comboCount * 0.5, 5);
        this.autoDropCountdown = Math.max(this.autoDropDefaultTime - comboReduction, 10);
        this.lastCountdownUpdate = Date.now();
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

        // 更新 Combo 特效
        this.comboEffects = this.comboEffects.filter(effect => {
            return now - effect.startTime < effect.duration;
        });

        // 更新爆炸特效
        this.explosionEffects = this.explosionEffects.filter(effect => {
            return now - effect.startTime < effect.duration;
        });

        // 更新冰块解冻特效
        this.iceThawEffects = this.iceThawEffects.filter(effect => {
            return now - effect.startTime < effect.duration;
        });
    }

    render() {
        const renderer = this.renderer;

        // 合并所有震动效果
        const earthquakeShake = this.getScreenShakeOffset();
        const mergeShake = this.getMergeShakeOffset();
        const shake = {
            x: earthquakeShake.x + mergeShake.x,
            y: earthquakeShake.y + mergeShake.y
        };
        
        if (shake.x !== 0 || shake.y !== 0) {
            renderer.ctx.save();
            renderer.ctx.translate(shake.x * renderer.pixelRatio, shake.y * renderer.pixelRatio);
        }
        
        // 应用 Combo 色调偏移滤镜
        if (this.comboHueShift && this.comboHueShift > 0) {
            renderer.ctx.filter = `hue-rotate(${this.comboHueShift}deg) saturate(${this.comboSaturation || 1})`;
        }

        // 清空画布
        renderer.clear();

        // 绘制背景
        renderer.drawBackground();

        // 绘制 Fever 模式背景效果
        if (this.isFeverMode) {
            const feverProgress = (Date.now() - (this.feverEndTime - FEVER.duration)) / FEVER.duration;
            renderer.drawFeverBackground(feverProgress);
        }

        // 绘制天气效果
        if (this.currentWeather) {
            renderer.drawWeatherOverlay(this.currentWeather);
        }

        // 绘制墙壁和地面
        renderer.drawWalls();

        // 绘制游戏结束线
        renderer.drawGameOverLine(this.gameArea.gameOverLineY);

        if (!this.isGameOver) {
            // 绘制投放线
            renderer.drawDropLine(this.dropX, FRUITS[this.currentFruitLevel], this.gameArea.gameOverLineY);

            // 绘制待投放水果
            const fruit = FRUITS[this.currentFruitLevel];
            const pendingRadius = this.isFeverMode ? fruit.radius * FEVER.radiusShrink : fruit.radius;
            const pendingY = this.gameArea.gameOverLineY - pendingRadius - 10;
            renderer.drawPendingFruit(
                this.dropX,
                pendingY,
                this.currentFruitLevel,
                this.nextIsMysteryBox,
                this.nextIsIceBlock,
                this.isFeverMode
            );

            // 绘制自动下落倒计时
            if (this.canDrop && this.autoDropEnabled) {
                renderer.drawAutoDropCountdown(
                    this.dropX,
                    pendingY,
                    this.autoDropCountdown,
                    this.currentFruitLevel,
                    this.autoDropDefaultTime
                );
            }
        }

        // 绘制引力场
        for (const field of this.gravityFields) {
            const progress = (Date.now() - field.startTime) / field.duration;
            renderer.drawGravityField(field.x, field.y, field.radius, field.attractRadius, progress);
        }

        // 绘制所有水果
        renderer.drawFruits(this.world.bodies);

        // 绘制合成特效
        const now = Date.now();
        for (const effect of this.mergeEffects) {
            const progress = (now - effect.startTime) / effect.duration;
            renderer.drawMergeEffect(effect.x, effect.y, effect.radius, progress);
        }

        // 绘制 Combo 特效
        for (const effect of this.comboEffects) {
            const progress = (now - effect.startTime) / effect.duration;
            renderer.drawComboEffect(effect.x, effect.y, effect.comboCount, progress);
        }

        // 绘制爆炸特效
        for (const effect of this.explosionEffects) {
            const progress = (now - effect.startTime) / effect.duration;
            renderer.drawExplosionEffect(effect.x, effect.y, progress);
        }

        // 绘制冰块解冻特效和冲击波
        for (const effect of this.iceThawEffects) {
            const progress = (now - effect.startTime) / effect.duration;
            if (effect.type === 'shockwave') {
                // 绘制冲击波
                renderer.drawIceShockwave(effect.x, effect.y, effect.radius, progress);
            }
        }

        // 绘制投影辅助线 / 动态轨迹预测
        if (this.showDropGuide && !this.isGameOver) {
            const fruit = FRUITS[this.currentFruitLevel];
            if (fruit) {
                // 计算风力影响
                let windForce = null;
                if (this.currentWeather === 'windy' && WEATHER.types.windy) {
                    windForce = { x: WEATHER.types.windy.forceX, y: WEATHER.types.windy.forceY || 0 };
                }
                
                const startY = this.gameArea.gameOverLineY - fruit.radius - 10;
                renderer.drawPredictPath(
                    this.dropX, 
                    startY, 
                    fruit.radius, 
                    this.world.gravity, 
                    windForce, 
                    this.gameArea
                );
            }
        }

        // 绘制警戒线动画
        if (this.showWarningLine && this.earthquakeTimer) {
            const progress = (now - this.earthquakeTimer) / EARTHQUAKE.triggerDelay;
            renderer.drawWarningLine(this.gameArea.gameOverLineY, progress);
        }

        // 绘制 Combo 计数器
        if (this.comboCount > 1) {
            renderer.drawComboCounter(this.comboCount, this.isFeverMode);
        }

        // 绘制天气状态指示器
        if (this.currentWeather) {
            const remaining = Math.ceil((this.weatherEndTime - now) / 1000);
            renderer.drawWeatherIndicator(this.currentWeather, remaining);
        }

        // 绘制分数
        renderer.drawScore(this.score, this.bestScore);

        // 绘制排行榜按钮
        this.rankButtonArea = renderer.drawRankButton();

        // 绘制道具栏
        this.toolbarHitAreas = renderer.drawToolbar(this.tools, this.skillCooldowns);

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
            this.debugPanelHitAreas = renderer.drawDebugPanel(this.getDebugState());
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

        // 绘制 Buff 选择面板
        if (this.showingBuffPanel) {
            this.buffPanelHitAreas = renderer.drawBuffSelector(this.buffChoices, this.buffStacks);
        }

        // 重置滤镜
        if (this.comboHueShift && this.comboHueShift > 0) {
            renderer.ctx.filter = 'none';
        }

        // 恢复屏幕震动变换
        if (shake.x !== 0 || shake.y !== 0) {
            renderer.ctx.restore();
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
            return Platform.getStorageSync('daxigua_bestScore') || 0;
        } catch (e) {
            return 0;
        }
    }

    saveBestScore() {
        try {
            Platform.setStorageSync('daxigua_bestScore', this.bestScore);
        } catch (e) {
            console.log('[游戏] 保存最高分失败');
        }
    }

    loadTools() {
        try {
            const saved = Platform.getStorageSync('daxigua_tools');
            if (saved) {
                return typeof saved === 'string' ? JSON.parse(saved) : saved;
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
            Platform.setStorageSync('daxigua_tools', JSON.stringify(this.tools));
        } catch (e) {
            console.log('[游戏] 保存道具失败');
        }
    }

    // ==================== 统计与成就系统 ====================

    /**
     * 加载已解锁的成就
     */
    loadUnlockedAchievements() {
        try {
            const saved = Platform.getStorageSync('daxigua_achievements');
            return saved ? (typeof saved === 'string' ? JSON.parse(saved) : saved) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * 保存已解锁的成就
     */
    saveUnlockedAchievements() {
        try {
            Platform.setStorageSync('daxigua_achievements', JSON.stringify(this.unlockedAchievements));
        } catch (e) {
            console.log('[成就] 保存失败');
        }
    }

    /**
     * 记录合成统计
     * @param {number} newLevel - 合成后的水果等级
     */
    recordMergeStat(newLevel) {
        // 更新总合成次数
        Platform.incrementStat('totalMerges');
        this.sessionMerges++;
        
        // 更新各水果合成次数
        const fruitMerges = Platform.getStat('fruitMerges', {});
        fruitMerges[newLevel] = (fruitMerges[newLevel] || 0) + 1;
        Platform.saveStat('fruitMerges', fruitMerges);
        
        // 如果合成了西瓜
        if (newLevel === 10) {
            Platform.incrementStat('totalWatermelons');
            this.sessionWatermelons++;
            
            // 记录最快合成西瓜时间
            if (this.gameStartTime > 0) {
                const timeToWatermelon = Math.floor((Date.now() - this.gameStartTime) / 1000);
                const currentFastest = Platform.getStat('fastestWatermelon', 9999);
                if (timeToWatermelon < currentFastest) {
                    Platform.saveStat('fastestWatermelon', timeToWatermelon);
                }
            }
        }
        
        // 检查成就
        this.checkAchievements();
    }

    /**
     * 记录连击统计
     * @param {number} comboCount - 当前连击数
     */
    recordComboStat(comboCount) {
        Platform.updateMaxStat('maxCombo', comboCount);
        this.checkAchievements();
    }

    /**
     * 游戏开始时调用
     */
    onGameStart() {
        this.gameStartTime = Date.now();
        this.sessionMerges = 0;
        this.sessionWatermelons = 0;
        Platform.incrementStat('totalGames');
    }

    /**
     * 游戏结束时调用
     */
    onGameEnd() {
        // 记录游戏时长
        if (this.gameStartTime > 0) {
            const playTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
            Platform.incrementStat('totalPlayTime', playTime);
        }
        
        // 更新最高分
        Platform.updateMaxStat('highestScore', this.score);
        
        // 检查成就
        this.checkAchievements();
    }

    /**
     * 检查并解锁成就
     */
    checkAchievements() {
        for (const achievement of ACHIEVEMENTS) {
            // 跳过已解锁的
            if (this.unlockedAchievements.includes(achievement.id)) continue;
            
            const { stat, value, compare } = achievement.condition;
            const currentValue = Platform.getStat(stat, 0);
            
            let unlocked = false;
            if (compare === 'lte') {
                unlocked = currentValue > 0 && currentValue <= value;
            } else {
                unlocked = currentValue >= value;
            }
            
            if (unlocked) {
                this.unlockAchievement(achievement);
            }
        }
    }

    /**
     * 解锁成就
     */
    unlockAchievement(achievement) {
        this.unlockedAchievements.push(achievement.id);
        this.saveUnlockedAchievements();
        this.newAchievements.push(achievement);
        
        // 显示成就解锁提示
        this.showToast(`🏆 成就解锁: ${achievement.name}`);
        this.playSound('success');
        
        console.log(`[成就] 解锁: ${achievement.name}`);
    }

    /**
     * 获取统计摘要
     */
    getStatsSummary() {
        return {
            totalGames: Platform.getStat('totalGames', 0),
            totalMerges: Platform.getStat('totalMerges', 0),
            totalWatermelons: Platform.getStat('totalWatermelons', 0),
            maxCombo: Platform.getStat('maxCombo', 0),
            highestScore: Platform.getStat('highestScore', 0),
            fastestWatermelon: Platform.getStat('fastestWatermelon', 0),
            totalPlayTime: Platform.getStat('totalPlayTime', 0),
            fruitMerges: Platform.getStat('fruitMerges', {}),
            unlockedAchievements: this.unlockedAchievements.length,
            totalAchievements: ACHIEVEMENTS.length
        };
    }

    /**
     * 显示统计面板
     */
    showStatsPanel() {
        this.showingStatsPanel = true;
        this.isPaused = true;
    }

    /**
     * 隐藏统计面板
     */
    hideStatsPanel() {
        this.showingStatsPanel = false;
        this.isPaused = false;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
} else if (typeof window !== 'undefined') {
    window.Game = Game;
}

})(); // 关闭 IIFE
