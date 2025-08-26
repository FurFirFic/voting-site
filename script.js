// Конфигурация голосования
let votingConfig = {
    isActive: false,
    options: [],
    adminPassword: "admin123", // Пароль по умолчанию
    votedUsers: [] // Массив для отслеживания проголосовавших
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    
    if (window.location.pathname.includes('admin.html')) {
        checkAdminAuth();
        setupAdminPage();
    } else {
        updateUI();
        setupChart();
        checkVotingStatus();
    }
});

// Настройка админ-страницы
function setupAdminPage() {
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
}

// Проверка аутентификации администратора
function checkAdminAuth() {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
        showAdminSection();
    } else {
        showLoginSection();
    }
}

// Показать секцию входа
function showLoginSection() {
    const loginSection = document.getElementById('loginSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (adminSection) adminSection.style.display = 'none';
}

// Показать админ-секцию
function showAdminSection() {
    const loginSection = document.getElementById('loginSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'block';
    
    updateUI();
    loadOptionsList();
}

// Вход в админ-панель
function login() {
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput ? passwordInput.value : '';
    
    console.log('Введенный пароль:', password);
    console.log('Ожидаемый пароль:', votingConfig.adminPassword);
    
    if (password === votingConfig.adminPassword) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        showAdminSection();
        if (passwordInput) passwordInput.value = ''; // Очищаем поле ввода
    } else {
        alert('Неверный пароль! Попробуйте снова.');
        if (passwordInput) passwordInput.value = ''; // Очищаем поле ввода
    }
}

// Выход из админ-панели
function logout() {
    sessionStorage.removeItem('adminAuthenticated');
    showLoginSection();
}

// Загрузка данных из LocalStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('votingData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            votingConfig.isActive = data.isActive || false;
            votingConfig.options = data.options || [];
            votingConfig.votedUsers = data.votedUsers || [];
            votingConfig.adminPassword = data.adminPassword || 'admin123';
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
            // Создаем стандартную конфигурацию при ошибке
            votingConfig.options = [
                { id: 1, name: "error А", votes: 0 },
                { id: 2, name: "error Б", votes: 0 },
                { id: 3, name: "error В", votes: 0 }
            ];
        }
    } else {
        // Если данных нет, создаем стандартную конфигурацию
        votingConfig.options = [
            { id: 1, name: "error А", votes: 0 },
            { id: 2, name: "error Б", votes: 0 },
            { id: 3, name: "error В", votes: 0 }
        ];
    }
}

// Сохранение данных в LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('votingData', JSON.stringify(votingConfig));
}

// Генерация уникального ID пользователя
function getUserId() {
    let userId = localStorage.getItem('votingUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('votingUserId', userId);
    }
    return userId;
}

// Проверка, голосовал ли уже пользователь
function hasUserVoted() {
    const userId = getUserId();
    return votingConfig.votedUsers.includes(userId);
}

// Голосование
function vote(optionId) {
    if (!votingConfig.isActive) {
        showNotification('Голосование остановлено!');
        return;
    }
    
    if (hasUserVoted()) {
        showNotification('Вы уже голосовали!');
        return;
    }
    
    const option = votingConfig.options.find(opt => opt.id === optionId);
    if (option) {
        option.votes++;
        const userId = getUserId();
        votingConfig.votedUsers.push(userId);
        saveToLocalStorage();
        updateUI();
        showNotification(`Ваш голос за "${option.name}" засчитан!`);
    }
}

// Добавление нового варианта ответа
function addOption() {
    const input = document.getElementById('newOptionText');
    if (!input) return;
    
    const text = input.value.trim();
    
    if (text) {
        const newId = votingConfig.options.length > 0 
            ? Math.max(...votingConfig.options.map(opt => opt.id)) + 1 
            : 1;
        
        votingConfig.options.push({
            id: newId,
            name: text,
            votes: 0
        });
        
        input.value = '';
        saveToLocalStorage();
        updateUI();
        loadOptionsList();
        showNotification('Вариант ответа добавлен!');
    } else {
        alert('Введите текст варианта ответа!');
    }
}

// Удаление варианта ответа
function removeOption(optionId) {
    if (confirm('Удалить этот вариант ответа?')) {
        votingConfig.options = votingConfig.options.filter(opt => opt.id !== optionId);
        saveToLocalStorage();
        updateUI();
        loadOptionsList();
        showNotification('Вариант ответа удален!');
    }
}

// Загрузка списка вариантов в админке
function loadOptionsList() {
    const container = document.getElementById('optionsList');
    if (container) {
        container.innerHTML = votingConfig.options.map(option => `
            <div class="option-item">
                <span>${option.name}</span>
                <button onclick="removeOption(${option.id})"> Удалить</button>
            </div>
        `).join('');
    }
}

// Обновление интерфейса
function updateUI() {
    updateStatus();
    updateOptions();
    updateTotalVotes();
    updateUniqueVoters();
    updateDetailedResults();
    updateResultsTable();
    updateChart();
}

// Обновление статуса
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

// Обновление уникальных voters
function updateUniqueVoters() {
    const uniqueVotersElement = document.getElementById('uniqueVoters');
    if (uniqueVotersElement) {
        uniqueVotersElement.textContent = votingConfig.votedUsers.length;
    }
}

// Обновление вариантов ответа
function updateOptions() {
    const optionsContainer = document.getElementById('optionsContainer');
    if (optionsContainer) {
        optionsContainer.innerHTML = votingConfig.options.map(option => `
            <div class="option" data-id="${option.id}">
                <h3>${option.name}</h3>
                <div class="votes">${option.votes} голосов</div>
                <button class="vote-btn" onclick="vote(${option.id})" 
                    ${!votingConfig.isActive || hasUserVoted() ? 'disabled' : ''}>
                    ${hasUserVoted() ? 'ы проголосовали' : 'Проголосовать'}
                </button>
            </div>
        `).join('');
    }
}

// Обновление общего количества голосов
function updateTotalVotes() {
    const totalVotesElement = document.getElementById('totalVotes');
    if (totalVotesElement) {
        const total = votingConfig.options.reduce((sum, opt) => sum + opt.votes, 0);
        totalVotesElement.textContent = total;
    }
}

// Обновление таблицы результатов
function updateResultsTable() {
    const tableBody = document.getElementById('resultsTableBody');
    if (tableBody) {
        const total = votingConfig.options.reduce((sum, opt) => sum + opt.votes, 0);
        
        tableBody.innerHTML = votingConfig.options.map(option => {
            const percentage = total > 0 ? ((option.votes / total) * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td><strong>${option.name}</strong></td>
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

// Админские функции
function startVoting() {
    votingConfig.isActive = true;
    saveToLocalStorage();
    updateUI();
    showNotification('Голосование запущено!');
}

function stopVoting() {
    votingConfig.isActive = false;
    saveToLocalStorage();
    updateUI();
    showNotification('Голосование остановлено!');
}

function resetVotes() {
    if (confirm('Вы уверены, что хотите сбросить все голоса? Это удалит все текущие результаты.')) {
        votingConfig.options.forEach(option => {
            option.votes = 0;
        });
        votingConfig.votedUsers = [];
        saveToLocalStorage();
        updateUI();
        showNotification('Голоса сброшены!');
    }
}

// График результатов
let resultsChart = null;

function setupChart() {
    const ctx = document.getElementById('resultsChart');
    if (ctx) {
        resultsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: votingConfig.options.map(opt => opt.name),
                datasets: [{
                    label: 'Количество голосов',
                    data: votingConfig.options.map(opt => opt.votes),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
                    ],
                    borderColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Результаты голосования',
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        color: '#2c3e50'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
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

// Детальные результаты для админки
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

// Вспомогательные функции
function showNotification(message) {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.custom-notification');
    oldNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%);
        color: white;
        padding: 18px 28px;
        border-radius: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        font-weight: bold;
        font-size: 1.1em;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Проверка статуса голосования
function checkVotingStatus() {
    // Дополнительная логика если нужна
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { 
            transform: translateX(100px); 
            opacity: 0; 
        }
        to { 
            transform: translateX(0); 
            opacity: 1; 
        }
    }
    
    @keyframes fadeIn {
        from { 
            opacity: 0; 
            transform: translateY(20px); 
        }
        to { 
            opacity: 1; 
            transform: translateY(0); 
        }
    }
    
    .results-grid {
        display: grid;
        gap: 20px;
        margin-top: 25px;
    }
    
    .result-item {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 25px;
        border-radius: 12px;
        border-left: 4px solid #667eea;
        animation: fadeIn 0.5s ease;
    }
    
    .progress-bar {
        background: #e9ecef;
        height: 25px;
        border-radius: 12px;
        margin: 15px 0;
        overflow: hidden;
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.1);
        position: relative;
    }
    
    .progress {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        height: 100%;
        border-radius: 12px;
        transition: width 0.5s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 0.9em;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    }
    
    .result-numbers {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        color: #2c3e50;
        font-size: 1.1em;
        margin-top: 10px;
    }
    
    .custom-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%);
        color: white;
        padding: 18px 28px;
        border-radius: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        font-weight: bold;
        font-size: 1.1em;
    }
    
    .option {
        animation: fadeIn 0.5s ease;
    }
    
    /* Стили для таблицы */
    .results-table {
        width: 100%;
        border-collapse: collapse;
        margin: 25px 0;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        animation: fadeIn 0.5s ease;
    }
    
    .results-table th,
    .results-table td {
        padding: 18px;
        text-align: left;
        border-bottom: 1px solid #e9ecef;
    }
    
    .results-table th {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 0.9em;
    }
    
    .results-table tr:last-child td {
        border-bottom: none;
    }
    
    .results-table tr:hover {
        background: rgba(102, 126, 234, 0.05);
    }
    
    .results-table td:nth-child(1) {
        font-weight: bold;
        color: #2c3e50;
    }
    
    .results-table td:nth-child(2),
    .results-table td:nth-child(3) {
        text-align: center;
        font-weight: bold;
    }
    
    .results-table td:nth-child(4) {
        min-width: 200px;
    }
`;
document.head.appendChild(style);

// Функция для тестирования (можно удалить в продакшене)
function testNotification() {
    showNotification('Тестовое уведомление!');
}