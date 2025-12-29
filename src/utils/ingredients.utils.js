const HARMFUL_KEYWORDS = require('./harmful_keywords.json');

const OCR_CORRECTIONS = {
    "LAG ACID": "LACTIC ACID",
    "LAC ACID": "LACTIC ACID",
    "PUM": "", // Mark as Junk
    "MALTODEXTRIN": "MALTODEXTRIN",
    "CORN SYRUP SOLIDS": "CORN SYRUP SOLIDS",
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

const JUNK_ALLOWLIST = new Set(["MSG", "BHA", "BHT", "TEA", "OIL", "GUM", "E100", "RED", "DYE", "SOY", "EGG", "FAT", "OAT", "RYE"]);

/**
 * Normalizes an ingredient name: casing, whitespace, OCR corrections, pluralization.
 */
function normalizeIngredientName(name) {
    if (!name) return "";
    let normalized = String(name).trim().toUpperCase();

    // Remove trailing punctuation
    normalized = normalized.replace(/[.,;:]+$/, "");

    // Exact OCR Fixes
    if (OCR_CORRECTIONS[normalized]) return OCR_CORRECTIONS[normalized];

    // Check correction map for substrings if needed (careful)
    // For now, strict mapping or simple suffix handling

    // Normalize Plurals
    if (SINGULAR_MAP[normalized]) return SINGULAR_MAP[normalized];

    // "XXX FLAVORS" -> "XXX FLAVOR"
    if (normalized.endsWith(" FLAVORS")) {
        normalized = normalized.replace(/ FLAVORS$/, " FLAVOR");
    }

    return normalized;
}

/**
 * Detects legitimate junk tokens (short nonsense, non-alpha noise).
 */
function isLikelyJunk(name) {
    if (!name || name.length < 2) return true;

    // Drop short tokens unless allowed
    if (name.length < 4) {
        if (!JUNK_ALLOWLIST.has(name)) return true;
    }

    // Heuristic: Must have at least one vowel (A E I O U Y)?
    // "MSG" has no vowels but is allowed.
    // "PUM" has U. 
    // "PHP" ?
    // Let's rely on allowlist for very short words.

    // Check for excessive symbols (OCR noise like "$%#")
    const letters = (name.match(/[A-Z]/g) || []).length;
    if (letters < name.length * 0.5) return true; // Less than 50% letters

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

        // Check validation
        if (!normalized) {
            dropped.push({ original: originalName, reason: "Empty/Mapped to Empty" });
            continue;
        }

        if (isLikelyJunk(normalized)) {
            dropped.push({ original: originalName, normalized, reason: "Junk token" });
            continue;
        }

        // Deduplication
        if (seen.has(normalized)) {
            // Already present. We might update is_harmful if strictly necessary, but maintaining first order is request.
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
