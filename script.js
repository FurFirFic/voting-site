// Конфигурация Firebase (ЗАМЕНИТЕ НА СВОЮ!)
const firebaseConfig = {
    apiKey: "AIzaSyC28gm9R_BakgKcZyG2KtLs1x1yGtkOahw",
    authDomain: "cftbg-66ea3.firebaseapp.com",
    projectId: "cftbg-66ea3",
    storageBucket: "cftbg-66ea3.firebasestorage.app",
    messagingSenderId: "296352300057",
    appId: "1:296352300057:web:e80d982ab73c39859cfe88"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Глобальные переменные
let votingConfig = {
    isActive: false,
    options: [],
    votingTitle: "Голосование",
    adminPassword: "admin123"
};

let currentUserVoted = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadVotingData();
        
        if (window.location.pathname.includes('admin.html')) {
            checkAdminAuth();
            setupAdminPage();
        } else {
            checkUserVoteStatus();
            updateUI();
            setupChart();
            setupRealTimeListener();
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showNotification('Ошибка загрузки данных');
    }
});

// Загрузка данных голосования
async function loadVotingData() {
    try {
        const doc = await db.collection('voting').doc('config').get();
        
        if (doc.exists) {
            const data = doc.data();
            votingConfig.isActive = data.isActive || false;
            votingConfig.options = data.options || [];
            votingConfig.votingTitle = data.votingTitle || "Голосование";
            votingConfig.adminPassword = data.adminPassword || "admin123";
        } else {
            // Создаем начальные данные
            await initVotingData();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        throw error;
    }
}

// Инициализация начальных данных
async function initVotingData() {
    votingConfig = {
        isActive: false,
        options: [
            { id: 1, name: "Проект А", votes: 0 },
            { id: 2, name: "Проект Б", votes: 0 },
            { id: 3, name: "Проект В", votes: 0 }
        ],
        votingTitle: "Голосование за лучший проект",
        adminPassword: "admin123"
    };
    
    await db.collection('voting').doc('config').set(votingConfig);
    await db.collection('votes').doc('users').set({ users: [] });
}

// Сохранение данных голосования
async function saveVotingData() {
    try {
        await db.collection('voting').doc('config').set(votingConfig);
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка сохранения данных');
    }
}

// Реaltime listener для обновлений
function setupRealTimeListener() {
    db.collection('voting').doc('config')
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                votingConfig.isActive = data.isActive;
                votingConfig.options = data.options;
                votingConfig.votingTitle = data.votingTitle;
                updateUI();
                updateChart();
            }
        });
}

// Проверка статуса голосования пользователя
async function checkUserVoteStatus() {
    try {
        const userId = getUserId();
        const votesDoc = await db.collection('votes').doc('users').get();
        
        if (votesDoc.exists) {
            const votedUsers = votesDoc.data().users || [];
            currentUserVoted = votedUsers.includes(userId);
        }
    } catch (error) {
        console.error('Ошибка проверки голоса:', error);
    }
}

// Голосование
async function vote(optionId) {
    if (!votingConfig.isActive) {
        showNotification('Голосование остановлено!');
        return;
    }
    
    if (currentUserVoted) {
        showNotification('Вы уже голосовали!');
        return;
    }
    
    try {
        const userId = getUserId();
        
        // Обновляем голоса в Firestore
        const optionIndex = votingConfig.options.findIndex(opt => opt.id === optionId);
        if (optionIndex !== -1) {
            votingConfig.options[optionIndex].votes++;
            
            // Добавляем пользователя в проголосовавшие
            const votesDoc = await db.collection('votes').doc('users').get();
            const votedUsers = votesDoc.exists ? votesDoc.data().users : [];
            votedUsers.push(userId);
            
            // Сохраняем все изменения атомарно
            const batch = db.batch();
            batch.update(db.collection('voting').doc('config'), {
                options: votingConfig.options
            });
            batch.set(db.collection('votes').doc('users'), {
                users: votedUsers
            });
            
            await batch.commit();
            
            currentUserVoted = true;
            showNotification('Ваш голос засчитан!');
        }
    } catch (error) {
        console.error('Ошибка голосования:', error);
        showNotification('Ошибка при голосовании');
    }
}

// Админские функции
async function startVoting() {
    try {
        votingConfig.isActive = true;
        await db.collection('voting').doc('config').update({
            isActive: true
        });
        showNotification('Голосование запущено!');
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка запуска голосования');
    }
}

async function stopVoting() {
    try {
        votingConfig.isActive = false;
        await db.collection('voting').doc('config').update({
            isActive: false
        });
        showNotification('Голосование остановлено!');
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка остановки голосования');
    }
}

async function resetVotes() {
    if (confirm('Вы уверены, что хотите сбросить все голоса?')) {
        try {
            // Сбрасываем голоса
            const resetOptions = votingConfig.options.map(opt => ({
                ...opt,
                votes: 0
            }));
            
            // Очищаем список проголосовавших
            const batch = db.batch();
            batch.update(db.collection('voting').doc('config'), {
                options: resetOptions
            });
            batch.set(db.collection('votes').doc('users'), {
                users: []
            });
            
            await batch.commit();
            
            currentUserVoted = false;
            showNotification('Голоса сброшены!');
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка сброса голосов');
        }
    }
}

async function addOption() {
    const input = document.getElementById('newOptionText');
    if (!input) return;
    
    const text = input.value.trim();
    
    if (text) {
        try {
            const newId = votingConfig.options.length > 0 
                ? Math.max(...votingConfig.options.map(opt => opt.id)) + 1 
                : 1;
            
            const newOption = {
                id: newId,
                name: text,
                votes: 0
            };
            
            votingConfig.options.push(newOption);
            await db.collection('voting').doc('config').update({
                options: votingConfig.options
            });
            
            input.value = '';
            showNotification('Вариант ответа добавлен!');
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка добавления варианта');
        }
    }
}

async function removeOption(optionId) {
    if (confirm('Удалить этот вариант ответа?')) {
        try {
            votingConfig.options = votingConfig.options.filter(opt => opt.id !== optionId);
            await db.collection('voting').doc('config').update({
                options: votingConfig.options
            });
            showNotification('Вариант ответа удален!');
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка удаления варианта');
        }
    }
}

async function updateVotingTitle() {
    const titleInput = document.getElementById('votingTitleInput');
    if (titleInput) {
        const newTitle = titleInput.value.trim();
        if (newTitle) {
            try {
                votingConfig.votingTitle = newTitle;
                await db.collection('voting').doc('config').update({
                    votingTitle: newTitle
                });
                showNotification('Заголовок голосования обновлен!');
            } catch (error) {
                console.error('Ошибка:', error);
                showNotification('Ошибка обновления заголовка');
            }
        }
    }
}

// Вспомогательные функции
function getUserId() {
    let userId = localStorage.getItem('votingUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('votingUserId', userId);
    }
    return userId;
}

function updateUI() {
    updateStatus();
    updateVotingTitleDisplay();
    updateOptions();
    updateTotalVotes();
    updateDetailedResults();
    updateResultsTable();
}

function updateVotingTitleDisplay() {
    const titleElement = document.getElementById('votingTitle');
    if (titleElement) {
        titleElement.textContent = votingConfig.votingTitle;
    }
}

function updateOptions() {
    const optionsContainer = document.getElementById('optionsContainer');
    if (optionsContainer) {
        optionsContainer.innerHTML = votingConfig.options.map(option => `
            <div class="option" data-id="${option.id}">
                <h3>${option.name}</h3>
                <div class="votes">${option.votes} голосов</div>
                <button class="vote-btn" onclick="vote(${option.id})" 
                    ${!votingConfig.isActive || currentUserVoted ? 'disabled' : ''}>
                    ${currentUserVoted ? 'Вы проголосовали' : 'Голосовать'}
                </button>
            </div>
        `).join('');
    }
}

function updateTotalVotes() {
    const totalVotesElement = document.getElementById('totalVotes');
    if (totalVotesElement) {
        const total = votingConfig.options.reduce((sum, opt) => sum + opt.votes, 0);
        totalVotesElement.textContent = total;
    }
}

// Остальные функции (updateStatus, updateDetailedResults, updateResultsTable, setupChart, updateChart)
// остаются без изменений, как в предыдущей версии

// Добавляем обработку ошибок Firebase
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.background = isError ? 
        'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' : 
        'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}