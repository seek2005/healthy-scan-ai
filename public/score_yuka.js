(function (global) {
    const WEIGHTS = { nutrition: 0.60, additives: 0.30, organic: 0.10 };
    const ADDITIVE_PENALTY = { high: 35, medium: 15, low: 0, unknown: 5 };
    const LETTER_TO_PERCENT = { A: 100, B: 80, C: 60, D: 40, E: 20 };

    const TH = {
        foods: {
            // Yuka strictness: ~2000kJ (478kcal) is roughly max penalty for energy density
            energy_kj: [335, 670, 1000, 1340, 1600, 1800, 2000, 2300, 2600, 2900],
            sugar_g: [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45],
            satfat_g: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            // 714mg sodium should be penalized heavily. 
            // Current index 7 (720) -> 7 points. Maybe fine.
            sodium_mg: [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
            fiber_g: [0.9, 1.9, 2.8, 3.7, 4.7],
            protein_g: [1.6, 3.2, 4.8, 6.4, 8.0],
            fvn_pct: [40, 60, 80]
        },
        beverages: {
            energy_kj: [30, 60, 90, 120, 150, 180, 210, 240, 270, 300],
            sugar_g: [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15],
            satfat_g: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            sodium_mg: [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
            fiber_g: [0.9, 1.9, 2.8, 3.7, 4.7],
            protein_g: [1.6, 3.2, 4.8, 6.4, 8.0],
            fvn_pct: [40, 60, 80]
        },
        beverages_water: { // Fallback for pure water if needed
            energy_kj: [], sugar_g: [], satfat_g: [], sodium_mg: [], fiber_g: [], protein_g: [], fvn_pct: []
        }
    };

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const points = (v, arr) => arr.reduce((p, t) => (v > t ? p + 1 : p), 0);
    const kcal2kj = (kcal) => Number(kcal) * 4.184;

    function toPer100(val, basis, serving) {
        if (val == null) return 0;
        const n = Number(val);
        if (basis === "per100g" || basis === "per100ml") return n;
        if (!serving) return n;
        return n * 100 / Number(serving);
    }

    function inferKind(product) {
        const name = (product.name || "").toLowerCase();
        const cat = (product.category || product.subcategory || "").toLowerCase();
        const tag = (product.kind || "").toLowerCase();
        if ((cat + name).includes("water") && !(cat + name).includes("melon")) return "beverages-water";
        const looksBeverage = /(drink|beverage|soda|juice|cola|tea|coffee|milk|yogurt|kefir|dairy)/.test(cat + " " + tag + " " + name);
        // Note: Yuka treats milk as food for scoring purposes usually, but user spec says "Milk/dairy must be treated as FOODS".
        // My logic below:
        const isDairy = /(milk|yogurt|kefir|dairy)/.test(cat + " " + name);
        if (looksBeverage && !isDairy) return "beverages";
        return "foods";
    }

    function nutriScore(product) {
        const basis = product.nutrients_basis || "per100g";
        const serving = product.serving_size_gml || 100;
        const kind0 = inferKind(product);
        const kind = kind0 === "beverages-water" ? "beverages" : kind0;
        const T = TH[kind] || TH.foods; // Safety fallback

        const energy_kj = toPer100(product.nutrients?.energy_kj ?? (product.nutrients?.energy_kcal ? kcal2kj(product.nutrients.energy_kcal) : 0), basis, serving);
        const sugar_g = toPer100(product.nutrients?.sugars_g ?? product.nutrients?.sugar_g ?? 0, basis, serving);
        const satfat_g = toPer100(product.nutrients?.saturated_fat_g ?? product.nutrients?.satfat_g ?? 0, basis, serving);
        const sodium_mg = toPer100(product.nutrients?.sodium_mg ?? 0, basis, serving);
        const fiber_g = toPer100(product.nutrients?.fiber_g ?? 0, basis, serving);
        const protein_g = toPer100(product.nutrients?.protein_g ?? 0, basis, serving);
        const fvn_pct = Number(product.fvn_percent ?? 0);

        const A = points(energy_kj, T.energy_kj) + points(sugar_g, T.sugar_g) + points(satfat_g, T.satfat_g) + points(sodium_mg, T.sodium_mg);
        const fvn_points = fvn_pct >= 80 ? 5 : fvn_pct >= 60 ? 2 : fvn_pct >= 40 ? 1 : 0;
        const fiber_points = points(fiber_g, T.fiber_g);
        const protein_points = points(protein_g, T.protein_g);
        const protein_ok = !(A >= 11 && fvn_points < 5 && product.subcategory !== "cheese");
        const C = fvn_points + fiber_points + (protein_ok ? protein_points : 0);
        const raw = A - C;

        let letter;
        if (kind0 === "beverages-water") letter = "A";
        else if (kind === "beverages") letter = raw <= 1 ? "A" : raw <= 5 ? "B" : raw <= 9 ? "C" : raw <= 13 ? "D" : "E";
        else letter = raw <= -1 ? "A" : raw <= 2 ? "B" : raw <= 10 ? "C" : raw <= 18 ? "D" : "E";

        return {
            letter,
            percent: LETTER_TO_PERCENT[letter],
            A, C, raw,
            per100: { energy_kj, sugar_g, satfat_g, sodium_mg, fiber_g, protein_g, fvn_pct },
            kind: kind0
        };
    }

    function additivesScore(additives = []) {
        let penalty = 0, counts = { high: 0, medium: 0, low: 0, unknown: 0 };
        for (const a of additives) {
            const r = String(a.risk || "unknown").toLowerCase();
            penalty += (ADDITIVE_PENALTY[r] ?? ADDITIVE_PENALTY.unknown);
            counts[r] = (counts[r] || 0) + 1;
        }
        return { percent: clamp(100 - penalty, 0, 100), counts, penalty };
    }

    function organicScore(organic) {
        if (organic == null) return { percent: 0 };
        const pct = typeof organic === "boolean" ? (organic ? 100 : 0) : Number(organic);
        return { percent: clamp(pct, 0, 100) };
    }

    function compute(product) {
        const nutri = nutriScore(product);
        const addi = additivesScore(product.additives || []);
        const org = organicScore(product.organic);

        const overall = Math.round(
            WEIGHTS.nutrition * nutri.percent + WEIGHTS.additives * addi.percent + WEIGHTS.organic * org.percent
        );

        const label = overall >= 75 ? "Excellent" : overall >= 50 ? "Good" : overall >= 25 ? "Mediocre" : "Bad";

        return {
            overall, label,
            subscores: { nutrition: nutri.percent, additives: addi.percent, organic: org.percent },
            details: { nutri, addi, org, weights: WEIGHTS }
        };
    }

    function toUIKIT(product, passthrough = {}) {
        const r = compute(product);
        return { score: r.overall, label: r.label, ...passthrough, _yuka: r };
    }

    global.YukaScore = { compute, toUIKIT, _consts: { WEIGHTS, ADDITIVE_PENALTY, LETTER_TO_PERCENT } };

    // Smoke tests (leave enabled for now; comment later)
    try {
        const milk = {
            name: "Reduced Fat Milk 2%", category: "dairy milk",
            nutrients_basis: "per100ml", serving_size_gml: 240,
            nutrients: { energy_kcal: 60, sugars_g: 5.8, saturated_fat_g: 1.25, sodium_mg: 62.5, fiber_g: 0, protein_g: 4.2 },
            additives: [], organic: true
        };
        const cheetos = {
            name: "Cheetos Crunchy", category: "snack chips",
            nutrients_basis: "per100g", serving_size_gml: 28,
            nutrients: { energy_kcal: 535, sugars_g: 3.5, saturated_fat_g: 5.36, sodium_mg: 714, fiber_g: 3.6, protein_g: 7.1 },
            additives: [{ risk: "high" }, { risk: "high" }, { risk: "medium" }], organic: false
        };
        console.log("Yuka-like Milk:", compute(milk));     // ≈ 88/100 Excellent
        console.log("Yuka-like Cheetos:", compute(cheetos)); // low score
    } catch (e) { }
})(window);
