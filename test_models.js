const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // There isn't a direct listModels method on the client instance in the node SDK easily accessible 
        // without using the model manager or just testing a simple prompt.
        // Let's try to just run a simple generateContent to see if it works, 
        // and if not, we'll try to fallback to 'gemini-pro' to see if the key works at all.

        console.log("Testing gemini-1.5-flash...");
        const result = await model.generateContent("Hello");
        console.log("Success! Response:", result.response.text());
    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);

        console.log("\nTesting gemini-pro...");
        try {
            const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
            const resultPro = await modelPro.generateContent("Hello");
            console.log("Success with gemini-pro! Response:", resultPro.response.text());
        } catch (errPro) {
            console.error("Error with gemini-pro:", errPro.message);
        }

        console.log("\nTesting gemini-1.5-flash-latest...");
        try {
            const modelLatest = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const resultLatest = await modelLatest.generateContent("Hello");
            console.log("Success with gemini-1.5-flash-latest! Response:", resultLatest.response.text());
        } catch (errLatest) {
            console.error("Error with gemini-1.5-flash-latest:", errLatest.message);
        }
    }
}

listModels();
