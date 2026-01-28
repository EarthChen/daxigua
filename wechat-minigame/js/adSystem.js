/**
 * 广告系统
 * 激励视频广告接入
 */

const { AD_CONFIG, TOOLS } = require('./config');

class AdSystem {
    constructor(game) {
        this.game = game;
        this.rewardedVideoAd = null;
        this.isLoaded = false;
        this.pendingReward = null;
        this.lastAdTime = 0;
        
        this.init();
    }

    init() {
        if (typeof wx.createRewardedVideoAd !== 'function') {
            console.log('[广告] 当前环境不支持激励视频广告');
            return;
        }

        try {
            this.rewardedVideoAd = wx.createRewardedVideoAd({
                adUnitId: AD_CONFIG.rewardedVideoAdUnitId
            });

            this.rewardedVideoAd.onLoad(() => {
                console.log('[广告] 激励视频广告加载成功');
                this.isLoaded = true;
            });

            this.rewardedVideoAd.onError((err) => {
                console.error('[广告] 激励视频广告加载失败:', err);
                this.isLoaded = false;
            });

            this.rewardedVideoAd.onClose((res) => {
                console.log('[广告] 广告关闭:', res);
                
                if (res && res.isEnded) {
                    this.onAdWatched();
                } else {
                    this.onAdSkipped();
                }
                
                // 预加载下一个广告
                this.rewardedVideoAd.load().catch(() => {});
            });

            // 预加载广告
            this.rewardedVideoAd.load().catch(() => {});
            
            console.log('[广告] 初始化完成');
        } catch (e) {
            console.error('[广告] 初始化失败:', e);
        }
    }

    /**
     * 显示激励视频广告
     */
    showAd(toolType) {
        return new Promise((resolve, reject) => {
            if (!this.rewardedVideoAd) {
                wx.showToast({
                    title: '广告功能暂不可用',
                    icon: 'none'
                });
                reject(new Error('广告未初始化'));
                return;
            }

            // 检查冷却时间
            const now = Date.now();
            if (now - this.lastAdTime < AD_CONFIG.cooldown) {
                const remaining = Math.ceil((AD_CONFIG.cooldown - (now - this.lastAdTime)) / 1000);
                wx.showToast({
                    title: `请${remaining}秒后再试`,
                    icon: 'none'
                });
                reject(new Error('广告冷却中'));
                return;
            }

            this.pendingReward = { toolType, resolve, reject };

            // 显示广告
            this.rewardedVideoAd.show()
                .catch(() => {
                    // 失败后重新加载
                    this.rewardedVideoAd.load()
                        .then(() => this.rewardedVideoAd.show())
                        .catch((err) => {
                            wx.showToast({
                                title: '广告加载失败',
                                icon: 'none'
                            });
                            this.pendingReward = null;
                            reject(err);
                        });
                });
        });
    }

    /**
     * 广告观看完成回调
     */
    onAdWatched() {
        this.lastAdTime = Date.now();
        
        if (this.pendingReward) {
            const { toolType, resolve } = this.pendingReward;
            this.pendingReward = null;
            
            // 发放奖励
            const reward = TOOLS[toolType].adReward;
            this.game.tools[toolType] += reward;
            this.game.saveTools();
            this.game.showToast(`🎉 获得 ${TOOLS[toolType].name} x${reward}！`);
            
            resolve(toolType);
        }
    }

    /**
     * 广告跳过回调
     */
    onAdSkipped() {
        if (this.pendingReward) {
            const { reject } = this.pendingReward;
            this.pendingReward = null;
            
            wx.showToast({
                title: '观看完整视频才能获得奖励',
                icon: 'none'
            });
            
            reject(new Error('用户跳过广告'));
        }
    }
}

module.exports = AdSystem;
