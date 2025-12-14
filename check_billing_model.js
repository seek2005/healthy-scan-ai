const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

async function checkModel() {
    console.log("Testing gemini-1.5-flash with current API key...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
