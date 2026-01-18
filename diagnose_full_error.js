require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function diagnose() {
    console.log("Diagnosing Gemini API...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using the same model as in backend/gemini.js
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log("Attempting to generate content...");
        const result = await model.generateContent("Hello, this is a test.");
        const response = await result.response;
        console.log("Success:", response.text());
    } catch (error) {
        console.error("Error Caught!");
        console.error("Message:", error.message);
        console.error("Full Error Object:", JSON.stringify(error, null, 2));

        if (error.response) {
            console.error("Error Response:", JSON.stringify(error.response, null, 2));
        }
    }
}

diagnose();
