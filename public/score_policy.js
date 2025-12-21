/* Scoring policy: Nutrition (Yuka) + Additives + Processing + Hard Caps */
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
    const WEIGHTS = { nutrition: 0.60, additives: 0.25, processing: 0.15 };
    const ADD_PENALTY = { high: 35, medium: 15, low: 0, unknown: 8 };

    // Broad but effective UPF signal
    const UPF_REGEX = /(maltodextrin|corn syrup|high fructose|dextrose|glucose syrup|hydrogenated|mono-?diglycerides|artificial(?!ly flavored milk)|color(?!i?ng)|lake\b|msg|glutamate|disodium|benzoate|sorbate|bht|bha|tbh?q|yellow ?5|yellow ?6|red ?40|blue ?1)/i;

    function isBeverageLike(p) {
        const s = `${p.category || ""} ${p.subcategory || ""} ${p.kind || ""} ${p.name || ""}`.toLowerCase();
        const dairy = /(milk|yogurt|kefir|dairy)/.test(s);
        return /(drink|beverage|soda|juice|cola|tea|coffee)/.test(s) && !dairy;
    }

    function additivesPercent(additives = [], ingText = "") {
        if (!Array.isArray(additives)) additives = [];
        if (additives.length === 0) {
            const upf = UPF_REGEX.test(ingText);
            return { percent: upf ? 35 : 60, counts: {}, penalty: upf ? 65 : 40 };
        }
        let penalty = 0;
        const counts = { high: 0, medium: 0, low: 0, unknown: 0 };
        for (const a of additives) {
            const r = String(a.risk || "unknown").toLowerCase();
            penalty += (ADD_PENALTY[r] ?? ADD_PENALTY.unknown);
            counts[r] = (counts[r] || 0) + 1;
        }
        return { percent: Math.max(0, 100 - penalty), counts, penalty };
    }

    function processingPercent(nova, ingText = "") {
        if (typeof nova === "number") {
            if (nova <= 1) return 100;
            if (nova === 2) return 85;
            if (nova === 3) return 55;
            return 15; // NOVA 4
        }
        return UPF_REGEX.test(ingText) ? 35 : 60; // heuristic
    }

    function compute(product, extras = {}) {
        if (!window.YukaScore || !window.YukaScore.compute) {
            throw new Error("YukaScore engine missing. Load /public/score_yuka.js first.");
        }

        // Nutrition via YukaScore
        const y = window.YukaScore.compute(product);

        // Ingredient text for signals (works for both flows)
        const list = (extras.ingredients_list || []).map(i => i.name).join(" ");
        const ingText = `${extras.ingredients_text || ""} ${list}`.trim();

        // Additives & Processing
        const addi = additivesPercent(product.additives || [], ingText);
        const proc = processingPercent(extras.nova_group, ingText);

        // Weighted overall
        let overall = Math.round(
            WEIGHTS.nutrition * y.subscores.nutrition +
            WEIGHTS.additives * addi.percent +
            WEIGHTS.processing * proc
        );

        // Hard caps for obvious junk
        const per = y.details.nutri.per100 || {};
        const isBeverage = isBeverageLike(product);

        if (!isBeverage && (per.sugar_g ?? per.sugars_g ?? 0) > 20) overall = Math.min(overall, 45);
        if (!isBeverage && (per.satfat_g ?? 0) > 10) overall = Math.min(overall, 35);
        if (!isBeverage && (per.sodium_mg ?? 0) > 800) overall = Math.min(overall, 35);
        if (isBeverage && (per.sugar_g ?? per.sugars_g ?? 0) > 8) overall = Math.min(overall, 40);

        const label = overall >= 75 ? "Excellent" : overall >= 50 ? "Good" : overall >= 25 ? "Mediocre" : "Bad";
        return {
            overall, label,
            subscores: { nutrition: y.subscores.nutrition, additives: addi.percent, processing: proc },
            details: { yuka: y, additives: addi, processing: proc, weights: WEIGHTS }
        };
    }

    // ESM + global
    const api = { compute, UPF_REGEX };
    try { window.ScorePolicy = api; } catch { }
    return api;
});
