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
// Using gemini-1.5-flash - Enabled by Tier 1 Key + API Activation
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = {};

    Object.entries(DAILY_LIMITS).forEach(([stage, limits]) => {
        const sugarPct = Math.round((s / limits.sugar) * 100);
        const sodiumPct = Math.round((sod / limits.sodium) * 100);
        const fatPct = Math.round((f / limits.fat) * 100);

        const getRec = (pct) => pct > 100 ? "Excessive" : pct > 50 ? "High" : "Recommended";

        result[stage] = {
            sugar: getRec(sugarPct), // Client expects 'sugar'
            sodium: getRec(sodiumPct),
            saturated_fat: getRec(fatPct)
        };
    });

    return result;
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

        const prompt = `
        Analyze this food product image and ensure strict JSON format output.
        Identify:
        1. Product Name
        2. Key Nutrients (Calories, Sugar, Sodium, Protein, Fat) with values.
        3. Ingredients list.
        4. Health Analysis (3 positive points, 3 negative points).
        5. A health score (0-100).
        6. Best healthier alternatives.
        7. Allergens.

        Return ONLY raw JSON. No markdown.
        Schema:
        {
          "productName": "string",
          "nutrients": { "calories": "val", "sugar": "val", "sodium": "val", "protein": "val", "fat": "val" },
          "ingredients": ["string"],
          "analysis": { "positives": ["string"], "negatives": ["string"] },
          "score": number,
          "alternatives": ["string"],
          "allergens": ["string"]
        }
        `;

        const imageParts = [
            {
                inlineData: {
                    data: image,
                    mimeType: mimeType || "image/jpeg"
                }
            }
        ];

        // Use the fallback function
        const result = await generateContentWithFallback(prompt, imageParts);
        const response = await result.response;
        const text = response.text();

        const jsonData = cleanJSON(text);
        if (!jsonData) throw new Error("Failed to parse AI response");

        res.json(jsonData);

    } catch (error) {
        console.error('Image Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// In-memory cache for analysis results
const resultCache = new Map();

router.post('/analyze-barcode', async (req, res) => {
    try {
        const { barcode } = req.body;
        if (!barcode) return res.status(400).json({ error: 'No barcode provided' });

        // 1. Check Cache
        if (resultCache.has(barcode)) {
            console.log(`⚡ CACHE HIT for barcode: ${barcode}`);
            return res.json(resultCache.get(barcode));
        }

        console.log(`fetching data for barcode: ${barcode} `);

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

        // 2. EXTRACT NUTRIENTS DIRECTLY (Hard Data > AI Guess)
        // Prefer 'value per serving' if available, else 'per 100g'
        const getNutrient = (key) => {
            const n = product.nutriments;
            // Try explicit serving first, then 100g, then generic value
            return n[`${key}_serving`] || n[`${key}_100g`] || n[key] || 0;
        };

        const sugarG = getNutrient('sugars');
        const sodiumMg = getNutrient('sodium') * 1000; // OFF usually returns sodium in grams? Check this.
        // Wait, OFF returns sodium in grams/100g usually, or unit specified. 
        // Let's use the explicit unit check if possible, to be safe assume OFF follows standards (grams for macros, varies for micro).
        // Actually, let's look at the raw data structure usually: 'sodium_100g' is in grams. 'sodium_serving' is in grams.
        // My limit logic expects mg for sodium. So I need to multiply by 1000.

        // Re-evaluating sodium: OFF 'sodium' is usually in Grams. My daily limit is 2300mg (2.3g).
        // So yes, need to convert to mg.
        const sodiumVal = (product.nutriments.sodium_value || product.nutriments.sodium || 0);
        const sodiumUnit = product.nutriments.sodium_unit || 'g'; // Default to grams if missing

        let finalSodiumMg = sodiumVal;
        if (sodiumUnit === 'g') finalSodiumMg = sodiumVal * 1000;
        if (sodiumUnit === 'mg') finalSodiumMg = sodiumVal;

        const realNutrients = {
            sugar_g: Number(getNutrient('sugars') || 0),
            sodium_mg: Number(finalSodiumMg || 0),
            sat_fat_g: Number(getNutrient('saturated-fat') || 0)
        };

        // 3. Send data to Gemini for Qualitative Analysis
        const prompt = `You are a nutritionist AI. Analyze this product data from a barcode scan.
        Product: ${JSON.stringify(productContext)}
        REAL NUTRIENTS (Use these EXACTLY): ${JSON.stringify(realNutrients)}
        
        1. Identify product. 
        2. Summarize health value. 
        3. Analyze "Positives" vs "Negatives".
        4. RETURN the 'extracted_nutrients' block using the REAL NUTRIENTS provided above.
        5. List ALL ingredients found.
        6. Suggest REAL US market alternative product. 
        CRITICAL: Output ONLY raw JSON in English. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "analysis": {
              "negatives": [ { "title": "string", "value": "string", "description": "string" } ],
              "positives": [ { "title": "string", "value": "string", "description": "string" } ]
          },
          "extracted_nutrients": { "sugar_g": ${realNutrients.sugar_g}, "sodium_mg": ${realNutrients.sodium_mg}, "sat_fat_g": ${realNutrients.sat_fat_g} },
          "allergens": [ { "name": "string", "severity": "string", "description": "string" } ],
          "ingredients_list": [{"name": "string", "is_harmful": boolean, "description": "string"}],
          "alternative": { "name": "string", "brand": "string", "score": "string", "reason": "string", "search_term": "string" } 
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

        // Forced Override with Real Data (Trust Code over AI)
        data.extracted_nutrients = realNutrients;

        // Calculate portion analysis programmatically
        data.portion_analysis = calculatePortionAnalysis(
            data.extracted_nutrients.sugar_g,
            data.extracted_nutrients.sodium_mg,
            data.extracted_nutrients.sat_fat_g
        );

        // Save to Cache
        resultCache.set(barcode, data);
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
