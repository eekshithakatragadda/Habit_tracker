// backend/gemini.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateHabitAdvice(reason, history = []) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const historyText = history.length > 0 ? `History of misses: ${history.join(", ")}` : "No previous miss history.";

        const prompt = `
        You are a strict habit coach.
        User just missed a habit.
        Current Reason: "${reason}"
        ${historyText}

        Goal: Analyze the reason and give one improvement suggestion.
        Constraints:
        1. Output EXACTLY 2 lines.
        2. Line 1: Why they missed it (analysis).
        3. Line 2: One simple tactical improvement.
        4. No bolding, no bullets, no emojis.
        5. Simple English.
        `;

        const result = await model.generateContent(prompt);
        const responseCallback = await result.response;
        const text = responseCallback.text();

        // Split into lines and clean up
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        return {
            line1: lines[0] || "Analysis failed.",
            line2: lines[1] || "Try again tomorrow."
        };

    } catch (error) {
        console.error("Gemini AI Error:", error.message);

        // Mock Responses "Dummy AI"
        const mocks = [
            { line1: "Missing is just a step backward.", line2: "Take two steps forward tomorrow." },
            { line1: "Consistency beats intensity.", line2: "Just show up for 5 minutes next time." },
            { line1: "It's okay to have off days.", line2: "Plan a specific time for this habit tomorrow." },
            { line1: "Don't let one miss become two.", line2: "Resume your streak immediately." },
            { line1: "Your reason is valid.", line2: "Try to remove one friction point for next time." }
        ];

        const randomMock = mocks[Math.floor(Math.random() * mocks.length)];
        return randomMock;
    }
}

module.exports = { generateHabitAdvice };
