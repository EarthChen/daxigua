/**
 * 平台适配层
 * 用于处理微信小程序和 Web 环境的差异
 */

(function() {
'use strict';

// 检测运行环境
var isWechat = typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function';
var isWeb = typeof window !== 'undefined' && typeof document !== 'undefined' && !isWechat;

/**
 * 平台适配对象
 */
var Platform = {
    isWechat,
    isWeb,

    // ==================== Canvas 相关 ====================
    
    /**
     * 获取 Canvas 上下文
     */
    getCanvas(canvasId) {
        if (isWechat) {
            return wx.createCanvas();
        } else {
            return document.getElementById(canvasId || 'GameCanvas');
        }
    },

    /**
     * 获取系统信息
     */
    getSystemInfo() {
        if (isWechat) {
            return wx.getSystemInfoSync();
        } else {
            return {
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                pixelRatio: window.devicePixelRatio || 1,
                platform: navigator.platform,
                language: navigator.language
            };
        }
    },

    // ==================== 触摸/鼠标事件 ====================
    
    /**
     * 绑定触摸开始事件
     */
    onTouchStart(callback, canvas) {
        if (isWechat) {
            wx.onTouchStart(callback);
        } else if (canvas) {
            const handler = (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touches = e.touches || [{ clientX: e.clientX, clientY: e.clientY }];
                callback({
                    touches: Array.from(touches).map(t => ({
                        clientX: t.clientX - rect.left,
                        clientY: t.clientY - rect.top
                    }))
                });
            };
            canvas.addEventListener('touchstart', handler, { passive: false });
            canvas.addEventListener('mousedown', (e) => {
                const rect = canvas.getBoundingClientRect();
                callback({
                    touches: [{
                        clientX: e.clientX - rect.left,
                        clientY: e.clientY - rect.top
                    }]
                });
            });
        }
    },

    /**
     * 绑定触摸移动事件
     */
    onTouchMove(callback, canvas) {
        if (isWechat) {
            wx.onTouchMove(callback);
        } else if (canvas) {
            const handler = (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touches = e.touches || [{ clientX: e.clientX, clientY: e.clientY }];
                callback({
                    touches: Array.from(touches).map(t => ({
                        clientX: t.clientX - rect.left,
                        clientY: t.clientY - rect.top
                    }))
                });
            };
            canvas.addEventListener('touchmove', handler, { passive: false });
            canvas.addEventListener('mousemove', (e) => {
                if (e.buttons === 1) {
                    const rect = canvas.getBoundingClientRect();
                    callback({
                        touches: [{
                            clientX: e.clientX - rect.left,
                            clientY: e.clientY - rect.top
                        }]
                    });
                }
            });
        }
    },

    /**
     * 绑定触摸结束事件
     */
    onTouchEnd(callback, canvas) {
        if (isWechat) {
            wx.onTouchEnd(callback);
        } else if (canvas) {
            const handler = (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const changedTouches = e.changedTouches || [{ clientX: e.clientX, clientY: e.clientY }];
                callback({
                    changedTouches: Array.from(changedTouches).map(t => ({
                        clientX: t.clientX - rect.left,
                        clientY: t.clientY - rect.top
                    }))
                });
            };
            canvas.addEventListener('touchend', handler, { passive: false });
            canvas.addEventListener('mouseup', (e) => {
                const rect = canvas.getBoundingClientRect();
                callback({
                    changedTouches: [{
                        clientX: e.clientX - rect.left,
                        clientY: e.clientY - rect.top
                    }]
                });
            });
        }
    },

    // ==================== 存储相关 ====================
    
    /**
     * 同步获取存储
     */
    getStorageSync(key) {
        if (isWechat) {
            try {
                return wx.getStorageSync(key);
            } catch (e) {
                return null;
            }
        } else {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : null;
            } catch (e) {
                return localStorage.getItem(key);
            }
        }
    },

    /**
     * 同步设置存储
     */
    setStorageSync(key, value) {
        if (isWechat) {
            try {
                wx.setStorageSync(key, value);
            } catch (e) {
                console.error('[Platform] 存储失败:', e);
            }
        } else {
            try {
                const strValue = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, strValue);
            } catch (e) {
                console.error('[Platform] 存储失败:', e);
            }
        }
    },

    // ==================== 音频相关 ====================
    
    /**
     * 创建音频上下文
     */
    createAudio(src) {
        if (isWechat) {
            const audio = wx.createInnerAudioContext();
            audio.src = src;
            return audio;
        } else {
            const audio = new Audio(src);
            // 添加与微信小程序兼容的方法
            audio.stop = function() {
                this.pause();
                this.currentTime = 0;
            };
            return audio;
        }
    },

    /**
     * 创建图片
     */
    createImage() {
        if (isWechat) {
            return wx.createImage();
        } else {
            return new Image();
        }
    },

    // ==================== 分享相关（Web 环境模拟） ====================
    
    /**
     * 显示分享菜单
     */
    showShareMenu(options) {
        if (isWechat) {
            wx.showShareMenu(options);
        } else {
            console.log('[Platform] Web 环境不支持原生分享');
        }
    },

    /**
     * 分享消息
     */
    shareAppMessage(options) {
        if (isWechat) {
            wx.shareAppMessage(options);
        } else {
            // Web 环境使用 Web Share API 或复制链接
            if (navigator.share) {
                navigator.share({
                    title: options.title,
                    url: window.location.href
                }).catch(() => {});
            } else {
                // 复制链接到剪贴板
                const url = window.location.href;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url);
                    alert('链接已复制到剪贴板！');
                }
            }
        }
    },

    // ==================== 开放数据域（Web 环境不支持） ====================
    
    getOpenDataContext() {
        if (isWechat) {
            return wx.getOpenDataContext();
        } else {
            return {
                postMessage: () => {},
                canvas: null
            };
        }
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Platform;
} else if (typeof window !== 'undefined') {
    window.Platform = Platform;
}

})(); // 关闭 IIFE
