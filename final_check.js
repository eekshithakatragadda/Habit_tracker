require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test(modelName) {
    console.log(`Checking ${modelName}...`);
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hi");
        console.log(`[PASS] ${modelName}`);
    } catch (e) {
        console.log(`[FAIL] ${modelName} - ${e.message}`);
    }
}

async function run() {
    await test("gemini-1.5-flash-001");
    await test("gemini-pro");
}

run();
