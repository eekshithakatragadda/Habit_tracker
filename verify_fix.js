require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const models = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest"
];

async function run() {
    for (const modelName of models) {
        console.log(`\nTesting ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            const response = await result.response;
            console.log(`✅ SUCCESS with ${modelName}`);
        } catch (error) {
            console.log(`❌ FAILED with ${modelName}: ${error.message.split('\n')[0]}`);
        }
    }
}

run();
