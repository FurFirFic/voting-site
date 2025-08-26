// Конфигурация голосования
let votingConfig = {
    isActive: false,
    options: [
        { id: 1, name: "Проект А", votes: 0 },
        { id: 2, name: "Проект Б", votes: 0 },
        { id: 3, name: "Проект В", votes: 0 }
    ]
};

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function() {
    loadFromLocalStorage();
    updateUI();
    setupChart();
});

// Загрузка данных из LocalStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem("votingData");
    if (saved) {
        const data = JSON.parse(saved);
        votingConfig.isActive = data.isActive;
        votingConfig.options = data.options;
    }
}

// Сохранение данных в LocalStorage
function saveToLocalStorage() {
    localStorage.setItem("votingData", JSON.stringify(votingConfig));
}

// Обновление интерфейса
function updateUI() {
    // Обновление статуса
    const statusElement = document.getElementById("status");
    const adminStatusElement = document.getElementById("adminStatus");
    
    if (statusElement) {
        statusElement.textContent = votingConfig.isActive ? 
            "Голосование активно" : "Голосование остановлено";
        statusElement.className = "status " + (votingConfig.isActive ? "active" : "stopped");
    }
    
    if (adminStatusElement) {
        adminStatusElement.textContent = votingConfig.isActive ? "активно" : "остановлено";
    }

    // Обновление кнопок голосования
    const voteButtons = document.querySelectorAll(".vote-btn");
    voteButtons.forEach(btn => {
        btn.disabled = !votingConfig.isActive;
    });

    // Обновление счетчиков голосов
    votingConfig.options.forEach(option => {
        const votesElement = document.querySelector(".option[data-id=\"" + option.id + "\"] .votes");
        if (votesElement) {
            votesElement.textContent = option.votes + " голосов";
        }
    });

    // Обновление общего количества голосов
    const totalVotesElement = document.getElementById("totalVotes");
    if (totalVotesElement) {
        const total = votingConfig.options.reduce((sum, opt) => sum + opt.votes, 0);
        totalVotesElement.textContent = total;
    }

    // Обновление детальных результатов в админке
    updateDetailedResults();
    
    // Обновление графика
    updateChart();
}

// Голосование
function vote(optionId) {
    if (!votingConfig.isActive) return;
    
    const option = votingConfig.options.find(opt => opt.id === optionId);
    if (option) {
        option.votes++;
        saveToLocalStorage();
        updateUI();
        
        // Показать уведомление
        showNotification("Ваш голос за \"" + option.name + "\" засчитан!");
    }
}

// Админские функции
function startVoting() {
    votingConfig.isActive = true;
    saveToLocalStorage();
    updateUI();
    showNotification("Голосование запущено!");
}

function stopVoting() {
    votingConfig.isActive = false;
    saveToLocalStorage();
    updateUI();
    showNotification("Голосование остановлено!");
}

function resetVotes() {
    if (confirm("Вы уверены, что хотите сбросить все голоса?")) {
        votingConfig.options.forEach(option => {
            option.votes = 0;
        });
        saveToLocalStorage();
        updateUI();
        showNotification("Голоса сброшены!");
    }
}

// График результатов
let resultsChart = null;

function setupChart() {
    const ctx = document.getElementById("resultsChart");
    if (ctx) {
        resultsChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: votingConfig.options.map(opt => opt.name),
                datasets: [{
                    label: "Количество голосов",
                    data: votingConfig.options.map(opt => opt.votes),
                    backgroundColor: [
                        "#FF6384",
                        "#36A2EB",
                        "#FFCE56"
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function updateChart() {
    if (resultsChart) {
        resultsChart.data.datasets[0].data = votingConfig.options.map(opt => opt.votes);
        resultsChart.update();
    }
}

// Детальные результаты для админки
function updateDetailedResults() {
    const resultsElement = document.getElementById("detailedResults");
    if (resultsElement) {
        const total = votingConfig.options.reduce((sum, opt) => sum + opt.votes, 0);
        
        let html = "<div class=\"results-grid\">";
        votingConfig.options.forEach(option => {
            const percentage = total > 0 ? ((option.votes / total) * 100).toFixed(1) : 0;
            html += "<div class=\"result-item\">" +
                "<h4>" + option.name + "</h4>" +
                "<div class=\"progress-bar\">" +
                "<div class=\"progress\" style=\"width: " + percentage + "%\"></div>" +
                "</div>" +
                "<div class=\"result-numbers\">" +
                "<span>" + option.votes + " голосов (" + percentage + "%)</span>" +
                "</div>" +
                "</div>";
        });
        html += "</div>";
        
        resultsElement.innerHTML = html;
    }
}

// Вспомогательные функции
function showNotification(message) {
    // Создаем уведомление
    const notification = document.createElement("div");
    notification.style.cssText = "position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 25px; border-radius: 5px; z-index: 1000;";
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
