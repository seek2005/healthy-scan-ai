const fetch = require('node-fetch');

async function listModels() {
    const key = "AIzaSyCCTfG8WEEz9kmPuNM-0K5e6fijvcswpLc";
    console.log("Checking models for NEW KEY...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("Error listing models:", JSON.stringify(data));
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

listModels();
