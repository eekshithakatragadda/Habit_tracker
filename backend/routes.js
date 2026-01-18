const express = require('express');
const router = express.Router();
const { db } = require('./firebase');
const { calculateStreak, addXP, checkBadges } = require('./gamification');

const { analyzeReason } = require('./analysis');
const { generateHabitAdvice } = require('./gemini');

// --- Helper: Get or Create User Stats (Single User App) ---
async function getUserStats() {
    // We assume a single user ID 'user_default' for this simplified app
    const userRef = db.collection('users').doc('default_user');
    const doc = await userRef.get();

    if (!doc.exists) {
        const initialStats = {
            xp: 0,
            level: 1,
            badges: [] // Array of badge IDs
        };
        await userRef.set(initialStats);
        return { ref: userRef, data: initialStats };
    }
    return { ref: userRef, data: doc.data() };
}

// --- Routes ---

// GET /habits - Get all habits
router.get('/habits', async (req, res) => {
    try {
        const snapshot = await db.collection('habits').get();
        const habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate streak for each habit on read, or just trust DB? 
        // Let's recalculate streak dynamically for accuracy
        const enrichedHabits = habits.map(h => ({
            ...h,
            // currentStreak: calculateStreak(h.completedDates || []) // Optional: compute on fly
        }));

        res.json(enrichedHabits);
    } catch (error) {
        console.error("Error fetching habits:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /habits - Create a new habit
router.post('/habits', async (req, res) => {
    try {
        const { title, description, reminderTime, reminderEnabled, targetDays } = req.body;
        if (!title) return res.status(400).json({ error: "Title is required" });

        const newHabit = {
            title,
            description: description || "",
            createdAt: new Date().toISOString(),
            completedDates: [], // Array of "YYYY-MM-DD"
            currentStreak: 0,
            longestStreak: 0,
            reminderTime: reminderTime || null, // "HH:MM"
            reminderEnabled: reminderEnabled || false,
            targetDays: parseInt(targetDays) || 0 // 0 means no limit/forever
        };

        const docRef = await db.collection('habits').add(newHabit);
        res.status(201).json({ id: docRef.id, ...newHabit });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /habits/:id - Update habit details
router.put('/habits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, reminderTime, reminderEnabled, targetDays } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (reminderTime !== undefined) updates.reminderTime = reminderTime;
        if (reminderEnabled !== undefined) updates.reminderEnabled = reminderEnabled;
        if (targetDays !== undefined) updates.targetDays = parseInt(targetDays);

        await db.collection('habits').doc(id).update(updates);
        res.json({ message: "Habit updated", updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /habits/:id
router.delete('/habits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('habits').doc(id).delete();
        res.json({ message: "Habit deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /habits/:id/action - Complete or Miss
// Body: { date: "YYYY-MM-DD", status: "completed" | "missed", reason: "optional string" }
router.post('/habits/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, status, reason } = req.body; // date format YYYY-MM-DD

        if (!date || !status) return res.status(400).json({ error: "Date and status required" });

        const habitRef = db.collection('habits').doc(id);
        const habitDoc = await habitRef.get();

        if (!habitDoc.exists) return res.status(404).json({ error: "Habit not found" });

        const habitData = habitDoc.data();
        let completedDates = habitData.completedDates || [];

        let responseData = { ...habitData };

        if (status === 'completed') {
            // Avoid duplicate completion for same day
            if (!completedDates.includes(date)) {
                completedDates.push(date);

                // Recalculate Streak
                const newStreak = calculateStreak(completedDates);
                const longestStreak = Math.max(habitData.longestStreak || 0, newStreak);

                // Update Habit
                await habitRef.update({
                    completedDates,
                    currentStreak: newStreak,
                    longestStreak
                });

                // Update User Stats (XP, Badges)
                const { ref: userRef, data: userData } = await getUserStats();
                const { xp, level, leveledUp } = addXP(userData.xp || 0, userData.level || 1);
                const newBadges = checkBadges(newStreak, userData.badges || []);

                const updatedBadges = [...(userData.badges || []), ...newBadges.map(b => b.id)];

                await userRef.update({
                    xp,
                    level,
                    badges: updatedBadges
                });

                responseData = {
                    ...habitData,
                    completedDates,
                    currentStreak: newStreak,
                    xpGained: 10, // constant
                    leveledUp,
                    newBadges,
                    newLevel: level,
                    currentXP: xp
                };
            } else {
                return res.status(400).json({ error: "Already completed today" });
            }
        } else if (status === 'missed') {
            // Log missed reason in a separate collection or subcollection
            // For simplicity, let's log to a 'logs' collection
            await db.collection('logs').add({
                habitId: id,
                habitTitle: habitData.title,
                date,
                type: 'missed',
                reason: reason || "No reason provided"
            });

            // Analyze Reason
            const analysis = await analyzeReason(habitData.title, reason || "", habitData.targetDays || 0);

            // Should we reset streak? 
            // The calculateStreak function handles logic based on dates.
            // If they explicitly say missed, the streak is definitely broken for today.
            // We just don't add the date to completedDates. 
            // We might want to explicitly set currentStreak to 0 in DB to show it in UI immediately.

            await habitRef.update({ currentStreak: 0 });

            responseData = {
                ...habitData,
                currentStreak: 0,
                analysis // contains feedback and quote
            };
        }

        res.json(responseData);

    } catch (error) {
        console.error("Action Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /habits/:id/history - Get merged history
router.get('/habits/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const habitRef = db.collection('habits').doc(id);
        const habitDoc = await habitRef.get();

        if (!habitDoc.exists) return res.status(404).json({ error: "Habit not found" });

        const habitData = habitDoc.data();
        const history = [];

        // 1. Add Completed Dates
        (habitData.completedDates || []).forEach(date => {
            history.push({ date, status: 'completed', xp: 10 });
        });

        // 2. Add Missed Logs (Fetch from 'logs' collection)
        const logsSnapshot = await db.collection('logs').where('habitId', '==', id).get();
        logsSnapshot.forEach(doc => {
            const log = doc.data();
            history.push({
                date: log.date,
                status: 'missed',
                reason: log.reason
            });
        });

        // Sort by date descending
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /stats - User Global Stats
router.get('/stats', async (req, res) => {
    try {
        const { data } = await getUserStats();

        // Populate badge details (since we only stored IDs)
        // Ideally we fetch badge metadata. For now hardcode or use helper.
        // Let's just return the IDs and frontend maps to icons, or map here.

        const badgesDB = [
            { id: 'streak_3', name: '3 Day Streak', icon: '🔥' },
            { id: 'streak_7', name: '7 Day Streak', icon: '⚡' },
            { id: 'streak_30', name: 'Monthly Master', icon: '🏆' }
        ];

        const enrichedBadges = (data.badges || []).map(id => badgesDB.find(b => b.id === id)).filter(Boolean);

        res.json({
            ...data,
            badges: enrichedBadges
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// [NEW] Retry Analysis Endpoint
router.post('/habits/:id/analyze', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const habitRef = db.collection('habits').doc(id);
        const doc = await habitRef.get();
        if (!doc.exists) return res.status(404).json({ error: "Habit not found" });

        const habit = doc.data();

        // Analyze Reason
        const analysis = await analyzeReason(habit.title, reason || "", habit.targetDays || 0);

        // Update with new analysis
        await habitRef.update({ analysis });

        res.json({ analysis });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /ai-suggestion - Direct AI Advice (Strict 2 lines)
router.post('/ai-suggestion', async (req, res) => {
    try {
        const { reason, history } = req.body;

        // Call Gemini
        const suggestion = await generateHabitAdvice(reason, history || []);

        res.json(suggestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
