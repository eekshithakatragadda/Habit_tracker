require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("API Key present:", !!process.env.GEMINI_API_KEY);
// Print first/last chars to verify loaded correctly
const key = process.env.GEMINI_API_KEY || "";
console.log("Key snippet:", key.substring(0, 5) + "..." + key.substring(key.length - 5));

async function test() {
    console.log("Testing model: gemini-2.0-flash-001");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

        const result = await model.generateContent("Hello, are you real?");
        const response = await result.response;
        console.log(`✅ SUCCESS:`, response.text());
    } catch (error) {
        console.log(`❌ FAILED:`, error.message);
    }
}

test();
