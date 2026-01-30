/**
 * 音效系统
 * 管理游戏音效和背景音乐
 * 支持微信小程序和 Web 环境
 */

(function() {
'use strict';

// 环境适配导入
var Platform;
if (typeof require !== 'undefined') {
    Platform = require('./platform');
} else {
    Platform = window.Platform;
}

class SoundSystem {
    constructor() {
        this.sounds = {};
        this.bgm = null;
        this.isMuted = false;
        this.isBgmPlaying = false;
        
        this.init();
    }

    init() {
        // 创建音效
        this.sounds = {
            merge: this.createSound('res/audio/merge.mp3'),
            drop: this.createSound('res/audio/drop.mp3'),
            destroy: this.createSound('res/audio/destroy.mp3'),
            success: this.createSound('res/audio/success.mp3'),
            gameOver: this.createSound('res/audio/gameover.mp3'),
            // 新增音效（如果文件不存在，使用已有音效替代）
            fever_start: this.createSound('res/audio/success.mp3'),
            earthquake: this.createSound('res/audio/destroy.mp3'),
            explosion: this.createSound('res/audio/destroy.mp3'),
            ice_crack: this.createSound('res/audio/merge.mp3')
        };

        // 创建背景音乐
        this.bgm = Platform.createAudio('res/audio/bgm.mp3');
        if (this.bgm) {
            this.bgm.loop = true;
            this.bgm.volume = 0.3;
        }

        console.log('[音效] 初始化完成');
    }

    createSound(src) {
        const audio = Platform.createAudio(src);
        if (audio) {
            audio.volume = 0.5;
        }
        return audio;
    }

    play(soundName) {
        if (this.isMuted) return;

        const sound = this.sounds[soundName];
        if (sound) {
            try {
                // 重置播放位置
                if (sound.stop) {
                    sound.stop();
                } else {
                    sound.pause();
                    sound.currentTime = 0;
                }
                sound.play();
            } catch (e) {
                // 静默处理播放错误
            }
        }
    }

    /**
     * 播放合成音效，支持 Pitch 变化
     * @param {number} comboCount - 当前连击数
     */
    playMerge(comboCount) {
        if (this.isMuted) return;

        const sound = this.sounds['merge'];
        if (sound) {
            // Pitch 随连击数升高（1.0 → 1.5）
            const pitchRate = Math.min(1.0 + (comboCount - 1) * 0.05, 1.5);
            
            try {
                sound.playbackRate = pitchRate;
            } catch (e) {
                // 部分设备可能不支持 playbackRate
            }
            
            try {
                if (sound.stop) {
                    sound.stop();
                } else {
                    sound.pause();
                    sound.currentTime = 0;
                }
                sound.play();
            } catch (e) {
                // 静默处理播放错误
            }
        }
    }

    playBgm() {
        if (this.isMuted || this.isBgmPlaying || !this.bgm) return;
        
        try {
            this.bgm.play();
            this.isBgmPlaying = true;
        } catch (e) {
            // 静默处理
        }
    }

    stopBgm() {
        if (!this.bgm) return;
        try {
            if (this.bgm.stop) {
                this.bgm.stop();
            } else {
                this.bgm.pause();
                this.bgm.currentTime = 0;
            }
            this.isBgmPlaying = false;
        } catch (e) {
            // 静默处理
        }
    }

    pauseBgm() {
        if (!this.bgm) return;
        try {
            this.bgm.pause();
            this.isBgmPlaying = false;
        } catch (e) {
            // 静默处理
        }
    }

    resumeBgm() {
        if (this.isMuted || !this.bgm) return;
        
        try {
            this.bgm.play();
            this.isBgmPlaying = true;
        } catch (e) {
            // 静默处理
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.pauseBgm();
        } else {
            this.resumeBgm();
        }
        
        return this.isMuted;
    }

    setVolume(volume) {
        for (const key in this.sounds) {
            if (this.sounds[key]) {
                this.sounds[key].volume = volume;
            }
        }
        if (this.bgm) {
            this.bgm.volume = volume * 0.6;
        }
    }

    destroy() {
        for (const key in this.sounds) {
            if (this.sounds[key] && this.sounds[key].destroy) {
                this.sounds[key].destroy();
            }
        }
        if (this.bgm && this.bgm.destroy) {
            this.bgm.destroy();
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundSystem;
} else if (typeof window !== 'undefined') {
    window.SoundSystem = SoundSystem;
}

})(); // 关闭 IIFE
