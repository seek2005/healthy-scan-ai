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
            sugar_percentage: `${sugarPct}%`,
            sodium_recommendation: getRec(sodiumPct),
            sodium_percentage: `${sodiumPct}%`,
            fat_recommendation: getRec(fatPct),
            fat_percentage: `${fatPct}%`
        };
    });
}

console.log("--- Testing 38g Sugar ---");
console.log(JSON.stringify(calculatePortionAnalysis(38, 0, 0), null, 2));

console.log("\n--- Testing 7.5g Sugar ---");
console.log(JSON.stringify(calculatePortionAnalysis(7.5, 0, 0), null, 2));
