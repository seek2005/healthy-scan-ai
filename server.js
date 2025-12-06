const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const router = express.Router(); // Create a router
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

// --- Nutrient Standards & Calculation Logic ---
const DAILY_LIMITS = {
    "Children (4-8)": { sugar: 25, sodium: 1200, fat: 10 }, // g, mg, g
    "Adults (19-50)": { sugar: 50, sodium: 2300, fat: 20 },
    "Seniors (51+)": { sugar: 30, sodium: 1500, fat: 15 }
};

function calculatePortionAnalysis(sugarG, sodiumMg, satFatG) {
    // Default to 0 if null/undefined
    const s = sugarG || 0;
    const sod = sodiumMg || 0;
    const f = satFatG || 0;

    return Object.entries(DAILY_LIMITS).map(([stage, limits]) => {
        const sugarPct = Math.round((s / limits.sugar) * 100);
        const sodiumPct = Math.round((sod / limits.sodium) * 100);
        const fatPct = Math.round((f / limits.fat) * 100);

        const getRec = (pct) => pct > 100 ? "EXCESSIVE" : pct > 50 ? "High" : "Recommended";

        return {
            stage: stage,
            sugar_recommendation: getRec(sugarPct),
            sugar_percentage: `${sugarPct}%`, // Kept for reference, but frontend can ignore
            sodium_recommendation: getRec(sodiumPct),
            sodium_percentage: `${sodiumPct}%`,
            fat_recommendation: getRec(fatPct),
            fat_percentage: `${fatPct}%`
        };
    });
}

// Routes defined on the router (no /api prefix here)
router.post('/analyze-image', async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided' });

        const prompt = `You are a nutritionist AI. Analyze this nutrition label. 
        1. Identify product. 
        2. Summarize health value. 
        3. Analyze the product for "Positives" (Health benefits, good nutrients) and "Negatives" (High sugar, additives, processing).
        4. EXTRACT the exact nutrient values:
           - **SUGAR**: Look for "Total Sugars". ALWAYS use the "Per Container" or "Per Package" column if available. If not, use the LARGEST number found. (e.g. if 20g and 46g, use 46).
           - **SODIUM**: Look for "Sodium". Use "Per Container" or LARGEST value.
           - **SAT FAT**: Look for "Saturated Fat". Use "Per Container" or LARGEST value.
        5. List ALL ingredients found. Provide a short description (max 10 words) for EACH. Mark if harmful.
        6. Suggest REAL US market alternative product. 
        CRITICAL: Output ONLY raw JSON in English. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "analysis": {
              "negatives": [ { "title": "string (e.g. High Sugar)", "value": "string (e.g. 38g)", "description": "string (short explanation)" } ],
              "positives": [ { "title": "string (e.g. Protein)", "value": "string (e.g. 10g)", "description": "string" } ]
          },
          "extracted_nutrients": { "sugar_g": number, "sodium_mg": number, "sat_fat_g": number },
          "allergens": [
            { "name": "string", "severity": "string (Low/Medium/High)", "description": "string" }
          ],
          "ingredients_list": [{"name": "string", "is_harmful": boolean, "description": "string"}],
          "alternative": { "name": "string", "brand": "string", "score": "string", "reason": "string", "search_term": "string (optimized for Amazon search)" } 
        }`;


        const result = await model.generateContent([
            prompt,
            { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } }
        ]);

        const response = await result.response;
        const text = response.text();
        console.log("--- DEBUG: Raw AI Response ---");
        console.log(text);
        console.log("------------------------------");

        const cleaned = cleanJSON(text);
        if (!cleaned) throw new Error("Failed to parse JSON from AI response");

        const data = JSON.parse(cleaned);

        // Robust parsing helper for potential string values like "20g"
        const parseNutrient = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            return 0;
        };

        // Ensure extracted_nutrients exists and has valid numbers
        if (data.extracted_nutrients) {
            data.extracted_nutrients.sugar_g = parseNutrient(data.extracted_nutrients.sugar_g);
            data.extracted_nutrients.sodium_mg = parseNutrient(data.extracted_nutrients.sodium_mg);
            data.extracted_nutrients.sat_fat_g = parseNutrient(data.extracted_nutrients.sat_fat_g);
        }

        // Calculate portion analysis programmatically
        if (data.extracted_nutrients) {
            data.portion_analysis = calculatePortionAnalysis(
                data.extracted_nutrients.sugar_g,
                data.extracted_nutrients.sodium_mg,
                data.extracted_nutrients.sat_fat_g
            );
        }

        res.json(data);

    } catch (error) {
        console.error('Image Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/analyze-barcode', async (req, res) => {
    try {
        const { barcode } = req.body;
        if (!barcode) return res.status(400).json({ error: 'No barcode provided' });

        console.log(`Fetching data for barcode: ${barcode} `);

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
        3. Analyze the product for "Positives" (Health benefits, good nutrients) and "Negatives" (High sugar, additives, processing).
        4. EXTRACT the exact nutrient values from context (sugar, sodium, sat fat).
        5. List ALL ingredients found. Provide a short description (max 10 words) for EACH.
        6. Suggest REAL US market alternative product. 
        CRITICAL: Output ONLY raw JSON in English. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "analysis": {
              "negatives": [ { "title": "string (e.g. High Sugar)", "value": "string (e.g. 38g)", "description": "string (short explanation)" } ],
              "positives": [ { "title": "string (e.g. Protein)", "value": "string (e.g. 10g)", "description": "string" } ]
          },
          "extracted_nutrients": { "sugar_g": number, "sodium_mg": number, "sat_fat_g": number },
          "allergens": [
            { "name": "string", "severity": "string (Low/Medium/High)", "description": "string" }
          ],
          "ingredients_list": [{"name": "string", "is_harmful": boolean, "description": "string"}],
          "alternative": { "name": "string", "brand": "string", "score": "string", "reason": "string", "search_term": "string (optimized for Amazon search)" } 
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("--- DEBUG: Barcode AI Response ---");
        console.log(text);
        console.log("----------------------------------");

        const cleaned = cleanJSON(text);
        if (!cleaned) throw new Error("Failed to parse JSON from AI response");

        const data = JSON.parse(cleaned);

        // Robust parsing helper
        const parseNutrient = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            return 0;
        };

        if (data.extracted_nutrients) {
            data.extracted_nutrients.sugar_g = parseNutrient(data.extracted_nutrients.sugar_g);
            data.extracted_nutrients.sodium_mg = parseNutrient(data.extracted_nutrients.sodium_mg);
            data.extracted_nutrients.sat_fat_g = parseNutrient(data.extracted_nutrients.sat_fat_g);

            data.portion_analysis = calculatePortionAnalysis(
                data.extracted_nutrients.sugar_g,
                data.extracted_nutrients.sodium_mg,
                data.extracted_nutrients.sat_fat_g
            );
        }

        res.json(data);

    } catch (error) {
        console.error('Barcode Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mount the router at /api for local dev
app.use('/api', router);
// Mount at / for Netlify Functions (which might strip the prefix)
app.use('/', router);

// Export app for Netlify Functions
module.exports = app;

// Only listen if running locally (not imported)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
