const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);

const OFF = (code) => `https://world.openfoodfacts.org/api/v2/product/${code}.json`;

async function withTimeout(url, ms = 2500) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { signal: ctrl.signal }); }
    finally { clearTimeout(id); }
}

function normalizeFromOFF(code, raw) {
    const p = raw?.product;
    if (!p) return null;
    const n = p.nutriments || {};
    // OFF returns sodium_100g in GRAMS. Convert to MG. Fallback to salt*400.
    const sodium_mg = n.sodium_100g != null ? n.sodium_100g * 1000
        : (n.salt_100g != null ? n.salt_100g * 400 : null);
    return {
        name: p.product_name || p.brands || code,
        category: p.categories || '',
        nutrients_basis: 'per100g',
        serving_size_gml: Number(p.serving_quantity) || 100,
        nutrients: {
            energy_kcal: n['energy-kcal'] ?? n.energy_kcal ?? null,
            energy_kj: n.energy_kj ?? null,
            sugars_g: n.sugars_100g ?? null,
            saturated_fat_g: n['saturated-fat_100g'] ?? n.saturated_fat_100g ?? null,
            sodium_mg: sodium_mg != null ? Number(sodium_mg) : null,
            fiber_g: n.fiber_100g ?? null,
            protein_g: n.proteins_100g ?? null
        },
        additives: (p.additives_tags || []).map(tag => ({ risk: 'unknown', tag })),
        nova_group: p.nova_group, // 1-4
        ingredients_text: p.ingredients_text || '',
        organic: /organic|bio/i.test(p.labels || '')
    };
}

app.get('/api/product/:code', async (req, res) => {
    const code = String(req.params.code || '').trim();
    if (!/^\d{8,14}$/.test(code)) return res.status(400).json({ ok: false, error: 'Invalid barcode' });

    const r = await withTimeout(OFF(code), 2500).catch(() => null);
    if (!r || !r.ok) return res.status(404).json({ ok: false, error: 'Not found' });

    const raw = await r.json().catch(() => null);
    const data = normalizeFromOFF(code, raw);
    if (!data) return res.status(404).json({ ok: false, error: 'No product data' });

    const body = JSON.stringify({ ok: true, data });
    const etag = crypto.createHash('sha1').update(body).digest('hex');

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.type('application/json').send(body);
});

module.exports = app;
