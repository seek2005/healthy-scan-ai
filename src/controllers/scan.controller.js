const { generateContentWithFallback, cleanJSON } = require('../services/gemini.service');
const { calculatePortionAnalysis } = require('../utils/nutrition.utils');
const fetch = require('node-fetch');

// In-memory cache for analysis results
const resultCache = new Map();

exports.analyzeImage = async (req, res) => {
    try {
        const { image, mimeType, userProfile } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided' });

        const profileContext = userProfile ? `
        USER PROFILE:
        - Age Group: ${userProfile.ageGroup || "General"}
        - Priorities: ${userProfile.dietary ? userProfile.dietary.join(", ") : "None"}
        CUSTOMIZE OUTPUT: 
        - Highlight if product conflicts with these priorities (e.g. High Sugar for Diabetic).
        - If Vegan/Keto is set, explicitly confirm or warn.
        ` : "";

        const prompt = `You are a nutritionist AI. Analyze this nutrition label. ${profileContext}
        1. Identify product. 
        2. Summarize health value. 
        3. Analyze the product for "Positives" (Health benefits, good nutrients) and "Negatives" (High sugar, additives, processing).
        4. EXTRACT the exact nutrient values:
           - **SUGAR**: Look for "Total Sugars". ALWAYS use the "Per Container" or "Per Package" column if available. If not, use the LARGEST number found. (e.g. if 20g and 46g, use 46).
           - **SODIUM**: Look for "Sodium". Use "Per Container" or LARGEST value.
           - **SAT FAT**: Look for "Saturated Fat". Use "Per Container" or LARGEST value.
        5. List ALL ingredients found. Provide a short description (max 10 words) for EACH. Mark if harmful.
        6. Suggest REAL US market alternative product. 
        7. Calculate a "health_score" from 0 to 100 based on overall nutritional value (100 is best).
        8. Identify "suitability_tags" based on ingredients (e.g. "Vegan", "Gluten-Free", "Keto-Friendly", "Low Sodium", "High Protein", "Dairy-Free").
        
        CRITICAL: Output ONLY raw JSON in English. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "health_score": number (0-100),
          "suitability_tags": ["string"],
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

        const data = JSON.parse(jsonData);

        // Calculate portion analysis programmatically if nutrients exist
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
};

exports.analyzeBarcode = async (req, res) => {
    try {
        const { barcode, userProfile } = req.body;
        if (!barcode) return res.status(400).json({ error: 'No barcode provided' });

        // 1. Check Cache
        if (resultCache.has(barcode)) {
            // Note: Cache currently ignores profile (personalization drawback). 
            // Ideally we cache by barcode+profile_hash, or re-run specific analysis.
            // For prototype, we skip cache if profile is present? Or just accept cached generic data?
            // "Senior" decision: If profile exists, skip cache OR re-prompt with cached data.
            // Let's re-prompt using fetched data if simple cache is hit, OR just separate cache keys.
            // Simple fix: Append profile signature to cache key.
            const cacheKey = barcode + (userProfile ? JSON.stringify(userProfile) : "");
            if (resultCache.has(cacheKey)) {
                console.log(`⚡ CACHE HIT for ${cacheKey}`);
                return res.json(resultCache.get(cacheKey));
            }
        }

        // ... (fetch logic) ...
        // We need to define cacheKey later to save it.
        const cacheKey = barcode + (userProfile ? JSON.stringify(userProfile) : "");



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
        const getNutrient = (key) => {
            const n = product.nutriments;
            return n[`${key}_serving`] || n[`${key}_100g`] || n[key] || 0;
        };

        const sodiumVal = (product.nutriments.sodium_value || product.nutriments.sodium || 0);
        const sodiumUnit = product.nutriments.sodium_unit || 'g';

        let finalSodiumMg = sodiumVal;
        if (sodiumUnit === 'g') finalSodiumMg = sodiumVal * 1000;
        if (sodiumUnit === 'mg') finalSodiumMg = sodiumVal;

        const realNutrients = {
            sugar_g: Number(getNutrient('sugars') || 0),
            sodium_mg: Number(finalSodiumMg || 0),
            sat_fat_g: Number(getNutrient('saturated-fat') || 0)
        };

        // 3. Send data to Gemini for Qualitative Analysis
        const profileContext = userProfile ? `
        USER PROFILE:
        - Age Group: ${userProfile.ageGroup || "General"}
        - Priorities: ${userProfile.dietary ? userProfile.dietary.join(", ") : "None"}
        CUSTOMIZE OUTPUT: 
        - Highlight if product conflicts with these priorities.
        ` : "";

        const prompt = `You are a nutritionist AI. Analyze this product data from a barcode scan. ${profileContext}
        Product: ${JSON.stringify(productContext)}
        REAL NUTRIENTS (Use these EXACTLY): ${JSON.stringify(realNutrients)}
        
        1. Identify product. 
        2. Summarize health value. 
        3. Analyze "Positives" vs "Negatives".
        4. RETURN the 'extracted_nutrients' block using the REAL NUTRIENTS provided above.
        5. List ALL ingredients found.
        6. Suggest REAL US market alternative product. 
        7. Calculate a "health_score" from 0 to 100 based on overall nutritional value (100 is best).
        8. Identify "suitability_tags" based on ingredients (e.g. "Vegan", "Gluten-Free", "Keto-Friendly", "Low Sodium", "High Protein", "Dairy-Free").
        
        CRITICAL: Output ONLY raw JSON in English. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "health_score": number (0-100),
          "suitability_tags": ["string"],
          "analysis": {
              "negatives": [ { "title": "string", "value": "string", "description": "string" } ],
              "positives": [ { "title": "string", "value": "string", "description": "string" } ]
          },
          "extracted_nutrients": { "sugar_g": ${realNutrients.sugar_g}, "sodium_mg": ${realNutrients.sodium_mg}, "sat_fat_g": ${realNutrients.sat_fat_g} },
          "allergens": [ { "name": "string", "severity": "string", "description": "string" } ],
          "ingredients_list": [{"name": "string", "is_harmful": boolean, "description": "string"}],
          "alternative": { "name": "string", "brand": "string", "score": "string", "reason": "string", "search_term": "string" } 
        }`;

        // Use Fallback here too - pass empty array for imageParts
        const result = await generateContentWithFallback(prompt, []);
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
        resultCache.set(cacheKey, data);
        res.json(data);

    } catch (error) {
        console.error('Barcode Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.debugModels = async (req, res) => {
    const fetch = require('node-fetch'); // ensuring fetch is available
    const { key } = require('../services/gemini.service'); // circular dependency potential if not careful, but key is exported

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        res.json({
            keySuffix: key ? key.slice(-4) : 'NONE',
            apiResponse: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
