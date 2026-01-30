/**
 * 游戏面板组件集合
 * 包括：游戏结束、水果选择、广告、分享、Buff选择等面板
 * 
 * 遵循最佳实践：
 * - bundle-dynamic-imports: 这些组件可以按需加载
 * - rerender-memo: 使用 memo 优化
 */
import { memo, useCallback } from 'react';
import { useGameStore, useUIState } from '../store/gameStore';
import { FRUITS, TOOLS, BUFFS } from '../game/config';

/**
 * 游戏结束面板
 */
export const GameOverPanel = memo(function GameOverPanel({ 
  score, 
  bestScore, 
  onRestart, 
  onShare 
}) {
  return (
    <div className="panel-overlay">
      <div className="panel-content text-center">
        <h2 className="text-3xl font-bold text-red-500 mb-4">游戏结束</h2>
        
        <div className="mb-6">
          <p className="text-2xl font-bold text-gray-800">得分: {score}</p>
          <p className="text-lg text-gray-600">最高分: {bestScore}</p>
        </div>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg transition-colors"
          >
            🔄 再来一局
          </button>
          <button
            onClick={onShare}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-colors"
          >
            📤 分享成绩
          </button>
        </div>
      </div>
    </div>
  );
});

/**
 * 水果选择面板
 */
export const FruitSelectorPanel = memo(function FruitSelectorPanel({ 
  onSelect, 
  onClose,
  maxLevel = 4 
}) {
  const useTool = useGameStore((s) => s.useTool);
  const toggleFruitSelector = useGameStore((s) => s.toggleFruitSelector);

  const handleSelect = useCallback((level) => {
    useTool('selectFruit');
    onSelect?.(level);
    toggleFruitSelector();
  }, [useTool, onSelect, toggleFruitSelector]);

  const handleClose = useCallback(() => {
    toggleFruitSelector();
    onClose?.();
  }, [toggleFruitSelector, onClose]);

  return (
    <div className="panel-overlay" onClick={handleClose}>
      <div className="panel-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">选择水果</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          {FRUITS.slice(0, maxLevel + 1).map((fruit) => (
            <button
              key={fruit.id}
              onClick={() => handleSelect(fruit.id)}
              className="flex flex-col items-center p-3 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-full mb-1"
                style={{ backgroundColor: fruit.color }}
              />
              <span className="text-xs">{fruit.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * 广告面板
 */
export const AdPanel = memo(function AdPanel({ onWatch, onClose }) {
  const toggleAdPanel = useGameStore((s) => s.toggleAdPanel);

  const handleWatch = useCallback((toolType) => {
    onWatch?.(toolType);
    toggleAdPanel();
  }, [onWatch, toggleAdPanel]);

  const handleClose = useCallback(() => {
    toggleAdPanel();
    onClose?.();
  }, [toggleAdPanel, onClose]);

  return (
    <div className="panel-overlay" onClick={handleClose}>
      <div className="panel-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">🎬 观看广告获取道具</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3">
          {Object.entries(TOOLS).map(([key, tool]) => (
            <button
              key={key}
              onClick={() => handleWatch(key)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tool.icon}</span>
                <span className="font-bold">{tool.name}</span>
              </div>
              <span className="text-sm">+{tool.adReward}</span>
            </button>
          ))}
        </div>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          观看完整广告即可获得奖励
        </p>
      </div>
    </div>
  );
});

/**
 * 分享面板
 */
export const SharePanel = memo(function SharePanel({ 
  score, 
  onShare, 
  onClose 
}) {
  const toggleSharePanel = useGameStore((s) => s.toggleSharePanel);

  const handleShare = useCallback((toolType) => {
    onShare?.(toolType);
    toggleSharePanel();
  }, [onShare, toggleSharePanel]);

  const handleClose = useCallback(() => {
    toggleSharePanel();
    onClose?.();
  }, [toggleSharePanel, onClose]);

  return (
    <div className="panel-overlay" onClick={handleClose}>
      <div className="panel-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">📤 分享获取道具</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        
        <div className="text-center mb-4">
          <p className="text-lg">当前分数: <strong>{score}</strong></p>
          <p className="text-sm text-gray-600">分享给好友挑战你的分数！</p>
        </div>
        
        <div className="space-y-3">
          {Object.entries(TOOLS).map(([key, tool]) => (
            <button
              key={key}
              onClick={() => handleShare(key)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tool.icon}</span>
                <span className="font-bold">{tool.name}</span>
              </div>
              <span className="text-sm">+{tool.adReward}</span>
            </button>
          ))}
        </div>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          每5分钟可分享一次
        </p>
      </div>
    </div>
  );
});

/**
 * Buff 选择面板
 */
export const BuffSelectorPanel = memo(function BuffSelectorPanel({ 
  onSelect, 
  onClose 
}) {
  const hideBuffSelection = useGameStore((s) => s.hideBuffSelection);
  const applyBuff = useGameStore((s) => s.applyBuff);
  const enableDropGuide = useGameStore((s) => s.enableDropGuide);

  // 随机选择3个 Buff
  const buffList = Object.values(BUFFS);
  const selectedBuffs = buffList.sort(() => Math.random() - 0.5).slice(0, 3);

  const handleSelect = useCallback((buff) => {
    applyBuff(buff.id);
    if (buff.effect.type === 'dropGuide') {
      enableDropGuide();
    }
    onSelect?.(buff);
    hideBuffSelection();
  }, [applyBuff, enableDropGuide, onSelect, hideBuffSelection]);

  const handleClose = useCallback(() => {
    hideBuffSelection();
    onClose?.();
  }, [hideBuffSelection, onClose]);

  return (
    <div className="panel-overlay">
      <div className="panel-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-yellow-500">🎉 合成大西瓜！</h3>
          <p className="text-gray-600">选择一个增益效果</p>
        </div>
        
        <div className="flex gap-4 justify-center">
          {selectedBuffs.map((buff) => (
            <button
              key={buff.id}
              onClick={() => handleSelect(buff)}
              className="buff-card flex-1"
            >
              <span className="text-4xl mb-2">{buff.icon}</span>
              <span className="text-yellow-400 font-bold">{buff.name}</span>
              <span className="text-gray-300 text-xs mt-1">{buff.description}</span>
            </button>
          ))}
        </div>
        
        <button
          onClick={handleClose}
          className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700"
        >
          跳过
        </button>
      </div>
    </div>
  );
});

/**
 * Toast 提示组件
 */
export const Toast = memo(function Toast({ message, visible }) {
  if (!visible) return null;
  
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce-slow">
      <div className="bg-black/80 text-white px-6 py-3 rounded-xl text-lg font-bold">
        {message}
      </div>
    </div>
  );
});

export default {
  GameOverPanel,
  FruitSelectorPanel,
  AdPanel,
  SharePanel,
  BuffSelectorPanel,
  Toast,
};
