const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkModel() {
    const newKey = "AIzaSyCCTfG8WEEz9kmPuNM-0K5e6fijvcswpLc";
    console.log("Testing gemini-1.5-flash with NEW API key:", newKey.slice(0, 10) + "...");

    const genAI = new GoogleGenerativeAI(newKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent("Hello, are you available?");
        const response = await result.response;
        console.log("SUCCESS: gemini-1.5-flash is working! Response:", response.text());
    } catch (error) {
        console.error("ERROR: Failed to access gemini-1.5-flash");
        console.error(error.message);
    }
}

checkModel();
