/* Scoring policy: Wrapper for YukaScore with standard weights (60% Nutrition, 30% Additives, 10% Organic) */
(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        const api = factory();
        root.ScorePolicy = api;
        try { root.exports = api; } catch { }
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    // Standard Yuka Weights
    const WEIGHTS = { nutrition: 0.60, additives: 0.30, organic: 0.10 };

    /**
     * Compute the overall score using YukaScore logic.
     * @param {Object} product - The product object normalized for YukaScore (must contain 'nutrients', 'additives', 'organic').
     * @returns {Object} - Object containing { overall, label, subscores, details }
     */
    function compute(product) {
        if (!window.YukaScore || !window.YukaScore.compute) {
            throw new Error("YukaScore engine missing. Load /public/score_yuka.js first.");
        }

        // Delegate entire calculation to YukaScore engine
        // YukaScore.compute returns { overall, subscores: { nutrition, additives, organic }, details... }
        // We re-calculate overall here just to be explicit about the 60/30/10 weighting if YukaScore doesn't enforce it exactly the same way,
        // BUT YukaScore usually does. Let's rely on YukaScore's internal weighting or re-apply it if needed.
        // Looking at typical YukaScore implementations:
        const y = window.YukaScore.compute(product);

        // Re-calculate overall with explicit weights to ensure accuracy per user request
        const overall = Math.round(
            WEIGHTS.nutrition * (y.subscores.nutrition || 0) +
            WEIGHTS.additives * (y.subscores.additives || 0) +
            WEIGHTS.organic * (y.subscores.organic || 0)
        );

        const label = overall >= 75 ? "Excellent" : overall >= 50 ? "Good" : overall >= 25 ? "Mediocre" : "Bad";

        return {
            overall,
            label,
            subscores: {
                nutrition: y.subscores.nutrition,
                additives: y.subscores.additives,
                organic: y.subscores.organic
            },
            details: {
                yuka: y,
                weights: WEIGHTS
            }
        };
    }

    const api = { compute };
    try { window.ScorePolicy = api; } catch { }
    return api;
});
