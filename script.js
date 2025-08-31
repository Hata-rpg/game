// 古都探索譚 - v1.9

// DOM要素の取得
const titleScreen = document.getElementById('title-screen');
const startButton = document.getElementById('start-game-button');
const explorationScreen = document.getElementById('exploration-screen');
const battleScreen = document.getElementById('battle-screen');
const endScreen = document.getElementById('end-screen');

// プレイヤー、ボスの初期ステータス
let player = {
    attack: 10, defense: 10, hp: 100, maxHp: 100, agility: 10, evasion: 0.1, critical: 0.1
};

let boss = {
    attack: 30, defense: 15, hp: 600, maxHp: 600, agility: 15, evasion: 0.05, critical: 0.05
};

// ゲームの状態管理
let game = {
    isGameStarted: false,
    isExploration: false,
    isBattle: false,
    timer: 60,
    timerInterval: null,
    playerLat: 35.000,
    playerLng: 135.768,
    map: null,
    spotMarkers: [],
    visitedSpots: new Set(),
    isTyping: false
};

// 京都周辺のスポットデータ
const spots = [
    { name: '清水寺', lat: 34.9949, lng: 135.7850, type: 'hp', value: 10, effect: 'HP +10' },
    { name: '金閣寺', lat: 35.0393, lng: 135.7292, type: 'defense', value: 5, effect: '防御 +5' },
    { name: '伏見稲荷大社', lat: 34.9671, lng: 135.7727, type: 'attack', value: 5, effect: '攻撃 +5' },
    { name: '嵐山', lat: 35.0135, lng: 135.6791, type: 'all', value: 3, effect: '全ステータス +3' },
    { name: '銀閣寺', lat: 35.0270, lng: 135.7983, type: 'agility', value: 5, effect: '敏捷 +5' },
    { name: '祇園', lat: 35.0033, lng: 135.7766, type: 'critical', value: 0.05, effect: '会心率 +5%' },
    { name: '平安神宮', lat: 35.0113, lng: 135.7804, type: 'evasion', value: 0.05, effect: '回避率 +5%' },
    { name: '三十三間堂', lat: 34.9880, lng: 135.7709, type: 'hp_major', effect: 'HP x 1.5倍' },
    { name: '京都御所', lat: 35.0253, lng: 135.7621, type: 'defense_major', effect: '防御力 x 1.5倍' },
    { name: '二条城', lat: 35.0142, lng: 135.7483, type: 'attack_major', effect: '攻撃力 x 1.5倍' },
    { name: '東寺', lat: 34.9806, lng: 135.7485, type: 'agility_major', effect: '敏捷 x 1.5倍' },
];

const sounds = {
    bgm: {
        exploration: new Howl({ src: ['/game/exploration_bgm.mp3'], loop: true, volume: 0.5 }),
        battle: new Howl({ src: ['/game/battle_bgm.mp3'], loop: true, volume: 0.5 })
    },
    se: {
        mouseover: new Howl({ src: ['/game/Assorted_SE06-07.mp3'] }),
        buttonMouseover: new Howl({ src: ['/game/Assorted_SE08-13.mp3'] }),
        start: new Howl({ src: ['/game/Horror_Accent09-1.mp3'] }),
        playerAttack: new Howl({ src: ['/game/剣で斬る2.mp3'] }),
        playerDamage: new Howl({ src: ['/game/重いパンチ3.mp3'] }),
        walk: new Howl({ src: ['/game/足音・草原を走る（WASD移動）.mp3'], loop: true, volume: 0.5 }),
        win: new Howl({ src: ['/game/kidouontekina1.mp3'] }),
        bossEnter: new Howl({ src: ['/game/ゴブリンの鳴き声2.mp3'] }),
        bossDefeat: new Howl({ src: ['/game/地響き.mp3'] }),
        spotClick: new Howl({ src: ['/game/Assorted_SE06-07.mp3'] }),
    }
};

function typeMessage(elementId, message, onComplete = () => {}) {
    const element = document.getElementById(elementId);
    let i = 0;
    game.isTyping = true;
    element.textContent = '';
    
    const span = document.createElement('span');
    span.textContent = '';
    element.appendChild(span);
    
    const interval = setInterval(() => {
        if (i < message.length) {
            span.textContent += message.charAt(i);
            i++;
        } else {
            clearInterval(interval);
            game.isTyping = false;
            onComplete();
        }
    }, 25);
}

function addLog(message) {
    const logContent = document.getElementById('log-content');
    logContent.textContent = '';
    typeMessage('log-content', message);
}

function addBattleLog(message, onComplete = () => {}) {
    const logContent = document.getElementById('battle-log-content');
    logContent.textContent = '';
    typeMessage('battle-log-content', message, onComplete);
}

function updateStatus() {
    document.getElementById('player-attack').textContent = player.attack;
    document.getElementById('player-defense').textContent = player.defense;
    document.getElementById('player-hp').textContent = Math.round(player.hp);
    document.getElementById('player-agility').textContent = player.agility;
    document.getElementById('player-evasion').textContent = (player.evasion * 100).toFixed(0);
    document.getElementById('player-critical').textContent = (player.critical * 100).toFixed(0);
}

function updateBattleStatus() {
    document.getElementById('battle-player-hp').textContent = Math.round(player.hp);
    document.getElementById('boss-hp').textContent = Math.round(boss.hp);
    document.getElementById('player-hp-bar').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    document.getElementById('boss-hp-bar').style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
}

function startGame() {
    game.isGameStarted = true;
    game.isExploration = true;
    switchScreen('exploration');
    initMap();
    startTimer();
    sounds.se.start.play();
    sounds.bgm.exploration.play();
    addLog('探索パート開始。60秒以内に禍を討つ力を集めよ。');
}

function switchScreen(screenId) {
    const screens = {
        'title': titleScreen,
        'exploration': explorationScreen,
        'battle': battleScreen,
        'end': endScreen
    };
    for (const key in screens) {
        screens[key].classList.remove('active');
    }
    screens[screenId].classList.add('active');
}

function initMap() {
    if (game.map) {
        game.map.remove();
        game.map = null;
        game.spotMarkers = [];
    }

    // マップのズームレベルを固定し、京都駅周辺を中心に表示
    game.map = L.map('map', {
        center: [34.9961, 135.7570], // 京都駅の少し南
        zoom: 13,
        minZoom: 13,
        maxZoom: 13,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(game.map);

    spots.forEach(spot => {
        const spotIcon = L.icon({
            iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="%23fff" stroke="%23000" stroke-width="2"/></svg>',
            className: 'spot-pin',
            iconSize: [15, 15]
        });
        const marker = L.marker([spot.lat, spot.lng], { icon: spotIcon }).addTo(game.map);
        marker.on('click', () => visitSpot(spot, marker));
        marker.on('mouseover', () => sounds.se.mouseover.play());
        game.spotMarkers.push({ spot, marker });
    });
}

function visitSpot(spot, marker) {
    if (game.visitedSpots.has(spot.name)) {
        addLog(`${spot.name}は既に訪れました。`);
        sounds.se.spotClick.play();
        return;
    }

    addLog(`${spot.name}を訪れました。${spot.effect}を得た。`);
    
    switch (spot.type) {
        case 'hp_major':
            player.hp = player.hp * 1.5;
            player.maxHp = player.maxHp * 1.5;
            break;
        case 'defense_major':
            player.defense *= 1.5;
            break;
        case 'agility_major':
            player.agility *= 1.5;
            break;
        case 'attack_major':
            player.attack *= 1.5;
            break;
        case 'hp':
            player.hp += spot.value;
            player.maxHp += spot.value;
            break;
        case 'defense':
            player.defense += spot.value;
            break;
        case 'agility':
            player.agility += spot.value;
            break;
        case 'evasion':
            player.evasion += spot.value;
            break;
        case 'critical':
            player.critical += spot.value;
            break;
        case 'attack':
            player.attack += spot.value;
            break;
        case 'all':
            player.attack += spot.value;
            player.defense += spot.value;
            player.hp += spot.value;
            player.maxHp += spot.value;
            player.agility += spot.value;
            break;
    }

    game.visitedSpots.add(spot.name);
    marker.setOpacity(0.3);
    updateStatus();
    sounds.se.spotClick.play();
}

function startTimer() {
    game.timer = 60;
    const timerElement = document.getElementById('game-timer');
    timerElement.textContent = game.timer.toFixed(2);
    
    const startTime = Date.now();
    game.timerInterval = setInterval(() => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        game.timer = 60 - elapsedTime;
        if (game.timer <= 0) {
            clearInterval(game.timerInterval);
            timerElement.textContent = '0.00';
            addLog('時間切れ！禍の化身が姿を現した！');
            setTimeout(startBattle, 2000);
        } else {
            timerElement.textContent = game.timer.toFixed(2);
        }
    }, 10);
}

function startBattle() {
    game.isExploration = false;
    game.isBattle = true;
    switchScreen('battle');
    sounds.bgm.exploration.stop();
    sounds.bgm.battle.play();
    sounds.se.bossEnter.play();
    updateBattleStatus();
    addBattleLog('禍の化身が立ちはだかる！戦闘開始！', () => {
        setTimeout(battleLoop, 2000);
    });
}

function battleLoop() {
    if (!game.isBattle || player.hp <= 0 || boss.hp <= 0) {
        return;
    }

    const playerTurnFunction = () => {
        playerTurn(() => {
            if (game.isBattle && player.hp > 0 && boss.hp > 0) {
                setTimeout(bossTurnFunction, 2000);
            }
        });
    };

    const bossTurnFunction = () => {
        bossTurn(() => {
            if (game.isBattle && player.hp > 0 && boss.hp > 0) {
                setTimeout(playerTurnFunction, 2000);
            }
        });
    };
    
    if (player.agility >= boss.agility) {
        playerTurnFunction();
    } else {
        bossTurnFunction();
    }
}


function playerTurn(onComplete) {
    const minDamage = Math.floor(player.attack * 0.9);
    const maxDamage = Math.ceil(player.attack * 1.1);
    let baseDamage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
    let finalDamage = Math.max(1, baseDamage - boss.defense);

    const isCritical = Math.random() < player.critical;
    if (isCritical) {
        finalDamage *= 2;
        addBattleLog('会心の一撃！', () => {
            sounds.se.playerAttack.play();
            boss.hp -= finalDamage;
            addBattleLog(`探索者の攻撃！禍の化身に${finalDamage.toFixed(0)}のダメージ！`, () => {
                updateBattleStatus();
                if (boss.hp <= 0) {
                    endGame('win');
                } else {
                    onComplete();
                }
            });
        });
    } else {
        boss.hp -= finalDamage;
        addBattleLog(`探索者の攻撃！禍の化身に${finalDamage.toFixed(0)}のダメージ！`, () => {
            sounds.se.playerAttack.play();
            updateBattleStatus();
            if (boss.hp <= 0) {
                endGame('win');
            } else {
                onComplete();
            }
        });
    }
}

function bossTurn(onComplete) {
    const isEvaded = Math.random() < player.evasion;
    if (isEvaded) {
        addBattleLog('探索者は攻撃を華麗に回避した！', () => {
            onComplete();
        });
    } else {
        const minDamage = Math.floor(boss.attack * 0.9);
        const maxDamage = Math.ceil(boss.attack * 1.1);
        let baseDamage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
        let finalDamage = Math.max(1, baseDamage - player.defense);

        const isCritical = Math.random() < boss.critical;
        if (isCritical) {
            finalDamage *= 2;
            addBattleLog('禍の化身の会心の一撃！');
        }
        player.hp -= finalDamage;
        addBattleLog(`禍の化身の攻撃！探索者は${finalDamage.toFixed(0)}のダメージを受けた！`, () => {
            sounds.se.playerDamage.play();
            updateBattleStatus();
            if (player.hp <= 0) {
                endGame('lose');
            } else {
                onComplete();
            }
        });
    }
}

function endGame(result) {
    game.isBattle = false;
    sounds.bgm.battle.stop();
    switchScreen('end');
    const endMessage = document.getElementById('end-message');
    const fragmentInfo = document.getElementById('fragment-info');
    const nextStageButton = document.getElementById('next-stage-button');
    const restartButton = document.getElementById('restart-button');

    if (result === 'win') {
        sounds.se.win.play();
        endMessage.textContent = '勝利！';
        explorationScreen.querySelector('.exploration-container').style.filter = 'brightness(1.0)';
        const bossImage = document.getElementById('boss-image');
        bossImage.classList.add('boss-disappear');
        sounds.se.bossDefeat.play();

        const fragment = Math.floor(Math.random() * 3);
        let statChanged = '';
        if (fragment === 0) {
            player.attack += 5;
            statChanged = '攻撃力';
        } else if (fragment === 1) {
            player.defense += 5;
            statChanged = '防御力';
        } else {
            player.maxHp += 5;
            player.hp += 5;
            statChanged = 'HP';
        }
        fragmentInfo.textContent = `呪物の欠片を手に入れた！${statChanged}が+5された。`;
        nextStageButton.style.display = 'inline-block';
        restartButton.textContent = '最初からやり直す';
        restartButton.style.display = 'none';
        nextStageButton.onclick = () => {
            resetGame();
            startGame();
        };

    } else {
        endMessage.textContent = '敗北...';
        document.body.classList.add('body-fade-in-red');
        fragmentInfo.textContent = '';
        nextStageButton.style.display = 'none';
        restartButton.textContent = '最初からやり直す';
        restartButton.style.display = 'inline-block';
        restartButton.onclick = resetGame;
    }
}

function resetGame() {
    player = {
        attack: 10, defense: 10, hp: 100, maxHp: 100, agility: 10, evasion: 0.1, critical: 0.1
    };
    boss = {
        attack: 30, defense: 15, hp: 600, maxHp: 600, agility: 15, evasion: 0.05, critical: 0.05
    };
    game.timer = 60;
    game.visitedSpots.clear();
    document.body.classList.remove('body-fade-in-red');
    if (game.map) {
        game.map.remove();
        game.map = null;
    }
    document.getElementById('boss-image').classList.remove('boss-disappear');
    switchScreen('title');
}

const moveSpeed = 0.0001;
const fastMoveSpeed = 0.0002;
let currentSpeed = moveSpeed;
let playerPos = { x: 0, y: 0 };
let isMoving = false;

function handleMovement(isKeyDown) {
    if (!game.isExploration) return;

    if (isKeyDown) {
        if (!isMoving) {
            isMoving = true;
            sounds.se.walk.play();
        }
    } else {
        isMoving = false;
        sounds.se.walk.stop();
    }
}

document.addEventListener('keydown', (e) => {
    if (!game.isExploration) return;

    switch (e.key) {
        case 'w':
        case 'ArrowUp':
            playerPos.y = currentSpeed;
            break;
        case 'a':
        case 'ArrowLeft':
            playerPos.x = -currentSpeed;
            break;
        case 's':
        case 'ArrowDown':
            playerPos.y = -currentSpeed;
            break;
        case 'd':
        case 'ArrowRight':
            playerPos.x = currentSpeed;
            break;
        case 'Shift':
            currentSpeed = fastMoveSpeed;
            break;
    }
    handleMovement(true);
});

document.addEventListener('keyup', (e) => {
    if (!game.isExploration) return;

    switch (e.key) {
        case 'w':
        case 'ArrowUp':
        case 's':
        case 'ArrowDown':
            playerPos.y = 0;
            break;
        case 'a':
        case 'ArrowLeft':
        case 'd':
        case 'ArrowRight':
            playerPos.x = 0;
            break;
        case 'Shift':
            currentSpeed = moveSpeed;
            break;
    }
    if (playerPos.x === 0 && playerPos.y === 0) {
        handleMovement(false);
    }
});

function animate() {
    if (game.isExploration && (playerPos.x !== 0 || playerPos.y !== 0)) {
        game.playerLat += playerPos.y;
        game.playerLng += playerPos.x;
        game.map.panTo([game.playerLat, game.playerLng]);
    }
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

startButton.addEventListener('click', () => {
    sounds.bgm.exploration.play();
    startGame();
});

document.getElementById('restart-button').addEventListener('click', () => {
    resetGame();
    switchScreen('title');
});

window.addEventListener('load', () => {
    initMap();
    document.getElementById('start-game-button').addEventListener('mouseover', () => sounds.se.buttonMouseover.play());
    document.getElementById('restart-button').addEventListener('mouseover', () => sounds.se.buttonMouseover.play());
});
