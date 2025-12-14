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

export function renderHistory(containerId, listId, onItemClick) {
    const history = getHistory();
    const container = document.getElementById(containerId);
    const list = document.getElementById(listId);

    if (!container || !list) return;

    if (history.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    list.innerHTML = history.map(item => `
        <div data-id="${item.id}" class="history-item bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
            <div>
                <p class="font-bold text-gray-800 text-sm group-hover:text-emerald-600 transition-colors pointer-events-none">${item.productName}</p>
                <p class="text-xs text-gray-400 pointer-events-none">${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
            <div class="bg-gray-50 p-2 rounded-lg group-hover:bg-emerald-50 transition-colors pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-gray-400 group-hover:text-emerald-600">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </div>
        </div>
    `).join('');

    // Attach listeners dynamically to avoid 'onclick' string issues
    list.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id);
            const item = history.find(h => h.id === id);
            if (item && onItemClick) onItemClick(item.data);
        });
    });
}
