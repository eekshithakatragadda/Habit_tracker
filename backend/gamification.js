// Gamification Logic

// Constants
const XP_PER_COMPLETION = 10;
const XP_FOR_LEVEL_UP_BASE = 100;

/**
 * Calculates the current streak based on completion dates.
 * @param {Array<string>} completedDates - Array of date strings "YYYY-MM-DD"
 * @returns {number} Current streak
 */
function calculateStreak(completedDates) {
    if (!completedDates || completedDates.length === 0) return 0;

    // Sort dates descending
    const sortedDates = [...completedDates].sort((a, b) => new Date(b) - new Date(a));

    // Get unique dates
    const uniqueDates = [...new Set(sortedDates)];

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Convert most recent completion to Date object
    const lastCompletion = new Date(uniqueDates[0]);
    lastCompletion.setHours(0, 0, 0, 0);

    // If last completion was neither today nor yesterday, streak is broken (0)
    // UNLESS we are just calculating the streak "as of the last completion" 
    // But for a "Current Active Streak", if you missed yesterday, it's 0.
    // However, usually we show the streak that WAS active. 
    // Let's implement robust checking:

    // Check if the most recent date is today or yesterday
    if (lastCompletion.getTime() !== today.getTime() && lastCompletion.getTime() !== yesterday.getTime()) {
        return 0;
    }

    streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
        const current = new Date(uniqueDates[i]);
        const next = new Date(uniqueDates[i + 1]); // The one before 'current' in time

        // Difference in days
        const diffTime = Math.abs(current - next);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

/**
 * Calculates new XP and Level.
 * @param {number} currentXP 
 * @param {number} currentLevel 
 * @returns {Object} { xp, level, leveledUp }
 */
function addXP(currentXP, currentLevel) {
    let xp = currentXP + XP_PER_COMPLETION;
    let level = currentLevel;
    let leveledUp = false;

    // Simple Level formula: Level * 100 XP to reach next level? 
    // Or just Cumulative XP / 100?
    // Let's do: Threshold = Level * 100.
    // If XP >= Level * 100, Level++, XP resets or carries over?
    // Let's do Cumulative for simplicity. Level = floor(TotalXP / 100) + 1.

    const newLevel = Math.floor(xp / XP_FOR_LEVEL_UP_BASE) + 1;

    if (newLevel > level) {
        leveledUp = true;
        level = newLevel;
    }

    return { xp, level, leveledUp };
}

/**
 * Checks for new badges based on actions.
 * @param {Object} habit - The updated habit object
 * @param {number} streak - Current streak
 * @param {Array<string>} userBadges - Current badges IDs
 * @returns {Array<Object>} Array of new badges earned { id, name, icon }
 */
function checkBadges(streak, userBadges) {
    const newBadges = [];
    const earnedBadgeIds = new Set(userBadges);

    const badgesDB = [
        { id: 'streak_3', name: '3 Day Streak', threshold: 3, icon: '🔥' },
        { id: 'streak_7', name: '7 Day Streak', threshold: 7, icon: '⚡' },
        { id: 'streak_30', name: 'Monthly Master', threshold: 30, icon: '🏆' }
    ];

    badgesDB.forEach(badge => {
        if (streak >= badge.threshold && !earnedBadgeIds.has(badge.id)) {
            newBadges.push(badge);
        }
    });

    return newBadges;
}

module.exports = { calculateStreak, addXP, checkBadges };
