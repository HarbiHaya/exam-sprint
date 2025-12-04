let currentUser = null;
let users = {};

function loadData() {
    const saved = localStorage.getItem('examSprint');
    if (saved) {
        const data = JSON.parse(saved);
        users = data.users || {};
        currentUser = data.currentUser || null;
    }
    renderUsers();
    loadUserTasks();
}

function saveData() {
    localStorage.setItem('examSprint', JSON.stringify({ users, currentUser }));
}

function addUser() {
    const input = document.getElementById('userName');
    const name = input.value.trim().toUpperCase();
    if (!name) return;
    
    if (!users[name]) {
        users[name] = { tasks: {} };
    }
    currentUser = name;
    saveData();
    renderUsers();
    loadUserTasks();
    input.value = '';
}

function selectUser(name) {
    currentUser = name;
    saveData();
    renderUsers();
    loadUserTasks();
}

function deleteUser(name, e) {
    e.stopPropagation();
    if (confirm('Remove ' + name + '?')) {
        delete users[name];
        if (currentUser === name) {
            currentUser = Object.keys(users)[0] || null;
        }
        saveData();
        renderUsers();
        loadUserTasks();
    }
}

function getProgress(name) {
    const user = users[name];
    if (!user) return 0;
    const total = document.querySelectorAll('input[data-task]').length;
    const done = Object.values(user.tasks).filter(v => v).length;
    return Math.round((done / total) * 100);
}

function getColor(p) {
    if (p < 25) return 'var(--red)';
    if (p < 50) return 'var(--orange)';
    if (p < 75) return 'var(--yellow)';
    return 'var(--green)';
}

function renderUsers() {
    const grid = document.getElementById('usersGrid');
    const names = Object.keys(users);
    
    if (!names.length) {
        grid.innerHTML = '<p class="no-users">No one here yet. Enter your name to start.</p>';
        return;
    }

    grid.innerHTML = names.map(name => {
        const p = getProgress(name);
        const active = name === currentUser;
        return `
            <div class="user-card ${active ? 'active' : ''}">
                <div class="user-header">
                    <span class="name">${name}</span>
                    <span class="percentage">${p}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${p}%;background:${getColor(p)}"></div>
                </div>
                <div class="user-actions">
                    <button class="btn-select" onclick="selectUser('${name}')">${active ? 'Selected' : 'Select'}</button>
                    <button class="btn-delete" onclick="deleteUser('${name}',event)">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

function loadUserTasks() {
    document.querySelectorAll('input[data-task]').forEach(cb => {
        cb.checked = currentUser && users[currentUser] 
            ? users[currentUser].tasks[cb.dataset.task] || false 
            : false;
    });
    updateCounters();
}

function handleTask(e) {
    if (!currentUser) {
        alert('Enter your name first!');
        e.target.checked = false;
        return;
    }
    users[currentUser].tasks[e.target.dataset.task] = e.target.checked;
    saveData();
    renderUsers();
    updateCounters();
}

function updateCounters() {
    document.querySelectorAll('.phase').forEach(phase => {
        const checks = phase.querySelectorAll('input[data-task]');
        const done = Array.from(checks).filter(c => c.checked).length;
        const counter = phase.querySelector('.phase-counter');
        if (counter) {
            counter.textContent = done + '/' + checks.length;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    document.querySelectorAll('input[data-task]').forEach(cb => {
        cb.addEventListener('change', handleTask);
    });
    
    document.getElementById('userName').addEventListener('keypress', e => {
        if (e.key === 'Enter') addUser();
    });
});