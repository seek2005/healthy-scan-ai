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
        
        SCORING RULES (CRITICAL - FOLLOW STRICTLY):
        - **Base Score**: Start at 100.
        - **Ultra-Processed Penalty**: If ingredients list contains HIGH QUANTITY of chemical additives (NOVA 4), DEDUCT 30-50 points.
        - **Additives Penalty**: For EACH harmful additive (Red 40, Nitrates, etc), DEDUCT 15 points.
        - **Sugar Context**: Do NOT penalize natural sugars found in Milk (Lactose) or Fruit significantly. Only penalize ADDED sugars (>10g).
        - **Nutrient Penalties**:
            - Sodium > 500mg: -15 points.
            - Saturated Fat > 5g: -10 points.
            - Sugar > 15g (and IS ADDED): -15 points.
        - **Bonuses (Stackable)**:
            - **Organic**: +15 points.
            - **High Protein (>8g)**: +10 points.
            - **Fiber (>3g)**: +5 points.
            - **No Additives**: +10 points.

        *Example 1 (Cheetos)*: Base 100 - 40 (Ultra Processed) - 15 (Yellow 6) - 10 (Sodium) = ~35 (Poor).
        *Example 2 (Organic Milk)*: Base 100 - 0 (Natural Sugar) + 15 (Organic) + 10 (Protein) = ~100 (Excellent). (Max 100).

        1. Identify product. 
        2. Summarize health value. 
        3. Analyze the product for "Positives" (Health benefits, good nutrients) and "Negatives" (High sugar, additives, processing).
        4. EXTRACT the exact nutrient values:
           - **SERVING SIZE**: Look for "Serving Size" (e.g. "1 oz (28g)"). Extract the GRAMS value (e.g. 28). If not found, estimating is okay (e.g. 30g).
           - **SUGAR**: Look for "Total Sugars". Use the value that matches the "Serving Size".
           - **SODIUM**: Look for "Sodium". Use the value that matches the "Serving Size".
           - **SAT FAT**: Look for "Saturated Fat". Use the value that matches the "Serving Size".
        5. List ALL ingredients found. Provide a short description (max 10 words) for EACH. Mark if harmful.
        6. Suggest REAL US market alternative product. 
        7. Calculate a "health_score" from 0 to 100 based on the RULES above.
        8. Identify "suitability_tags" based on ingredients (e.g. "Vegan", "Gluten-Free", "Keto-Friendly", "Low Sodium", "High Protein", "Dairy-Free", "Organic", "Ultra-Processed").
        
        CRITICAL: Output ONLY raw JSON in English. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "health_score": number (0-100),
          "suitability_tags": ["string"],
          "analysis": {
              "negatives": [ { "title": "string (e.g. High Sugar)", "value": "string (e.g. 38g)", "description": "string (short explanation)" } ],
              "positives": [ { "title": "string (e.g. Protein)", "value": "string (e.g. 10g)", "description": "string" } ]
          },
          "extracted_nutrients": { "serving_size_g": number, "sugar_g": number, "sodium_mg": number, "sat_fat_g": number },
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
        // Prioritize 100g to ensure "Bad" foods are caught regardless of small serving sizes
        const getNutrient = (key) => {
            const n = product.nutriments;
            return n[`${key}_100g`] || n[`${key}_serving`] || n[key] || 0;
        };

        const sodiumVal = (product.nutriments.sodium_value || product.nutriments.sodium || 0);
        const sodiumUnit = product.nutriments.sodium_unit || 'g';

        let finalSodiumMg = sodiumVal;
        if (sodiumUnit === 'g') finalSodiumMg = sodiumVal * 1000;
        if (sodiumUnit === 'mg') finalSodiumMg = sodiumVal;

        // If sodium is 0, try to find sodium_100g directly
        if (!finalSodiumMg && product.nutriments.sodium_100g) {
            finalSodiumMg = product.nutriments.sodium_100g * 1000;
        }

        const realNutrients = {
            energy_kcal: Number(getNutrient('energy-kcal') || 0),
            sugar_g: Number(getNutrient('sugars') || 0),
            sodium_mg: Number(finalSodiumMg || 0),
            sat_fat_g: Number(getNutrient('saturated-fat') || 0),
            fiber_g: Number(getNutrient('fiber') || 0),
            protein_g: Number(getNutrient('proteins') || 0)
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
        
        SCORING RULES (CRITICAL - FOLLOW STRICTLY):
        - **Base Score**: Start at 100.
        - **Ultra-Processed Penalty**: If ingredients list contains HIGH QUANTITY of chemical additives (NOVA 4), DEDUCT 30-50 points.
        - **Additives Penalty**: For EACH harmful additive (Red 40, Nitrates, etc), DEDUCT 15 points.
        - **Sugar Context**: Do NOT penalize natural sugars found in Milk (Lactose) or Fruit significantly. Only penalize ADDED sugars (>10g).
        - **Nutrient Penalties**:
            - Sodium > 500mg: -15 points.
            - Saturated Fat > 5g: -10 points.
            - Sugar > 15g (and IS ADDED): -15 points.
        - **Bonuses (Stackable)**:
            - **Organic**: +15 points.
            - **High Protein (>8g)**: +10 points.
            - **Fiber (>3g)**: +5 points.
            - **No Additives**: +10 points.

        *Example 1 (Cheetos)*: Base 100 - 40 (Ultra Processed) - 15 (Yellow 6) - 10 (Sodium) = ~35 (Poor).
        *Example 2 (Organic Milk)*: Base 100 - 0 (Natural Sugar) + 15 (Organic) + 10 (Protein) = ~100 (Excellent). (Max 100).

        1. Identify product. 
        2. Summarize health value. 
        3. Analyze "Positives" vs "Negatives".
        4. RETURN the 'extracted_nutrients' block using the REAL NUTRIENTS provided above.
        5. List ALL ingredients found.
        6. Suggest REAL US market alternative product. 
        7. Calculate a "health_score" from 0 to 100 based on the RULES above.
        8. Identify "suitability_tags" based on ingredients (e.g. "Vegan", "Gluten-Free", "Keto-Friendly", "Low Sodium", "High Protein", "Dairy-Free", "Organic", "Ultra-Processed").
        
        CRITICAL: Output ONLY raw JSON in English. No intro text.
        { 
          "summary": "string (use **bold** for emphasis)", 
          "health_score": number (0-100),
          "suitability_tags": ["string"],
          "analysis": {
              "negatives": [ { "title": "string", "value": "string", "description": "string" } ],
              "positives": [ { "title": "string", "value": "string", "description": "string" } ]
          },
          "extracted_nutrients": { "energy_kcal": ${realNutrients.energy_kcal}, "sugar_g": ${realNutrients.sugar_g}, "sodium_mg": ${realNutrients.sodium_mg}, "sat_fat_g": ${realNutrients.sat_fat_g}, "fiber_g": ${realNutrients.fiber_g}, "protein_g": ${realNutrients.protein_g} },
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
