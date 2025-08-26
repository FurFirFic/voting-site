// Конфигурация Firebase
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
let votedUsers = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Инициализация приложения...');
    try {
        await loadVotingData();
        await loadVotedUsers();
        
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
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки данных', true);
    }
});

// Загрузка данных голосования
async function loadVotingData() {
    try {
        console.log('Загрузка данных голосования...');
        const doc = await db.collection('voting').doc('config').get();
        
        if (doc.exists) {
            const data = doc.data();
            votingConfig.isActive = data.isActive || false;
            votingConfig.options = data.options || [];
            votingConfig.votingTitle = data.votingTitle || "Голосование";
            votingConfig.adminPassword = data.adminPassword || "admin123";
            console.log('Данные загружены:', votingConfig);
        } else {
            console.log('Данные не найдены, создаем начальные...');
            await initVotingData();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        throw error;
    }
}

// Загрузка списка проголосовавших
async function loadVotedUsers() {
    try {
        const doc = await db.collection('votes').doc('users').get();
        if (doc.exists) {
            votedUsers = doc.data().users || [];
            console.log('Проголосовавших:', votedUsers.length);
        }
    } catch (error) {
        console.error('Ошибка загрузки votedUsers:', error);
        votedUsers = [];
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
    console.log('Начальные данные созданы');
}

// Real-time listener
function setupRealTimeListener() {
    db.collection('voting').doc('config').onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            votingConfig.isActive = data.isActive;
            votingConfig.options = data.options;
            votingConfig.votingTitle = data.votingTitle;
            updateUI();
            updateChart();
            console.log('Данные обновлены в реальном времени');
        }
    });
}

// Проверка статуса голосования пользователя
function checkUserVoteStatus() {
    const userId = getUserId();
    currentUserVoted = votedUsers.includes(userId);
    console.log('Пользователь голосовал:', currentUserVoted);
}

// Генерация ID пользователя
function getUserId() {
    let userId = localStorage.getItem('votingUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('votingUserId', userId);
    }
    return userId;
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
        const optionIndex = votingConfig.options.findIndex(opt => opt.id === optionId);
        
        if (optionIndex !== -1) {
            // Обновляем голоса
            votingConfig.options[optionIndex].votes++;
            
            // Добавляем пользователя в проголосовавшие
            votedUsers.push(userId);
            
            // Сохраняем в Firebase
            await db.collection('voting').doc('config').update({
                options: votingConfig.options
            });
            
            await db.collection('votes').doc('users').update({
                users: votedUsers
            });
            
            currentUserVoted = true;
            showNotification('Ваш голос засчитан!');
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка голосования:', error);
        showNotification('Ошибка при голосовании', true);
    }
}

// АДМИН-ПАНЕЛЬ
function setupAdminPage() {
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    // Заполняем поле заголовка
    const titleInput = document.getElementById('votingTitleInput');
    if (titleInput) {
        titleInput.value = votingConfig.votingTitle;
    }
    
    loadOptionsList();
}

function checkAdminAuth() {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
    console.log('Статус аутентификации:', isAuthenticated);
    
    if (isAuthenticated) {
        showAdminSection();
    } else {
        showLoginSection();
    }
}

function showLoginSection() {
    const loginSection = document.getElementById('loginSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (adminSection) adminSection.style.display = 'none';
}

function showAdminSection() {
    const loginSection = document.getElementById('loginSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'block';
    
    updateUI();
    loadOptionsList();
}

async function login() {
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput ? passwordInput.value : '';
    
    console.log('Попытка входа, пароль:', password);
    
    // Простая проверка пароля
    if (password === votingConfig.adminPassword) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        showAdminSection();
        if (passwordInput) passwordInput.value = '';
        console.log('Вход успешен');
    } else {
        alert('Неверный пароль! Попробуйте: admin123');
        if (passwordInput) passwordInput.value = '';
        console.log('Неверный пароль');
    }
}

function testLogin() {
    document.getElementById('adminPassword').value = 'admin123';
    login();
}

function logout() {
    sessionStorage.removeItem('adminAuthenticated');
    showLoginSection();
    console.log('Выход из админ-панели');
}

// Админские функции
async function startVoting() {
    try {
        votingConfig.isActive = true;
        await db.collection('voting').doc('config').update({ isActive: true });
        showNotification('Голосование запущено!');
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка запуска голосования', true);
    }
}

async function stopVoting() {
    try {
        votingConfig.isActive = false;
        await db.collection('voting').doc('config').update({ isActive: false });
        showNotification('Голосование остановлено!');
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка остановки голосования', true);
    }
}

async function resetVotes() {
    if (confirm('Вы уверены, что хотите сбросить все голоса?')) {
        try {
            // Сбрасываем голоса
            const resetOptions = votingConfig.options.map(opt => ({ ...opt, votes: 0 }));
            
            // Очищаем список проголосовавших
            votedUsers = [];
            
            await db.collection('voting').doc('config').update({ options: resetOptions });
            await db.collection('votes').doc('users').update({ users: [] });
            
            currentUserVoted = false;
            showNotification('Голоса сброшены!');
            updateUI();
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка сброса голосов', true);
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
            
            votingConfig.options.push({
                id: newId,
                name: text,
                votes: 0
            });
            
            await db.collection('voting').doc('config').update({
                options: votingConfig.options
            });
            
            input.value = '';
            showNotification('Вариант ответа добавлен!');
            loadOptionsList();
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка добавления варианта', true);
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
            loadOptionsList();
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка удаления варианта', true);
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
                showNotification('Ошибка обновления заголовка', true);
            }
        }
    }
}

function loadOptionsList() {
    const container = document.getElementById('optionsList');
    if (container) {
        container.innerHTML = votingConfig.options.map(option => `
            <div class="option-item">
                <span>${option.name}</span>
                <button onclick="removeOption(${option.id})">Удалить</button>
            </div>
        `).join('');
    }
}

// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    updateStatus();
    updateVotingTitleDisplay();
    updateOptions();
    updateTotalVotes();
    updateUniqueVoters();
    updateDetailedResults();
    updateResultsTable();
}

function updateStatus() {
    const statusElement = document.getElementById('status');
    const adminStatusElement = document.getElementById('adminStatus');
    
    if (statusElement) {
        statusElement.textContent = votingConfig.isActive ? 
            'Голосование активно' : 'Голосование остановлено';
        statusElement.className = `status ${votingConfig.isActive ? 'active' : 'stopped'}`;
    }
    
    if (adminStatusElement) {
        adminStatusElement.textContent = votingConfig.isActive ? 'активно' : 'остановлено';
    }
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

function updateUniqueVoters() {
    const uniqueVotersElement = document.getElementById('uniqueVoters');
    if (uniqueVotersElement) {
        uniqueVotersElement.textContent = votedUsers.length;
    }
}

function updateResultsTable() {
    const tableBody = document.getElementById('resultsTableBody');
    if (tableBody) {
        const total = votingConfig.options.reduce((sum, opt) => sum + opt.votes, 0);
        
        tableBody.innerHTML = votingConfig.options.map(option => {
            const percentage = total > 0 ? ((option.votes / total) * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td>${option.name}</td>
                    <td>${option.votes}</td>
                    <td>${percentage}%</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${percentage}%">
                                ${percentage}%
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function updateDetailedResults() {
    const resultsElement = document.getElementById('detailedResults');
    if (resultsElement) {
        const total = votingConfig.options.reduce((sum, opt) => sum + opt.votes, 0);
        
        let html = '<div class="results-grid">';
        votingConfig.options.forEach(option => {
            const percentage = total > 0 ? ((option.votes / total) * 100).toFixed(1) : 0;
            html += `
                <div class="result-item">
                    <h4>${option.name}</h4>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percentage}%">
                            ${percentage}%
                        </div>
                    </div>
                    <div class="result-numbers">
                        <span>${option.votes} голосов (${percentage}%)</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        resultsElement.innerHTML = html;
    }
}

// ГРАФИК
let resultsChart = null;

function setupChart() {
    const ctx = document.getElementById('resultsChart');
    if (ctx) {
        resultsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: votingConfig.options.map(opt => opt.name),
                datasets: [{
                    label: 'Голоса',
                    data: votingConfig.options.map(opt => opt.votes),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

function updateChart() {
    if (resultsChart) {
        resultsChart.data.labels = votingConfig.options.map(opt => opt.name);
        resultsChart.data.datasets[0].data = votingConfig.options.map(opt => opt.votes);
        resultsChart.update();
    }
}

// УВЕДОМЛЕНИЯ
function showNotification(message, isError = false) {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.custom-notification');
    oldNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isError ? 
            'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' : 
            'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .custom-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    }
`;
document.head.appendChild(style);

// Проверка подключения к Firebase
async function checkFirebaseConnection() {
    try {
        await db.collection('voting').doc('config').get();
        console.log('Firebase подключен успешно');
        return true;
    } catch (error) {
        console.error('Ошибка подключения к Firebase:', error);
        showNotification('Ошибка подключения к базе данных', true);
        return false;
    }
}