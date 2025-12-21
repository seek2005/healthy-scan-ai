const { generateContentWithFallback, cleanJSON } = require('../services/gemini.service');
const { calculatePortionAnalysis } = require('../utils/nutrition.utils');
const fetch = require('node-fetch');
const YukaScore = require('../utils/score_yuka.server');

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

        const prompt = `You are a nutrition data extraction AI. Extract data from this nutrition label image exactly as requested.
        
        CRITICAL: Return ONLY raw JSON. No introductory text. No markdown.
        
        EXTRACT the exact nutrient values and ingredient data:
        - **SERVING SIZE**: Look for "Serving Size". Extract GRAMS (e.g. 28). If not found, estimate.
        - **CALORIES**: Look for "Calories" per serving.
        - **SUGAR**: "Total Sugars" per serving.
        - **SODIUM**: "Sodium" per serving.
        - **SAT FAT**: "Saturated Fat" per serving.
        - **FIBER**: "Dietary Fiber" per serving.
        - **PROTEIN**: "Protein" per serving.
        
        EXTRACT ingredients and allergens:
        - **Ingredients**: List all. Flag harmful ones (artificial colors, preservatives, hydrogenated oils).
        - **Allergens**: List declared allergens.
        {
          "extracted_nutrients": {
            "serving_size_g": number,
            "energy_kcal": number,
            "sugar_g": number,
            "sodium_mg": number,
            "sat_fat_g": number,
            "fiber_g": number,
            "protein_g": number
          },
          "ingredients_list": [
            { "name": "string", "is_harmful": boolean, "description": "string (short)" }
          ],
          "allergens": [
            { "name": "string", "severity": "string", "description": "string" }
          ]
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

        // NORMALIZE AND SCORE
        let yukaResult = { overall: 0, label: "Unknown", subscores: {} };

        if (data.extracted_nutrients) {
            const ext = data.extracted_nutrients;
            const serving = ext.serving_size_g || 100;
            const factor = serving > 0 ? (100 / serving) : 1;

            // Scale to 100g
            const scaled = {
                energy_kcal: (ext.energy_kcal || 0) * factor,
                sugars_g: (ext.sugar_g || 0) * factor,
                sodium_mg: (ext.sodium_mg || 0) * factor,
                saturated_fat_g: (ext.sat_fat_g || 0) * factor,
                fiber_g: (ext.fiber_g || 0) * factor,
                protein_g: (ext.protein_g || 0) * factor
            };

            const productForScoring = {
                name: "Scanned Product",
                nutrients_basis: "per100g",
                serving_size_gml: 100, // We are providing 100g scaled values
                nutrients: scaled,
                additives: (data.ingredients_list || []).filter(i => i.is_harmful).map(_ => ({ risk: "high" })),
                organic: false
            };

            yukaResult = YukaScore.compute(productForScoring);

            // Enrich response
            data.health_score = yukaResult.overall;
            data.score_label = yukaResult.label;
            data.yuka_breakdown = yukaResult;
            data.nutrients_100g = scaled;

            // Recalculate Portion Analysis (using per-serving or per-100g? Usually portion analysis is relevant to serving)
            // But function expects raw values. Let's pass Extracted (per serving) values if avail, else scaled?
            // Actually existing code passed extracted values. We'll keep that.
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

        const prompt = `You are a nutrition data extraction AI. Extract data from this nutrition label image exactly as requested.
        
        CRITICAL: Return ONLY raw JSON. No introductory text. No markdown.
        
        EXTRACT the exact nutrient values and ingredient data:
        - **SERVING SIZE**: Look for "Serving Size". Extract GRAMS (e.g. 28). If not found, estimate.
        - **CALORIES**: Look for "Calories" per serving.
        - **SUGAR**: "Total Sugars" per serving.
        - **SODIUM**: "Sodium" per serving.
        - **SAT FAT**: "Saturated Fat" per serving.
        - **FIBER**: "Dietary Fiber" per serving.
        - **PROTEIN**: "Protein" per serving.
        
        EXTRACT ingredients and allergens:
        - **Ingredients**: List all. Flag harmful ones (artificial colors, preservatives, hydrogenated oils).
        - **Allergens**: List declared allergens.
        
        {
          "extracted_nutrients": {
            "serving_size_g": number,
            "energy_kcal": number,
            "sugar_g": number,
            "sodium_mg": number,
            "sat_fat_g": number,
            "fiber_g": number,
            "protein_g": number
          },
          "ingredients_list": [
            { "name": "string", "is_harmful": boolean, "description": "string (short)" }
          ],
          "allergens": [
            { "name": "string", "severity": "string", "description": "string" }
          ]
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

        // SCORE WITH YUKA (Server-Side)
        const productForScoring = {
            name: product.product_name || "Scanned Product",
            category: (product.categories_tags || []).join(' '), // OFF specific
            nutrients_basis: "per100g", // We prioritized 100g
            serving_size_gml: 100,
            nutrients: {
                energy_kcal: realNutrients.energy_kcal,
                sugars_g: realNutrients.sugar_g,
                saturated_fat_g: realNutrients.sat_fat_g,
                sodium_mg: realNutrients.sodium_mg,
                fiber_g: realNutrients.fiber_g,
                protein_g: realNutrients.protein_g
            },
            additives: (product.additives_tags || []).map(t => ({ risk: "high" })), // Simple risk mapping or use AI ingredients
            organic: (product.labels_tags || []).some(l => l.includes('organic'))
        };
        // Note: Additives from OFF are codes. AI might be better at parsing risk from ingredients list if OFF data is sparse, 
        // but strict standard uses Yuka. For now, let's use the additives list from OFF if available, or fall back to AI risk flags?
        // User "Verify that the barcode flow ... uses YukaScore.compute()".
        // I'll use the AI's "ingredients_list" risk flags if OFF additives are tricky to parse rapidly without a DB.
        // Actually, let's use the AI's harmful flag since the prompt asks for it.
        productForScoring.additives = (data.ingredients_list || []).filter(i => i.is_harmful).map(_ => ({ risk: "high" }));

        const yukaResult = YukaScore.compute(productForScoring);
        data.health_score = yukaResult.overall;
        data.score_label = yukaResult.label;
        data.yuka_breakdown = yukaResult;

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
