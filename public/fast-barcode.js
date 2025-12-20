/* Fast barcode fetch: cache (RAM+LS), preconnect, timeout, fastest-wins race. */
(() => {
    const MEM = new Map();
    const LS_KEY = 'hs:barcodeCache:v3'; // Bumped to v3 for Sodium fix
    const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const AGG_URL = '/api/product/';
    const PROVIDERS = [
        (code) => fetchWithTimeout(`${AGG_URL}${code}`, 2500),
        (code) => fetchWithTimeout(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, 3000),
    ];

    function now() { return Date.now(); }
    function loadLS() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{"map":{}}'); } catch { return { map: {} }; } }
    function saveLS(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch { } }
    function getFromCache(code) {
        if (MEM.has(code)) return MEM.get(code);
        const db = loadLS(); const e = db.map[code];
        if (e && (now() - e.t) < TTL_MS) { MEM.set(code, e.v); return e.v; }
        return null;
    }
    function putInCache(code, val) {
        MEM.set(code, val);
        const db = loadLS(); db.map[code] = { t: now(), v: val }; saveLS(db);
    }
    function fetchWithTimeout(url, ms) {
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort('timeout'), ms);
        return fetch(url, { signal: ctrl.signal, credentials: 'omit' }).finally(() => clearTimeout(id));
    }
    function pickProduct(json) {
        if (!json) return null;
        if (json.ok && json.data) return json.data;   // our aggregator
        if (json.product) return json.product;        // OFF direct
        if (json.foods?.length) return json.foods[0]; // FDC shape
        return json;
    }
    async function raceProviders(barcode) {
        const errs = [];
        for (const p of PROVIDERS) {
            try {
                const res = await p(barcode);
                if (!res.ok) { errs.push(res.status); continue; }
                const json = await res.json();
                const product = pickProduct(json);
                if (product) return { raw: json, product };
            } catch (e) { errs.push(String(e)); }
        }
        throw new Error('Providers failed: ' + errs.join(', '));
    }

    async function fastFetchProduct(barcode) {
        if (!barcode) throw new Error('barcode required');
        const cached = getFromCache(barcode);
        if (cached) return { from: 'cache', ...cached };
        const t0 = performance.now();
        const { raw, product } = await raceProviders(barcode);
        const payload = { raw, product, ms: Math.round(performance.now() - t0) };
        putInCache(barcode, payload);
        return { from: 'network', ...payload };
    }

    // Hook: emit product when barcode is found (non-breaking)
    window.addEventListener('barcode:found', async (e) => {
        try {
            const { product } = await fastFetchProduct(e.detail);
            window.dispatchEvent(new CustomEvent('barcode:product', { detail: { code: e.detail, product } }));
        } catch (err) {
            console.error('[barcode] fetch failed', err);
            window.dispatchEvent(new CustomEvent('barcode:error', { detail: String(err) }));
        }
    });

    // Export
    window.fastFetchProduct = fastFetchProduct;

    // Preconnect early (why: cuts DNS/TLS latency on mobile)
    (function preconnect() {
        ['' + location.origin + '/api/', 'https://world.openfoodfacts.org'].forEach(h => {
            const l = document.createElement('link'); l.rel = 'preconnect'; l.href = h; l.crossOrigin = ''; document.head.appendChild(l);
        });
    })();
})();
