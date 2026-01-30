/**
 * Toolbar 组件 - 游戏道具工具栏
 * 
 * 遵循最佳实践：
 * - rerender-memo: 使用 memo 避免不必要的重渲染
 * - rerender-functional-setstate: 使用函数式更新
 */
import { memo, useCallback } from 'react';
import { useToolCounts, useGameStore } from '../store/gameStore';
import { TOOLS } from '../game/config';

/**
 * 单个工具按钮组件
 * 遵循 rendering-conditional-render: 使用三元运算符
 */
const ToolButton = memo(function ToolButton({ type, count, onUse, disabled }) {
  const tool = TOOLS[type];
  
  const handleClick = useCallback(() => {
    if (!disabled && count > 0) {
      onUse(type);
    }
  }, [type, count, disabled, onUse]);

  return (
    <button
      className={`tool-btn ${disabled || count <= 0 ? 'tool-btn-disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled || count <= 0}
    >
      <span className="text-2xl">{tool.icon}</span>
      <span className="text-xs mt-1">{tool.name}</span>
      {count > 0 && (
        <span className="tool-count">{count}</span>
      )}
    </button>
  );
});

/**
 * Toolbar 组件
 */
const Toolbar = memo(function Toolbar({ 
  onHammerUse, 
  onSelectFruitUse, 
  onSkipUse,
  onAdClick,
  onShareClick,
  isGameOver,
  isPaused,
}) {
  const tools = useToolCounts();
  const useTool = useGameStore((s) => s.useTool);
  const toggleAdPanel = useGameStore((s) => s.toggleAdPanel);
  const toggleSharePanel = useGameStore((s) => s.toggleSharePanel);

  const handleHammer = useCallback(() => {
    if (tools.hammer > 0) {
      useTool('hammer');
      onHammerUse?.();
    }
  }, [tools.hammer, useTool, onHammerUse]);

  const handleSelectFruit = useCallback(() => {
    if (tools.selectFruit > 0) {
      onSelectFruitUse?.();
    }
  }, [tools.selectFruit, onSelectFruitUse]);

  const handleSkip = useCallback(() => {
    if (tools.skip > 0) {
      useTool('skip');
      onSkipUse?.();
    }
  }, [tools.skip, useTool, onSkipUse]);

  const handleAdClick = useCallback(() => {
    toggleAdPanel();
    onAdClick?.();
  }, [toggleAdPanel, onAdClick]);

  const handleShareClick = useCallback(() => {
    toggleSharePanel();
    onShareClick?.();
  }, [toggleSharePanel, onShareClick]);

  const disabled = isGameOver || isPaused;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-amber-900/95 to-amber-800/90 backdrop-blur-sm p-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex justify-center items-center gap-2 max-w-md mx-auto">
        {/* 道具按钮 */}
        <ToolButton
          type="hammer"
          count={tools.hammer}
          onUse={handleHammer}
          disabled={disabled}
        />
        <ToolButton
          type="selectFruit"
          count={tools.selectFruit}
          onUse={handleSelectFruit}
          disabled={disabled}
        />
        <ToolButton
          type="skip"
          count={tools.skip}
          onUse={handleSkip}
          disabled={disabled}
        />

        {/* 分隔线 */}
        <div className="w-px h-12 bg-amber-600/50 mx-1" />

        {/* 广告按钮 */}
        <button
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 active:scale-95 transition-all duration-150 min-w-[60px] shadow-lg"
          onClick={handleAdClick}
        >
          <span className="text-2xl">🎬</span>
          <span className="text-xs mt-1 text-white font-medium">广告</span>
        </button>

        {/* 分享按钮 */}
        <button
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 active:scale-95 transition-all duration-150 min-w-[60px] shadow-lg"
          onClick={handleShareClick}
        >
          <span className="text-2xl">📤</span>
          <span className="text-xs mt-1 text-white font-medium">分享</span>
        </button>
      </div>
    </div>
  );
});

export default Toolbar;
