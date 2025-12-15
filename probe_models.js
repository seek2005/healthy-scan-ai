const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const candidates = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro-001",
    "gemini-1.0-pro",
    "gemini-pro",
    "gemini-pro-vision"
];

async function probe() {
    console.log("--- STARTING MODEL PROBE ---");
    // Hardcoded key for diagnosis only
    const key = "AIzaSyDvCwE6fY1xZIhLJEbc-0rLm_25o-bPFOA";
    if (!key) {
        console.error("CRITICAL: GEMINI_API_KEY not found in env!");
        return;
    }
    console.log("API Key present explicitly.");

    const genAI = new GoogleGenerativeAI(key);

    for (const modelName of candidates) {
        process.stdout.write(`Testing ${modelName.padEnd(25)} ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you there?");
            const response = await result.response;
            console.log("✅ SUCCESS!");
        } catch (e) {
            if (e.message.includes("404")) {
                console.log("❌ 404 Not Found");
            } else if (e.message.includes("API key expired")) {
                console.log("❌ API Key Expired");
            } else {
                console.log(`❌ ERROR: ${e.message.split('\n')[0]}`);
            }
        }
    }
    console.log("--- PROBE COMPLETE ---");
}

probe();
