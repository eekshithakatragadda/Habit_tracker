// Analysis Logic
const { generateHabitAdvice } = require('./gemini');

/**
 * Analyzes the missed reason and provides feedback using AI.
 * @param {string} habitTitle 
 * @param {string} reason 
 * @param {number} targetDays
 * @returns {Promise<Object>} { feedback }
 */
async function analyzeReason(habitTitle, reason, targetDays) {
    // Get AI Feedback
    const feedback = await generateHabitAdvice(habitTitle, reason, targetDays);

    return { feedback };
}

module.exports = { analyzeReason };
