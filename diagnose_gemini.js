const https = require('https');
require('dotenv').config();

const key = process.env.GEMINI_API_KEY;
console.log("Checking API Key: " + (key ? "Present" : "Missing"));

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log("Querying [https://generativelanguage.googleapis.com/v1beta/models]...");

https.get(url, (res) => {
    let data = '';
    res.on('data', () => console.log("Received chunk..."));
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log("\nStatus Code:", res.statusCode);
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", JSON.stringify(json.error, null, 2));
            } else if (json.models) {
                console.log("✅ SUCCESS! Available Models:");
                console.log("✅ SUCCESS! Available Models:");
                const fs = require('fs');
                const list = json.models.map(m => ` - ${m.name}`).join('\n');
                fs.writeFileSync('available_models.txt', list);
                console.log("Written to available_models.txt");
            } else {
                console.log("Response:", data);
            }
        } catch (e) {
            console.error("Failed to parse JSON:", e.message);
            console.log("Raw Body:", data);
        }
    });
}).on('error', (err) => {
    console.error("Network Error:", err.message);
});
