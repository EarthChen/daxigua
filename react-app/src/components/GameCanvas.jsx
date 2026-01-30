/**
 * GameCanvas 组件 - 游戏渲染画布
 * 
 * 遵循最佳实践：
 * - rendering-hoist-jsx: 提取静态 JSX
 * - rerender-use-ref-transient-values: Canvas 渲染使用 ref
 */
import { useRef, useEffect, useCallback, memo } from 'react';
import { FRUITS, COLORS, GAME_AREA, RULES, COMBO, FEVER, WEATHER } from '../game/config';

/**
 * 水果图片缓存
 */
const fruitImageCache = new Map();

/**
 * 预加载水果图片
 */
function preloadFruitImages() {
  for (let i = 0; i <= 10; i++) {
    const img = new Image();
    img.src = `/res/images/fruit_${i}.png`;
    fruitImageCache.set(i, img);
  }
}

// 立即预加载
preloadFruitImages();

/**
 * GameCanvas 组件
 * 遵循 rerender-memo: 使用 memo 包裹纯渲染组件
 */
const GameCanvas = memo(function GameCanvas({
  width,
  height,
  pixelRatio,
  gameEngine,
  isFeverMode,
  currentWeather,
  comboCount,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // ==================== 渲染函数 ====================
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameEngine) return;

    const ctx = canvas.getContext('2d');
    const state = gameEngine.getState();
    const world = gameEngine.getWorld();
    const gameArea = gameEngine.getGameArea();

    // 清空画布
    ctx.save();
    ctx.scale(pixelRatio, pixelRatio);
    
    // 应用屏幕震动（由 useGameEngine 中的 updateScreenShake 计算）
    if (state.screenShake && (state.screenShake.x !== 0 || state.screenShake.y !== 0)) {
      ctx.translate(state.screenShake.x, state.screenShake.y);
    }

    // 绘制背景
    drawBackground(ctx, width, height, isFeverMode, currentWeather);

    // 绘制游戏区域
    drawGameArea(ctx, gameArea, width, height);

    // 绘制警戒线（包含地震警告）
    drawGameOverLine(ctx, gameArea, width, state);

    // 绘制投放辅助线
    if (state.showDropGuide && state.canDrop) {
      drawDropGuide(ctx, state.dropX, gameArea);
    }

    // 绘制待投放水果
    if (!state.isGameOver && state.canDrop) {
      drawPendingFruit(ctx, state, gameArea, isFeverMode);
    }

    // 绘制所有水果
    if (world) {
      for (const body of world.bodies) {
        if (body.label === 'fruit' && !body.isStatic) {
          drawFruit(ctx, body);
        }
      }
    }

    // 绘制合成特效
    for (const effect of state.mergeEffects) {
      drawMergeEffect(ctx, effect);
    }

    // 绘制 Combo 特效
    for (const effect of state.comboEffects) {
      drawComboEffect(ctx, effect);
    }

    // 绘制天气效果
    if (currentWeather) {
      drawWeatherOverlay(ctx, currentWeather, width, height, state);
    }

    // 绘制天气指示器
    if (currentWeather) {
      drawWeatherIndicator(ctx, currentWeather, width);
    }

    // 绘制分数
    drawScore(ctx, state.score, width);
    
    // 绘制自动下落倒计时
    drawAutoDropCountdown(ctx, state.autoDropCountdown, state.canDrop, gameArea, width);
    
    // 绘制 Combo 计数器
    drawComboCounter(ctx, state.comboCount || 0, width, gameArea);

    ctx.restore();

    // 继续渲染循环
    animationRef.current = requestAnimationFrame(render);
  }, [gameEngine, width, height, pixelRatio, isFeverMode, currentWeather, comboCount]);

  // ==================== 渲染循环管理 ====================
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  // ==================== 触摸事件处理 ====================
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    gameEngine?.updateDropX(x);
  }, [gameEngine]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    gameEngine?.updateDropX(x);
  }, [gameEngine]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    gameEngine?.dropFruit();
  }, [gameEngine]);

  // ==================== 渲染 ====================
  return (
    <canvas
      ref={canvasRef}
      width={width * pixelRatio}
      height={height * pixelRatio}
      style={{ width, height }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={(e) => e.buttons === 1 && handleTouchMove(e)}
      onMouseUp={handleTouchEnd}
    />
  );
});

// ==================== 绘制函数（提取到组件外部） ====================

function drawBackground(ctx, width, height, isFeverMode, weather) {
  // 基础背景 - 更丰富的渐变
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#fff8e7');
  gradient.addColorStop(0.3, '#fef3c7');
  gradient.addColorStop(0.7, '#f5deb3');
  gradient.addColorStop(1, '#e8d4a8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // 添加木纹效果
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let y = 0; y < height; y += 20) {
    ctx.fillStyle = y % 40 === 0 ? '#8b4513' : '#a0522d';
    ctx.fillRect(0, y, width, 10);
  }
  ctx.restore();

  // Fever 模式效果 - 更强烈的脉冲
  if (isFeverMode) {
    const pulse = 0.15 + Math.sin(Date.now() / 150) * 0.1;
    ctx.fillStyle = `rgba(255, 80, 0, ${pulse})`;
    ctx.fillRect(0, 0, width, height);
    
    // 边缘发光
    const glowGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
    glowGradient.addColorStop(0, 'rgba(255, 200, 0, 0)');
    glowGradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.05)');
    glowGradient.addColorStop(1, 'rgba(255, 50, 0, 0.15)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawGameArea(ctx, gameArea, width, height) {
  // 地面
  const groundGradient = ctx.createLinearGradient(0, gameArea.groundY, 0, height);
  groundGradient.addColorStop(0, COLORS.groundTop);
  groundGradient.addColorStop(1, COLORS.ground);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, gameArea.groundY, width, height - gameArea.groundY);

  // 墙壁
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, gameArea.left, height);
  ctx.fillRect(gameArea.right, 0, width - gameArea.right, height);
}

function drawGameOverLine(ctx, gameArea, width, state) {
  const now = Date.now();
  
  // 检查是否有水果接近警戒线
  const isWarning = state.earthquakeTimer && (now - state.earthquakeTimer > 500);
  
  if (isWarning) {
    // 警告状态 - 红色闪烁
    const pulse = Math.sin(now / 100) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
    ctx.lineWidth = 4;
    
    // 绘制警告区域背景
    ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.1})`;
    ctx.fillRect(gameArea.left, gameArea.gameOverLineY - 50, 
                 gameArea.right - gameArea.left, 50);
  } else {
    ctx.strokeStyle = COLORS.gameOverLine;
    ctx.lineWidth = 2;
  }
  
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(gameArea.left, gameArea.gameOverLineY);
  ctx.lineTo(gameArea.right, gameArea.gameOverLineY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // 绘制警告文字
  if (isWarning) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 50, 50, ${Math.sin(now / 80) * 0.3 + 0.7})`;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ 地震警告！', width / 2, gameArea.gameOverLineY - 20);
    ctx.restore();
  }
}

function drawDropGuide(ctx, dropX, gameArea) {
  ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(dropX, gameArea.top);
  ctx.lineTo(dropX, gameArea.groundY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPendingFruit(ctx, state, gameArea, isFeverMode) {
  const fruit = FRUITS[state.currentFruitLevel];
  let radius = fruit.radius;
  if (isFeverMode) radius *= FEVER.radiusShrink;

  const x = state.dropX;
  const y = gameArea.top + radius + 10;

  // 绘制投放线
  ctx.strokeStyle = COLORS.dropLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, gameArea.top);
  ctx.lineTo(x, y - radius);
  ctx.stroke();

  // 绘制水果
  drawFruitAt(ctx, x, y, radius, state.currentFruitLevel);
}

function drawFruit(ctx, body) {
  const { x, y } = body.position;
  const radius = body.radius;
  const level = body.fruitLevel;

  // 冰封效果
  if (body.iceState === 'frozen') {
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawFruitAt(ctx, x, y, radius, level);
    ctx.restore();
    
    // 冰晶效果
    ctx.strokeStyle = '#a0e0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  // 盲盒效果
  if (body.isMysteryBox && body.mysteryState !== 'resolved') {
    const now = Date.now();
    let offsetX = 0, offsetY = 0;
    
    // 震动阶段动画
    if (body.mysteryState === 'shaking') {
      const shakeIntensity = 4;
      offsetX = Math.sin(now / 30) * shakeIntensity;
      offsetY = Math.cos(now / 25) * shakeIntensity * 0.5;
    }
    
    ctx.save();
    
    // 盲盒背景
    const gradient = ctx.createRadialGradient(x + offsetX, y + offsetY, 0, x + offsetX, y + offsetY, radius);
    gradient.addColorStop(0, '#b366d9');
    gradient.addColorStop(0.7, '#9b59b6');
    gradient.addColorStop(1, '#7d3c98');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 光泽效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x + offsetX - radius * 0.3, y + offsetY - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // 问号
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${radius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.fillText('?', x + offsetX, y + offsetY);
    
    // 震动时的光环
    if (body.mysteryState === 'shaking') {
      const pulse = Math.sin(now / 100) * 0.3 + 0.5;
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + offsetX, y + offsetY, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
    return;
  }

  drawFruitAt(ctx, x, y, radius, level);
}

function drawFruitAt(ctx, x, y, radius, level) {
  const fruit = FRUITS[level];
  const img = fruitImageCache.get(level);

  if (img && img.complete) {
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    // 备用颜色绘制
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fruit.name, x, y);
  }
}

function drawMergeEffect(ctx, effect) {
  ctx.save();
  ctx.globalAlpha = effect.alpha;
  
  // 扩散光环
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.radius * (2 - effect.alpha), 0, Math.PI * 2);
  ctx.stroke();
  
  // 分数显示
  ctx.fillStyle = '#ff6600';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`+${effect.score}`, effect.x, effect.y - effect.radius - 10);
  
  ctx.restore();
}

function drawComboEffect(ctx, effect) {
  ctx.save();
  ctx.globalAlpha = effect.alpha;
  ctx.fillStyle = getComboColor(parseInt(effect.text));
  ctx.font = `bold ${20 * effect.scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(effect.text, effect.x, effect.y);
  ctx.restore();
}

function getComboColor(combo) {
  if (combo >= 10) return '#ff0000';
  if (combo >= 5) return '#ff6600';
  if (combo >= 3) return '#ffcc00';
  return '#00cc00';
}

function drawWeatherOverlay(ctx, weather, width, height, state) {
  const config = WEATHER.types[weather];
  if (!config) return;

  ctx.save();
  const time = Date.now();
  
  if (weather === 'windy') {
    // ============ 大风效果 - 更真实 ============
    
    // 1. 风的波纹线条（多层次）
    for (let layer = 0; layer < 3; layer++) {
      const alpha = 0.15 - layer * 0.04;
      const speed = 8 + layer * 3;
      ctx.strokeStyle = `rgba(180, 180, 180, ${alpha})`;
      ctx.lineWidth = 2 - layer * 0.5;
      
      for (let i = 0; i < 15; i++) {
        const baseY = (time / speed + i * 60 + layer * 20) % (height + 100) - 50;
        const amplitude = 15 + Math.sin(time / 500 + i) * 5;
        
        ctx.beginPath();
        ctx.moveTo(-20, baseY);
        
        // 使用贝塞尔曲线绘制波浪
        for (let x = 0; x <= width + 40; x += 40) {
          const waveY = baseY + Math.sin((x + time / 10) / 50) * amplitude;
          ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
    }
    
    // 2. 飘动的小颗粒（灰尘/树叶）
    for (let i = 0; i < 40; i++) {
      const seed = i * 7919; // 质数作为种子
      const particleX = ((time / 3 + seed) % (width + 100)) - 50;
      const baseY = (seed * 13) % height;
      const particleY = baseY + Math.sin(time / 200 + i) * 20;
      const size = 2 + (seed % 3);
      const alpha = 0.3 + (seed % 4) * 0.1;
      
      ctx.fillStyle = `rgba(139, 119, 101, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(particleX, particleY, size * 1.5, size, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
  } else if (weather === 'slippery') {
    // ============ 雨天效果 - 更真实 ============
    
    // 1. 雨滴背景暗化
    ctx.fillStyle = 'rgba(50, 70, 90, 0.08)';
    ctx.fillRect(0, 0, width, height);
    
    // 2. 雨滴 - 多层次、多角度
    for (let layer = 0; layer < 3; layer++) {
      const dropCount = 30 + layer * 20;
      const dropLength = 20 - layer * 5;
      const dropSpeed = 12 - layer * 3;
      const alpha = 0.5 - layer * 0.12;
      
      ctx.strokeStyle = `rgba(120, 160, 200, ${alpha})`;
      ctx.lineWidth = 1.5 - layer * 0.3;
      
      for (let i = 0; i < dropCount; i++) {
        const seed = i * 3571 + layer * 1000;
        const x = (seed * 17) % width;
        const baseY = ((time / dropSpeed + seed) % (height + 100)) - 50;
        const angle = -0.1 + Math.sin(seed) * 0.05; // 轻微倾斜角度
        
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x + Math.sin(angle) * dropLength, baseY + Math.cos(angle) * dropLength);
        ctx.stroke();
      }
    }
    
    // 3. 水花效果（在底部）
    ctx.fillStyle = 'rgba(150, 180, 210, 0.3)';
    for (let i = 0; i < 15; i++) {
      const seed = i * 2341;
      const x = (seed * 23) % width;
      const splashY = height - 80 + (seed % 20);
      const splashTime = (time / 100 + seed) % 30;
      
      if (splashTime < 10) {
        const splashSize = splashTime * 0.5;
        const splashAlpha = (10 - splashTime) / 10 * 0.4;
        ctx.fillStyle = `rgba(150, 180, 210, ${splashAlpha})`;
        ctx.beginPath();
        ctx.arc(x, splashY, splashSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
  } else if (weather === 'icy') {
    // ============ 霜冻效果 - 更真实 ============
    
    // 1. 冰蓝色背景层
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
    gradient.addColorStop(0, 'rgba(200, 230, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(180, 210, 240, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 2. 雪花 - 多种大小和形状
    for (let i = 0; i < 60; i++) {
      const seed = i * 4523;
      const x = ((time / 40 + seed) % (width + 50)) - 25;
      const baseY = ((time / 25 + seed * 3) % (height + 50)) - 25;
      const wobble = Math.sin(time / 300 + i * 2) * 10;
      const y = baseY + wobble;
      
      const size = 2 + (seed % 4);
      const alpha = 0.4 + (seed % 5) * 0.1;
      const rotation = (time / 1000 + seed) % (Math.PI * 2);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      
      // 绘制雪花形状
      if (size > 3) {
        // 大雪花 - 六角形
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // 小雪花 - 圆形
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    
    // 3. 边缘霜冻效果
    const frostGradient = ctx.createLinearGradient(0, 0, 0, 60);
    frostGradient.addColorStop(0, 'rgba(200, 230, 255, 0.3)');
    frostGradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
    ctx.fillStyle = frostGradient;
    ctx.fillRect(0, 0, width, 60);
    
    // 底部霜冻
    const bottomFrost = ctx.createLinearGradient(0, height - 40, 0, height);
    bottomFrost.addColorStop(0, 'rgba(200, 230, 255, 0)');
    bottomFrost.addColorStop(1, 'rgba(200, 230, 255, 0.25)');
    ctx.fillStyle = bottomFrost;
    ctx.fillRect(0, height - 40, width, 40);
  }
  
  ctx.restore();
}

function drawWeatherIndicator(ctx, weather, width) {
  const config = WEATHER.types[weather];
  if (!config) return;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(width - 90, 10, 80, 30, 8);
  ctx.fill();
  
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${config.icon} ${config.name}`, width - 50, 30);
  ctx.restore();
}

function drawScore(ctx, score, width) {
  ctx.save();
  ctx.fillStyle = COLORS.scoreText;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`分数: ${score}`, width / 2, 50);
  ctx.restore();
}

function drawAutoDropCountdown(ctx, countdown, canDrop, gameArea, width) {
  if (!canDrop || countdown <= 0) return;
  
  const warningTime = 3; // 最后3秒显示警告
  const isWarning = countdown <= warningTime;
  
  ctx.save();
  
  // 绘制倒计时圆圈
  const x = width - 50;
  const y = gameArea.top + 60;
  const radius = 25;
  
  // 背景圆
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = isWarning ? 'rgba(255, 50, 50, 0.8)' : 'rgba(100, 100, 100, 0.6)';
  ctx.fill();
  
  // 进度弧
  const progress = countdown / 5; // 5秒总时间
  ctx.beginPath();
  ctx.arc(x, y, radius - 3, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
  ctx.strokeStyle = isWarning ? '#ff0' : '#fff';
  ctx.lineWidth = 4;
  ctx.stroke();
  
  // 倒计时数字
  ctx.fillStyle = '#fff';
  ctx.font = isWarning ? 'bold 20px Arial' : 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.ceil(countdown).toString(), x, y);
  
  // 警告闪烁效果
  if (isWarning) {
    const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 50, 50, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawComboCounter(ctx, comboCount, width, gameArea) {
  if (comboCount < 2) return;
  
  ctx.save();
  
  const x = gameArea.left + 30;
  const y = gameArea.top + 80;
  
  // Combo 文字大小随连击数增加
  const scale = Math.min(1 + comboCount * 0.1, 2);
  const fontSize = Math.floor(16 * scale);
  
  // 背景
  ctx.fillStyle = comboCount >= 5 ? 'rgba(255, 100, 0, 0.9)' : 'rgba(50, 50, 50, 0.8)';
  ctx.beginPath();
  ctx.roundRect(x - 10, y - fontSize, 80, fontSize + 15, 8);
  ctx.fill();
  
  // Combo 文字
  ctx.fillStyle = comboCount >= 5 ? '#fff' : '#ffd700';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(`${comboCount}x`, x, y);
  
  // Combo 标签
  ctx.font = '10px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('COMBO', x + 2, y + 12);
  
  ctx.restore();
}

export default GameCanvas;
