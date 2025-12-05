const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function checkKey() {
    console.log("Checking API Key via REST API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("API Error Status:", response.status);
            console.error("API Error Body:", JSON.stringify(data, null, 2));
        } else {
            console.log("Success! API Key is valid.");
            console.log("Available Models:");
            if (data.models) {
                data.models.forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log("No models found in response.");
            }
        }
    } catch (error) {
        console.error("Network/Fetch Error:", error.message);
    }
}

checkKey();
