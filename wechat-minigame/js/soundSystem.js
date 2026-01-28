/**
 * 音效系统
 * 管理游戏音效和背景音乐
 */

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
            gameOver: this.createSound('res/audio/gameover.mp3')
        };

        // 创建背景音乐
        this.bgm = wx.createInnerAudioContext();
        this.bgm.src = 'res/audio/bgm.mp3';
        this.bgm.loop = true;
        this.bgm.volume = 0.3;

        console.log('[音效] 初始化完成');
    }

    createSound(src) {
        const audio = wx.createInnerAudioContext();
        audio.src = src;
        audio.volume = 0.5;
        return audio;
    }

    play(soundName) {
        if (this.isMuted) return;

        const sound = this.sounds[soundName];
        if (sound) {
            // 重置播放位置
            sound.stop();
            sound.play();
        }
    }

    playBgm() {
        if (this.isMuted || this.isBgmPlaying) return;
        
        this.bgm.play();
        this.isBgmPlaying = true;
    }

    stopBgm() {
        this.bgm.stop();
        this.isBgmPlaying = false;
    }

    pauseBgm() {
        this.bgm.pause();
        this.isBgmPlaying = false;
    }

    resumeBgm() {
        if (this.isMuted) return;
        
        this.bgm.play();
        this.isBgmPlaying = true;
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
            this.sounds[key].volume = volume;
        }
        this.bgm.volume = volume * 0.6;
    }

    destroy() {
        for (const key in this.sounds) {
            this.sounds[key].destroy();
        }
        this.bgm.destroy();
    }
}

module.exports = SoundSystem;
