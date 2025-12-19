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

        const getRec = (pct) => pct > 40 ? "High" : pct > 20 ? "Medium" : "Low";

        result[stage] = {
            sugar: getRec(sugarPct), // Client expects 'sugar'
            sodium: getRec(sodiumPct),
            saturated_fat: getRec(fatPct)
        };
    });

    return result;
}

module.exports = { DAILY_LIMITS, calculatePortionAnalysis };
