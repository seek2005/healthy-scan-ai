const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error("[CRITICAL] No API Key found in environment variables!");
}
const genAI = new GoogleGenerativeAI(key ? key.trim() : "");

const MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-flash-latest", "gemini-pro-latest", "gemini-2.5-flash"];

async function generateContentWithFallback(prompt, imageParts) {
    let errors = [];
    for (const modelName of MODELS) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([prompt, ...imageParts]);
            return result;
        } catch (error) {
            console.error(`Model ${modelName} failed: ${error.message}`);
            errors.push(`${modelName}: ${error.message}`);
        }
    }
    throw new Error(`All models failed. Details: ${errors.join(' | ')}`);
}

function cleanJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return match[0].replace(/```json/g, '').replace(/```/g, '');
}

module.exports = { generateContentWithFallback, cleanJSON, key };
