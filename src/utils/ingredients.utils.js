```javascript
const HARMFUL_KEYWORDS = require('./harmful_keywords.json');

const OCR_CORRECTIONS = {
    "LAG ACID": "LACTIC ACID",
    "LAC ACID": "LACTIC ACID",
    "MALTODEXTRIN": "MALTODEXTRIN", // No-op but safe
    "VEG OIL": "VEGETABLE OIL",
    "F.D.C": "FD&C"
    // REMOVED "PUM" logic entirely to prevent hallucination.
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
 * Normalizes an ingredient name: casing, whitespace, safe OCR corrections.
 */
function normalizeIngredientName(name) {
    if (!name) return "";
    let normalized = String(name).trim().toUpperCase();
    normalized = normalized.replace(/[.,;:]+$/, ""); // Remove trailing punctuation

    // Exact OCR Fixes (Safe List Only)
    if (OCR_CORRECTIONS[normalized]) return OCR_CORRECTIONS[normalized];

    // Normalize Plurals
    if (SINGULAR_MAP[normalized]) return SINGULAR_MAP[normalized];
    
    // "XXX FLAVORS" -> "XXX FLAVOR"
    if (normalized.endsWith(" FLAVORS")) {
        normalized = normalized.replace(/ FLAVORS$/, " FLAVOR");
    }

    return normalized;
}

/**
 * Detects junk tokens (short nonsense, non-alpha noise).
 */
function isLikelyJunk(name) {
    if (!name || name.length < 2) return true;
    
    // Drop short tokens unless allowed
    if (name.length < 4) {
        if (!SAFE_SHORT_TOKENS.has(name) && !/^E\d+$/.test(name)) return true;
    }

    // Heuristic: Must have at least one vowel?
    if (!/[AEIOUY]/.test(name) && !SAFE_SHORT_TOKENS.has(name) && !/^E\d+$/.test(name)) return true;

    // Check for excessive symbols (OCR noise like "$%#")
    const letters = (name.match(/[A-Z]/g) || []).length;
    if (letters < name.length * 0.5) return true; // Less than 50% letters

    // Specific Junk Blocklist
    if (name === "PUM") return true;

    return false;
}

/**
 * Main cleaning function.
 * @param {Array} ingredientsList - Array of {name, is_harmful, description} or strings.
 * @returns {Object} { ingredients_list_clean, ingredients_dropped }
 */
function cleanIngredients(ingredientsList) {
    if (!Array.isArray(ingredientsList)) return { ingredients_list_clean: [], ingredients_dropped: [] };

    const cleaned = [];
    const dropped = [];
    const seen = new Set();

    for (const item of ingredientsList) {
        const originalName = (typeof item === 'object' && item.name) ? item.name : String(item);
        const description = (typeof item === 'object' && item.description) ? item.description : "";
        let isHarmful = (typeof item === 'object' && item.is_harmful) === true;

        const normalized = normalizeIngredientName(originalName);
        const originalNormalized = originalName.trim().toUpperCase();
        let corrected = normalized !== originalNormalized;
        let dropReason = null;

        // Check validation
        if (!normalized) {
            dropReason = "Empty/Mapped to Empty";
        } else if (isLikelyJunk(normalized)) {
            dropReason = "Junk token";
        }

        if (dropReason) {
            dropped.push({ original: originalName, normalized, reason: dropReason });
            continue;
        }

        // Deduplication
        if (seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);

        // Enhance Harmful Detection
        if (!isHarmful) {
            // Check dictionary
            const isRisky = HARMFUL_KEYWORDS.some(k => normalized.includes(k));
            if (isRisky) isHarmful = true;
        }

        cleaned.push({
            name: normalized,
            original_name: originalName,
            is_harmful: isHarmful,
            description: description,
            flags: {
                corrected: normalized !== originalName.trim().toUpperCase(),
                dropped: false
            }
        });
    }

    return { ingredients_list_clean: cleaned, ingredients_dropped: dropped };
}

module.exports = { cleanIngredients, normalizeIngredientName, isLikelyJunk };
