require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = process.env.GEMINI_API_KEY;
console.log("Key length:", key ? key.length : 0);

async function test() {
    const genAI = new GoogleGenerativeAI(key);
    // Try listing models first to see what's available
    try {
        console.log("Attempting to generate content with gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log("Success with gemini-1.5-flash:", await result.response.text());
        return;
    } catch (e) {
        console.error("Error with gemini-1.5-flash:", e.message);
        if (e.response) {
            console.error("Response:", JSON.stringify(e.response, null, 2));
        }
    }

    try {
        console.log("Attempting to generate content with gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hi");
        console.log("Success with gemini-pro:", await result.response.text());
        return;
    } catch (e) {
        console.error("Error with gemini-pro:", e.message);
    }
}

test();
