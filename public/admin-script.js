let currentUser = null;
let eventSource = null;
let botEventSource = null;
let allUsers = [];
let allBots = [];
let systemStats = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
    loadUserInfo();
    loadOverviewStats();
    setupEventListeners();
});

function initializeAdminPanel() {
    setupMobileMenu();
    setupThemeToggle();
    setupNavigation();
}

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });
    
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light');
        const isLight = document.body.classList.contains('light');
        themeIcon.className = isLight ? 'bi bi-sun' : 'bi bi-moon-stars';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light');
        themeIcon.className = 'bi bi-sun';
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            switchSection(section);
            
            document.querySelector('.sidebar').classList.remove('mobile-open');
        });
    });
}

function switchSection(section) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.add('hidden');
    });
    
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    document.getElementById('pageTitle').textContent = getSectionTitle(section);
    
    switch(section) {
        case 'overview':
            loadOverviewStats();
            break;
        case 'users':
            loadUsers();
            break;
        case 'bots':
            loadBots();
            break;
        case 'coins':
            loadCoinsStats();
            break;
        case 'system':
            loadSystemConfig();
            break;
        case 'logs':
            break;
    }
}

function getSectionTitle(section) {
    const titles = {
        'overview': 'Resumen General',
        'users': 'Gestión de Usuarios',
        'bots': 'Gestión de Bots',
        'coins': 'Estadísticas de Coins',
        'system': 'Configuración del Sistema',
        'logs': 'Logs del Servidor'
    };
    return titles[section] || 'Panel de Administración';
}

function setupEventListeners() {
    document.getElementById('refreshStats').addEventListener('click', loadOverviewStats);
    document.getElementById('syncAllBots').addEventListener('click', syncAllBots);
    document.getElementById('downloadBackup').addEventListener('click', downloadBackup);
    
    document.getElementById('refreshUsers').addEventListener('click', loadUsers);
    document.getElementById('setGlobalCoins').addEventListener('click', showGlobalCoinsModal);
    document.getElementById('usersSearch').addEventListener('input', filterUsers);
    
    document.getElementById('refreshBots').addEventListener('click', loadBots);
    document.getElementById('viewAllLogs').addEventListener('click', startServerLogs);
    document.getElementById('botsSearch').addEventListener('input', filterBots);
    
    document.getElementById('refreshCoins').addEventListener('click', loadCoinsStats);
    document.getElementById('exportCoins').addEventListener('click', exportCoinsData);
    document.getElementById('coinsSearch').addEventListener('input', filterCoins);
    
    document.getElementById('saveGlobalCoins').addEventListener('click', saveGlobalCoins);
    
    document.getElementById('startLogs').addEventListener('click', startServerLogs);
    document.getElementById('stopLogs').addEventListener('click', stopServerLogs);
    document.getElementById('clearLogs').addEventListener('click', clearLogs);
    document.getElementById('copyLogs').addEventListener('click', copyLogs);
    
    setupModalEvents();
}

function setupModalEvents() {
    document.getElementById('userModalClose').addEventListener('click', closeUserModal);
    document.getElementById('modalClose').addEventListener('click', closeUserModal);
    
    document.getElementById('botModalClose').addEventListener('click', closeBotModal);
    
    document.getElementById('globalCoinsModalClose').addEventListener('click', closeGlobalCoinsModal);
    document.getElementById('globalCoinsCancel').addEventListener('click', closeGlobalCoinsModal);
    document.getElementById('globalCoinsSave').addEventListener('click', saveGlobalCoinsLimit);
    
    document.getElementById('modalAddCoins').addEventListener('click', addCoinsToUser);
    document.getElementById('modalRemoveCoins').addEventListener('click', removeCoinsFromUser);
    document.getElementById('modalToggleAdmin').addEventListener('click', toggleUserRole);
    document.getElementById('modalDeleteUser').addEventListener('click', deleteUser);
document.getElementById('botModalLogs').addEventListener('click', function() {
    const phone = document.getElementById('botModalPhone').textContent;
    closeBotModal();
    viewBotLogs(phone);
});

document.getElementById('botModalConfig').addEventListener('click', function() {
    const phone = document.getElementById('botModalPhone').textContent;
    showNotification(`Configuración del bot ${phone} - Próximamente`, 'info');
});

document.getElementById('botModalDelete').addEventListener('click', function() {
    const phone = document.getElementById('botModalPhone').textContent;
    deleteBot(phone);
});
}

async function loadUserInfo() {
    try {
        const response = await fetch('/api/user-info');
        const data = await response.json();
        
        if (data.ok) {
            currentUser = data;
            document.getElementById('userName').textContent = data.username;
            document.getElementById('userEmail').textContent = data.email;
        }
    } catch (error) {
        console.error('Error cargando información del usuario:', error);
    }
}

async function loadOverviewStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        
        if (data.ok) {
            systemStats = data.stats;
            updateOverviewStats(data.stats);
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

function updateOverviewStats(stats) {
    document.getElementById('kpiTotalUsers').innerHTML = `<i class="bi bi-people"></i> Total Usuarios: ${stats.users.total}`;
    document.getElementById('kpiTotalBots').innerHTML = `<i class="bi bi-robot"></i> Total Bots: ${stats.bots.total}`;
    document.getElementById('kpiActiveBots').innerHTML = `<span class="dot ${stats.bots.active > 0 ? 'online' : ''}"></span> Bots Activos: ${stats.bots.active}`;
    document.getElementById('kpiCoinsUsage').innerHTML = `<i class="bi bi-coin"></i> Uso de Coins: ${stats.coins.usagePercentage}`;
    
    document.getElementById('kpiAdmins').innerHTML = `<i class="bi bi-shield-check"></i> Administradores: ${stats.users.admins}`;
    document.getElementById('kpiRegularUsers').innerHTML = `<i class="bi bi-person"></i> Usuarios Regulares: ${stats.users.regular}`;
    document.getElementById('kpiMonthlyLimit').innerHTML = `<i class="bi bi-arrow-repeat"></i> Límite Mensual: ${stats.coins.monthlyLimit}`;
    document.getElementById('kpiLastUpdate').innerHTML = `<i class="bi bi-clock"></i> Actualizado: ${new Date().toLocaleTimeString()}`;
}

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.users) {
            allUsers = data.users;
            renderUsersGrid(data.users);
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

function renderUsersGrid(users) {
    const grid = document.getElementById('usersGrid');
    const emptyMsg = document.getElementById('usersEmptyMsg');
    
    if (users.length === 0) {
        grid.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
    }
    
    emptyMsg.classList.add('hidden');
    
    grid.innerHTML = users.map(user => `
        <div class="server-card" onclick="openUserModal('${user.email}')">
            <div class="server-header">
                <div class="server-avatar">
                    <i class="bi bi-person"></i>
                </div>
                <div class="server-info">
                    <div class="server-name">${user.username}</div>
                    <div class="server-jid">${user.email}</div>
                    <div class="server-status">
                        <span class="dot ${user.role === 'admin' ? 'online' : ''}"></span>
                        ${user.role === 'admin' ? 'Administrador' : 'Usuario'} • ${user.bots.length} bots
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterUsers() {
    const searchTerm = document.getElementById('usersSearch').value.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm) || 
        user.username.toLowerCase().includes(searchTerm)
    );
    renderUsersGrid(filteredUsers);
}

async function loadBots() {
    try {
        const response = await fetch('/api/admin/active-bots');
        const data = await response.json();
        
        if (data.ok) {
            allBots = data.bots;
            renderBotsGrid(data.bots);
        }
    } catch (error) {
        console.error('Error cargando bots:', error);
    }
}

function renderBotsGrid(bots) {
    const grid = document.getElementById('botsGrid');
    const emptyMsg = document.getElementById('botsEmptyMsg');
    
    if (bots.length === 0) {
        grid.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
    }
    
    emptyMsg.classList.add('hidden');
    
    grid.innerHTML = bots.map(bot => `
        <div class="server-card" onclick="openBotModal('${bot.id}')">
            <div class="server-header">
                <div class="server-avatar" style="background-image: url('${bot.profilePic || ''}')">
                    ${!bot.profilePic ? '<i class="bi bi-robot"></i>' : ''}
                </div>
                <div class="server-info">
                    <div class="server-name">${bot.name}</div>
                    <div class="server-jid">${bot.id}</div>
                    <div class="server-status">
                        <span class="dot ${bot.status === 'open' ? 'online' : 'offline'}"></span>
                        ${bot.status === 'open' ? 'En línea' : 'Desconectado'} • ${bot.owner}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterBots() {
    const searchTerm = document.getElementById('botsSearch').value.toLowerCase();
    const filteredBots = allBots.filter(bot => 
        bot.id.toLowerCase().includes(searchTerm) || 
        bot.name.toLowerCase().includes(searchTerm) ||
        bot.owner.toLowerCase().includes(searchTerm)
    );
    renderBotsGrid(filteredBots);
}

async function loadCoinsStats() {
    try {
        const response = await fetch('/api/admin/global-coins-usage');
        const data = await response.json();
        
        if (data.ok) {
            renderCoinsTable(data.users);
            updateCoinsSummary(data.summary);
        }
    } catch (error) {
        console.error('Error cargando estadísticas de coins:', error);
    }
}

function renderCoinsTable(users) {
    const table = document.getElementById('coinsTable');
    
    table.innerHTML = users.map(user => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:white;font-size:14px">
                        <i class="bi bi-person"></i>
                    </div>
                    <div>
                        <div style="font-weight:600">${user.username}</div>
                        <div style="font-size:12px;color:var(--text-secondary)">${user.email}</div>
                    </div>
                </div>
            </td>
            <td>${user.currentCoins}</td>
            <td>${user.monthlyCoins}</td>
            <td>${user.coinsUsed}</td>
            <td>${user.usagePercentage}</td>
            <td>${user.lastCoinReset || 'Nunca'}</td>
            <td>
                <button class="btn small" onclick="openUserModal('${user.email}')">
                    <i class="bi bi-pencil"></i> Editar
                </button>
            </td>
        </tr>
    `).join('');
}

function updateCoinsSummary(summary) {
    document.getElementById('coinsTotalUsage').innerHTML = `<i class="bi bi-graph-up"></i> Uso Total: ${summary.totalCoinsUsed}`;
    document.getElementById('coinsMonthlyLimit').innerHTML = `<i class="bi bi-arrow-repeat"></i> Límite Mensual: ${summary.monthlyLimit}`;
    document.getElementById('coinsGlobalUsage').innerHTML = `<i class="bi bi-percent"></i> Porcentaje Global: ${summary.globalUsagePercentage}`;
}

function filterCoins() {
    const searchTerm = document.getElementById('coinsSearch').value.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm) || 
        user.username.toLowerCase().includes(searchTerm)
    );
    renderCoinsTable(filteredUsers);
}

async function loadSystemConfig() {
    try {
        const response = await fetch('/api/system/config');
        const data = await response.json();
        
        if (data.ok) {
            document.getElementById('globalCoinsLimit').value = data.config.monthlyCoinsLimit;
            document.getElementById('currentCoinsLimit').textContent = data.config.monthlyCoinsLimit;
            document.getElementById('systemTotalUsers').textContent = systemStats.users.total || '—';
            document.getElementById('systemLastUpdate').textContent = new Date().toLocaleString();
        }
    } catch (error) {
        console.error('Error cargando configuración del sistema:', error);
    }
}

function openUserModal(email) {
    const user = allUsers.find(u => u.email === email);
    if (!user) return;
    
    document.getElementById('userModalEmail').textContent = user.email;
    document.getElementById('modalUsername').value = user.username;
    document.getElementById('modalCoins').value = user.coins;
    document.getElementById('modalBotsCount').textContent = user.bots.length;
    document.getElementById('modalRole').textContent = user.role;
    document.getElementById('modalLastReset').textContent = user.lastCoinReset || 'Nunca';
    
    document.getElementById('modalToggleAdmin').innerHTML = user.role === 'admin' ? 
        '<i class="bi bi-person"></i> Quitar Admin' : 
        '<i class="bi bi-shield-check"></i> Hacer Admin';
    
    document.getElementById('userModal').classList.add('show');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('show');
}

function openBotModal(botId) {
    const bot = allBots.find(b => b.id === botId);
    if (!bot) return;
    
    document.getElementById('botModalJid').textContent = bot.id;
    document.getElementById('botModalName').textContent = bot.name;
    document.getElementById('botModalOwner').textContent = bot.owner;
    document.getElementById('botModalPhone').textContent = bot.id.replace('@s.whatsapp.net', '');
    document.getElementById('botModalState').textContent = bot.status;
    document.getElementById('botModalUptime').textContent = formatUptime(bot.uptime);
    
    const statusDot = document.getElementById('botModalStatusDot');
    const statusText = document.getElementById('botModalStatusText');
    
    if (bot.status === 'open') {
        statusDot.className = 'dot online';
        statusText.textContent = 'En línea';
    } else {
        statusDot.className = 'dot offline';
        statusText.textContent = 'Desconectado';
    }
    
    const avatar = document.getElementById('botModalAvatar');
    if (bot.profilePic) {
        avatar.style.backgroundImage = `url('${bot.profilePic}')`;
        avatar.innerHTML = '';
    } else {
        avatar.style.backgroundImage = 'none';
        avatar.innerHTML = '<i class="bi bi-robot"></i>';
    }
    
    loadBotDetailedInfo(bot.id.replace('@s.whatsapp.net', ''));
    
    document.getElementById('botModal').classList.add('show');
}

function closeBotModal() {
    document.getElementById('botModal').classList.remove('show');
}
async function loadBotDetailedInfo(phone) {
    try {
        const response = await fetch(`/api/bot/info?phone=${encodeURIComponent(phone)}`);
        const data = await response.json();
        
        if (data.ok && data.bot) {
            updateBotModalWithDetails(data.bot);
        }
    } catch (error) {
        console.error('Error cargando información detallada del bot:', error);
    }
}

function updateBotModalWithDetails(botInfo) {
    const detailInfo = document.querySelector('.detail-info');
    detailInfo.innerHTML = `
        <div class="info-item">
            <label>Propietario:</label>
            <span id="botModalOwner">${botInfo.userInfo?.name || '—'}</span>
        </div>
        <div class="info-item">
            <label>Teléfono:</label>
            <span id="botModalPhone">${botInfo.phone || '—'}</span>
        </div>
        <div class="info-item">
            <label>Estado:</label>
            <span id="botModalState">${botInfo.status || '—'}</span>
        </div>
        <div class="info-item">
            <label>Uptime:</label>
            <span id="botModalUptime">${botInfo.uptime?.formatted || '—'}</span>
        </div>
        <div class="info-item">
            <label>Usuarios bloqueados:</label>
            <span>${botInfo.blockedUsers?.count || 0}</span>
        </div>
        <div class="info-item">
            <label>Última conexión:</label>
            <span>${botInfo.lastOpenAt ? new Date(botInfo.lastOpenAt).toLocaleString() : '—'}</span>
        </div>
    `;
}

function startBotLogs(phone) {
    if (botEventSource) {
        botEventSource.close();
    }
    
    const logBox = document.getElementById('serverLogs');
    logBox.innerHTML = `<div class="log-entry"><span class="log-time">[00:00:00]</span><span class="log-message log-info">Conectando a logs del bot ${phone}...</span></div>`;
    
    botEventSource = new EventSource(`/logs?phone=${encodeURIComponent(phone)}`);
    
    botEventSource.onopen = function() {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span><span class="log-message log-success">Conectado a logs del bot ${phone}</span>`;
        logBox.appendChild(logEntry);
        logBox.scrollTop = logBox.scrollHeight;
    };
    
    botEventSource.onmessage = function(event) {
        if (event.data === ': ping') return;
        
        try {
            const logData = JSON.parse(event.data);
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const time = new Date(logData.ts).toLocaleTimeString();
            const typeClass = `log-${logData.type}`;
            
            logEntry.innerHTML = `
                <span class="log-time">[${time}]</span>
                <span class="log-message ${typeClass}">${logData.text}</span>
            `;
            
            logBox.appendChild(logEntry);
            logBox.scrollTop = logBox.scrollHeight;
        } catch (e) {
            console.error('Error parsing log:', e);
        }
    };
    
    botEventSource.onerror = function(error) {
        const errorEntry = document.createElement('div');
        errorEntry.className = 'log-entry';
        errorEntry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span><span class="log-message log-error">Error en conexión de logs del bot: ${error.message || 'Desconocido'}</span>`;
        logBox.appendChild(errorEntry);
        logBox.scrollTop = logBox.scrollHeight;
        stopBotLogs();
    };
    
    showNotification(`Conectado a logs del bot ${phone}`, 'success');
}

function stopBotLogs() {
    if (botEventSource) {
        botEventSource.close();
        botEventSource = null;
    }
    showNotification('Logs del bot detenidos', 'info');
}

function viewBotLogs(phone) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector('.nav-item[data-section="logs"]').classList.add('active');
    switchSection('logs');
    
    startBotLogs(phone);
}

async function deleteBot(phone) {
    if (!confirm(`¿Estás seguro de eliminar el bot ${phone}? Esta acción eliminará todos los datos de la sesión.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/bot?phone=${encodeURIComponent(phone)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.ok) {
            showNotification(data.message, 'success');
            closeBotModal();
            loadBots();
            loadOverviewStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error eliminando bot:', error);
        showNotification('Error eliminando bot', 'error');
    }
}
function showGlobalCoinsModal() {
    document.getElementById('newGlobalCoins').value = systemStats.coins?.monthlyLimit || 500;
    document.getElementById('globalUsersCount').textContent = systemStats.users?.regular || 0;
    document.getElementById('globalCoinsModal').classList.add('show');
}

function closeGlobalCoinsModal() {
    document.getElementById('globalCoinsModal').classList.remove('show');
}

async function syncAllBots() {
    try {
        const response = await fetch('/api/bots/sync-all', { method: 'POST' });
        const data = await response.json();
        
        if (data.ok) {
            showNotification(`Sincronizados ${data.updated} bots`, 'success');
            loadOverviewStats();
            loadBots();
        }
    } catch (error) {
        console.error('Error sincronizando bots:', error);
        showNotification('Error sincronizando bots', 'error');
    }
}

async function downloadBackup() {
    try {
        const response = await fetch('/api/admin/backup');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('Backup descargado correctamente', 'success');
    } catch (error) {
        console.error('Error descargando backup:', error);
        showNotification('Error descargando backup', 'error');
    }
}

async function saveGlobalCoins() {
    const newLimit = document.getElementById('globalCoinsLimit').value;
    if (!newLimit || newLimit < 1) {
        showNotification('Límite inválido', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/system/config/monthly-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthlyCoinsLimit: parseInt(newLimit) })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            showNotification(data.message, 'success');
            loadSystemConfig();
            loadOverviewStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error guardando configuración:', error);
        showNotification('Error guardando configuración', 'error');
    }
}

async function saveGlobalCoinsLimit() {
    const newLimit = document.getElementById('newGlobalCoins').value;
    if (!newLimit || newLimit < 1) {
        showNotification('Límite inválido', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/system/config/monthly-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthlyCoinsLimit: parseInt(newLimit) })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            showNotification(data.message, 'success');
            closeGlobalCoinsModal();
            loadSystemConfig();
            loadOverviewStats();
            loadCoinsStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error guardando límite global:', error);
        showNotification('Error guardando límite global', 'error');
    }
}

async function addCoinsToUser() {
    const email = document.getElementById('userModalEmail').textContent;
    const currentCoins = parseInt(document.getElementById('modalCoins').value);
    const amount = prompt('¿Cuántos coins quieres agregar?', '100');
    
    if (!amount || isNaN(amount)) return;
    
    try {
        const response = await fetch('/api/admin/add-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, amount: parseInt(amount) })
        });
        
        const data = await response.json();
        
        if (data.message) {
            showNotification(data.message, 'success');
            document.getElementById('modalCoins').value = data.coins;
            loadUsers();
            loadCoinsStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error agregando coins:', error);
        showNotification('Error agregando coins', 'error');
    }
}

async function removeCoinsFromUser() {
    const email = document.getElementById('userModalEmail').textContent;
    const currentCoins = parseInt(document.getElementById('modalCoins').value);
    const amount = prompt('¿Cuántos coins quieres remover?', '50');
    
    if (!amount || isNaN(amount)) return;
    
    try {
        const response = await fetch('/api/admin/remove-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, amount: parseInt(amount) })
        });
        
        const data = await response.json();
        
        if (data.message) {
            showNotification(data.message, 'success');
            document.getElementById('modalCoins').value = data.coins;
            loadUsers();
            loadCoinsStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error removiendo coins:', error);
        showNotification('Error removiendo coins', 'error');
    }
}

async function toggleUserRole() {
    const email = document.getElementById('userModalEmail').textContent;
    const currentRole = document.getElementById('modalRole').textContent;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    const endpoint = newRole === 'admin' ? '/api/admin/make-admin' : '/api/admin/remove-admin';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.message) {
            showNotification(data.message, 'success');
            closeUserModal();
            loadUsers();
            loadOverviewStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error cambiando rol:', error);
        showNotification('Error cambiando rol', 'error');
    }
}

async function deleteUser() {
    const email = document.getElementById('userModalEmail').textContent;
    
    if (!confirm(`¿Estás seguro de eliminar al usuario ${email}? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/user?email=${encodeURIComponent(email)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.ok) {
            showNotification(data.message, 'success');
            closeUserModal();
            loadUsers();
            loadOverviewStats();
            loadBots();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showNotification('Error eliminando usuario', 'error');
    }
}

function startServerLogs() {
    if (eventSource) return;
    
    const logBox = document.getElementById('serverLogs');
    logBox.innerHTML = '<div class="log-entry"><span class="log-time">[00:00:00]</span><span class="log-message log-info">Conectando a todos los logs del sistema...</span></div>';
    
    eventSource = new EventSource('/api/admin/all-logs');
    
    eventSource.onopen = function() {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = '<span class="log-time">[' + new Date().toLocaleTimeString() + ']</span><span class="log-message log-success">Conectado a todos los logs del sistema</span>';
        logBox.appendChild(logEntry);
        logBox.scrollTop = logBox.scrollHeight;
    };
    
    eventSource.onmessage = function(event) {
        if (event.data === ': ping') return;
        
        try {
            const logData = JSON.parse(event.data);
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const time = new Date(logData.ts).toLocaleTimeString();
            const typeClass = `log-${logData.type}`;
            
            logEntry.innerHTML = `
                <span class="log-time">[${time}]</span>
                <span class="log-message ${typeClass}"><strong>${logData.id}:</strong> ${logData.text}</span>
            `;
            
            logBox.appendChild(logEntry);
            logBox.scrollTop = logBox.scrollHeight;
        } catch (e) {
            console.error('Error parsing log:', e);
        }
    };
    
    eventSource.onerror = function(error) {
        const errorEntry = document.createElement('div');
        errorEntry.className = 'log-entry';
        errorEntry.innerHTML = '<span class="log-time">[' + new Date().toLocaleTimeString() + ']</span><span class="log-message log-error">Error en conexión de logs: ' + (error.message || 'Desconocido') + '</span>';
        logBox.appendChild(errorEntry);
        logBox.scrollTop = logBox.scrollHeight;
        stopServerLogs();
    };
    
    showNotification('Conectado a todos los logs del sistema', 'success');
}

function stopServerLogs() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    if (botEventSource) {
        botEventSource.close();
        botEventSource = null;
    }
    showNotification('Logs detenidos', 'info');
}

function clearLogs() {
    document.getElementById('serverLogs').innerHTML = '';
}

function copyLogs() {
    const logBox = document.getElementById('serverLogs');
    const text = logBox.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Logs copiados al portapapeles', 'success');
    });
}

function exportCoinsData() {
    const table = document.getElementById('coinsTable');
    let csv = 'Usuario,Email,Coins Actuales,Límite Mensual,Coins Usados,% Uso,Último Reset\n';
    
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const username = cells[0].querySelector('div > div:first-child').textContent.trim();
            const email = cells[0].querySelector('div > div:last-child').textContent.trim();
            const currentCoins = cells[1].textContent.trim();
            const monthlyLimit = cells[2].textContent.trim();
            const coinsUsed = cells[3].textContent.trim();
            const usagePercent = cells[4].textContent.trim();
            const lastReset = cells[5].textContent.trim();
            
            csv += `"${username}","${email}",${currentCoins},${monthlyLimit},${coinsUsed},${usagePercent},"${lastReset}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coins-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Datos de coins exportados', 'success');
}

function formatUptime(ms) {
    if (!ms) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="bi bi-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-left: 4px solid var(--${type});
        border-radius: var(--radius);
        padding: 12px 16px;
        box-shadow: var(--shadow);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-success { --success: #10b981; }
    .notification-error { --error: #ef4444; }
    .notification-warning { --warning: #f59e0b; }
    .notification-info { --info: #6366f1; }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .notification-content i {
        font-size: 16px;
    }
`;
document.head.appendChild(style);