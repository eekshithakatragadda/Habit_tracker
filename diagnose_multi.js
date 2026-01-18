require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testModel(modelName) {
    console.log(`\n--- Testing ${modelName} ---`);
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello.");
        const response = await result.response;
        console.log(`✅ SUCCESS: ${modelName} is working.`);
    } catch (error) {
        console.log(`❌ FAILED: ${modelName}`);
        console.log(`Error Message: ${error.message}`);
        // Check for common error codes
        if (error.message.includes("429")) console.log("-> Rate Limit / Quota Exceeded");
        if (error.message.includes("404")) console.log("-> Model Not Found / Not Available");
        if (error.message.includes("400")) console.log("-> Bad Request (possibly invalid key or region)");
    }
}

async function runDiagnostics() {
    await testModel("gemini-1.5-flash");
    await testModel("gemini-2.0-flash");
    await testModel("gemini-pro");
}

runDiagnostics();
