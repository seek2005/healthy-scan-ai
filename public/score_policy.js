/* Scoring policy that wraps YukaScore for Nutrition and adds Additives+Processing + hard caps */
(function (global) {
    const WEIGHTS = { nutrition: 0.60, additives: 0.25, processing: 0.15 };
    const ADD_PENALTY = { high: 35, medium: 15, low: 0, unknown: 8 };
    const UPF_REGEX =
        /(maltodextrin|corn syrup|high fructose|dextrose|glucose syrup|hydrogenated|mono-?diglycerides|artificial|color(?!i?ng)|lake\b|msg|glutamate|disodium|benzoate|sorbate|bht|bha|tb(h)?q|yellow ?5|yellow ?6|red ?40|blue ?1)/i;

    function pct(v, min, max) { if (v == null) return null; return Math.max(0, Math.min(100, (v - min) * 100 / (max - min))); }

    function isBeverageLike(p) {
        const s = `${p.category || ""} ${p.subcategory || ""} ${p.kind || ""} ${p.name || ""}`.toLowerCase();
        const dairy = /(milk|yogurt|kefir|dairy)/.test(s);
        return /(drink|beverage|soda|juice|cola|tea|coffee)/.test(s) && !dairy;
    }

    function additivesPercent(additives = [], ingText = "") {
        if (!Array.isArray(additives)) additives = [];
        let penalty = 0, counts = { high: 0, medium: 0, low: 0, unknown: 0 };

        if (additives.length === 0) {
            // Unknown shouldn’t be perfect; baseline plus UPF hint
            const upf = UPF_REGEX.test(ingText);
            return { percent: upf ? 35 : 60, counts, penalty: upf ? 65 : 40 };
        }

        for (const a of additives) {
            const r = String(a.risk || "unknown").toLowerCase();
            penalty += (ADD_PENALTY[r] ?? ADD_PENALTY.unknown);
            counts[r] = (counts[r] || 0) + 1;
        }
        const percent = Math.max(0, 100 - penalty);
        return { percent, counts, penalty };
    }

    function processingPercent(nova, ingText = "") {
        if (typeof nova === "number") {
            if (nova <= 1) return 100;
            if (nova === 2) return 85;
            if (nova === 3) return 55;
            return 15; // nova 4
        }
        // Infer from UPF keywords
        return UPF_REGEX.test(ingText) ? 35 : 60;
    }

    // Expect product normalized to per-100 basis like your yukaProduct
    function compute(product, extras = {}) {
        if (!global.YukaScore || !global.YukaScore.compute) {
            throw new Error("YukaScore engine not loaded – load /public/score_yuka.js first.");
        }
        const y = global.YukaScore.compute(product); // gives nutrition percent + details

        const listText = (extras.ingredients_list || []).map(i => i.name).join(" ");
        const ingText = `${extras.ingredients_text || ""} ${listText}`.trim();

        const addi = additivesPercent(product.additives || [], ingText);
        const proc = processingPercent(extras.nova_group, ingText);

        let overall = Math.round(
            WEIGHTS.nutrition * y.subscores.nutrition +
            WEIGHTS.additives * addi.percent +
            WEIGHTS.processing * proc
        );

        // Hard caps for obvious junk
        const per100 = y.details.nutri.per100 || {};
        const beverage = isBeverageLike(product);

        if (!beverage && per100.sugars_g > 20) overall = Math.min(overall, 45);
        if (!beverage && per100.satfat_g > 10) overall = Math.min(overall, 35);
        if (!beverage && per100.sodium_mg > 800) overall = Math.min(overall, 35);
        if (beverage && per100.sugar_g > 8) overall = Math.min(overall, 40);

        const label = overall >= 75 ? "Excellent" : overall >= 50 ? "Good" : overall >= 25 ? "Mediocre" : "Bad";
        return {
            overall, label,
            subscores: { nutrition: y.subscores.nutrition, additives: addi.percent, processing: proc },
            details: { yuka: y, additives: addi, processing: proc, weights: WEIGHTS }
        };
    }

    global.ScorePolicy = { compute, UPF_REGEX };
})(window);
