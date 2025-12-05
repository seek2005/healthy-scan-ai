const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.')); // Serve static files from current directory

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Note: Using gemini-2.0-flash as it is available for this API key
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// Helper to clean JSON response
function cleanJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return match[0].replace(/```json/g, '').replace(/```/g, '');
}

// Endpoint: Analyze Image
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided' });

        const prompt = `You are a nutritionist AI. Analyze this nutrition label. 
        1. Identify product. 
        2. Summarize health value. 
        3. Analyze Sugar, Sodium, Sat Fat for Children (4-8), Adults (19-50), Seniors (51+). Mark as 'Recommended', 'High', or 'EXCESSIVE' based on standard guidelines. Calculate the percentage of daily limit used (e.g., "45%").
        4. List ALL ingredients found in the product. Mark if they are generally considered harmful/controversial (e.g., high fructose corn syrup, red 40). Provide a very brief description (max 10 words) of what it is.
        5. Suggest REAL US market alternative product. 
        CRITICAL: Output ONLY raw JSON. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "allergens": [
            { "name": "string", "severity": "string (Low/Medium/High)", "description": "string" }
          ],
          "ingredients_list": [{"name": "string", "is_harmful": boolean, "description": "string"}],
          "portion_analysis": [
            {
                "stage": "Children (4-8)", 
                "sugar_recommendation": "string", "sugar_percentage": "string",
                "sodium_recommendation": "string", "sodium_percentage": "string",
                "fat_recommendation": "string", "fat_percentage": "string"
            },
            {
                "stage": "Adults (19-50)", 
                "sugar_recommendation": "string", "sugar_percentage": "string",
                "sodium_recommendation": "string", "sodium_percentage": "string",
                "fat_recommendation": "string", "fat_percentage": "string"
            },
            {
                "stage": "Seniors (51+)", 
                "sugar_recommendation": "string", "sugar_percentage": "string",
                "sodium_recommendation": "string", "sodium_percentage": "string",
                "fat_recommendation": "string", "fat_percentage": "string"
            }
          ], 
          "alternative": { "name": "string", "brand": "string", "score": "string", "reason": "string", "search_term": "string (optimized for Amazon search)" } 
        }`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } }
        ]);

        const response = await result.response;
        const text = response.text();
        const cleaned = cleanJSON(text);

        if (!cleaned) throw new Error("Failed to parse JSON from AI response");

        res.json(JSON.parse(cleaned));

    } catch (error) {
        console.error('Image Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Analyze Barcode
app.post('/api/analyze-barcode', async (req, res) => {
    try {
        const { barcode } = req.body;
        if (!barcode) return res.status(400).json({ error: 'No barcode provided' });

        console.log(`Fetching data for barcode: ${barcode}`);

        // 1. Fetch product data from OpenFoodFacts
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        const offData = await offResponse.json();

        if (offData.status !== 1) {
            return res.status(404).json({ error: 'Product not found in database' });
        }

        const product = offData.product;
        const productContext = {
            name: product.product_name,
            brand: product.brands,
            categories: product.categories,
            nutriments: product.nutriments,
            ingredients: product.ingredients_text
        };

        // 2. Send data to Gemini for analysis
        const prompt = `You are a nutritionist AI. Analyze this product data from a barcode scan.
        Product: ${JSON.stringify(productContext)}
        
        1. Identify product. 
        2. Summarize health value based on the ingredients and nutriments provided. 
        3. Analyze Sugar, Sodium, Sat Fat for Children (4-8), Adults (19-50), Seniors (51+). Mark as 'Recommended', 'High', or 'EXCESSIVE' based on standard guidelines. Calculate the percentage of daily limit used (e.g., "45%").
        4. List ALL ingredients found in the product. Mark if they are generally considered harmful/controversial (e.g., high fructose corn syrup, red 40). Provide a very brief description (max 10 words) of what it is.
        5. Suggest REAL US market alternative product. 
        CRITICAL: Output ONLY raw JSON. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "allergens": [
            { "name": "string", "severity": "string (Low/Medium/High)", "description": "string" }
          ],
          "ingredients_list": [{"name": "string", "is_harmful": boolean, "description": "string"}],
          "portion_analysis": [
            {
                "stage": "Children (4-8)", 
                "sugar_recommendation": "string", "sugar_percentage": "string",
                "sodium_recommendation": "string", "sodium_percentage": "string",
                "fat_recommendation": "string", "fat_percentage": "string"
            },
            {
                "stage": "Adults (19-50)", 
                "sugar_recommendation": "string", "sugar_percentage": "string",
                "sodium_recommendation": "string", "sodium_percentage": "string",
                "fat_recommendation": "string", "fat_percentage": "string"
            },
            {
                "stage": "Seniors (51+)", 
                "sugar_recommendation": "string", "sugar_percentage": "string",
                "sodium_recommendation": "string", "sodium_percentage": "string",
                "fat_recommendation": "string", "fat_percentage": "string"
            }
          ], 
          "alternative": { "name": "string", "brand": "string", "score": "string", "reason": "string", "search_term": "string (optimized for Amazon search)" } 
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleaned = cleanJSON(text);

        if (!cleaned) throw new Error("Failed to parse JSON from AI response");

        res.json(JSON.parse(cleaned));

    } catch (error) {
        console.error('Barcode Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export app for Netlify Functions
module.exports = app;

// Only listen if running locally (not imported)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
