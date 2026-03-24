/* ========================================
   西电宁波校友新年家宴抽奖 - 主逻辑
   ======================================== */

// ========================================
// 音效系统 - 使用 Web Audio API
// ========================================


// 安全随机数生成（消除模偏差）
function secureRandom(max) {
    const array = new Uint32Array(1);
    const limit = Math.floor(0xFFFFFFFF / max) * max;
    do {
        crypto.getRandomValues(array);
    } while (array[0] >= limit);
    return array[0] % max;
}

// 参与者名单
const attendants = [
    "王晨", "韩双燕", "韩双燕家属", "张亮", "郅慧", "郑晓瑜", "高淼", "梅曦",
    "郑高明", "赵春来", "钟微波", "叶晨威", "孙律明", "孙律明家属", "荆海量",
    "应炳杰", "冯宗颖", "陈廷雯", "张毅", "叶成红", "徐鸿乾", "陆重阳",
    "郝冬艳", "吴魁", "汪天华", "劳建辉", "王夕寅", "王海波", "王红霞",
    "陈沉", "陈沉家属", "叶燕华", "许欢欢", "李进维", "张鑫", "王强",
    "冯柏沄", "孙萌", "廖桂生", "葛枭桀", "张洪", "张洪家属", "王国振",
    "戴春生", "涂月圆", "梁亮", "徐凯", "黄依波", "黄依波家属", "王小九",
    "冯波", "冯波家属", "罗芥", "卢裕湘", "刘潇", "邵爱花", "王立军",
    "邵先供", "田红心", "崔振红", "韩光", "罗大大", "金大大", "沈涛", "张玉民"
];

// 奖项配置（按抽奖顺序）
const prizeConfig = [
    {
        name: "三等奖",
        desc: "米家榨汁杯/跳绳 - 价值99元",
        count: 22,
        icon: "🎁"
    },
    {
        name: "马不停蹄奖",
        desc: "蔚来专项奖",
        count: 6,
        icon: "🐴"
    },
    {
        name: "二等奖",
        desc: "米家哑铃套装 - 价值119元",
        count: 12,
        icon: "🏋️"
    },
    {
        name: "爱心喜茶奖",
        desc: "喜茶专属奖品",
        count: 6,
        icon: "🧋"
    },
    {
        name: "一等奖",
        desc: "米家空气炸锅 - 价值259元",
        count: 5,
        icon: "🍳"
    },
    {
        name: "奔向蔚来奖",
        desc: "蔚来专项奖",
        count: 12,
        icon: "🚗"
    },
    {
        name: "特等奖",
        desc: "华为耳机 - 价值399元",
        count: 2,
        icon: "🎧"
    }
];

// 状态管理
let currentPrizeIndex = 0;
let isRolling = false;
let rollInterval = null;
let remainingAttendants = [...attendants];
let allWinners = {}; // { prizeName: [winners] }
let currentRoundWinners = [];

// DOM 元素
const nameDisplay = document.getElementById('nameDisplay');
const lotteryBtn = document.getElementById('lotteryBtn');
const currentPrizeEl = document.getElementById('currentPrize');
const prizeDescEl = document.getElementById('prizeDesc');
const remainingCountEl = document.getElementById('remainingCount');
const currentWinnersEl = document.getElementById('currentWinners');
const prevPrizeBtn = document.getElementById('prevPrize');
const nextPrizeBtn = document.getElementById('nextPrize');
const roundIndicatorEl = document.getElementById('roundIndicator');
const prizeListEl = document.getElementById('prizeList');
const allWinnersContentEl = document.getElementById('allWinnersContent');
const fireworksContainer = document.getElementById('fireworksContainer');
const fallingElements = document.getElementById('fallingElements');
const bgm = document.getElementById('bgm');

// 状态持久化
function saveState() {
    localStorage.setItem('lotteryState', JSON.stringify({
        allWinners,
        currentPrizeIndex,
        remainingAttendants
    }));
}

function loadState() {
    const saved = localStorage.getItem('lotteryState');
    if (!saved) return false;
    try {
        const state = JSON.parse(saved);
        if (!Array.isArray(state.remainingAttendants) || typeof state.allWinners !== 'object') {
            throw new Error('invalid');
        }
        allWinners = state.allWinners;
        currentPrizeIndex = Math.min(state.currentPrizeIndex, prizeConfig.length - 1);
        remainingAttendants = state.remainingAttendants;
        return true;
    } catch (e) {
        localStorage.removeItem('lotteryState');
        return false;
    }
}

function resetState() {
    if (!confirm('确定要重置所有抽奖结果吗？')) return;
    localStorage.removeItem('lotteryState');
    currentPrizeIndex = 0;
    remainingAttendants = [...attendants];
    allWinners = {};
    prizeConfig.forEach(prize => { allWinners[prize.name] = []; });
    currentRoundWinners = [];
    updatePrizeDisplay();
    renderAllWinners();
    renderPrizeList();
    updatePrizeListHighlight();
}

// 初始化
function init() {
    // 初始化每个奖项的获奖者数组（先初始化再加载，确保结构完整）
    prizeConfig.forEach(prize => {
        allWinners[prize.name] = [];
    });

    // 尝试恢复上次状态
    loadState();

    updatePrizeDisplay();
    renderPrizeList();
    renderAllWinners();
    initFallingElements();
    playBgm();

    lotteryBtn.addEventListener('click', handleLotteryClick);
    prevPrizeBtn.addEventListener('click', () => changePrize(-1));
    nextPrizeBtn.addEventListener('click', () => changePrize(1));
    document.getElementById('resetBtn').addEventListener('click', resetState);

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); handleLotteryClick(); }
        if (e.code === 'ArrowLeft') changePrize(-1);
        if (e.code === 'ArrowRight') changePrize(1);
    });
}

// 更新奖项显示
function updatePrizeDisplay() {
    const prize = prizeConfig[currentPrizeIndex];
    const won = allWinners[prize.name] ? allWinners[prize.name].length : 0;
    const remaining = prize.count - won;

    currentPrizeEl.textContent = `${prize.icon} ${prize.name}`;
    prizeDescEl.textContent = prize.desc;
    remainingCountEl.textContent = remaining;

    // 更新轮次指示器
    roundIndicatorEl.textContent = `第 ${currentPrizeIndex + 1} / ${prizeConfig.length} 轮`;

    // 更新导航按钮状态
    prevPrizeBtn.disabled = currentPrizeIndex === 0;
    nextPrizeBtn.disabled = currentPrizeIndex === prizeConfig.length - 1;

    // 更新当前轮中奖者显示
    currentRoundWinners = allWinners[prize.name] || [];
    renderCurrentWinners();

    // 更新奖品列表高亮
    updatePrizeListHighlight();

    // 检查当前奖项是否已抽完
    if (remaining <= 0) {
        nameDisplay.textContent = "本奖项已抽完";
        lotteryBtn.disabled = true;
    } else {
        nameDisplay.textContent = "点击开始抽奖";
        lotteryBtn.disabled = false;
    }

    // 检查是否还有人可抽
    if (remainingAttendants.length === 0) {
        nameDisplay.textContent = "所有人已中奖";
        lotteryBtn.disabled = true;
    }
}

// 渲染当前轮中奖者
function renderCurrentWinners() {
    currentWinnersEl.innerHTML = currentRoundWinners.map(name =>
        `<span class="winner-tag">${name}</span>`
    ).join('');
}

// 渲染奖品列表
function renderPrizeList() {
    prizeListEl.innerHTML = prizeConfig.map((prize, index) =>
        `<li data-index="${index}">${prize.icon} ${prize.name} (${prize.count}份)</li>`
    ).join('');
}

// 更新奖品列表高亮
function updatePrizeListHighlight() {
    const items = prizeListEl.querySelectorAll('li');
    items.forEach((item, index) => {
        item.classList.remove('active', 'completed');
        const prize = prizeConfig[index];
        const won = allWinners[prize.name] ? allWinners[prize.name].length : 0;

        if (index === currentPrizeIndex) {
            item.classList.add('active');
        } else if (won >= prize.count) {
            item.classList.add('completed');
        }
    });
}

// 渲染所有获奖者
function renderAllWinners() {
    let html = '';
    prizeConfig.forEach(prize => {
        const winners = allWinners[prize.name] || [];
        if (winners.length > 0) {
            html += `
                <div class="all-winners-prize">
                    <div class="all-winners-prize-name">${prize.icon} ${prize.name}</div>
                    <div class="all-winners-names">${winners.join('、')}</div>
                </div>
            `;
        }
    });
    allWinnersContentEl.innerHTML = html || '<div style="color: #888;">暂无获奖者</div>';
}

// 切换奖项
function changePrize(direction) {
    if (isRolling) return;

    const newIndex = currentPrizeIndex + direction;
    if (newIndex >= 0 && newIndex < prizeConfig.length) {
        currentPrizeIndex = newIndex;
        updatePrizeDisplay();
    }
}

// 处理抽奖按钮点击
function handleLotteryClick() {
    if (isRolling) {
        stopRolling();
    } else {
        startRolling();
    }
}

// 开始滚动
function startRolling() {
    const prize = prizeConfig[currentPrizeIndex];
    const won = allWinners[prize.name] ? allWinners[prize.name].length : 0;

    if (won >= prize.count) {
        alert('本奖项已抽完，请切换到下一奖项！');
        return;
    }

    if (remainingAttendants.length === 0) {
        alert('所有人都已中奖！');
        return;
    }

    isRolling = true;
    lotteryBtn.classList.add('running');
    lotteryBtn.querySelector('.btn-text').textContent = '停止抽奖';
    nameDisplay.classList.add('rolling');
    nameDisplay.classList.remove('winner');

    // 快速滚动名字
    let rollSpeed = 50;
    rollInterval = setInterval(() => {
        const randomIndex = secureRandom(remainingAttendants.length);
        nameDisplay.textContent = remainingAttendants[randomIndex];
    }, rollSpeed);
}

// 停止滚动
function stopRolling() {
    isRolling = false;
    clearInterval(rollInterval);

    lotteryBtn.classList.remove('running');
    lotteryBtn.querySelector('.btn-text').textContent = '开始抽奖';
    nameDisplay.classList.remove('rolling');

    // 随机选择最终中奖者（使用密码学安全随机数）
    const winnerIndex = secureRandom(remainingAttendants.length);
    const winner = remainingAttendants[winnerIndex];

    // 从待抽名单中移除
    remainingAttendants.splice(winnerIndex, 1);

    // 添加到获奖名单
    const prizeName = prizeConfig[currentPrizeIndex].name;
    if (!allWinners[prizeName]) {
        allWinners[prizeName] = [];
    }
    allWinners[prizeName].push(winner);
    currentRoundWinners = allWinners[prizeName];

    // 显示中奖者
    nameDisplay.textContent = winner;
    nameDisplay.classList.add('winner');

    // 更新显示
    renderCurrentWinners();
    renderAllWinners();
    updatePrizeDisplay();

    // 触发烟花效果
    triggerFireworks();

    // 持久化状态
    saveState();
}

// 烟花效果（使用 DocumentFragment 批量插入减少回流）
function triggerFireworks() {
    const colors = ['#ffd700', '#ff6b35', '#e63946', '#ff1493', '#00ff88'];
    const batchSize = 10;
    const totalBatches = 5;

    for (let batch = 0; batch < totalBatches; batch++) {
        setTimeout(() => {
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < batchSize; i++) {
                const firework = document.createElement('div');
                firework.className = 'firework';
                const color = colors[secureRandom(colors.length)];
                firework.style.left = Math.random() * 100 + 'vw';
                firework.style.top = Math.random() * 60 + 20 + 'vh';
                firework.style.backgroundColor = color;
                firework.style.boxShadow = `0 0 10px ${color}`;
                firework.addEventListener('animationend', () => firework.remove());
                fragment.appendChild(firework);
            }
            fireworksContainer.appendChild(fragment);
        }, batch * 150);
    }
}

// 初始化飘落元素
function initFallingElements() {
    const elements = ['🧧', '✨', '🎊', '🎉', '💫', '⭐', '🌟'];

    for (let i = 0; i < 20; i++) {
        const el = document.createElement('div');
        el.className = 'falling-item';
        el.textContent = elements[Math.floor(Math.random() * elements.length)];
        el.style.left = Math.random() * 100 + 'vw';
        el.style.animationDuration = (5 + Math.random() * 10) + 's';
        el.style.animationDelay = Math.random() * 10 + 's';
        fallingElements.appendChild(el);
    }
}

// 播放背景音乐（持续尝试直到成功）
function playBgm() {
    bgm.volume = 0.5;
    const tryPlay = () => {
        bgm.play().then(() => {
            document.removeEventListener('click', tryPlay);
        }).catch(() => {});
    };
    tryPlay();
    document.addEventListener('click', tryPlay);
}

// 启动
init();
