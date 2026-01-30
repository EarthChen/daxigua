# 🍉 《合成大西瓜：增强版》功能扩展执行计划

本计划旨在通过**物理干预、风险博弈、动态节奏**三个维度，对基础版《合成大西瓜》进行升级，使其具备更高的随机性与策略深度。

---

## 一、 动态节奏与爽感系统 (Combo & Fever)
**目标：** 强化合成反馈，让连续操作产生即时奖励。

### 1.1 Combo 连击判定

#### 1.1.1 数据结构设计 (`config.js`)
```javascript
// 新增 COMBO 配置
const COMBO = {
    windowMs: 1500,           // Combo 有效窗口时间（毫秒）
    scoreMultiplier: 0.5,     // 每次连击增加的分数倍率
    maxCombo: 20,             // 最大连击数上限
    feverThreshold: 5,        // 触发 Fever 模式的连击数
    resetOnDrop: false        // 投放新水果时是否重置连击
};
```

#### 1.1.2 Game 类状态扩展 (`game.js`)
```javascript
// 在 constructor 中添加
this.comboCount = 0;              // 当前连击数
this.lastMergeTime = 0;           // 上次合成时间戳
this.comboEffects = [];           // Combo 特效队列
this.isFeverMode = false;         // 是否处于 Fever 模式
this.feverEndTime = 0;            // Fever 模式结束时间
```

#### 1.1.3 核心方法实现
```javascript
// 在 mergeFruits() 方法中调用
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

// 计算带连击加成的分数
calculateMergeScore(baseScore) {
    const multiplier = 1 + (this.comboCount - 1) * COMBO.scoreMultiplier;
    return Math.floor(baseScore * multiplier);
}
```

#### 1.1.4 视觉反馈 (`renderer.js`)
```javascript
// 新增 Combo 特效绘制方法
drawComboEffect(x, y, comboCount, progress) {
    // 弹出式 "Combo xN" 动画
    const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
    const alpha = 1 - progress;
    const yOffset = -50 * progress;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${24 * scale * pr}px Arial`;
    ctx.fillStyle = this.getComboColor(comboCount);  // 根据连击数变色
    ctx.fillText(`Combo x${comboCount}`, x * pr, (y + yOffset) * pr);
    ctx.restore();
}

// Combo 颜色渐变（白→黄→橙→红）
getComboColor(count) {
    if (count < 3) return '#ffffff';
    if (count < 5) return '#ffeb3b';
    if (count < 8) return '#ff9800';
    return '#f44336';
}
```

#### 1.1.5 音效增强 (`soundSystem.js`)
```javascript
// 修改 play() 方法支持 Pitch 变化
playMerge(comboCount) {
    const audio = this.sounds['merge'];
    if (audio) {
        // Pitch 随连击数升高（1.0 → 1.5）
        const pitchRate = Math.min(1.0 + comboCount * 0.05, 1.5);
        audio.playbackRate = pitchRate;
        audio.currentTime = 0;
        audio.play();
    }
}
```

---

### 1.2 Fever Mode (狂热模式)

#### 1.2.1 配置参数
```javascript
const FEVER = {
    duration: 6000,           // 持续时间（毫秒）
    radiusShrink: 0.85,       // 碰撞体缩小比例
    dropCooldown: 0,          // 投放冷却时间
    bgEffect: 'pulse',        // 背景特效类型
    particleCount: 30         // 粒子数量
};
```

#### 1.2.2 核心逻辑
```javascript
activateFeverMode() {
    this.isFeverMode = true;
    this.feverEndTime = Date.now() + FEVER.duration;
    
    // 暂存原始物理参数
    this._originalDropCooldown = RULES.dropCooldown;
    RULES.dropCooldown = FEVER.dropCooldown;
    
    // 缩小所有水果碰撞体
    for (const body of this.world.bodies) {
        if (body.label === 'fruit') {
            body._originalRadius = body.radius;
            body.radius *= FEVER.radiusShrink;
        }
    }
    
    this.showToast('🔥 FEVER MODE!');
    this.playSound('fever_start');
}

deactivateFeverMode() {
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
}

// 在 loop() 中检查
checkFeverExpiry() {
    if (this.isFeverMode && Date.now() > this.feverEndTime) {
        this.deactivateFeverMode();
    }
}
```

#### 1.2.3 Fever 视觉特效
```javascript
// 背景脉冲效果
drawFeverBackground(progress) {
    const pulseAlpha = 0.1 + Math.sin(progress * Math.PI * 4) * 0.05;
    ctx.fillStyle = `rgba(255, 100, 0, ${pulseAlpha})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 边缘火焰粒子
    this.drawFeverParticles();
}
```

---

## 二、 物理环境干扰 (Random Events)
**目标：** 打破静态堆积的沉闷，引入外部变量。

### 2.1 随机天气控制器

#### 2.1.1 天气系统配置
```javascript
const WEATHER = {
    interval: 60000,          // 天气切换间隔（毫秒）
    duration: 15000,          // 单次天气持续时间
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
```

#### 2.1.2 天气控制器类 (`weatherController.js` - 新文件)
```javascript
/**
 * 天气控制器 - 管理随机天气事件
 */
class WeatherController {
    constructor(game) {
        this.game = game;
        this.currentWeather = null;
        this.weatherEndTime = 0;
        this.nextWeatherTime = Date.now() + WEATHER.interval;
        this._savedPhysics = {};
    }
    
    update(now) {
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
        const weatherType = this.weightedRandom(types);
        this.currentWeather = weatherType;
        this.weatherEndTime = Date.now() + WEATHER.duration;
        this.nextWeatherTime = this.weatherEndTime + WEATHER.interval;
        
        // 保存原始物理参数
        this._savedPhysics = {
            friction: PHYSICS.friction,
            restitution: PHYSICS.restitution
        };
        
        // 应用天气效果
        const config = WEATHER.types[weatherType];
        if (config.friction !== undefined) {
            this.setFriction(config.friction);
        }
        if (config.restitution !== undefined) {
            this.setRestitution(config.restitution);
        }
        
        this.game.showToast(`${config.icon} ${config.name}来袭！`);
    }
    
    applyWindForce() {
        const config = WEATHER.types.windy;
        for (const body of this.game.world.bodies) {
            if (body.label === 'fruit' && !body.isStatic) {
                body.wake();  // 唤醒休眠的刚体！
                body.applyForce(new Vector(config.forceX, config.forceY));
            }
        }
    }
    
    setFriction(value) {
        for (const body of this.game.world.bodies) {
            if (body.label === 'fruit') {
                body.friction = value;
            }
        }
    }
    
    setRestitution(value) {
        for (const body of this.game.world.bodies) {
            if (body.label === 'fruit') {
                body.restitution = value;
            }
        }
    }
    
    endWeather() {
        // 恢复原始物理参数
        this.setFriction(this._savedPhysics.friction);
        this.setRestitution(this._savedPhysics.restitution);
        this.currentWeather = null;
        this.game.showToast('天气恢复正常');
    }
    
    weightedRandom(types) {
        const roll = Math.random();
        let cumulative = 0;
        for (const type of types) {
            cumulative += WEATHER.types[type].probability;
            if (roll < cumulative) return type;
        }
        return types[types.length - 1];
    }
}

module.exports = WeatherController;
```

#### 2.1.3 天气视觉效果 (`renderer.js`)
```javascript
drawWeatherOverlay(weatherType) {
    switch (weatherType) {
        case 'windy':
            this.drawWindParticles();  // 飘动的线条/树叶
            break;
        case 'slippery':
            this.drawRainDrops();      // 下落的雨滴
            break;
        case 'icy':
            this.drawSnowflakes();     // 飘落的雪花
            this.drawFrostOverlay();   // 边缘霜冻效果
            break;
    }
}

// 风的视觉表现
drawWindParticles() {
    // 斜线粒子从右向左飘动
    for (let i = 0; i < 20; i++) {
        const x = (this.windOffset + i * 50) % this.width;
        const y = i * 40;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x * pr, y * pr);
        ctx.lineTo((x - 30) * pr, (y + 20) * pr);
        ctx.stroke();
    }
    this.windOffset = (this.windOffset + 3) % 50;
}

// 雨滴效果
drawRainDrops() {
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
    ctx.lineWidth = 2 * pr;
    for (let i = 0; i < 30; i++) {
        const x = (this.rainOffset + i * 30) % this.width;
        const y = ((Date.now() / 10) + i * 40) % this.height;
        ctx.beginPath();
        ctx.moveTo(x * pr, y * pr);
        ctx.lineTo((x - 5) * pr, (y + 15) * pr);
        ctx.stroke();
    }
}

// 雪花效果
drawSnowflakes() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const time = Date.now() / 1000;
    for (let i = 0; i < 40; i++) {
        const x = (Math.sin(time + i) * 20 + i * 20) % this.width;
        const y = ((time * 30) + i * 25) % this.height;
        const size = 3 + Math.sin(i) * 2;
        ctx.beginPath();
        ctx.arc(x * pr, y * pr, size * pr, 0, Math.PI * 2);
        ctx.fill();
    }
}
```

---

### 2.2 紧急震动 (Earthquake)

#### 2.2.1 配置参数
```javascript
const EARTHQUAKE = {
    triggerDelay: 2000,       // 超线后触发延迟（毫秒）
    impulseStrength: 8,       // 向上冲量强度
    cooldown: 10000,          // 两次震动间隔
    screenShake: {
        duration: 500,
        intensity: 10
    }
};
```

#### 2.2.2 核心实现
```javascript
// 在 Game 类中添加
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
            body.wake();  // 关键：唤醒休眠刚体
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

// 屏幕震动效果
startScreenShake() {
    this.screenShake = {
        startTime: Date.now(),
        duration: EARTHQUAKE.screenShake.duration,
        intensity: EARTHQUAKE.screenShake.intensity
    };
}

// 在 render() 开头应用
applyScreenShake() {
    if (!this.screenShake) return { x: 0, y: 0 };
    
    const elapsed = Date.now() - this.screenShake.startTime;
    if (elapsed > this.screenShake.duration) {
        this.screenShake = null;
        return { x: 0, y: 0 };
    }
    
    const progress = elapsed / this.screenShake.duration;
    const decay = 1 - progress;  // 衰减
    const intensity = this.screenShake.intensity * decay;
    
    return {
        x: (Math.random() - 0.5) * intensity * 2,
        y: (Math.random() - 0.5) * intensity * 2
    };
}
```

#### 2.2.3 警戒线预警动画
```javascript
drawWarningLine(y, progress) {
    // 闪烁的红色警戒线
    const alpha = 0.3 + Math.sin(progress * Math.PI * 6) * 0.3;
    
    ctx.save();
    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.lineWidth = 4 * pr;
    ctx.setLineDash([15 * pr, 10 * pr]);
    ctx.beginPath();
    ctx.moveTo(this.gameArea.left * pr, y * pr);
    ctx.lineTo(this.gameArea.right * pr, y * pr);
    ctx.stroke();
    
    // 文字警告
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.font = `bold ${14 * pr}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ 危险！', (this.width / 2) * pr, (y - 15) * pr);
    ctx.restore();
}
```

---

## 三、 深度博弈：特种实体 (Special Entities)
**目标：** 增加中后期的挑战性与策略选择。

### 3.1 盲盒果实 (Mystery Box)

#### 3.1.1 配置参数
```javascript
const MYSTERY_BOX = {
    spawnChance: 0.05,        // 每次生成水果时的出现概率
    results: {
        evolve: { chance: 0.05, levelBonus: 3 },
        bomb: { chance: 0.10, fuseTime: 3000, blastRadius: 100 },
        random: { chance: 0.85, levelRange: [0, 3] }
    },
    triggerDelay: 500         // 落地后判定延迟
};
```

#### 3.1.2 盲盒状态机
```javascript
// 扩展 Circle 类或使用标记
const MysteryBoxState = {
    FALLING: 'falling',       // 下落中
    REVEALING: 'revealing',   // 揭示中（动画）
    RESOLVED: 'resolved'      // 已转化
};

// 在 Game 类中添加盲盒处理
handleMysteryBox(body) {
    if (body.mysteryState !== MysteryBoxState.FALLING) return;
    
    // 检查是否落地（速度接近0且接触地面/其他水果）
    if (body.velocity.lengthSq() < 1 && this.isBodyGrounded(body)) {
        body.mysteryState = MysteryBoxState.REVEALING;
        
        setTimeout(() => {
            this.resolveMysteryBox(body);
        }, MYSTERY_BOX.triggerDelay);
    }
}

resolveMysteryBox(body) {
    const roll = Math.random();
    let result;
    
    if (roll < MYSTERY_BOX.results.evolve.chance) {
        // 进化为高级水果
        const newLevel = Math.min(body.fruitLevel + 3, 10);
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
    body.radius = newFruit.radius;
    body.fruitLevel = newLevel;
    body.isMysteryBox = false;
    body.mysteryState = MysteryBoxState.RESOLVED;
    
    // 播放转化特效
    this.mergeEffects.push({
        x: body.position.x,
        y: body.position.y,
        radius: newFruit.radius,
        type: 'transform',
        startTime: Date.now(),
        duration: 400
    });
}
```

#### 3.1.3 盲盒渲染
```javascript
drawMysteryBox(x, y, radius) {
    const ctx = this.ctx;
    const pr = this.pixelRatio;
    
    // 绘制木箱外观
    ctx.fillStyle = '#8B4513';  // 木色
    ctx.fillRect((x - radius) * pr, (y - radius) * pr, radius * 2 * pr, radius * 2 * pr);
    
    // 木纹
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2 * pr;
    for (let i = 0; i < 3; i++) {
        const lineY = y - radius + radius * 0.5 * (i + 1);
        ctx.beginPath();
        ctx.moveTo((x - radius) * pr, lineY * pr);
        ctx.lineTo((x + radius) * pr, lineY * pr);
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
    ctx.fill();
}
```

---

### 3.2 炸弹实体 (Bomb)

#### 3.2.1 配置参数
```javascript
const BOMB = {
    fuseTime: 3000,           // 引爆时间
    blastRadius: 120,         // 爆炸半径
    blastForce: 15,           // 爆炸冲量
    destroyRadius: 60,        // 销毁半径（范围内水果直接消失）
    scoreBonus: 50            // 每销毁一个水果的分数
};
```

#### 3.2.2 炸弹逻辑
```javascript
createBomb(x, y) {
    const bomb = new Circle(x, y, 35, {
        restitution: 0.1,
        friction: 0.5,
        label: 'bomb'
    });
    bomb.isBomb = true;
    bomb.fuseStartTime = Date.now();
    bomb.exploded = false;
    
    this.world.add(bomb);
}

updateBombs() {
    for (const body of this.world.bodies) {
        if (!body.isBomb || body.exploded) continue;
        
        const elapsed = Date.now() - body.fuseStartTime;
        if (elapsed >= BOMB.fuseTime) {
            this.explodeBomb(body);
        }
    }
}

explodeBomb(bomb) {
    bomb.exploded = true;
    const center = bomb.position;
    let destroyedCount = 0;
    
    for (const body of this.world.bodies) {
        if (body === bomb || body.label !== 'fruit') continue;
        
        const dx = body.position.x - center.x;
        const dy = body.position.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < BOMB.destroyRadius) {
            // 直接销毁
            this.world.remove(body);
            destroyedCount++;
        } else if (dist < BOMB.blastRadius) {
            // 施加爆炸冲量
            body.wake();
            const force = BOMB.blastForce * (1 - dist / BOMB.blastRadius);
            const direction = new Vector(dx, dy).normalize();
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
        duration: 600
    });
    
    this.playSound('explosion');
    this.world.remove(bomb);
}
```

#### 3.2.3 炸弹渲染
```javascript
drawBomb(x, y, radius, fuseProgress) {
    const ctx = this.ctx;
    const pr = this.pixelRatio;
    
    // 炸弹主体
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x * pr, y * pr, radius * pr, 0, Math.PI * 2);
    ctx.fill();
    
    // 引信
    const fuseX = x + radius * 0.6;
    const fuseY = y - radius * 0.6;
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3 * pr;
    ctx.beginPath();
    ctx.moveTo(x * pr, (y - radius * 0.3) * pr);
    ctx.quadraticCurveTo(fuseX * pr, (fuseY - 10) * pr, fuseX * pr, fuseY * pr);
    ctx.stroke();
    
    // 火花（闪烁）
    if (fuseProgress > 0.5) {
        const sparkAlpha = Math.sin(Date.now() / 50) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, ${150 - fuseProgress * 100}, 0, ${sparkAlpha})`;
        ctx.beginPath();
        ctx.arc(fuseX * pr, fuseY * pr, 8 * pr, 0, Math.PI * 2);
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
```

---

### 3.3 冰封果实 (Ice Block)

#### 3.3.1 配置参数
```javascript
const ICE_BLOCK = {
    spawnChance: 0.08,        // 出现概率
    thawRadius: 80,           // 解冻触发半径（相邻合成范围）
    visualAlpha: 0.6          // 冰层透明度
};
```

#### 3.3.2 冰封状态机
```javascript
const IceState = {
    FROZEN: 'frozen',         // 冰封状态
    THAWING: 'thawing',       // 解冻动画中
    NORMAL: 'normal'          // 正常状态
};

// 在碰撞检测中跳过冰封水果
handleCollisions() {
    // ... 在合成检测中添加
    if (bodyA.iceState === IceState.FROZEN || bodyB.iceState === IceState.FROZEN) {
        continue;  // 冰封水果不参与合成
    }
}

// 检查解冻条件
checkIceThaw(mergePosition) {
    for (const body of this.world.bodies) {
        if (body.iceState !== IceState.FROZEN) continue;
        
        const dx = body.position.x - mergePosition.x;
        const dy = body.position.y - mergePosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < ICE_BLOCK.thawRadius) {
            this.thawIceBlock(body);
        }
    }
}

thawIceBlock(body) {
    body.iceState = IceState.THAWING;
    
    // 播放解冻动画
    this.iceThawEffects.push({
        body: body,
        startTime: Date.now(),
        duration: 500
    });
    
    setTimeout(() => {
        body.iceState = IceState.NORMAL;
        this.showToast('🧊 冰块解冻！');
    }, 500);
}
```

#### 3.3.3 冰封渲染
```javascript
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
```

---

## 四、 局外成长与局内 Buff (Roguelike Elements)
**目标：** 提升重复游玩的欲望。

### 4.1 局内三选一 Buff 系统

#### 4.1.1 Buff 配置
```javascript
const BUFFS = {
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
```

#### 4.1.2 Buff 选择面板
```javascript
// 在 mergeFruits() 中检测大西瓜合成
if (newLevel === 10) {
    this.showBuffSelector();
}

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
    return this.shuffleArray(available).slice(0, count);
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
    }
    
    // 记录 Buff
    this.activeBuffs[buff.id] = true;
    this.buffStacks[buff.id] = (this.buffStacks[buff.id] || 0) + 1;
    
    this.hideBuffSelector();
    this.showToast(`${buff.icon} ${buff.name} 已激活！`);
}
```

#### 4.1.3 Buff 效果实现
```javascript
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

// 在 render() 中绘制投影辅助线
drawDropGuide(x, fruitRadius) {
    if (!this.showDropGuide) return;
    
    const ctx = this.ctx;
    const pr = this.pixelRatio;
    
    ctx.save();
    ctx.setLineDash([5 * pr, 5 * pr]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2 * pr;
    ctx.beginPath();
    ctx.moveTo(x * pr, this.gameArea.gameOverLineY * pr);
    ctx.lineTo(x * pr, this.gameArea.groundY * pr);
    ctx.stroke();
    
    // 落点圆圈
    ctx.beginPath();
    ctx.arc(x * pr, (this.gameArea.groundY - fruitRadius) * pr, 
            fruitRadius * pr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    ctx.restore();
}
```

#### 4.1.4 Buff 选择面板 UI
```javascript
drawBuffSelector(choices) {
    const ctx = this.ctx;
    const pr = this.pixelRatio;
    
    // 遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 标题
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${28 * pr}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('🍉 大西瓜！选择奖励', (this.width / 2) * pr, 120 * pr);
    
    // 三个选项卡片
    const cardWidth = 90;
    const cardHeight = 140;
    const gap = 15;
    const startX = (this.width - (cardWidth * 3 + gap * 2)) / 2;
    const startY = 180;
    
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
        ctx.fillText(buff.icon, (x + cardWidth / 2) * pr, (y + 40) * pr);
        
        // 名称
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 * pr}px Arial`;
        ctx.fillText(buff.name, (x + cardWidth / 2) * pr, (y + 75) * pr);
        
        // 描述
        ctx.fillStyle = '#a0aec0';
        ctx.font = `${11 * pr}px Arial`;
        ctx.fillText(buff.description, (x + cardWidth / 2) * pr, (y + 100) * pr);
        
        // 层数（如果可叠加）
        if (buff.stackable) {
            const stacks = this.game.buffStacks[buff.id] || 0;
            ctx.fillStyle = '#68d391';
            ctx.font = `${10 * pr}px Arial`;
            ctx.fillText(`${stacks}/${buff.maxStacks}`, 
                        (x + cardWidth / 2) * pr, (y + 120) * pr);
        }
        
        hitAreas.push({
            buffId: buff.id,
            x, y, width: cardWidth, height: cardHeight
        });
    });
    
    return hitAreas;
}
```

---

## 五、 开发路线图 (Roadmap) - 细化版

| 阶段 | 核心任务 | 涉及文件 | 预估代码量 | 难度 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0.1** | Combo 数据结构与计算逻辑 | `config.js`, `game.js` | ~80 行 | ⭐ | 极高 |
| **P0.2** | Combo UI 特效（弹出动画） | `renderer.js` | ~60 行 | ⭐ | 极高 |
| **P0.3** | Combo 音效 Pitch 变化 | `soundSystem.js` | ~20 行 | ⭐ | 极高 |
| **P1.1** | Fever 模式核心逻辑 | `game.js` | ~100 行 | ⭐⭐ | 高 |
| **P1.2** | Fever 视觉特效 | `renderer.js` | ~80 行 | ⭐⭐ | 高 |
| **P2.1** | 天气控制器架构 | `weatherController.js` (新) | ~150 行 | ⭐⭐ | 高 |
| **P2.2** | 天气视觉效果 | `renderer.js` | ~120 行 | ⭐⭐ | 中 |
| **P2.3** | 地震系统 | `game.js` | ~80 行 | ⭐⭐ | 中 |
| **P3.1** | 盲盒果实逻辑 | `game.js` | ~100 行 | ⭐⭐⭐ | 中 |
| **P3.2** | 炸弹实体 | `game.js` | ~100 行 | ⭐⭐⭐ | 中 |
| **P3.3** | 冰封果实 | `game.js`, `renderer.js` | ~120 行 | ⭐⭐⭐ | 中 |
| **P4.1** | Buff 系统架构 | `game.js`, `config.js` | ~150 行 | ⭐⭐ | 低 |
| **P4.2** | Buff 选择 UI | `renderer.js` | ~100 行 | ⭐⭐ | 低 |

---

## 六、 新增资源需求

### 6.1 音效文件
| 文件名 | 用途 | 时长建议 |
| :--- | :--- | :--- |
| `fever_start.mp3` | Fever 模式激活 | 0.5-1s |
| `fever_loop.mp3` | Fever 背景循环 | 5-8s（循环） |
| `earthquake.mp3` | 地震触发 | 1s |
| `explosion.mp3` | 炸弹爆炸 | 0.8s |
| `ice_crack.mp3` | 冰块解冻 | 0.5s |
| `buff_select.mp3` | Buff 选择确认 | 0.3s |

### 6.2 图片资源
| 文件名 | 用途 | 尺寸建议 |
| :--- | :--- | :--- |
| `mystery_box.png` | 盲盒果实 | 128x128 |
| `bomb.png` | 炸弹 | 128x128 |
| `ice_overlay.png` | 冰层叠加（可选） | 256x256 |
| `weather_icons.png` | 天气图标精灵图 | 192x64 (3x64) |

---

## 七、 测试清单

### 7.1 Combo 系统测试
- [ ] 1.5秒内连续合成，Combo 正确累加
- [ ] 超过 1.5秒未合成，Combo 重置为 1
- [ ] 分数倍率计算正确
- [ ] Combo 特效动画流畅
- [ ] 音效 Pitch 随 Combo 升高

### 7.2 Fever 模式测试
- [ ] Combo >= 5 时正确触发
- [ ] 水果碰撞体缩小生效
- [ ] 投放冷却时间为 0
- [ ] 持续时间结束后正确恢复
- [ ] 背景特效正常显示

### 7.3 天气系统测试
- [ ] 60秒自动切换天气
- [ ] 大风：水果受到水平力
- [ ] 梅雨：摩擦力降低
- [ ] 霜冻：弹性降低
- [ ] 天气结束后参数恢复
- [ ] 休眠刚体被正确唤醒

### 7.4 特殊实体测试
- [ ] 盲盒按概率正确转化
- [ ] 炸弹倒计时准确
- [ ] 炸弹爆炸范围正确
- [ ] 冰封水果不参与合成
- [ ] 相邻合成触发解冻

### 7.5 Buff 系统测试
- [ ] 合成大西瓜触发选择面板
- [ ] 三个 Buff 随机且不重复
- [ ] 扩容效果正确（墙壁移动）
- [ ] 软化效果正确（重力降低）
- [ ] 精准效果正确（投影线显示）
- [ ] 可叠加 Buff 层数正确

---

## 八、 代码架构建议

### 8.1 新增文件结构
```
wechat-minigame/
├── js/
│   ├── game.js           # 主游戏逻辑（扩展 Combo、Fever、Earthquake）
│   ├── config.js         # 配置（新增 COMBO、FEVER、WEATHER 等）
│   ├── physics.js        # 物理引擎（无需大改）
│   ├── renderer.js       # 渲染器（扩展特效绘制）
│   ├── soundSystem.js    # 音效系统（扩展 Pitch 控制）
│   ├── weatherController.js  # 【新增】天气控制器
│   ├── specialEntities.js    # 【新增】特殊实体管理
│   └── buffSystem.js         # 【新增】Buff 系统
```

### 8.2 模块依赖关系
```
game.js
├── physics.js
├── renderer.js
├── soundSystem.js
├── config.js
├── weatherController.js
├── specialEntities.js
└── buffSystem.js
```

---

## 💡 开发 Tips

1. **物理引擎注意事项**
   - 在实现**震动 (Earthquake)** 或 **大风** 时，必须对已经 `Sleep` 的物理刚体执行 `wake()` 操作
   - 修改物理参数（如 friction、restitution）时需要遍历所有现有水果

2. **性能优化建议**
   - 粒子特效使用对象池复用
   - 天气视觉效果使用离屏 Canvas 预渲染
   - 避免在 render 循环中创建新对象

3. **调试技巧**
   - 在 DEBUG_CONFIG 中添加快捷键触发各种事件
   - 添加 Combo/Fever/Weather 状态显示面板

4. **代码组织建议**
   - 将特殊实体逻辑抽取到 `specialEntities.js`
   - 将天气系统独立为 `weatherController.js`
   - 将 Buff 系统独立为 `buffSystem.js`

5. **微信小游戏适配**
   - 所有新增音效需在 `soundSystem.js` 中预加载
   - 新增图片资源需确保路径正确且体积优化
   - 考虑低端设备的性能，特效粒子数可配置化
