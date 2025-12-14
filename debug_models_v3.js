const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Just to init
        // Actually SDK has no direct listModels method on the client instance usually, 
        // it's often on a specialized manager or we just try a few.
        // Wait, the error message said "Call ListModels".
        // In node SDK it might be different.

        console.log("Testing gemini-1.5-flash...");
        try {
            const m = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await m.generateContent("Test");
            console.log("gemini-1.5-flash WORKS!");
        } catch (e) {
            console.log("gemini-1.5-flash FAILED: " + e.message);
        }

        console.log("Testing gemini-1.5-flash-001...");
        try {
            const m = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
            const result = await m.generateContent("Test");
            console.log("gemini-1.5-flash-001 WORKS!");
        } catch (e) {
            console.log("gemini-1.5-flash-001 FAILED: " + e.message);
        }

        console.log("Testing gemini-1.5-flash-latest...");
        try {
            const m = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result = await m.generateContent("Test");
            console.log("gemini-1.5-flash-latest WORKS!");
        } catch (e) {
            console.log("gemini-1.5-flash-latest FAILED: " + e.message);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
