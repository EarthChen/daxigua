/**
 * 音频系统 Hook
 * 遵循 rerender-lazy-state-init：惰性初始化音频资源
 * 遵循 client-event-listeners：避免重复创建事件监听器
 */
import { useRef, useCallback, useEffect } from 'react';

// 音频资源路径
const AUDIO_SOURCES = {
  merge: '/res/audio/merge.mp3',
  drop: '/res/audio/drop.mp3',
  destroy: '/res/audio/destroy.mp3',
  success: '/res/audio/success.mp3',
  gameOver: '/res/audio/gameover.mp3',
  fever_start: '/res/audio/success.mp3',
  earthquake: '/res/audio/destroy.mp3',
  explosion: '/res/audio/destroy.mp3',
  ice_crack: '/res/audio/merge.mp3',
};

/**
 * 创建音频实例
 * @param {string} src - 音频源路径
 * @returns {HTMLAudioElement}
 */
function createAudio(src) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = 0.5;
  return audio;
}

/**
 * 音频系统 Hook
 * @returns {Object} 音频控制方法
 */
export function useAudio() {
  // 使用 ref 存储音频实例，避免重复创建
  // 遵循 rerender-use-ref-transient-values
  const audioMapRef = useRef(null);
  const isMutedRef = useRef(false);

  // 惰性初始化音频 Map
  // 遵循 rerender-lazy-state-init
  const getAudioMap = useCallback(() => {
    if (!audioMapRef.current) {
      audioMapRef.current = new Map();
      Object.entries(AUDIO_SOURCES).forEach(([key, src]) => {
        audioMapRef.current.set(key, createAudio(src));
      });
    }
    return audioMapRef.current;
  }, []);

  /**
   * 播放音效
   * 遵循 rerender-functional-setstate：使用稳定回调
   */
  const play = useCallback((soundName) => {
    if (isMutedRef.current) return;

    const audioMap = getAudioMap();
    const audio = audioMap.get(soundName);
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // 静默处理自动播放限制
        });
      } catch (e) {
        // 静默处理
      }
    }
  }, [getAudioMap]);

  /**
   * 播放合成音效（带 Pitch 变化）
   */
  const playMerge = useCallback((comboCount) => {
    if (isMutedRef.current) return;

    const audioMap = getAudioMap();
    const audio = audioMap.get('merge');
    if (audio) {
      // Pitch 随连击数升高
      const pitchRate = Math.min(1.0 + (comboCount - 1) * 0.05, 1.5);
      try {
        audio.playbackRate = pitchRate;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch (e) {
        // 静默处理
      }
    }
  }, [getAudioMap]);

  /**
   * 切换静音
   */
  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    return isMutedRef.current;
  }, []);

  /**
   * 设置音量
   */
  const setVolume = useCallback((volume) => {
    const audioMap = getAudioMap();
    audioMap.forEach((audio) => {
      audio.volume = volume;
    });
  }, [getAudioMap]);

  // 清理音频资源
  // 遵循 advanced-init-once
  useEffect(() => {
    return () => {
      if (audioMapRef.current) {
        audioMapRef.current.forEach((audio) => {
          audio.pause();
          audio.src = '';
        });
        audioMapRef.current.clear();
      }
    };
  }, []);

  return {
    play,
    playMerge,
    toggleMute,
    setVolume,
    isMuted: () => isMutedRef.current,
  };
}

export default useAudio;
