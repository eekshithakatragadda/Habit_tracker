require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test15() {
    console.log("Testing model: gemini-1.5-flash");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent("Hello, simple test.");
        const response = await result.response;
        console.log(`✅ SUCCESS with 1.5-flash:`, response.text());
    } catch (error) {
        console.log(`❌ FAILED with 1.5-flash:`, error.message);
    }
}

test15();
