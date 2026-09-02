// --- ИГРОВОЕ СОСТОЯНИЕ (STATE) ---
let gameState = {
    ore: 0,
    gold: 0,
    depth: 0,
    checkpoint: 1,
    minePower: 1,      
    hitPower: 1,       
    miners: 0,
    isCombatMode: false,
    readyForCombat: false,
    monsterHp: 0,
    monsterMaxHp: 0,
    pickaxeTier: 1,    
    swordTier: 1,
    // НАША ПАМЯТЬ ДЛЯ ДИАЛОГОВ: тут игра будет отмечать, что мы уже видели
    shownDialogs: {
        start: false,
        firstGold: false,
        firstMonster: false
    }
};


// Ассортимент Кирок (влияют на добычу руды)
const shopPickaxes = {
    1: { name: "Каменная кирка (+2 копание)", cost: 15, power: 2, reqCheckpoint: 1 },
    2: { name: "Железная кирка (+5 копание)", cost: 120, power: 5, reqCheckpoint: 5 },
    3: { name: "Стальной бур (+15 копание)", cost: 600, power: 15, reqCheckpoint: 15 },
    4: { name: "Алмазное сверло (+60 копание)", cost: 3000, power: 60, reqCheckpoint: 30 }
};

// Ассортимент Мечей (влияют на урон монстрам)
const shopSwords = {
    1: { name: "Деревянный меч (+2 урон)", cost: 25, power: 2, reqCheckpoint: 1 },
    2: { name: "Железный гладиус (+6 урон)", cost: 150, power: 6, reqCheckpoint: 5 },
    3: { name: "Стальной палаш (+20 урон)", cost: 700, power: 20, reqCheckpoint: 15 },
    4: { name: "Световой клинок (+80 урон)", cost: 4000, power: 80, reqCheckpoint: 30 }
};

function getMonsterData(checkpoint) {
    if (checkpoint === 50) return { name: "КРИСТАЛЛ ЖИЗНИ (ФИНАЛ)", hp: 50000 };
    return {
        name: `Подземный Монстр Слой ${checkpoint}`,
        hp: Math.round(15 * Math.pow(1.25, checkpoint)) 
    };
}

// --- HTML ЭЛЕМЕНТЫ ---
const oreDisplay = document.getElementById('ore-count');
const goldDisplay = document.getElementById('gold-count');
const depthDisplay = document.getElementById('depth-count');
const checkpointDisplay = document.getElementById('checkpoint-id');
const monsterNameDisplay = document.getElementById('monster-name');
const gpsDisplay = document.getElementById('gps-count');
const statMinePower = document.getElementById('stat-mine-power');
const statHitPower = document.getElementById('stat-hit-power');

const mainActionBtn = document.getElementById('main-action-btn');
const farmOreBtn = document.getElementById('farm-ore-btn'); // Новая кнопка фарма
const targetEmoji = document.getElementById('target-emoji');
const actionDescription = document.getElementById('action-description');
const hpBarContainer = document.getElementById('target-hp-bar');
const hpFill = document.getElementById('target-hp-fill');

const sellOreBtn = document.getElementById('sell-ore-btn');
const buyPickaxeBtn = document.getElementById('buy-pickaxe-btn');
const pickaxeNameDisplay = document.getElementById('pickaxe-name');
const pickaxeCostDisplay = document.getElementById('pickaxe-cost');

const buySwordBtn = document.getElementById('buy-sword-btn');
const swordNameDisplay = document.getElementById('sword-name');
const swordCostDisplay = document.getElementById('sword-cost');

const minerCostDisplay = document.getElementById('miner-cost');
const minerCountDisplay = document.getElementById('miner-count');
const buyMinerBtn = document.getElementById('buy-miner-btn');
const resetBtn = document.getElementById('reset-btn');

// --- СЮЖЕТНЫЕ ДИАЛОГИ И ОКНА ---
const storyModal = document.getElementById('story-modal');
const storySpeaker = document.getElementById('story-speaker');
const storyText = document.getElementById('story-text');
const closeStoryBtn = document.getElementById('close-story-btn');

// --- ЗАГРУЗКА АУДИОАССЕТОВ ---
// Замените названия файлов в кавычках на ваши реальные файлы из папки audio
const soundMine = new Audio('audio/hit_mine.wav');   // Удар кирки
const soundSword = new Audio('audio/hit_sword.wav'); // Удар мечом
const soundCoin = new Audio('audio/buy_shop.wav');   // Звук покупки/продажи
const soundMonsterDie = new Audio('audio/monster_die.wav'); // Звук гибели врага



// Проверяем, что все элементы интерфейса диалогов успешно найдены на HTML-странице
if (!storyModal || !storySpeaker || !storyText || !closeStoryBtn) {
    console.error("Критическая ошибка: В HTML файле не найдены элементы для отображения диалогов (#story-modal и др.)");
}

function showDialog(speaker, text, key) {
    // Безопасная инициализация объекта памяти, если вдруг он стерся или пуст
    if (!gameState.shownDialogs) {
        gameState.shownDialogs = {};
    }
    
    // Если в памяти уже отмечено true для этого ключа — прерываем выполнение и не показываем окно
    if (gameState.shownDialogs[key] === true) {
        return; 
    }
    
    // Заполняем текстовые поля модального окна сюжета данными
    storySpeaker.textContent = speaker;
    storyText.textContent = text;
    storyModal.style.display = "flex"; // Активируем флекс-контейнер overlay для вывода на экран
    
    // Вешаем обработчик события на клик по кнопке закрытия окна
    closeStoryBtn.onclick = function() {
        storyModal.style.display = "none"; // Прячем окно обратно
        
        // Записываем в объект состояния факт успешного просмотра сюжета
        gameState.shownDialogs[key] = true;
        
        saveGame(); // Синхронизируем изменения с локальным хранилищем LocalStorage
        updateUI(); // Перерисовываем элементы интерфейса
    };
}



// --- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА (UI) ---
function updateUI() {
    oreDisplay.textContent = Math.floor(gameState.ore);
    goldDisplay.textContent = Math.floor(gameState.gold);
    depthDisplay.textContent = gameState.depth;
    checkpointDisplay.textContent = gameState.checkpoint;
    gpsDisplay.textContent = gameState.miners;
    minerCountDisplay.textContent = gameState.miners;
    statMinePower.textContent = gameState.minePower;
    statHitPower.textContent = gameState.hitPower;

    let currentMinerCost = Math.round(30 * Math.pow(1.4, gameState.miners));

        // --- РАЗДЕЛЕННЫЙ ВИЗУАЛ: КИРКА ВСЕГДА КИРКА ---
    if (gameState.isCombatMode) {
        // В самом бою копать шахту нельзя — она заблокирована
        mainActionBtn.disabled = true;
        mainActionBtn.className = "main-target mining-mode";
        targetEmoji.textContent = "🔒"; 
        
        let monster = getMonsterData(gameState.checkpoint);
        monsterNameDisplay.textContent = monster.name;
        actionDescription.textContent = `Вы сражаетесь! Кликайте по кнопке атаки ниже!`;
        hpBarContainer.style.display = "block";
        
        let hpPercent = (gameState.monsterHp / gameState.monsterMaxHp) * 100;
        hpFill.style.width = hpPercent + "%";

                // --- ИСПРАВЛЕНО: ЯРКАЯ И ЧИТАЕМАЯ КНОПКА АТАКЫ БЕЗ ЗЕЛЕНКИ ---
        farmOreBtn.style.display = "none"; 
        const combatBtn = document.getElementById('start-combat-btn') || farmOreBtn; 
        combatBtn.style.display = "block";
        combatBtn.className = "farm-btn"; 
        
        // Меняем цвет самой кнопки на сочный красный
        combatBtn.style.backgroundColor = "#ff4757";
        // УБИРАЕМ ЗЕЛЕНУЮ ПЛАШКУ: Переписываем тень на тёмно-красную под тон кнопки
        combatBtn.style.boxShadow = "0 4px 0 #ff214f";
        // Делаем текст белым, крупным и очень чётким
        combatBtn.style.color = "#ffffff";
        combatBtn.style.fontWeight = "bold";
        combatBtn.style.textShadow = "1px 1px 2px rgba(0,0,0,0.5)"; // Тень под текстом для читаемости
        
        combatBtn.textContent = `⚔️ Нанести удар (-${gameState.hitPower} HP) [HP: ${gameState.monsterHp}/${gameState.monsterMaxHp}]`;


        buyMinerBtn.textContent = "В бою наем закрыт!";
        buyMinerBtn.disabled = true;

    } else if (gameState.readyForCombat) {
        // ТУПИК: Большая кнопка РАБОТАЕТ и копает руду, но глубина не идет
        mainActionBtn.disabled = false;
        mainActionBtn.className = "main-target mining-mode";
        targetEmoji.textContent = "⛏️";
        
        let monster = getMonsterData(gameState.checkpoint);
        monsterNameDisplay.textContent = `${monster.name} преграждает путь!`;
        actionDescription.textContent = `Центральная кнопка безопасно копает руду. Нажмите красную кнопку ниже, чтобы начать бой!`;
        hpBarContainer.style.display = "none";

        // Показываем кнопку входа в бой (сделаем её красной визуально)
        farmOreBtn.style.display = "block";
        farmOreBtn.style.backgroundColor = "#ff4757";
        farmOreBtn.textContent = `⚔️ Вступить в бой с монстром`;

        buyMinerBtn.textContent = "Нанять";
        buyMinerBtn.disabled = gameState.gold < currentMinerCost;

    } else {
        // ОБЫЧНОЕ ПРЕДВИЖЕНИЕ
        mainActionBtn.disabled = false;
        mainActionBtn.className = "main-target mining-mode";
        targetEmoji.textContent = "⛏️";
        monsterNameDisplay.textContent = "Путь свободен";
        actionDescription.textContent = `Вы продвигаетесь вглубь... (${10 - (gameState.depth % 10)}м до чекпоинта)`;
        hpBarContainer.style.display = "none";

        farmOreBtn.style.display = "none"; // Прячем нижнюю кнопку

        buyMinerBtn.textContent = "Нанять";
        buyMinerBtn.disabled = gameState.gold < currentMinerCost;
    }


    if (!gameState.isCombatMode) {
        minerCostDisplay.textContent = `${currentMinerCost} 🪙`;
    } else {
        minerCostDisplay.textContent = "—";
    }

    // Отрисовка Кирок в магазине
    let currentPick = shopPickaxes[gameState.pickaxeTier];
    if (currentPick) {
        if (gameState.checkpoint >= currentPick.reqCheckpoint) {
            pickaxeNameDisplay.textContent = currentPick.name;
            pickaxeCostDisplay.textContent = currentPick.cost + " 🪙";
            buyPickaxeBtn.disabled = gameState.gold < currentPick.cost;
        } else {
            pickaxeNameDisplay.textContent = `${currentPick.name}`;
            pickaxeCostDisplay.textContent = `Нужен чекп. ${currentPick.reqCheckpoint}`;
            buyPickaxeBtn.disabled = true;
        }
    } else {
        pickaxeNameDisplay.textContent = "Лучшая кирка куплена";
        pickaxeCostDisplay.textContent = "—";
        buyPickaxeBtn.disabled = true;
    }

    // Отрисовка Мечей в магазине
    let currentSword = shopSwords[gameState.swordTier];
    if (currentSword) {
        if (gameState.checkpoint >= currentSword.reqCheckpoint) {
            swordNameDisplay.textContent = currentSword.name;
            swordCostDisplay.textContent = currentSword.cost + " 🪙";
            buySwordBtn.disabled = gameState.gold < currentSword.cost;
        } else {
            swordNameDisplay.textContent = `${currentSword.name}`;
            swordCostDisplay.textContent = `Нужен чекп. ${currentSword.reqCheckpoint}`;
            buySwordBtn.disabled = true;
        }
    } else {
        swordNameDisplay.textContent = "Лучший меч куплен";
        swordCostDisplay.textContent = "—";
        buySwordBtn.disabled = true;
    }

    sellOreBtn.disabled = gameState.ore <= 0;
       // --- ПРОВЕРКА И ЗАПУСК СЮЖЕТНЫХ ДИАЛОГОВ ---
    
    // 1. Диалог на самом старте игры
    if (gameState.depth === 0) {
        showDialog(
            "Староста деревни", 
            "Привет, работяга! У твоей жены Розы сильная лихорадка... Спасти её может только особый Кристалл Жизни, скрытый на глубине 50 чекпоинтов. Хватай кирку и копай руду на круглую кнопку! Полученную руду продавай Купцу на рынке.", 
            "start"
        );
    }
    
    // 2. Диалог, когда игрок заработал первые деньги (больше или равно 15 монет на кирку)
    if (gameState.gold >= 15 && gameState.pickaxeTier === 1) {
        showDialog(
            "Купец", 
            "Ого, у тебя появились первые монеты! Скорее загляни в магазин снаряжения на поверхности. Там ты можешь купить Каменную кирку, чтобы копать быстрее, или нанять первого Шахтера-работягу для пассивного дохода!", 
            "firstGold"
        );
    }

    // 3. Диалог, когда игрок впервые уперся в монстра (на 10 метрах)
    if (gameState.readyForCombat && gameState.checkpoint === 1) {
        showDialog(
            "Трусливый Шахтер", 
            "Стой! Слышишь этот ужасный скрежет? Путь преградил Каменный Слизень! Твоя кирка тут бессильна. Купи Деревянный меч в магазине снаряжения, а затем нажми красную кнопку 'Вступить в бой' под шахтой!", 
            "firstMonster"
        );
    }
 
}

// --- ИЗОЛИРОВАННАЯ ЛОГИКА КНОПОК ---

// Центральная кнопка: СТРОГО КИРКА (дает руду всегда, кроме активного боя)
mainActionBtn.addEventListener('click', () => {
    if (!gameState.isCombatMode) {
        // Проигрываем звук удара о камень
        soundMine.currentTime = 0; // Сбрасываем таймер звука в начало, чтобы можно было быстро кликать
        soundMine.play();
        gameState.ore += gameState.minePower; // Дает руду в зависимости от кирки

        // Двигаем глубину только если впереди чисто
        if (!gameState.readyForCombat) {
            gameState.depth += 1;
            if (gameState.depth > 0 && gameState.depth % 10 === 0) {
                gameState.readyForCombat = true;
            }
        }
        updateUI();
        saveGame();
    }
});

// --- ИСПРАВЛЕНО: ЗВУКИ БОЕВКИ И ВХОДА В БОЙ ---
farmOreBtn.addEventListener('click', () => {
    if (gameState.readyForCombat && !gameState.isCombatMode) {
        // Активируем режим боя по нажатию снизу
        gameState.readyForCombat = false;
        gameState.isCombatMode = true;
        let monster = getMonsterData(gameState.checkpoint);
        gameState.monsterHp = monster.hp;
        gameState.monsterMaxHp = monster.hp;
    } else if (gameState.isCombatMode) {
        // ТЕПЕРЬ ЗВУК РАБОТАЕТ НА КАЖДЫЙ УДАР:
        soundSword.currentTime = 0;
        soundSword.play();
        
        // Наносим урон мечом, пока мы в бою
        gameState.monsterHp -= gameState.hitPower;
        if (gameState.monsterHp <= 0) {
            soundMonsterDie.play(); // <--- Добавляем сочный звук победы!
            gameState.isCombatMode = false;
            if (gameState.checkpoint === 50) {
                triggerFinalCutscene();
                return;
            }
            gameState.checkpoint += 1;
            gameState.depth += 1; // Проходим чекпоинт
        }
    }
    updateUI();
    saveGame();
});



// --- СКУПЩИК РУДЫ ---
sellOreBtn.addEventListener('click', () => {
    if (gameState.ore > 0) {
        soundCoin.play(); // Звук монеток!
        gameState.gold += gameState.ore;
        gameState.ore = 0;
        updateUI();
        saveGame();
    }
});

// --- ИСПРАВЛЕНО: ЗВУК ПОКУПКИ КИРКИ ---
buyPickaxeBtn.addEventListener('click', () => {
    let currentPick = shopPickaxes[gameState.pickaxeTier];
    if (currentPick && gameState.gold >= currentPick.cost) {
        if (gameState.checkpoint >= currentPick.reqCheckpoint) {
            soundCoin.currentTime = 0; // Сбрасываем таймер звука
            soundCoin.play();          // Воспроизводим дзиньканье!
            
            gameState.gold -= currentPick.cost;
            gameState.minePower = currentPick.power;
            gameState.pickaxeTier += 1;
            updateUI();
            saveGame();
        }
    }
});

// --- ИСПРАВЛЕНО: ЗВУК ПОКУПКИ МЕЧА ---
buySwordBtn.addEventListener('click', () => {
    let currentSword = shopSwords[gameState.swordTier];
    if (currentSword && gameState.gold >= currentSword.cost) {
        if (gameState.checkpoint >= currentSword.reqCheckpoint) {
            soundCoin.currentTime = 0; // Сбрасываем таймер звука
            soundCoin.play();          // Воспроизводим дзиньканье!
            
            gameState.gold -= currentSword.cost;
            gameState.hitPower = currentSword.power;
            gameState.swordTier += 1;
            updateUI();
            saveGame();
        }
    }
});
// --- НАЕМ ШАХТЕРОВ ---
buyMinerBtn.addEventListener('click', () => {
    let currentMinerCost = Math.round(30 * Math.pow(1.4, gameState.miners));
    if (gameState.gold >= currentMinerCost && !gameState.isCombatMode) {
        gameState.gold -= currentMinerCost;
        gameState.miners += 1;
        updateUI();
        saveGame();
    }
});

// Пассивный доход капает всегда, кроме активного боя
setInterval(() => {
    if (gameState.miners > 0 && !gameState.isCombatMode) {
        gameState.ore += (gameState.miners / 10);
        updateUI();
    }
}, 100);

function triggerFinalCutscene() {
    alert("🎉 ИСТОРИЯ ЗАВЕРШЕНА! 🎉\n\nВы добыли Кристалл Жизни!");
    localStorage.removeItem('story_miner_save');
    location.reload();
}

function saveGame() {
    localStorage.setItem('story_miner_save', JSON.stringify(gameState));
}

function loadGame() {
    const savedData = localStorage.getItem('story_miner_save');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed && typeof parsed === 'object') {
                gameState = { ...gameState, ...parsed };
            }
        } catch (e) {
            console.error("Ошибка загрузки:", e);
        }
    }
    // Вызываем обновление UI СРАЗУ при запуске, чтобы убрать зеленые кнопки!
    updateUI();
}

resetBtn.addEventListener('click', () => {
    if(confirm("Вы уверены, что хотите обнулить историю?")) {
        localStorage.removeItem('story_miner_save');
        location.reload();
    }
});

// Запуск загрузки
loadGame();
