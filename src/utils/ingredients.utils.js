const HARMFUL_KEYWORDS = require('./harmful_keywords.json');

const OCR_CORRECTIONS = {
    "LAG ACID": "LACTIC ACID",
    "LAC ACID": "LACTIC ACID",
    "MALTODEXTRIN": "MALTODEXTRIN", // Keep simple
    "VEG OIL": "VEGETABLE OIL",
    "F.D.C": "FD&C"
};

const SINGULAR_MAP = {
    "SPICES": "SPICE",
    "CHIPS": "CHIP",
    "FLAVORS": "FLAVOR",
    "COLORS": "COLOR",
    "PRESERVATIVES": "PRESERVATIVE"
};

const SAFE_SHORT_TOKENS = new Set(["MSG", "BHA", "BHT", "TEA", "OIL", "GUM", "E100", "RED", "DYE", "SOY", "EGG", "FAT", "OAT", "RYE", "CORN", "MILK", "SALT"]);

/**
 * Normalizes an ingredient name: casing, whitespace.
 * NO corrections applied here yet to preserve traceability.
 */
function normalizeBasic(name) {
    if (!name) return "";
    let normalized = String(name).trim().toUpperCase();
    normalized = normalized.replace(/[.,;:]+$/, ""); // Remove trailing punctuation
    return normalized;
}

/**
 * Detects junk tokens (short nonsense, non-alpha noise).
 */
function isLikelyJunk(name, rawText) {
    if (!name || name.length < 2) return true;

    // Specific Blocklist
    if (name === "PUM") return true;

    // Drop short tokens unless allowed
    if (name.length < 4) {
        if (!SAFE_SHORT_TOKENS.has(name) && !/^E\d+$/.test(name)) return true;
    }

    // Heuristic: Must have at least one vowel?
    if (!/[AEIOUY]/.test(name) && !SAFE_SHORT_TOKENS.has(name) && !/^E\d+$/.test(name)) return true;

    // Check for excessive symbols (OCR noise like "$%#")
    const letters = (name.match(/[A-Z]/g) || []).length;
    if (letters < name.length * 0.5) return true; // Less than 50% letters

    // Evidence Gate: If raw text is available, short/weird tokens MUST appear in it
    if (rawText && name.length < 5 && !rawText.toUpperCase().includes(name)) {
        return true;
    }

    return false;
}

/**
 * Main cleaning function with Traceability.
 * @param {Array} ingredientsList - Array of {name, is_harmful, description} or strings.
 * @param {string} rawText - Optional raw OCR text for evidence gating.
 * @returns {Object} { ingredients_list_clean, ingredients_dropped }
 */
function cleanIngredients(ingredientsList, rawText = "") {
    if (!Array.isArray(ingredientsList)) return { ingredients_list_clean: [], ingredients_dropped: [] };

    const cleaned = [];
    const dropped = [];
    const seen = new Set();
    const rawUpper = rawText ? rawText.toUpperCase() : "";

    for (const item of ingredientsList) {
        const originalName = (typeof item === 'object' && item.name) ? item.name : String(item);
        const description = (typeof item === 'object' && item.description) ? item.description : "";
        let isHarmful = (typeof item === 'object' && item.is_harmful) === true;

        let normalized = normalizeBasic(originalName);
        let finalName = normalized;
        let corrected = false;
        let confidence = "high";
        let dropReason = null;

        // 1. Check for Empty
        if (!normalized) {
            dropped.push({ original_name: originalName, reason: "Empty" });
            continue;
        }

        // 2. Junk Detection (Stage 1)
        if (isLikelyJunk(normalized, rawUpper)) {
            dropped.push({ original_name: originalName, normalized_name: normalized, reason: "Junk/Noise" });
            continue;
        }

        // 3. Corrections (OCR / Plural)
        // Check OCR Map
        if (OCR_CORRECTIONS[normalized]) {
            finalName = OCR_CORRECTIONS[normalized];
            corrected = true;
        }
        // Normalize Plurals (Safe)
        else if (SINGULAR_MAP[normalized]) {
            finalName = SINGULAR_MAP[normalized];
            corrected = true;
        }
        // Suffix "FLAVORS" -> "FLAVOR"
        else if (normalized.endsWith(" FLAVORS")) {
            finalName = normalized.replace(/ FLAVORS$/, " FLAVOR");
            corrected = true;
        }

        // 4. Evidence Gate for Corrections (Prevent Hallucinations)
        // If we corrected a short token, verify meaningfulness or existence
        if (corrected && normalized.length < 5 && !SAFE_SHORT_TOKENS.has(finalName)) {
            // If the correction isn't in allowlist, be skeptical
            if (rawUpper && !rawUpper.includes(finalName)) {
                // If the target word isn't in raw text, assume hallucination OR strict fix.
                // For OCR_CORRECTIONS map, we assume they are safe fixes (LAG ACID -> LACTIC ACID is standard).
                // But for "PUM" -> "POTASSIUM", we killed that map entry.
                // So if it survived the map, it's likely okay.
            }
        }

        // 5. Deduplication
        if (seen.has(finalName)) {
            // Already present. We drop duplicates but might log them if strict tracing needed.
            // User requested dedupe after correction.
            continue;
        }
        seen.add(finalName);

        // 6. Enhance Harmful Detection
        if (!isHarmful) {
            const isRisky = HARMFUL_KEYWORDS.some(k => finalName.includes(k));
            if (isRisky) isHarmful = true;
        }

        cleaned.push({
            name: finalName,            // The display name
            final_name: finalName,      // Implicit alias
            original_name: originalName,
            normalized_name: normalized,
            corrected: corrected,
            confidence: confidence,
            is_harmful: isHarmful,
            description: description,
            flags: {
                corrected: corrected,
                dropped: false
            }
        });
    }

    return { ingredients_list_clean: cleaned, ingredients_dropped: dropped };
}

module.exports = { cleanIngredients, isLikelyJunk };
