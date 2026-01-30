/**
 * 游戏引擎 Hook
 * 管理物理世界、游戏循环、碰撞检测
 * 
 * 遵循最佳实践：
 * - rerender-use-ref-transient-values: 高频更新数据使用 ref
 * - advanced-event-handler-refs: 事件处理器存储在 ref 中
 */
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Vector, Circle, Rectangle, World } from '../game/physics';
import {
  FRUITS, PHYSICS, GAME_AREA, RULES, COMBO, FEVER, WEATHER, EARTHQUAKE,
  MYSTERY_BOX, BOMB, ICE_BLOCK,
} from '../game/config';

/**
 * 游戏引擎 Hook
 * @param {Object} params - 配置参数
 * @param {HTMLCanvasElement} params.canvas - Canvas 元素
 * @param {number} params.width - 游戏宽度
 * @param {number} params.height - 游戏高度
 * @param {Function} params.onScoreChange - 分数变化回调
 * @param {Function} params.onComboChange - Combo 变化回调
 * @param {Function} params.onGameOver - 游戏结束回调
 * @param {Function} params.playSound - 播放音效回调
 */
export function useGameEngine({
  canvas,
  width,
  height,
  onScoreChange,
  onComboChange,
  onFeverChange,
  onWeatherChange,
  onGameOver,
  onShowBuffPanel,
  playSound,
}) {
  // ==================== Refs（高频数据） ====================
  const worldRef = useRef(null);
  const gameLoopRef = useRef(null);
  const stateRef = useRef({
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    dropX: width / 2,
    currentFruitLevel: 0,
    canDrop: true,
    lastDropTime: 0,
    nextFruitIsMysteryBox: false,
    nextFruitIsIceBlock: false,
    
    // 自动下落倒计时
    autoDropCountdown: RULES.autoDropTime,
    lastAutoDropUpdate: Date.now(),
    
    // Combo & Fever
    comboCount: 0,
    lastMergeTime: 0,
    isFeverMode: false,
    feverEndTime: 0,
    
    // Weather
    currentWeather: null,
    weatherEndTime: 0,
    nextWeatherTime: Date.now() + (WEATHER.firstDelay || 10000),
    
    // Earthquake
    earthquakeTimer: null,
    lastEarthquakeTime: 0,
    screenShake: { x: 0, y: 0 },
    screenShakeEndTime: 0,
    
    // Effects
    mergeEffects: [],
    comboEffects: [],
    explosionEffects: [],
    feverParticles: [],
    weatherParticles: [],
    
    // Buffs
    activeBuffs: {},
    containerWidthBonus: 0,
    gravityMultiplier: 1,
    showDropGuide: false,
  });

  // 游戏区域计算
  const gameArea = useMemo(() => ({
    left: width * GAME_AREA.sideMargin + 20,
    right: width * (1 - GAME_AREA.sideMargin) - 20,
    top: height * GAME_AREA.topMargin,
    bottom: height * (1 - GAME_AREA.bottomMargin),
    groundY: height * (1 - GAME_AREA.bottomMargin),
    gameOverLineY: height * RULES.gameOverLineY,
  }), [width, height]);

  // ==================== 初始化物理世界 ====================
  const initWorld = useCallback(() => {
    const world = new World({ gravity: PHYSICS.gravity });
    worldRef.current = world;

    // 创建墙壁和地面
    const ga = gameArea;
    const wallThickness = GAME_AREA.wallThickness;

    // 地面
    world.add(new Rectangle(
      width / 2,
      ga.groundY + wallThickness / 2,
      width,
      wallThickness,
      { label: 'ground' }
    ));

    // 左墙
    world.add(new Rectangle(
      ga.left - wallThickness / 2,
      height / 2,
      wallThickness,
      height,
      { label: 'leftWall' }
    ));

    // 右墙
    world.add(new Rectangle(
      ga.right + wallThickness / 2,
      height / 2,
      wallThickness,
      height,
      { label: 'rightWall' }
    ));

    return world;
  }, [width, height, gameArea]);

  // ==================== 生成水果 ====================
  const generateNextFruit = useCallback(() => {
    const state = stateRef.current;
    
    // 随机决定是否生成特殊果实
    if (MYSTERY_BOX.enabled && Math.random() < MYSTERY_BOX.spawnChance) {
      state.nextFruitIsMysteryBox = true;
      state.nextFruitIsIceBlock = false;
    } else if (ICE_BLOCK.enabled && Math.random() < ICE_BLOCK.spawnChance) {
      state.nextFruitIsMysteryBox = false;
      state.nextFruitIsIceBlock = true;
    } else {
      state.nextFruitIsMysteryBox = false;
      state.nextFruitIsIceBlock = false;
    }
    
    // 随机选择水果等级
    state.currentFruitLevel = Math.floor(Math.random() * Math.min(RULES.maxFruitLevel + 1, 5));
  }, []);

  // ==================== 投放水果 ====================
  const dropFruit = useCallback(() => {
    const state = stateRef.current;
    const world = worldRef.current;
    
    if (!state.canDrop || state.isGameOver || state.isPaused || !world) return false;

    const now = Date.now();
    const cooldown = state.isFeverMode ? FEVER.dropCooldown : RULES.dropCooldown;
    if (now - state.lastDropTime < cooldown) return false;

    const level = state.currentFruitLevel;
    const fruit = FRUITS[level];
    let radius = fruit.radius;
    
    // Fever 模式缩小水果
    if (state.isFeverMode) {
      radius *= FEVER.radiusShrink;
    }

    // 创建水果刚体
    const body = new Circle(
      state.dropX,
      gameArea.top + radius + 10,
      radius,
      {
        label: 'fruit',
        fruitLevel: level,
        isMysteryBox: state.nextFruitIsMysteryBox,
        mysteryState: state.nextFruitIsMysteryBox ? 'falling' : null,
        iceState: state.nextFruitIsIceBlock ? 'frozen' : null,
        createdAt: Date.now(),
      }
    );

    world.add(body);
    state.lastDropTime = now;
    state.canDrop = false;
    
    // 重置自动下落倒计时
    state.autoDropCountdown = RULES.autoDropTime;
    state.lastAutoDropUpdate = now;

    // 播放音效
    playSound?.('drop');

    // 重新启用投放
    setTimeout(() => {
      stateRef.current.canDrop = true;
    }, cooldown);

    // 生成下一个水果
    generateNextFruit();

    return true;
  }, [gameArea, generateNextFruit, playSound]);

  // ==================== 合成水果 ====================
  const mergeFruits = useCallback((bodyA, bodyB, world) => {
    const state = stateRef.current;
    if (!bodyA || !bodyB || bodyA.isRemoved || bodyB.isRemoved) return;

    const level = bodyA.fruitLevel;
    if (level >= 10) return; // 大西瓜不能再合成

    // 冰封水果检查
    if (bodyA.iceState === 'frozen' || bodyB.iceState === 'frozen') return;

    // 计算新位置
    const newX = (bodyA.position.x + bodyB.position.x) / 2;
    const newY = (bodyA.position.y + bodyB.position.y) / 2;

    // 移除旧水果
    world.remove(bodyA);
    world.remove(bodyB);
    bodyA.isRemoved = true;
    bodyB.isRemoved = true;

    // 创建新水果
    const newLevel = level + 1;
    const newFruit = FRUITS[newLevel];
    let newRadius = newFruit.radius;
    
    if (state.isFeverMode) {
      newRadius *= FEVER.radiusShrink;
    }

    const newBody = new Circle(newX, newY, newRadius, {
      label: 'fruit',
      fruitLevel: newLevel,
    });
    world.add(newBody);

    // 更新 Combo
    const now = Date.now();
    if (now - state.lastMergeTime < COMBO.windowMs) {
      state.comboCount = Math.min(state.comboCount + 1, COMBO.maxCombo);
    } else {
      state.comboCount = 1;
    }
    state.lastMergeTime = now;
    onComboChange?.(state.comboCount);

    // 计算分数
    const baseScore = newFruit.score;
    const comboBonus = state.comboCount > 1 
      ? Math.floor(baseScore * (state.comboCount - 1) * COMBO.scoreMultiplier)
      : 0;
    const totalScore = baseScore + comboBonus;
    
    state.score += totalScore;
    onScoreChange?.(state.score);

    // 添加合成特效
    state.mergeEffects.push({
      x: newX,
      y: newY,
      radius: newRadius,
      alpha: 1,
      score: totalScore,
    });

    // Combo 特效
    if (state.comboCount > 1) {
      state.comboEffects.push({
        x: newX,
        y: newY - 30,
        text: `${state.comboCount} COMBO!`,
        alpha: 1,
        scale: 1,
      });
    }

    // 播放音效（带 Pitch）
    playSound?.('merge', state.comboCount);

    // 检查 Fever 激活
    if (!state.isFeverMode && state.comboCount >= COMBO.feverThreshold) {
      activateFeverMode();
    }

    // 合成大西瓜触发 Buff 选择
    if (newLevel === 10) {
      playSound?.('success');
      onShowBuffPanel?.();
    }
  }, [onScoreChange, onComboChange, onShowBuffPanel, playSound]);

  // ==================== Fever 模式 ====================
  const activateFeverMode = useCallback(() => {
    const state = stateRef.current;
    state.isFeverMode = true;
    state.feverEndTime = Date.now() + FEVER.duration;
    playSound?.('fever_start');
    onFeverChange?.(true);
  }, [playSound, onFeverChange]);

  const checkFeverExpiry = useCallback(() => {
    const state = stateRef.current;
    if (state.isFeverMode && Date.now() > state.feverEndTime) {
      state.isFeverMode = false;
      state.feverEndTime = 0;
      onFeverChange?.(false);
    }
  }, [onFeverChange]);

  // ==================== 天气系统 ====================
  const updateWeather = useCallback(() => {
    if (!WEATHER.enabled) return;
    
    const state = stateRef.current;
    const world = worldRef.current;
    const now = Date.now();

    // 检查当前天气是否结束
    if (state.currentWeather && now > state.weatherEndTime) {
      state.currentWeather = null;
      state.weatherEndTime = 0;
      onWeatherChange?.(null);
    }

    // 检查是否应该开始新天气
    if (!state.currentWeather && now > state.nextWeatherTime) {
      const weatherTypes = Object.keys(WEATHER.types);
      const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      
      state.currentWeather = randomWeather;
      state.weatherEndTime = now + WEATHER.duration;
      state.nextWeatherTime = now + WEATHER.interval;
      
      onWeatherChange?.(randomWeather);
    }
    
    // 应用天气效果到物理世界
    if (state.currentWeather && world) {
      const weatherConfig = WEATHER.types[state.currentWeather];
      
      if (state.currentWeather === 'windy' && weatherConfig.forceX) {
        // 风天气 - 对所有水果施加水平力
        const windForce = weatherConfig.forceX * (0.8 + Math.sin(now / 500) * 0.4);
        
        for (const body of world.bodies) {
          if (body.label === 'fruit' && !body.isStatic && !body.isSleeping) {
            // 施加风力
            body.velocity.x += windForce * 0.1;
            // 轻微唤醒
            if (Math.abs(windForce) > 0.2) {
              body.wake?.();
            }
          }
        }
      }
      
      // 可以根据天气类型动态修改物理参数
      // slippery: 降低摩擦
      // icy: 降低弹性
    }
  }, [onWeatherChange]);

  // ==================== 地震系统 ====================
  const checkEarthquake = useCallback(() => {
    if (!EARTHQUAKE.enabled) return;
    
    const state = stateRef.current;
    const world = worldRef.current;
    const now = Date.now();
    
    if (!world || state.isGameOver) return;
    
    // 检查冷却时间
    if (now - state.lastEarthquakeTime < EARTHQUAKE.cooldown) return;
    
    // 检测是否有水果超过警戒线
    let fruitsAboveLine = 0;
    for (const body of world.bodies) {
      if (body.label === 'fruit' && !body.isStatic) {
        const age = now - (body.createdAt || now);
        if (age > 1000 && body.position.y - body.radius < gameArea.gameOverLineY + 50) {
          fruitsAboveLine++;
        }
      }
    }
    
    // 如果有水果接近警戒线，开始计时
    if (fruitsAboveLine > 0) {
      if (!state.earthquakeTimer) {
        state.earthquakeTimer = now;
      }
      
      // 超过触发延迟后触发地震
      if (now - state.earthquakeTimer > EARTHQUAKE.triggerDelay) {
        triggerEarthquake();
        state.earthquakeTimer = null;
        state.lastEarthquakeTime = now;
      }
    } else {
      state.earthquakeTimer = null;
    }
  }, [gameArea]);

  const triggerEarthquake = useCallback(() => {
    const state = stateRef.current;
    const world = worldRef.current;
    
    if (!world) return;
    
    // 播放地震音效
    playSound?.('earthquake');
    
    // 对所有水果施加向上和随机水平的冲量
    for (const body of world.bodies) {
      if (body.label === 'fruit' && !body.isStatic) {
        // 计算冲量 - 向上 + 随机水平
        const horizontalForce = (Math.random() - 0.5) * EARTHQUAKE.impulseStrength * 0.5;
        const verticalForce = -EARTHQUAKE.impulseStrength * (0.8 + Math.random() * 0.4);
        
        // 使用 applyImpulse 如果存在，否则直接修改速度
        if (body.applyImpulse) {
          body.applyImpulse({ x: horizontalForce, y: verticalForce });
        } else {
          body.velocity.x += horizontalForce / (body.mass || 1);
          body.velocity.y += verticalForce / (body.mass || 1);
        }
        
        // 唤醒休眠的物体
        if (body.wake) body.wake();
      }
    }
    
    // 启动屏幕震动
    state.screenShakeEndTime = Date.now() + EARTHQUAKE.screenShake.duration;
    state.screenShakeIntensity = EARTHQUAKE.screenShake.intensity;
    
    console.log('[Game] Earthquake triggered!');
  }, [playSound]);

  const updateScreenShake = useCallback(() => {
    const state = stateRef.current;
    const now = Date.now();
    
    if (now < state.screenShakeEndTime) {
      // 计算剩余时间比例，震动逐渐减弱
      const remaining = (state.screenShakeEndTime - now) / EARTHQUAKE.screenShake.duration;
      const intensity = (state.screenShakeIntensity || EARTHQUAKE.screenShake.intensity) * remaining;
      
      // 使用正弦波 + 噪声产生更自然的震动
      const frequency = 30; // 震动频率
      state.screenShake = {
        x: Math.sin(now / frequency) * intensity * (0.5 + Math.random() * 0.5),
        y: Math.cos(now / frequency * 1.3) * intensity * (0.5 + Math.random() * 0.5),
      };
    } else {
      state.screenShake = { x: 0, y: 0 };
    }
  }, []);

  // ==================== 自动下落系统 ====================
  const updateAutoDrop = useCallback(() => {
    if (!RULES.autoDropEnabled) return;
    
    const state = stateRef.current;
    const now = Date.now();
    
    // 只在可以投放时倒计时
    if (!state.canDrop || state.isGameOver || state.isPaused) {
      state.lastAutoDropUpdate = now;
      return;
    }
    
    const elapsed = (now - state.lastAutoDropUpdate) / 1000;
    if (elapsed >= 1) {
      state.autoDropCountdown -= Math.floor(elapsed);
      state.lastAutoDropUpdate = now;
      
      // 倒计时结束，自动投放
      if (state.autoDropCountdown <= 0) {
        dropFruit();
        resetAutoDropCountdown();
      }
    }
  }, []);

  const resetAutoDropCountdown = useCallback(() => {
    const state = stateRef.current;
    state.autoDropCountdown = RULES.autoDropTime;
    state.lastAutoDropUpdate = Date.now();
  }, []);

  // ==================== 盲盒系统 ====================
  const updateMysteryBoxes = useCallback(() => {
    if (!MYSTERY_BOX.enabled) return;
    
    const state = stateRef.current;
    const world = worldRef.current;
    const now = Date.now();
    
    if (!world || state.isGameOver) return;
    
    for (const body of world.bodies) {
      if (!body.isMysteryBox || body.mysteryState !== 'falling') continue;
      
      const age = now - (body.createdAt || now);
      const velocity = body.velocity.length();
      
      // 检测是否落地（速度低或存在足够长时间）
      const isLanded = velocity < (MYSTERY_BOX.landingVelocityThreshold || 2) && age > 300;
      const isGrounded = body.position.y + body.radius > gameArea.groundY - 5;
      
      if (isLanded || isGrounded) {
        // 开始揭示倒计时
        if (!body.revealStartTime) {
          body.revealStartTime = now;
          body.mysteryState = 'shaking';
        }
        
        // 震动阶段
        if (body.mysteryState === 'shaking') {
          const elapsed = now - body.revealStartTime;
          if (elapsed > (MYSTERY_BOX.animation?.shakeDuration || 500)) {
            // 揭示盲盒
            resolveMysteryBox(body);
          }
        }
      }
    }
  }, [gameArea]);

  const resolveMysteryBox = useCallback((body) => {
    const state = stateRef.current;
    
    // 决定结果
    const rand = Math.random();
    let cumulative = 0;
    let result = 'random';
    
    for (const [key, config] of Object.entries(MYSTERY_BOX.results)) {
      cumulative += config.chance;
      if (rand < cumulative) {
        result = key;
        break;
      }
    }
    
    body.mysteryState = 'resolved';
    body.isMysteryBox = false;
    
    switch (result) {
      case 'evolve':
        // 进化：提升水果等级
        const bonus = MYSTERY_BOX.results.evolve.levelBonus || 2;
        body.fruitLevel = Math.min(body.fruitLevel + bonus, FRUITS.length - 2);
        body.radius = FRUITS[body.fruitLevel].radius;
        playSound?.('merge');
        console.log('[MysteryBox] Evolved to level', body.fruitLevel);
        break;
        
      case 'lucky':
        // 幸运：直接加分
        const scoreBonus = MYSTERY_BOX.results.lucky?.scoreBonus || 20;
        state.score += scoreBonus;
        onScoreChange?.(state.score, scoreBonus);
        console.log('[MysteryBox] Lucky! +', scoreBonus);
        break;
        
      case 'bomb':
        // 炸弹：标记为炸弹
        body.isBomb = true;
        body.bombFuseStart = Date.now();
        console.log('[MysteryBox] It is a bomb!');
        break;
        
      default:
        // 随机：变成随机等级水果
        const range = MYSTERY_BOX.results.random.levelRange || [0, 3];
        const newLevel = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
        body.fruitLevel = newLevel;
        body.radius = FRUITS[newLevel].radius;
        console.log('[MysteryBox] Random fruit level', newLevel);
    }
  }, [playSound, onScoreChange]);

  // ==================== 游戏循环 ====================
  const gameLoop = useCallback(() => {
    const state = stateRef.current;
    const world = worldRef.current;

    if (!state.isRunning || state.isPaused || !world) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // 更新物理世界
    world.update(1 / 60);

    // 检测碰撞和合成
    const pairs = world.getCollisionPairs();
    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;
      if (bodyA && bodyB && bodyA.label === 'fruit' && bodyB.label === 'fruit') {
        if (bodyA.fruitLevel === bodyB.fruitLevel) {
          // 检查是否可以合成
          if (!bodyA.isMysteryBox && !bodyB.isMysteryBox) {
            mergeFruits(bodyA, bodyB, world);
          }
        }
      }
    }

    // 更新系统
    checkFeverExpiry();
    updateWeather();
    checkEarthquake();
    updateScreenShake();
    updateAutoDrop();
    updateMysteryBoxes();

    // 更新特效生命周期
    state.mergeEffects = state.mergeEffects.filter(e => {
      e.alpha -= 0.05;
      return e.alpha > 0;
    });
    state.comboEffects = state.comboEffects.filter(e => {
      e.alpha -= 0.03;
      e.scale += 0.02;
      return e.alpha > 0;
    });

    // 检查游戏结束
    checkGameOver();

    // 下一帧
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [mergeFruits, checkFeverExpiry, updateWeather, checkEarthquake, updateScreenShake, updateAutoDrop, updateMysteryBoxes]);

  // ==================== 游戏结束检测 ====================
  const checkGameOver = useCallback(() => {
    const state = stateRef.current;
    const world = worldRef.current;
    if (!world || state.isGameOver) return;

    for (const body of world.bodies) {
      if (body.label === 'fruit' && !body.isStatic) {
        // 只检测已经落地的水果（至少存在 2 秒）
        const age = Date.now() - (body.createdAt || Date.now());
        if (age < 2000) continue;
        
        // 检查是否超过游戏结束线且稳定
        if (body.position.y - body.radius < gameArea.gameOverLineY) {
          // 需要更长时间的稳定状态才触发
          if (!body.aboveLineTimer) {
            body.aboveLineTimer = Date.now();
          }
          const timeAboveLine = Date.now() - body.aboveLineTimer;
          
          // 超过警戒线 1.5 秒且速度很慢才判定游戏结束
          if (timeAboveLine > 1500 && body.velocity.lengthSq() < 0.5) {
            state.isGameOver = true;
            playSound?.('gameOver');
            onGameOver?.(state.score);
            break;
          }
        } else {
          // 不在警戒线上方，重置计时器
          body.aboveLineTimer = null;
        }
      }
    }
  }, [gameArea, playSound, onGameOver]);

  // ==================== 控制方法 ====================
  const start = useCallback(() => {
    stateRef.current.isRunning = true;
    generateNextFruit();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [generateNextFruit, gameLoop]);

  const pause = useCallback(() => {
    stateRef.current.isPaused = true;
  }, []);

  const resume = useCallback(() => {
    stateRef.current.isPaused = false;
  }, []);

  const restart = useCallback(() => {
    const state = stateRef.current;
    
    // 重置状态
    state.score = 0;
    state.isGameOver = false;
    state.isPaused = false;
    state.comboCount = 0;
    state.isFeverMode = false;
    state.currentWeather = null;
    state.mergeEffects = [];
    state.comboEffects = [];
    
    // 重新初始化物理世界
    if (worldRef.current) {
      worldRef.current.clear();
    }
    initWorld();
    
    // 生成第一个水果
    generateNextFruit();
    
    // 重启游戏循环
    state.isRunning = true;
    
    onScoreChange?.(0);
    onComboChange?.(0);
    onFeverChange?.(false);
    onWeatherChange?.(null);
  }, [initWorld, generateNextFruit, onScoreChange, onComboChange, onFeverChange, onWeatherChange]);

  const updateDropX = useCallback((x) => {
    const state = stateRef.current;
    // 限制在游戏区域内
    const minX = gameArea.left + 30;
    const maxX = gameArea.right - 30;
    state.dropX = Math.max(minX, Math.min(maxX, x));
  }, [gameArea]);

  // ==================== 生命周期 ====================
  useEffect(() => {
    initWorld();
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [initWorld]);

  // ==================== 返回接口 ====================
  return {
    // 状态访问
    getState: () => stateRef.current,
    getWorld: () => worldRef.current,
    getGameArea: () => gameArea,
    
    // 控制方法
    start,
    pause,
    resume,
    restart,
    dropFruit,
    updateDropX,
    
    // 特殊操作
    setFruitLevel: (level) => { stateRef.current.currentFruitLevel = level; },
    skipFruit: () => { generateNextFruit(); },
  };
}

export default useGameEngine;
