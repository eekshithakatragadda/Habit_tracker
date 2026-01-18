// app.js

const API_URL = '/api';

// State
let state = {
    stats: { level: 1, xp: 0, badges: [] },
    habits: []
};

// DOM Elements
const els = {
    userLevel: document.getElementById('user-level'),
    userXP: document.getElementById('user-xp'),
    xpBar: document.getElementById('xp-bar'),
    badgesList: document.getElementById('badges-list'),
    habitList: document.getElementById('habit-list'),
    addBtn: document.getElementById('add-habit-btn'),
    addModal: document.getElementById('add-modal'),
    saveHabitBtn: document.getElementById('save-habit'),
    cancelAddBtn: document.getElementById('cancel-add'),
    habitTitleInput: document.getElementById('habit-title'),
    habitDescInput: document.getElementById('habit-desc'),
    missModal: document.getElementById('miss-modal'),
    confirmMissBtn: document.getElementById('confirm-miss'),
    cancelMissBtn: document.getElementById('cancel-miss'),
    customReasonInput: document.getElementById('custom-reason'),
    customReasonInput: document.getElementById('custom-reason'), // Quote section removed
    themeToggle: document.getElementById('theme-toggle'),
    rewardModal: document.getElementById('reward-modal'),
    rewardTitle: document.getElementById('reward-title'),
    rewardMessage: document.getElementById('reward-message'),
    closeRewardBtn: document.getElementById('close-reward')
};

let currentHabitIdToMiss = null;
let selectedReason = '';

// --- Initialization ---

async function init() {
    setupEventListeners();
    setupReminderUI();          // Reminder UI
    setupCalendarListeners();

    // Initial Load
    fetchHabits();
    fetchStats();
    await fetchStats();
    await fetchHabits();
    checkTheme();

    startReminderLoop();           // Start checking reminders
    requestNotificationPermission(); // Ask for permission
}

function setupEventListeners() {
    // Theme
    els.themeToggle.addEventListener('click', toggleTheme);

    // Test Notification
    const testBtn = document.getElementById('test-notification');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            if (!("Notification" in window)) {
                showToast("System Info", "Browser notifications not supported");
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                new Notification("Notifications Enabled! 🔔", {
                    body: "Great! You will now receive habit reminders.",
                    icon: 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png'
                });
            } else {
                showToast("Notification Test", "Permission denied/default. Using In-App Toast!");
            }
        });
    }

    // Add Habit
    els.addBtn.addEventListener('click', () => {
        // Reset form for new habit
        document.getElementById('edit-habit-id').value = '';
        els.habitTitleInput.value = '';
        els.habitDescInput.value = '';
        document.getElementById('target-days').value = '';
        document.getElementById('reminder-toggle').checked = false;
        document.getElementById('reminder-time').value = '';
        document.getElementById('reminder-time').disabled = true;
        document.querySelector('#add-modal h3').textContent = "New Quest";
        document.getElementById('save-habit').textContent = "Start Quest";

        showModal(els.addModal);
    });
    els.cancelAddBtn.addEventListener('click', () => hideModal(els.addModal));
    els.saveHabitBtn.addEventListener('click', saveHabit);

    // Miss Habit
    els.cancelMissBtn.addEventListener('click', () => {
        hideModal(els.missModal);
        currentHabitIdToMiss = null;
        selectedReason = '';
        document.querySelectorAll('.tag').forEach(t => t.classList.remove('selected'));
    });

    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedReason = e.target.dataset.reason;
        });
    });

    els.confirmMissBtn.addEventListener('click', submitMiss);

    // Reward Modal
    els.closeRewardBtn.addEventListener('click', () => hideModal(els.rewardModal));
}

// --- API Calls ---

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const data = await res.json();
        state.stats = data;
        renderStats();
    } catch (err) {
        console.error("Failed to fetch stats", err);
    }
}

async function fetchHabits() {
    try {
        const res = await fetch(`${API_URL}/habits`);
        const data = await res.json();
        state.habits = data;
        renderHabits();
    } catch (err) {
        console.error("Failed to fetch habits", err);
    }
}

async function saveHabit() {
    const title = els.habitTitleInput.value.trim();
    if (!title) return;

    const desc = els.habitDescInput.value.trim();
    const reminderEnabled = document.getElementById('reminder-toggle').checked;
    const reminderTime = document.getElementById('reminder-time').value;
    const targetDays = document.getElementById('target-days').value;
    const editId = document.getElementById('edit-habit-id').value;

    const payload = {
        title,
        description: desc,
        reminderEnabled,
        reminderTime,
        targetDays
    };

    try {
        let url = `${API_URL}/habits`;
        let method = 'POST';

        if (editId) {
            url = `${API_URL}/habits/${editId}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            hideModal(els.addModal);
            fetchHabits();
        }
    } catch (err) {
        console.error("Error saving habit", err);
    }
}

function openEditModal(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    document.getElementById('edit-habit-id').value = habit.id;
    els.habitTitleInput.value = habit.title;
    els.habitDescInput.value = habit.description;
    document.getElementById('target-days').value = habit.targetDays || '';

    document.getElementById('reminder-toggle').checked = habit.reminderEnabled;
    const timeInput = document.getElementById('reminder-time');
    timeInput.value = habit.reminderTime || '';
    timeInput.disabled = !habit.reminderEnabled;

    document.querySelector('#add-modal h3').textContent = "Edit Quest";
    document.getElementById('save-habit').textContent = "Save Changes";

    showModal(els.addModal);
}

async function completeHabit(id) {
    const today = new Date().toISOString().split('T')[0];
    try {
        const res = await fetch(`${API_URL}/habits/${id}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, status: 'completed' })
        });

        const data = await res.json();
        if (res.ok) {
            handleGamificationUpdate(data);
            fetchHabits(); // Refresh list to update streaks/buttons
            fetchStats();
        } else {
            alert(data.error || "Action failed");
        }
    } catch (err) {
        console.error("Error completing habit", err);
    }
}

async function deleteHabit(id) {
    if (!confirm("Are you sure you want to delete this quest?")) return;

    try {
        await fetch(`${API_URL}/habits/${id}`, { method: 'DELETE' });
        fetchHabits();
    } catch (err) {
        console.error("Error deleting habit", err);
    }
}

function openMissModal(id) {
    currentHabitIdToMiss = id;
    showModal(els.missModal);
}

async function submitMiss() {
    if (!currentHabitIdToMiss) return;

    const customReason = els.customReasonInput.value.trim();
    const reason = customReason || selectedReason || "No reason";
    const today = new Date().toISOString().split('T')[0];

    try {
        const res = await fetch(`${API_URL}/habits/${currentHabitIdToMiss}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, status: 'missed', reason })
        });

        const data = await res.json();

        hideModal(els.missModal);

        // Get AI Suggestion
        try {
            // Fetch habits history for context (optional, but good for "history" param)
            // For now, let's just send the current reason as per user request demo
            const aiRes = await fetch(`${API_URL}/ai-suggestion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: reason,
                    history: [] // Future: populate with actual history
                })
            });

            const aiData = await aiRes.json();

            // Display strict 2-line suggestion
            const message = `${aiData.line1}\n\n👉 ${aiData.line2}`;
            alert(message);

        } catch (aiErr) {
            console.error("AI Error", aiErr);
            alert("Miss recorded, but AI is sleeping.");
        }

        fetchHabits();
    } catch (err) {
        console.error("Error submitting miss", err);
    }
}

async function retryAnalysis(habitId) {
    // Better UX: Show "Retrying..."
    const btn = document.querySelector(`button[onclick="retryAnalysis('${habitId}')"]`);
    if (btn) btn.textContent = "...";

    try {
        const res = await fetch(`${API_URL}/habits/${habitId}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: "I missed this habit" })
        });
        const data = await res.json();

        fetchHabits();
    } catch (err) {
        console.error("Retry failed", err);
        if (btn) btn.textContent = "↻";
    }
}

// --- Rendering ---

function renderStats() {
    els.userLevel.textContent = state.stats.level;
    els.userXP.textContent = state.stats.xp;

    // XP Progress (Assuming 100 XP per level for simplicity visual)
    const xpInLevel = state.stats.xp % 100;
    els.xpBar.style.width = `${xpInLevel}%`;

    els.badgesList.innerHTML = '';
    if (state.stats.badges && state.stats.badges.length > 0) {
        state.stats.badges.forEach(badge => {
            const span = document.createElement('span');
            span.className = 'badge';
            span.textContent = `${badge.icon} ${badge.name}`;
            span.title = badge.name;
            els.badgesList.appendChild(span);
        });
    } else {
        els.badgesList.innerHTML = '<span class="placeholder-badge">No Badges Yet</span>';
    }
}

function renderHabits() {
    els.habitList.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    state.habits.forEach(habit => {
        const isCompletedToday = (habit.completedDates || []).includes(today);
        const completionCount = (habit.completedDates || []).length;
        const target = habit.targetDays || 0;
        const progressText = target > 0 ? `${completionCount}/${target} Days` : '';

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.innerHTML = `
            <div class="habit-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3>${habit.title}</h3>
                    <button class="edit-btn" onclick="openEditModal('${habit.id}')" title="Edit Quest">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
                <div class="ai-feedback">
                                <p>
                                    <strong>Advice:</strong> ${habit.analysis && habit.analysis.feedback ? habit.analysis.feedback : ''}
                                    ${habit.analysis && habit.analysis.feedback && habit.analysis.feedback.includes("Rate Limit")
                ? `<button onclick="retryAnalysis('${habit.id}', '${habit.analysis.reason || ''}')" class="retry-btn" title="Try AI Again">↻</button>`
                : ''}
                                </p>
                               </div><div class="habit-stats">
                    ${habit.reminderEnabled ? `<span title="Reminder at ${habit.reminderTime}"><i class="fa-solid fa-bell"></i> ${habit.reminderTime}</span>` : ''}
                    <button class="icon-btn" onclick="openCalendar('${habit.id}', '${habit.title}')" title="View History" style="font-size: 0.9rem; padding: 2px;">
                        <i class="fa-regular fa-calendar"></i>
                    </button>
                    <span>🔥 ${habit.currentStreak || 0} Streak</span>
                     ${progressText ? `<span class="goal-progress">🎯 ${progressText}</span>` : ''}
                </div>
            </div>
            <div class="habit-actions">
                ${!isCompletedToday ? `
                <button class="check-btn" onclick="completeHabit('${habit.id}')" title="Complete">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="miss-btn" onclick="openMissModal('${habit.id}')" title="Missed">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                ` : `
                <button class="check-btn completed" title="Done!">
                    <i class="fa-solid fa-check"></i>
                </button>
                `}
                <button class="delete-btn" onclick="deleteHabit('${habit.id}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        els.habitList.appendChild(card);
    });
}

function handleGamificationUpdate(data) {
    if (data.leveledUp) {
        els.rewardTitle.textContent = "Level Up!";
        els.rewardMessage.textContent = `You reached Level ${data.newLevel}!`;
        showModal(els.rewardModal);
    } else if (data.newBadges && data.newBadges.length > 0) {
        els.rewardTitle.textContent = "New Badge!";
        els.rewardMessage.textContent = `You earned: ${data.newBadges[0].name} ${data.newBadges[0].icon}`;
        showModal(els.rewardModal);
    }
}

// --- Reminders Logic ---

function setupReminderUI() {
    const toggle = document.getElementById('reminder-toggle');
    const timeInput = document.getElementById('reminder-time');
    if (!toggle || !timeInput) return; // Guard

    toggle.addEventListener('change', () => {
        timeInput.disabled = !toggle.checked;
        if (toggle.checked) requestNotificationPermission();
    });
}

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return;
    }
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

function startReminderLoop() {
    // Check every 60 seconds
    setInterval(checkReminders, 60000);
}

function checkReminders() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;

    console.log(`[HabitTracker] Checking reminders for ${currentTime}. Permission: ${Notification.permission}`);

    // Check habits
    state.habits.forEach(habit => {
        if (habit.reminderEnabled) {
            console.log(`- Checking '${habit.title}': ${habit.reminderTime} vs ${currentTime}`);
        }

        if (habit.reminderEnabled && habit.reminderTime === currentTime) {
            // Check if already completed today
            const today = now.toISOString().split('T')[0];
            const isCompleted = (habit.completedDates || []).includes(today);

            if (!isCompleted) {
                showNotification(habit);
            }
        }
    });
}

function showNotification(habit) {
    if (Notification.permission === 'granted') {
        new Notification(`Time to Quest! ⚔️`, {
            body: `Don't forget to: ${habit.title}`,
            icon: 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png'
        });
    } else {
        // Fallback to Toast
        showToast(`Time to Quest! ⚔️`, `Don't forget to: ${habit.title}`);
    }
}

function showToast(title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i class="fa-solid fa-bell"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    // Remove on click
    toast.onclick = () => {
        toast.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    };

    // Auto remove after 5s
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);

    container.appendChild(toast);
}

// --- Calendar Logic ---

let currentCalendarDate = new Date();
let currentHabitIdForCalendar = null;
let currentHabitHistory = [];

function setupCalendarListeners() {
    const els = {
        calendarModal: document.getElementById('calendar-modal'),
        closeCalendarBtn: document.getElementById('close-calendar'),
        prevMonthBtn: document.getElementById('prev-month'),
        nextMonthBtn: document.getElementById('next-month')
    };

    if (!els.calendarModal) return; // Guard

    els.closeCalendarBtn.addEventListener('click', () => hideModal(els.calendarModal));

    els.prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    els.nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}

async function openCalendar(id, title) {
    currentHabitIdForCalendar = id;
    document.getElementById('calendar-title').textContent = title;
    currentCalendarDate = new Date(); // Reset to today

    try {
        const res = await fetch(`${API_URL}/habits/${id}/history`);
        currentHabitHistory = await res.json();

        renderCalendar();
        showModal(document.getElementById('calendar-modal'));
    } catch (err) {
        console.error("Failed to load history", err);
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('current-month');

    grid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Set Header
    monthLabel.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Days in month
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Headers (S M T W T F S)
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(d => {
        const el = document.createElement('div');
        el.className = 'calendar-day empty';
        el.style.fontWeight = 'bold';
        el.textContent = d;
        grid.appendChild(el);
    });

    // Empty slots for start
    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day empty';
        grid.appendChild(el);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const el = document.createElement('div');
        el.className = 'calendar-day';
        el.textContent = day;

        // Check status
        const historyItem = currentHabitHistory.find(h => h.date === dateStr);
        if (historyItem) {
            el.classList.add(historyItem.status);
            if (historyItem.status === 'missed' && historyItem.reason) {
                el.title = `Missed: ${historyItem.reason}`;
                el.onclick = () => alert(`Missed Reason: ${historyItem.reason}`);
            } else if (historyItem.status === 'completed') {
                el.title = "Completed (+10 XP)";
            }
        }

        grid.appendChild(el);
    }
}

function showModal(modal) {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
}

function hideModal(modal) {
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function checkTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.remove('dark-mode');
        els.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    els.themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

// Expose functions to window for HTML onclick
window.completeHabit = completeHabit;
window.deleteHabit = deleteHabit;
window.openMissModal = openMissModal;
window.openEditModal = openEditModal;
window.openEditModal = openEditModal;
window.openCalendar = openCalendar;
window.retryAnalysis = retryAnalysis;

// Run
init();
