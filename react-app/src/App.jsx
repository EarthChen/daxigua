/**
 * 合成大西瓜 - React 增强版
 * 主应用组件
 * 
 * 遵循最佳实践：
 * - bundle-dynamic-imports: 面板组件可以动态加载
 * - rerender-defer-reads: 仅订阅需要的状态
 */
import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useGameStore, useUIState, useScores } from './store/gameStore';
import GameCanvas from './components/GameCanvas';
import Toolbar from './components/Toolbar';
import DebugPanel from './components/DebugPanel';
import { useGameEngine } from './hooks/useGameEngine';
import { useAudio } from './hooks/useAudio';
import { __DEV__ } from './game/config';

// 动态加载面板组件 (bundle-dynamic-imports)
const GameOverPanel = lazy(() => 
  import('./components/Panels').then(m => ({ default: m.GameOverPanel }))
);
const FruitSelectorPanel = lazy(() => 
  import('./components/Panels').then(m => ({ default: m.FruitSelectorPanel }))
);
const AdPanel = lazy(() => 
  import('./components/Panels').then(m => ({ default: m.AdPanel }))
);
const SharePanel = lazy(() => 
  import('./components/Panels').then(m => ({ default: m.SharePanel }))
);
const BuffSelectorPanel = lazy(() => 
  import('./components/Panels').then(m => ({ default: m.BuffSelectorPanel }))
);
const Toast = lazy(() => 
  import('./components/Panels').then(m => ({ default: m.Toast }))
);

/**
 * Loading Fallback
 */
const PanelLoading = () => (
  <div className="panel-overlay">
    <div className="text-white text-xl">加载中...</div>
  </div>
);

/**
 * 主应用组件
 */
function App() {
  // ==================== 游戏尺寸 ====================
  const [dimensions, setDimensions] = useState(() => {
    const maxWidth = 450;
    const maxHeight = 800;
    const ratio = maxHeight / maxWidth;
    
    let width, height;
    if (window.innerHeight / window.innerWidth > ratio) {
      width = Math.min(window.innerWidth, maxWidth);
      height = width * ratio;
    } else {
      height = Math.min(window.innerHeight - 80, maxHeight); // 留出工具栏空间
      width = height / ratio;
    }
    
    return { width, height, pixelRatio: window.devicePixelRatio || 1 };
  });

  // ==================== Store 状态 (rerender-defer-reads) ====================
  const { score, bestScore } = useScores();
  const { showFruitSelector, showAdPanel, showSharePanel, showBuffPanel } = useUIState();
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isPaused = useGameStore((s) => s.isPaused);
  const comboCount = useGameStore((s) => s.comboCount);
  const isFeverMode = useGameStore((s) => s.isFeverMode);
  const currentWeather = useGameStore((s) => s.currentWeather);
  
  // Store Actions
  const addScore = useGameStore((s) => s.addScore);
  const setGameOver = useGameStore((s) => s.setGameOver);
  const setComboCount = useGameStore((s) => s.setComboCount);
  const activateFever = useGameStore((s) => s.activateFever);
  const deactivateFever = useGameStore((s) => s.deactivateFever);
  const setWeather = useGameStore((s) => s.setWeather);
  const clearWeather = useGameStore((s) => s.clearWeather);
  const resetGame = useGameStore((s) => s.resetGame);
  const addTool = useGameStore((s) => s.addTool);
  const showBuffSelection = useGameStore((s) => s.showBuffSelection);
  const toggleFruitSelector = useGameStore((s) => s.toggleFruitSelector);

  // ==================== Toast 状态 ====================
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2000);
  }, []);

  // ==================== 音频系统 ====================
  const { play, playMerge } = useAudio();

  // ==================== 游戏引擎 ====================
  const gameEngine = useGameEngine({
    canvas: null, // 由 GameCanvas 组件管理
    width: dimensions.width,
    height: dimensions.height,
    onScoreChange: useCallback((newScore) => {
      // 计算增量
      const delta = newScore - score;
      if (delta > 0) addScore(delta);
    }, [score, addScore]),
    onComboChange: setComboCount,
    onFeverChange: useCallback((active) => {
      if (active) {
        activateFever(6000);
      } else {
        deactivateFever();
      }
    }, [activateFever, deactivateFever]),
    onWeatherChange: useCallback((weather) => {
      if (weather) {
        setWeather(weather, 15000);
      } else {
        clearWeather();
      }
    }, [setWeather, clearWeather]),
    onGameOver: useCallback((finalScore) => {
      setGameOver(true);
    }, [setGameOver]),
    onShowBuffPanel: useCallback(() => {
      showBuffSelection([]);
    }, [showBuffSelection]),
    playSound: useCallback((sound, comboCount) => {
      if (sound === 'merge' && comboCount) {
        playMerge(comboCount);
      } else {
        play(sound);
      }
    }, [play, playMerge]),
  });

  // ==================== 游戏启动 ====================
  useEffect(() => {
    gameEngine.start();
  }, [gameEngine]);

  // ==================== 事件处理器 ====================
  const handleRestart = useCallback(() => {
    resetGame();
    gameEngine.restart();
  }, [resetGame, gameEngine]);

  const handleHammerUse = useCallback(() => {
    showToast('🔨 点击要销毁的水果');
  }, [showToast]);

  const handleSelectFruitUse = useCallback(() => {
    toggleFruitSelector();
  }, [toggleFruitSelector]);

  const handleSkipUse = useCallback(() => {
    gameEngine.skipFruit();
    showToast('⏭️ 已跳过当前水果');
  }, [gameEngine, showToast]);

  const handleFruitSelect = useCallback((level) => {
    gameEngine.setFruitLevel(level);
    showToast(`🍇 已选择 ${level} 级水果`);
  }, [gameEngine, showToast]);

  const handleWatchAd = useCallback((toolType) => {
    // 模拟广告观看（Web 环境直接发放奖励）
    addTool(toolType, 1);
    showToast(`🎉 获得道具 +1`);
  }, [addTool, showToast]);

  const handleShare = useCallback((toolType) => {
    // 分享功能
    if (navigator.share) {
      navigator.share({
        title: '合成大西瓜',
        text: `我在合成大西瓜中得了 ${score} 分，来挑战我吧！`,
        url: window.location.href,
      }).then(() => {
        addTool(toolType, 1);
        showToast(`📤 分享成功！获得道具 +1`);
      }).catch(() => {});
    } else {
      // 复制链接
      navigator.clipboard?.writeText(window.location.href);
      addTool(toolType, 1);
      showToast(`📤 链接已复制！获得道具 +1`);
    }
  }, [score, addTool, showToast]);

  const handleBuffSelect = useCallback((buff) => {
    showToast(`✨ 已激活 ${buff.name}`);
  }, [showToast]);

  // ==================== 渲染 ====================
  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* 游戏画布 */}
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <GameCanvas
          width={dimensions.width}
          height={dimensions.height}
          pixelRatio={dimensions.pixelRatio}
          gameEngine={gameEngine}
          isFeverMode={isFeverMode}
          currentWeather={currentWeather}
          comboCount={comboCount}
        />
      </div>

      {/* 工具栏 */}
      <Toolbar
        onHammerUse={handleHammerUse}
        onSelectFruitUse={handleSelectFruitUse}
        onSkipUse={handleSkipUse}
        isGameOver={isGameOver}
        isPaused={isPaused}
      />

      {/* 调试面板（仅开发环境） */}
      {__DEV__ && (
        <DebugPanel
          gameEngine={gameEngine}
          onClearFruits={() => {
            gameEngine.restart();
          }}
        />
      )}

      {/* 面板 (动态加载) */}
      <Suspense fallback={<PanelLoading />}>
        {isGameOver && (
          <GameOverPanel
            score={score}
            bestScore={bestScore}
            onRestart={handleRestart}
            onShare={() => handleShare('hammer')}
          />
        )}

        {showFruitSelector && (
          <FruitSelectorPanel
            onSelect={handleFruitSelect}
            onClose={() => {}}
          />
        )}

        {showAdPanel && (
          <AdPanel
            onWatch={handleWatchAd}
            onClose={() => {}}
          />
        )}

        {showSharePanel && (
          <SharePanel
            score={score}
            onShare={handleShare}
            onClose={() => {}}
          />
        )}

        {showBuffPanel && (
          <BuffSelectorPanel
            onSelect={handleBuffSelect}
            onClose={() => {}}
          />
        )}

        {toast.visible && (
          <Toast message={toast.message} visible={toast.visible} />
        )}
      </Suspense>
    </div>
  );
}

export default App;
