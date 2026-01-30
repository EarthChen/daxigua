/**
 * 游戏状态管理 - Zustand Store
 * 遵循 rerender-derived-state 最佳实践：订阅派生布尔值而非原始值
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 道具初始配置
const INITIAL_TOOLS = {
  hammer: 3,
  selectFruit: 2,
  skip: 5,
};

/**
 * 游戏状态 Store
 */
export const useGameStore = create(
  persist(
    (set, get) => ({
      // ==================== 游戏状态 ====================
      score: 0,
      bestScore: 0,
      isGameOver: false,
      isPaused: false,
      
      // ==================== Combo & Fever ====================
      comboCount: 0,
      isFeverMode: false,
      feverEndTime: 0,
      
      // ==================== 天气系统 ====================
      currentWeather: null,
      weatherEndTime: 0,
      
      // ==================== 道具系统 ====================
      tools: { ...INITIAL_TOOLS },
      hammerMode: false,
      
      // ==================== UI 状态 ====================
      showFruitSelector: false,
      showAdPanel: false,
      showSharePanel: false,
      showBuffPanel: false,
      buffChoices: [],
      
      // ==================== Buff 系统 ====================
      activeBuffs: {},
      buffStacks: {},
      showDropGuide: false,
      
      // ==================== Actions ====================
      
      // 分数相关
      addScore: (points) => set((state) => {
        const newScore = state.score + points;
        const newBestScore = Math.max(state.bestScore, newScore);
        return { score: newScore, bestScore: newBestScore };
      }),
      
      resetScore: () => set({ score: 0 }),
      
      // 游戏状态
      setGameOver: (isOver) => set({ isGameOver: isOver }),
      setPaused: (isPaused) => set({ isPaused }),
      
      // Combo 系统
      setComboCount: (count) => set({ comboCount: count }),
      incrementCombo: () => set((state) => ({ 
        comboCount: Math.min(state.comboCount + 1, 20) 
      })),
      resetCombo: () => set({ comboCount: 0 }),
      
      // Fever 模式
      activateFever: (duration) => set({ 
        isFeverMode: true, 
        feverEndTime: Date.now() + duration 
      }),
      deactivateFever: () => set({ isFeverMode: false, feverEndTime: 0 }),
      
      // 天气系统
      setWeather: (weather, duration) => set({
        currentWeather: weather,
        weatherEndTime: Date.now() + duration,
      }),
      clearWeather: () => set({ currentWeather: null, weatherEndTime: 0 }),
      
      // 道具系统
      useTool: (toolType) => set((state) => {
        if (state.tools[toolType] <= 0) return state;
        return {
          tools: {
            ...state.tools,
            [toolType]: state.tools[toolType] - 1,
          },
        };
      }),
      
      addTool: (toolType, count = 1) => set((state) => ({
        tools: {
          ...state.tools,
          [toolType]: state.tools[toolType] + count,
        },
      })),
      
      setHammerMode: (mode) => set({ hammerMode: mode }),
      
      // UI 面板
      toggleFruitSelector: () => set((state) => ({ 
        showFruitSelector: !state.showFruitSelector 
      })),
      toggleAdPanel: () => set((state) => ({ showAdPanel: !state.showAdPanel })),
      toggleSharePanel: () => set((state) => ({ showSharePanel: !state.showSharePanel })),
      
      showBuffSelection: (choices) => set({ showBuffPanel: true, buffChoices: choices }),
      hideBuffSelection: () => set({ showBuffPanel: false, buffChoices: [] }),
      
      // Buff 系统
      applyBuff: (buffId) => set((state) => ({
        activeBuffs: { ...state.activeBuffs, [buffId]: true },
        buffStacks: {
          ...state.buffStacks,
          [buffId]: (state.buffStacks[buffId] || 0) + 1,
        },
      })),
      
      enableDropGuide: () => set({ showDropGuide: true }),
      
      // 重置游戏
      resetGame: () => set({
        score: 0,
        isGameOver: false,
        isPaused: false,
        comboCount: 0,
        isFeverMode: false,
        feverEndTime: 0,
        currentWeather: null,
        weatherEndTime: 0,
        hammerMode: false,
        showFruitSelector: false,
        showAdPanel: false,
        showSharePanel: false,
        showBuffPanel: false,
        buffChoices: [],
        // 保留 tools、activeBuffs、buffStacks、showDropGuide
      }),
      
      // 完全重置（包括道具）
      fullReset: () => set({
        score: 0,
        bestScore: 0,
        isGameOver: false,
        isPaused: false,
        comboCount: 0,
        isFeverMode: false,
        feverEndTime: 0,
        currentWeather: null,
        weatherEndTime: 0,
        tools: { ...INITIAL_TOOLS },
        hammerMode: false,
        showFruitSelector: false,
        showAdPanel: false,
        showSharePanel: false,
        showBuffPanel: false,
        buffChoices: [],
        activeBuffs: {},
        buffStacks: {},
        showDropGuide: false,
      }),
    }),
    {
      name: 'daxigua-game-storage',
      partialize: (state) => ({
        bestScore: state.bestScore,
        tools: state.tools,
        activeBuffs: state.activeBuffs,
        buffStacks: state.buffStacks,
        showDropGuide: state.showDropGuide,
      }),
    }
  )
);

// ==================== 选择器（遵循 rerender-derived-state） ====================

// 派生布尔值选择器 - 避免不必要的重渲染
export const useIsPlaying = () => useGameStore((s) => !s.isGameOver && !s.isPaused);
export const useHasCombo = () => useGameStore((s) => s.comboCount > 1);
export const useIsHighCombo = () => useGameStore((s) => s.comboCount >= 5);
export const useHasWeather = () => useGameStore((s) => s.currentWeather !== null);
export const useCanUseHammer = () => useGameStore((s) => s.tools.hammer > 0);
export const useCanUseSelectFruit = () => useGameStore((s) => s.tools.selectFruit > 0);
export const useCanUseSkip = () => useGameStore((s) => s.tools.skip > 0);

// 常用组合选择器
export const useToolCounts = () => useGameStore((s) => s.tools);
export const useScores = () => useGameStore((s) => ({ score: s.score, bestScore: s.bestScore }));
export const useUIState = () => useGameStore((s) => ({
  showFruitSelector: s.showFruitSelector,
  showAdPanel: s.showAdPanel,
  showSharePanel: s.showSharePanel,
  showBuffPanel: s.showBuffPanel,
}));
