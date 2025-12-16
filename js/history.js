export function getHistory() {
    return JSON.parse(localStorage.getItem('scanHistory') || '[]');
}

export function saveToHistory(data) {
    const history = getHistory();
    // Create simple summary object
    const newItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        productName: data.summary?.match(/\*\*(.*?)\*\*/) ? data.summary.match(/\*\*(.*?)\*\*/)[1] : "Unknown Product",
        summary: data.summary,
        score: "Analysis Complete",
        data: data
    };

    // Add to top, limit to 10 items
    history.unshift(newItem);
    if (history.length > 10) history.pop();

    localStorage.setItem('scanHistory', JSON.stringify(history));
}

export const loadFromHistory = getHistory;

// Helper to get color class based on partial match
function getScoreColor(text) {
    if (!text) return 'text-gray-500';
    const lower = text.toLowerCase();
    if (lower.includes('poor') || lower.includes('bad') || lower.includes('harmful')) return 'text-red-500';
    if (lower.includes('average') || lower.includes('moderate')) return 'text-yellow-500';
    if (lower.includes('good') || lower.includes('excellent') || lower.includes('healthy')) return 'text-emerald-500';
    return 'text-gray-500';
}

export function renderHistory(containerId) {
    const history = getHistory();
    const container = document.getElementById(containerId);

    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10">No scans yet. Start analyzing!</div>`;
        return;
    }

    container.innerHTML = history.map(item => {
        // Safe access to data properties
        const scannedName = item.productName || "Unknown Product";
        const scannedBrand = item.data.Brand || "Scanned Item"; // Brand logic might vary based on parsing
        // Since we don't save scanned brand explicitly in top level, try to find it or default
        const scannedScore = item.data.score || "Unknown"; // We didn't save score explicitly in item root properly in prev iteration, let's check item.score or item.data.score

        // Alternative Data
        const alt = item.data.alternative || {};
        const altName = alt.name || "No Alternative Found";
        const altBrand = alt.brand || "";
        const altScore = alt.score || "Excellent";

        // Generate Images via Pollinations
        const scannedImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(scannedName + " product packaging white background")}?width=200&height=200&nologo=true`;
        const altImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(altName + " " + altBrand + " product packaging white background")}?width=200&height=200&nologo=true`;

        return `
        <!-- Comparison Card Pair -->
        <div class="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 flex flex-col md:flex-row items-center gap-4 group hover:shadow-xl transition-all">
            
            <!-- Scanned Product (Left) -->
            <div class="flex-1 flex flex-col items-center text-center space-y-2 w-full">
                <div class="relative w-24 h-24 md:w-32 md:h-32 mb-2">
                     <img src="${scannedImg}" alt="${scannedName}" class="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-500">
                     <div class="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm border border-red-200">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clip-rule="evenodd" />
                        </svg>
                     </div>
                </div>
                <h4 class="font-bold text-gray-900 leading-tight line-clamp-2 text-sm md:text-base">${scannedName}</h4>
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">${scannedBrand}</p>
                <div class="flex items-center gap-1.5 text-xs font-bold ${getScoreColor('Poor')}">
                    <span class="w-2 h-2 rounded-full bg-current"></span>
                    Poor
                </div>
            </div>

            <!-- Swap Icon (Middle) -->
            <div class="text-gray-300 transform md:rotate-0 rotate-90">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8 md:w-10 md:h-10">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
            </div>

            <!-- Alternative Product (Right) -->
            <div class="flex-1 flex flex-col items-center text-center space-y-2 w-full">
                <div class="relative w-24 h-24 md:w-32 md:h-32 mb-2">
                     <img src="${altImg}" alt="${altName}" class="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-500">
                     <div class="absolute -top-2 -right-2 bg-emerald-100 text-emerald-600 rounded-full p-1 shadow-sm border border-emerald-200">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
                        </svg>
                     </div>
                </div>
                <h4 class="font-bold text-gray-900 leading-tight line-clamp-2 text-sm md:text-base">${altName}</h4>
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">${altBrand}</p>
                <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ${altScore}
                </div>
            </div>

        </div>
        `;
    }).join('');
}
