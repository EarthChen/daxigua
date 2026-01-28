/**
 * 合成大西瓜 - 开放数据域（好友排行榜）
 * 运行在微信开放数据域，可访问关系链数据
 */

const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');

// 排行榜配置
const CONFIG = {
    itemHeight: 70,
    maxDisplay: 8,
    avatarSize: 45,
    paddingX: 15,
    colors: {
        bg: '#ffffff',
        title: '#333333',
        name: '#333333',
        score: '#f99f0a',
        rank1: '#FFD700',
        rank2: '#C0C0C0',
        rank3: '#CD7F32',
        myBg: '#fff3cd'
    }
};

let friendsData = [];
let scrollOffset = 0;

/**
 * 监听主域消息
 */
wx.onMessage((data) => {
    console.log('[开放数据域] 收到消息:', data.type);
    
    switch (data.type) {
        case 'showRankList':
            showRankList();
            break;
        case 'updateScore':
            updateMyScore(data.score);
            break;
        case 'hideRankList':
            hideRankList();
            break;
        case 'scroll':
            handleScroll(data.offset);
            break;
    }
});

/**
 * 显示排行榜
 */
function showRankList() {
    wx.getFriendCloudStorage({
        keyList: ['score'],
        success: (res) => {
            console.log('[开放数据域] 获取好友数据成功:', res.data.length);
            
            friendsData = res.data
                .filter(item => item.KVDataList && item.KVDataList.length > 0)
                .map(item => ({
                    nickname: item.nickname,
                    avatarUrl: item.avatarUrl,
                    score: parseInt(item.KVDataList.find(kv => kv.key === 'score')?.value || '0')
                }))
                .sort((a, b) => b.score - a.score);
            
            drawRankList();
        },
        fail: (err) => {
            console.error('[开放数据域] 获取好友数据失败:', err);
            drawErrorState(err);
        }
    });
}

/**
 * 更新我的分数
 */
function updateMyScore(score) {
    wx.setUserCloudStorage({
        KVDataList: [{ key: 'score', value: String(score) }],
        success: () => console.log('[开放数据域] 分数更新成功:', score),
        fail: (err) => console.error('[开放数据域] 分数更新失败:', err)
    });
}

/**
 * 隐藏排行榜
 */
function hideRankList() {
    ctx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
}

/**
 * 处理滚动
 */
function handleScroll(offset) {
    scrollOffset = Math.max(0, Math.min(
        scrollOffset + offset,
        (friendsData.length - CONFIG.maxDisplay) * CONFIG.itemHeight
    ));
    drawRankList();
}

/**
 * 绘制排行榜
 */
function drawRankList() {
    const { width, height } = sharedCanvas;
    
    ctx.clearRect(0, 0, width, height);
    
    // 背景
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    // 标题
    ctx.fillStyle = CONFIG.colors.title;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 好友排行榜', width / 2, 35);
    
    // 分割线
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CONFIG.paddingX, 50);
    ctx.lineTo(width - CONFIG.paddingX, 50);
    ctx.stroke();
    
    if (friendsData.length === 0) {
        drawEmptyState();
        return;
    }
    
    // 绘制排行列表
    const startY = 60;
    const startIndex = Math.floor(scrollOffset / CONFIG.itemHeight);
    const visibleItems = Math.min(friendsData.length - startIndex, CONFIG.maxDisplay);
    
    for (let i = 0; i < visibleItems; i++) {
        const index = startIndex + i;
        const friend = friendsData[index];
        const y = startY + i * CONFIG.itemHeight;
        const rank = index + 1;
        
        // 排名
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px sans-serif';
        if (rank <= 3) {
            const medals = ['🥇', '🥈', '🥉'];
            ctx.fillText(medals[rank - 1], CONFIG.paddingX + 15, y + CONFIG.itemHeight / 2 + 6);
        } else {
            ctx.fillStyle = '#666666';
            ctx.font = '14px sans-serif';
            ctx.fillText(String(rank), CONFIG.paddingX + 15, y + CONFIG.itemHeight / 2 + 5);
        }
        
        // 头像占位
        const avatarX = CONFIG.paddingX + 40;
        const avatarY = y + (CONFIG.itemHeight - CONFIG.avatarSize) / 2;
        
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(avatarX + CONFIG.avatarSize / 2, avatarY + CONFIG.avatarSize / 2, CONFIG.avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 加载头像
        if (friend.avatarUrl) {
            const avatar = wx.createImage();
            avatar.src = friend.avatarUrl;
            avatar.onload = () => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX + CONFIG.avatarSize / 2, avatarY + CONFIG.avatarSize / 2, CONFIG.avatarSize / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(avatar, avatarX, avatarY, CONFIG.avatarSize, CONFIG.avatarSize);
                ctx.restore();
            };
        }
        
        // 昵称
        ctx.textAlign = 'left';
        ctx.fillStyle = CONFIG.colors.name;
        ctx.font = '14px sans-serif';
        const nickname = friend.nickname.length > 6 ? friend.nickname.substring(0, 6) + '...' : friend.nickname;
        ctx.fillText(nickname, avatarX + CONFIG.avatarSize + 10, y + CONFIG.itemHeight / 2 - 3);
        
        // 分数
        ctx.fillStyle = CONFIG.colors.score;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(friend.score + ' 分', avatarX + CONFIG.avatarSize + 10, y + CONFIG.itemHeight / 2 + 18);
        
        // 分割线
        ctx.strokeStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.moveTo(CONFIG.paddingX, y + CONFIG.itemHeight - 1);
        ctx.lineTo(width - CONFIG.paddingX, y + CONFIG.itemHeight - 1);
        ctx.stroke();
    }
    
    // 滚动提示
    if (friendsData.length > CONFIG.maxDisplay) {
        ctx.fillStyle = '#999999';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↕ 滑动查看更多', width / 2, height - 15);
    }
}

/**
 * 绘制空状态
 */
function drawEmptyState() {
    const { width, height } = sharedCanvas;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍉', width / 2, height / 2 - 20);
    ctx.fillText('暂无好友数据', width / 2, height / 2 + 10);
    ctx.font = '12px sans-serif';
    ctx.fillText('邀请好友一起来玩吧！', width / 2, height / 2 + 35);
}

/**
 * 绘制错误状态
 */
function drawErrorState(err) {
    const { width, height } = sharedCanvas;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    // 标题
    ctx.fillStyle = CONFIG.colors.title;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 好友排行榜', width / 2, 35);
    
    ctx.fillStyle = '#999999';
    ctx.font = '14px sans-serif';
    ctx.fillText('⚠️', width / 2, height / 2 - 30);
    
    // 根据错误类型显示不同消息
    if (err && err.errno === 1026) {
        ctx.fillText('需要配置隐私协议', width / 2, height / 2);
        ctx.font = '11px sans-serif';
        ctx.fillText('请在微信公众平台配置', width / 2, height / 2 + 25);
        ctx.fillText('用户隐私保护指引', width / 2, height / 2 + 45);
    } else {
        ctx.fillText('加载失败', width / 2, height / 2);
        ctx.font = '11px sans-serif';
        ctx.fillText('请稍后重试', width / 2, height / 2 + 25);
    }
}

console.log('[开放数据域] 初始化完成');
