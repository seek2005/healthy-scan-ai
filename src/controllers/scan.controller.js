const { generateContentWithFallback, cleanJSON } = require('../services/gemini.service');
const { calculatePortionAnalysis } = require('../utils/nutrition.utils');
const { cleanIngredients } = require('../utils/ingredients.utils');
const fetch = require('node-fetch');
const YukaScore = require('../utils/score_yuka.server');

// In-memory cache for barcode lookups
const resultCache = new Map();

// Helper to determine product category from a list of tags
function determineCategory(tags) {
    const knownCats = [
        'chips', 'soda', 'cereal', 'yogurt', 'bread', 'snack',
        'sauce', 'frozen', 'candy', 'dairy', 'meat'
    ];
    const lowerTags = (tags || []).map(t => t.toLowerCase());
    let cat = 'other';
    for (const known of knownCats) {
        if (lowerTags.some(t => t.includes(known))) {
            cat = known;
            break;
        }
    }
    return cat;
}

// Regex patterns for harmful additives
const HARMFUL_PATTERNS = [
    /monosodium\s+glutamate/i, /msg\b/i, /e621/i,
    /disodium\s+inosinate/i, /e631/i,
    /disodium\s+guanylate/i, /e627/i,
    /yellow\s*5/i, /tartrazine/i, /e102/i,
    /yellow\s*6/i, /sunset\s*yellow/i, /e110/i,
    /red\s*40/i, /allura\s*red/i, /e129/i,
    /blue\s*1/i, /brilliant\s*blue/i, /e133/i,
    /artificial\s+flavou?r/i,
    /natural\s*&\s*artificial\s+flavou?r/i,
    /hydrogenated\s+oil/i,
    /high\s+fructose\s+corn\s+syrup/i
];

function detectHarmfulIngredients(text) {
    return HARMFUL_PATTERNS.some(p => p.test(text));
}

exports.analyzeImage = async (req, res) => {
    // Generate Request ID for consistency check (Client-side anti-caching)
    const requestId = global.crypto ? global.crypto.randomUUID() : Date.now().toString();

    try {
        const { image, mimeType, userProfile } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided', requestId });

        // Build the prompt: ask for product name, brand and category plus nutrient values.
        const prompt = `You are a nutrition data extraction AI. Extract data from this nutrition label image exactly as requested.

CRITICAL: Return ONLY raw JSON. No introductory text. No markdown.

1. IDENTIFY PRODUCT:
   - **product_name**: Determine the specific product name (e.g. "Nachos Cheese Chips", "Greek Yogurt"). DO NOT use "Scanned Product". If nothing is legible, return a generic name like "Corn Chips".
   - **brand**: The brand name if visible, otherwise empty string.
   - **category**: Choose the BEST match: "chips", "soda", "cereal", "yogurt", "bread", "snack", "sauce", "frozen", "candy", "dairy", "meat", "other".
   - **category_confidence**: Confidence level (0.0 to 1.0).

2. EXTRACT NUTRIENTS:
   - **SERVING SIZE**: Look for "Serving Size". Extract grams (e.g. 28). If not found, estimate.
   - **CALORIES**: "Calories" per serving.
   - **SUGAR**: "Total Sugars" per serving.
   - **SODIUM**: "Sodium" per serving.
   - **SAT FAT**: "Saturated Fat" per serving.
   - **FIBER**: "Dietary Fiber" per serving.
   - **PROTEIN**: "Protein" per serving.

3. EXTRACT INGREDIENTS & ALLERGENS:
   - **Visibility Check**: First, determine if an ingredients list is visible in the image.
   - **ingredients_status**: Set to one of:
       - "FOUND": Ingredients list is visible and readable.
       - "NOT_IN_IMAGE": Image contains Nutrition Facts or product info, but NO ingredients list text is visible.
       - "OCR_FAILED": Ingredients section appears to be present but is too blurry/cutoff to read.
   - **Ingredients**: List all ingredients ONLY if status is "FOUND". Mark 'is_harmful = true' for known additives.
   - **Allergens**: List declared allergens.
   - **Ingredients Text**: Extract the full raw text block of ingredients as a string.

JSON OUTPUT FORMAT:
{
  "product_name": "string",
  "brand": "string",
  "category": "string",
  "category_confidence": number,
  "ingredients_status": "FOUND" | "NOT_IN_IMAGE" | "OCR_FAILED",
  "ingredients_text": "string",
  "extracted_nutrients": {
    "serving_size_g": number,
    "energy_kcal": number,
    "sugar_g": number,
    "sodium_mg": number,
    "sat_fat_g": number,
    "fiber_g": number,
    "protein_g": number
  },
  "ingredients_list": [ { "name": "string", "is_harmful": boolean, "description": "string" } ],
  "allergens": [ { "name": "string", "severity": "string", "description": "string" } ]
}`;

        const imageParts = [
            {
                inlineData: {
                    data: image,
                    mimeType: mimeType || 'image/jpeg'
                }
            }
        ];

        // Call Gemini via helper
        const result = await generateContentWithFallback(prompt, imageParts);
        const response = await result.response;
        const text = response.text();
        const jsonData = cleanJSON(text);
        if (!jsonData) throw new Error('Failed to parse AI response');

        const data = JSON.parse(jsonData);
        // Fallback defaults if fields missing
        data.product_name = data.product_name || 'Unknown Product';
        data.brand = data.brand || '';
        data.category = data.category || 'other';
        data.requestId = requestId; // Attach ID

        // CLEAN & NORMALIZE INGREDIENTS (Remove OCR artifacts, dedupe, fix typos)
        if (data.ingredients_list && Array.isArray(data.ingredients_list)) {
            console.log(`[AnalyzeImage] Cleaning ingredients request=${requestId}...`);
            // Pass raw ingredients text for Evidence Gating
            const rawText = data.ingredients_text || "";
            const { ingredients_list_clean, ingredients_dropped } = cleanIngredients(data.ingredients_list, rawText);
            data.ingredients_list = ingredients_list_clean;
            data.ingredients_dropped = ingredients_dropped;
        }

        let yukaResult = { overall: 0, label: 'Unknown', subscores: {} };

        if (data.extracted_nutrients) {
            const ext = data.extracted_nutrients;
            const serving = ext.serving_size_g || 100;
            const factor = serving > 0 ? 100 / serving : 1;
            // Scale nutrients to per 100g
            const scaled = {
                energy_kcal: (ext.energy_kcal || 0) * factor,
                sugars_g: (ext.sugar_g || 0) * factor,
                sodium_mg: (ext.sodium_mg || 0) * factor,
                saturated_fat_g: (ext.sat_fat_g || 0) * factor,
                fiber_g: (ext.fiber_g || 0) * factor,
                protein_g: (ext.protein_g || 0) * factor
            };
            // Create product object for Yuka scoring

            // Post-process additives mapping
            if (data.ingredients_list) {
                // Ensure harmful ingredients are explicitly flagged (Redundant if cleaner works, but safe)
                data.ingredients_list.forEach(ing => {
                    if (detectHarmfulIngredients(ing.name)) ing.is_harmful = true;
                });
            }

            const productForScoring = {
                name: data.product_name,
                category: data.category,
                nutrients_basis: 'per100g',
                serving_size_gml: 100,
                nutrients: scaled,
                additives: (data.ingredients_list || []).filter(i => i.is_harmful).map(_ => ({ risk: 'high' })),
                organic: false
            };
            // Compute score via Yuka
            yukaResult = YukaScore.compute(productForScoring);
            data.health_score = yukaResult.overall;
            data.score_label = yukaResult.label;
            data.yuka_breakdown = yukaResult;
            data.nutrients_100g = scaled;
            data.portion_analysis = calculatePortionAnalysis(
                scaled.sugars_g,
                scaled.sodium_mg,
                scaled.saturated_fat_g
            );
        }
        // Return full data including product_name, brand, category
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

        // Check cache for repeated lookups
        const cacheKey = barcode + (userProfile ? JSON.stringify(userProfile) : '');
        if (resultCache.has(cacheKey)) {
            return res.json(resultCache.get(cacheKey));
        }

        console.log(`fetching data for barcode: ${barcode}`);
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        const offData = await offResponse.json();
        if (offData.status !== 1) {
            return res.status(404).json({ error: 'Product not found in database' });
        }
        const product = offData.product;
        // Derive nutrient values; convert sodium to mg
        const getNutrient = (key) => {
            const n = product.nutriments;
            return n[`${key}_100g`] || n[`${key}_serving`] || n[key] || 0;
        };
        const sodiumVal = product.nutriments.sodium_value || product.nutriments.sodium || 0;
        const sodiumUnit = product.nutriments.sodium_unit || 'g';
        let finalSodiumMg = sodiumVal;
        if (sodiumUnit === 'g') finalSodiumMg = sodiumVal * 1000;
        if (sodiumUnit === 'mg') finalSodiumMg = sodiumVal;
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
        // Build data object
        const data = {};
        // Set product fields with fallbacks
        data.product_name = product.product_name || 'Unknown Product';
        data.brand = product.brands || '';
        data.category = determineCategory(product.categories_tags || []);
        // Store nutrients on data so the frontend can render the AI Product Analysis card
        data.nutrients = {
            energy_kcal: realNutrients.energy_kcal,
            sugars_g: realNutrients.sugar_g,
            sodium_mg: realNutrients.sodium_mg,
            saturated_fat_g: realNutrients.sat_fat_g,
            fiber_g: realNutrients.fiber_g,
            protein_g: realNutrients.protein_g
        };
        data.extracted_nutrients = realNutrients;
        // Use the product name for UI consistency
        data.name = data.product_name;

        // Build an additives array combining OpenFoodFacts tags and harmful additives detected in the ingredients text
        let additivesArray = [];

        // 1. Check strict additives tags from OFF (looking for known bad codes)
        const knownBadHtmlCodes = ['e621', 'e631', 'e627', 'e102', 'e110', 'e129', 'e133'];
        (product.additives_tags || []).forEach(tag => {
            if (knownBadHtmlCodes.some(code => tag.includes(code))) {
                additivesArray.push({ risk: 'high' });
            }
        });

        // 2. Regex scan on ingredients text
        const ingredientsText = product.ingredients_text || '';
        HARMFUL_PATTERNS.forEach((pattern) => {
            if (pattern.test(ingredientsText)) {
                additivesArray.push({ risk: 'high' });
            }
        });

        // 3. Fallback: If OpenAI/Gemini was used for barcode logic previously (not here but kept for safety)
        if (data.ingredients_list) {
            const aiHarmful = data.ingredients_list.filter(i => i.is_harmful || detectHarmfulIngredients(i.name)).map(() => ({ risk: 'high' }));
            additivesArray = additivesArray.concat(aiHarmful);
        }

        // Compose product for scoring using the scaled nutrients and combined additives
        const productForScoring = {
            name: data.product_name,
            category: data.category,
            nutrients_basis: 'per100g',
            serving_size_gml: 100,
            nutrients: data.nutrients,
            additives: additivesArray,
            organic: (product.labels_tags || []).some((l) => l.toLowerCase().includes('organic'))
        };
        // Compute Yuka score
        const yukaResult = YukaScore.compute(productForScoring);
        data.health_score = yukaResult.overall;
        data.score_label = yukaResult.label;
        data.yuka_breakdown = yukaResult;
        // Portion analysis uses scaled nutrients
        data.portion_analysis = calculatePortionAnalysis(
            data.nutrients.sugars_g,
            data.nutrients.sodium_mg,
            data.nutrients.saturated_fat_g
        );
        // Cache and return
        resultCache.set(cacheKey, data);
        res.json(data);
    } catch (error) {
        console.error('Barcode Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.debugModels = async (req, res) => {
    const fetch = require('node-fetch');
    const { key } = require('../services/gemini.service');

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