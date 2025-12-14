import { getColorClass } from './utils.js';

export function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

export function switchTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
        btn.classList.add('text-gray-600', 'hover:bg-gray-200/50');
    });

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-50', 'text-emerald-600');
        btn.classList.add('text-gray-600');
    });

    const target = document.getElementById('tab-' + tabName);
    if (target) target.classList.remove('hidden');

    const desktopBtn = document.getElementById('nav-' + tabName);
    if (desktopBtn) {
        desktopBtn.classList.add('active-nav');
        desktopBtn.classList.remove('text-gray-600', 'hover:bg-gray-200/50');
    }

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.add('hidden');

    const header = document.getElementById('main-header');
    if (tabName === 'home') {
        if (header) header.classList.remove('hidden');
    } else {
        if (header) header.classList.add('hidden');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function previewImage(file, imagePreviewElement, scanButton) {
    if (file) {
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.onload = (e) => {
                imagePreviewElement.src = e.target.result;
                const base64 = e.target.result.split(',')[1];

                document.getElementById('defaultView').classList.add('hidden');
                document.getElementById('previewView').classList.remove('hidden');
                document.getElementById('previewView').classList.add('flex');

                scanButton.disabled = false;
                scanButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    Start Analysis
                `;
                resolve(base64);
            };
            reader.readAsDataURL(file);
        });
    }
    return Promise.resolve(null);
}

export function showStatus(message, isError = false) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.classList.remove('hidden', 'text-red-600', 'bg-red-50', 'text-blue-600', 'bg-blue-50');
    statusMessage.classList.add('block');
    if (isError) {
        statusMessage.classList.add('text-red-600', 'bg-red-50');
        statusMessage.innerHTML = `Error: ${message}`;
    } else {
        statusMessage.classList.add('text-blue-600', 'bg-blue-50', 'flex', 'items-center', 'justify-center');
        statusMessage.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${message}`;
    }
}

export function resetUI(imageUpload) {
    document.getElementById('defaultView').classList.remove('hidden');
    document.getElementById('previewView').classList.add('hidden');
    document.getElementById('previewView').classList.remove('flex');
    document.getElementById('resultsContainer').classList.add('hidden');
    document.getElementById('resultsContainer').classList.remove('flex', 'flex-col');
    document.getElementById('statusMessage').classList.add('hidden');

    // Restore Start Analysis button
    const scanBtn = document.getElementById('scanButton');
    if (scanBtn) scanBtn.classList.remove('hidden');

    // Restore Recent Scans (if not empty - handled by renderHistory, but good to unhide container)
    // Actually renderHistory handles visibility, so just ensure we don't force hide it unless needed.
    // For now, let's just make sure we don't leave it permanently hidden if renderHistory doesn't run immediately.
    const recentScans = document.getElementById('recentScansContainer');
    if (recentScans && recentScans.children.length > 0) recentScans.classList.remove('hidden');

    if (imageUpload) imageUpload.value = '';
}

export function displayResults(data) {
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.classList.remove('hidden');
        resultsContainer.classList.add('flex', 'flex-col');
    }

    const defaultView = document.getElementById('defaultView');
    const previewView = document.getElementById('previewView');
    if (defaultView) defaultView.classList.add('hidden');
    // Keep preview view visible if it has an image
    if (previewView && document.getElementById('imagePreview').src) {
        previewView.classList.remove('hidden');
        // HIDE the original 'Start Analysis' button to avoid clutter
        const originalScanBtn = document.getElementById('scanButton');
        if (originalScanBtn) originalScanBtn.classList.add('hidden');
    }

    // Hide Recent Scans to focus on result
    const recentScans = document.getElementById('recentScansContainer');
    if (recentScans) recentScans.classList.add('hidden');

    // 0. AI Product Analysis (Summary)
    const summaryContainer = document.getElementById('productAnalysisContainer');
    if (summaryContainer) {
        summaryContainer.classList.remove('hidden');
        if (data.summary) {
            summaryContainer.innerHTML = `
                <!-- Action Buttons (Reset/Scan) -->
                <div class="flex gap-4 mb-8 justify-center animate-fade-in-up">
                    <button onclick="resetUI()" class="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                        Scan New Image
                    </button>
                    <button onclick="resetUI(); setTimeout(() => startBarcodeScan(), 100)" class="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
                        </svg>
                        Scan Barcode
                    </button>
                </div>
    
    <div class="glass-panel rounded-[1.5rem] p-5 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50">
                    <h3 class="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                         <div class="p-2 md:p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white">
                            <!-- Custom Nutrition Label + Magnifying Glass Icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 md:w-8 md:h-8">
                                <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 017.5 15zm0-3.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm0-3.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clip-rule="evenodd" opacity="0.8" />
                                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                                <path fill-rule="evenodd" d="M16 11a4 4 0 10-8 0 4 4 0 008 0zm-1.5 4.5l3.5 3.5-1.5 1.5-3.5-3.5a6 6 0 111.5-1.5z" clip-rule="evenodd" transform="translate(4, 4) scale(0.8)" />
                            </svg>
                        </div>
                         AI Product Analysis
                    </h3>
                    <p class="text-gray-700 leading-relaxed font-medium text-base md:text-lg">
                        ${data.summary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-900">$1</strong>')}
                    </p>
                </div>
    `;
        }
    }

    // 1. Allergen Alerts
    const allergenContainer = document.getElementById('allergenContainer');
    if (allergenContainer) {
        allergenContainer.innerHTML = '';
        allergenContainer.classList.add('hidden');
        if (data.allergens && data.allergens.length > 0) {
            allergenContainer.classList.remove('hidden');
            let html = `<div class="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm">
                <h4 class="text-red-800 font-bold flex items-center gap-2 mb-3 text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                        <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
                    </svg>
                    Allergen Warning
                </h4>
                <ul class="list-disc list-inside text-red-700 text-base space-y-2">`;
            data.allergens.forEach(a => html += `<li><span class="font-bold text-red-900">${a.name}</span>: ${a.description}</li>`);
            html += `</ul></div>`;
            allergenContainer.innerHTML = html;
        }
    }

    // 2. Table (Age Breakdown)
    const tableElement = document.getElementById('portionAnalysisTable');
    if (tableElement) {
        const parentCard = tableElement.closest('.glass-panel'); // Re-introduced definition
        if (parentCard) {
            parentCard.className = 'glass-panel rounded-[1.5rem] p-4 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50';
            const headerIcon = parentCard.querySelector('.p-2');
            if (headerIcon) headerIcon.className = 'p-2 md:p-3 bg-white text-orange-500 rounded-xl shadow-sm';
        }

        let rows = '';
        if (data.portion_analysis) {
            for (const [group, nutrients] of Object.entries(data.portion_analysis)) {
                rows += `
    <tr class="group hover:bg-white/50 transition-colors border-b border-orange-100 last:border-0">
                    <td class="py-2 md:py-4 font-bold text-gray-800 capitalize pl-1 text-xs md:text-base w-1/4 break-words">${group}</td>
                    <td class="py-2 md:py-4 text-center w-1/4">
                        <span class="px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${getColorClass(nutrients.sugar)} block w-full truncate">
                            ${nutrients.sugar}
                        </span>
                    </td>
                    <td class="py-2 md:py-4 text-center w-1/4">
                        <span class="px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${getColorClass(nutrients.sodium)} block w-full truncate">
                            ${nutrients.sodium}
                        </span>
                    </td>
                    <td class="py-2 md:py-4 text-center w-1/4">
                        <span class="px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${getColorClass(nutrients.saturated_fat)} block w-full truncate">
                            ${nutrients.saturated_fat}
                        </span>
                    </td>
                </tr>`;
            }
        }
        tableElement.innerHTML = rows;
    }

    // 3. Ingredients
    const ingContainer = document.getElementById('ingredientsContainer');
    if (ingContainer) {
        ingContainer.innerHTML = '';
        const parentCard = ingContainer.closest('.glass-panel'); // Re-introduced definition
        if (parentCard) {
            parentCard.className = 'glass-panel rounded-[1.5rem] p-4 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50';
            const headerIcon = parentCard.querySelector('.p-2');
            if (headerIcon) headerIcon.className = 'p-2 md:p-3 bg-white text-orange-600 rounded-xl shadow-sm';
        }

        if (data.ingredients_list) {
            data.ingredients_list.forEach(ing => {
                const el = document.createElement('div');
                el.className = `group relative px-3 py-1 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1 cursor-help transition-all hover:scale-105 shadow-sm hover:shadow-md ${ing.is_harmful ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-emerald-700 border border-emerald-100'}`;
                el.innerHTML = `
                    ${ing.name}
<div class="tooltip-bubble">
    ${ing.description || "No description available"}
</div>
`;
                ingContainer.appendChild(el);
            });
        }
    }

    // 4. Smart Alt
    const altContainer = document.getElementById('altContainer');
    if (altContainer && data.alternative) {
        const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(data.alternative.brand + ' ' + data.alternative.name)}`;
        const cleanName = encodeURIComponent(data.alternative.name + " " + data.alternative.brand + " product packaging");
        const productImageUrl = `https://image.pollinations.ai/prompt/${cleanName}?width=300&height=300&nologo=true`;

        altContainer.innerHTML = `
            <div class="glass-panel p-5 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 rounded-[2rem] md:rounded-[2.5rem] border border-orange-100 shadow-xl mt-6 md:mt-8">
                <div class="flex items-center gap-4 mb-8">
                     <div class="p-2 bg-white text-orange-600 rounded-xl shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
                          <path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.352-.172-2.67-.51-3.903a.75.75 0 00-.722-.515 11.208 11.208 0 01-7.877-3.08zM12 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" />
                          <path d="M10 14.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z" />
                        </svg>
                     </div>
                     <h3 class="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Smart Alternative</h3>
                </div>

                <div class="flex flex-col md:flex-row gap-8 items-start">
                    <div class="w-full md:w-48 h-48 bg-white rounded-3xl p-4 shadow-lg shadow-orange-100/50 flex items-center justify-center shrink-0 border-4 border-white transform group-hover:scale-105 transition-transform duration-300">
                        <img src="${productImageUrl}" alt="${data.alternative.name}" class="w-full h-full object-contain" onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                    </div>

                    <div class="flex-1 space-y-4">
                        <h4 class="text-2xl font-black text-gray-900 leading-tight">${data.alternative.name}</h4>
                        <p class="text-orange-600 font-bold text-lg uppercase tracking-wide">${data.alternative.brand}</p>
                        <div class="bg-white/60 p-4 rounded-2xl italic text-gray-700 border-l-4 border-orange-400">
                            "${data.alternative.reason}"
                        </div>
                        <a href="${amazonUrl}" target="_blank" class="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl mt-2">
                            Find on Amazon
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    if (resultsContainer) {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
