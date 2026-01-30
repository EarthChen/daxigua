/**
 * 调试面板组件
 * 仅在开发环境显示
 */
import { memo, useState, useCallback } from 'react';
import { useGameStore, useScores, useToolCounts } from '../store/gameStore';
import { __DEV__, FRUITS } from '../game/config';

/**
 * 调试面板组件
 */
const DebugPanel = memo(function DebugPanel({ 
  gameEngine,
  onAddFruit,
  onClearFruits,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { score, bestScore } = useScores();
  const tools = useToolCounts();
  const addTool = useGameStore((s) => s.addTool);
  const addScore = useGameStore((s) => s.addScore);
  const resetGame = useGameStore((s) => s.resetGame);
  const activateFever = useGameStore((s) => s.activateFever);
  const setWeather = useGameStore((s) => s.setWeather);
  const showBuffSelection = useGameStore((s) => s.showBuffSelection);

  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // 添加道具
  const handleAddTool = useCallback((type, count = 10) => {
    addTool(type, count);
  }, [addTool]);

  // 添加分数
  const handleAddScore = useCallback((points) => {
    addScore(points);
  }, [addScore]);

  // 激活 Fever
  const handleActivateFever = useCallback(() => {
    activateFever(10000);
  }, [activateFever]);

  // 触发天气
  const handleSetWeather = useCallback((type) => {
    setWeather(type, 15000);
  }, [setWeather]);

  // 显示 Buff 选择
  const handleShowBuff = useCallback(() => {
    showBuffSelection([]);
  }, [showBuffSelection]);

  // 重置游戏
  const handleReset = useCallback(() => {
    resetGame();
    gameEngine?.restart();
  }, [resetGame, gameEngine]);

  // 只在开发环境显示
  if (!__DEV__) return null;

  return (
    <>
      {/* 调试按钮 */}
      <button
        onClick={togglePanel}
        className="fixed top-2 left-2 z-50 w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center text-lg font-bold"
      >
        🔧
      </button>

      {/* 调试面板 */}
      {isOpen && (
        <div className="fixed top-14 left-2 z-50 w-72 bg-gray-900 text-white rounded-xl shadow-2xl p-4 text-sm max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">🔧 调试面板</h3>
            <button
              onClick={togglePanel}
              className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* 状态信息 */}
          <div className="mb-4 p-2 bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <div>分数: <span className="text-green-400 font-bold">{score}</span></div>
              <div>最高: <span className="text-yellow-400 font-bold">{bestScore}</span></div>
              <div>锤子: <span className="text-orange-400">{tools.hammer}</span></div>
              <div>选果: <span className="text-purple-400">{tools.selectFruit}</span></div>
              <div>跳过: <span className="text-blue-400">{tools.skip}</span></div>
            </div>
          </div>

          {/* 道具操作 */}
          <div className="mb-4">
            <h4 className="font-bold mb-2 text-gray-400">道具操作</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAddTool('hammer', 10)}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs"
              >
                +10 锤子
              </button>
              <button
                onClick={() => handleAddTool('selectFruit', 10)}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
              >
                +10 选果
              </button>
              <button
                onClick={() => handleAddTool('skip', 10)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                +10 跳过
              </button>
            </div>
          </div>

          {/* 分数操作 */}
          <div className="mb-4">
            <h4 className="font-bold mb-2 text-gray-400">分数操作</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAddScore(100)}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
              >
                +100 分
              </button>
              <button
                onClick={() => handleAddScore(500)}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
              >
                +500 分
              </button>
              <button
                onClick={() => handleAddScore(1000)}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
              >
                +1000 分
              </button>
            </div>
          </div>

          {/* 特效操作 */}
          <div className="mb-4">
            <h4 className="font-bold mb-2 text-gray-400">特效操作</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleActivateFever}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
              >
                🔥 激活 Fever
              </button>
              <button
                onClick={handleShowBuff}
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
              >
                ✨ 选择 Buff
              </button>
            </div>
          </div>

          {/* 天气操作 */}
          <div className="mb-4">
            <h4 className="font-bold mb-2 text-gray-400">天气操作</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSetWeather('windy')}
                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-xs"
              >
                🌪️ 大风
              </button>
              <button
                onClick={() => handleSetWeather('slippery')}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                🌧️ 梅雨
              </button>
              <button
                onClick={() => handleSetWeather('icy')}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs"
              >
                ❄️ 霜冻
              </button>
            </div>
          </div>

          {/* 游戏操作 */}
          <div>
            <h4 className="font-bold mb-2 text-gray-400">游戏操作</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleReset}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
              >
                🔄 重置游戏
              </button>
              <button
                onClick={onClearFruits}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
              >
                🗑️ 清空水果
              </button>
            </div>
          </div>

          {/* 版本信息 */}
          <div className="mt-4 pt-2 border-t border-gray-700 text-xs text-gray-500 text-center">
            React 增强版 v2.0.0 | DEV Mode
          </div>
        </div>
      )}
    </>
  );
});

export default DebugPanel;
