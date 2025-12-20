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

// Helper to resize image
export function previewImage(file, imagePreviewElement, scanButton) {
    if (file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Resize Logic
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

                    // Show Preview
                    imagePreviewElement.src = compressedDataUrl;

                    // Update UI State
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

                    // Return base64 without prefix for API
                    resolve(compressedDataUrl.split(',')[1]);
                };
                img.src = e.target.result;
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
        if (data.summary || data.nutrients) { // Accept Fast Data OR AI Data
            // Prepare data for Yuka Scorer
            const n = data.nutrients || {};
            const ext = data.extracted_nutrients || {};

            // Normalize Nutrients for Yuka
            const mappedNutrients = {
                sugars_g: n.sugars_g ?? ext.sugar_g ?? 0,
                saturated_fat_g: n.saturated_fat_g ?? ext.sat_fat_g ?? 0,
                sodium_mg: n.sodium_mg ?? ext.sodium_mg ?? 0,
                energy_kcal: n.energy_kcal ?? ext.energy_kcal ?? 0,
                fiber_g: n.fiber_g ?? ext.fiber_g ?? 0,
                protein_g: n.protein_g ?? ext.protein_g ?? 0
            };

            const yukaProduct = {
                name: data.name || "Product",
                category: data.category || "foods",
                nutrients_basis: "per100g",
                serving_size_gml: 100,
                nutrients: mappedNutrients,
                additives: data.additives
                    ? data.additives
                    : (data.ingredients_list || []).filter(i => i.is_harmful).map(i => ({ risk: "high" })),
                organic: data.organic !== undefined ? data.organic : (data.suitability_tags || []).includes("Organic")
            };

            // STRICT PENALTY: Ultra-Processed
            const isProcessed = (data.suitability_tags || []).some(t => t.includes('Processed') || t.includes('Ultra'));

            if (isProcessed) {
                // Add 4 virtual high-risk additives to force score to 0/30 for additives
                yukaProduct.additives.push({ risk: "high" });
                yukaProduct.additives.push({ risk: "high" });
                yukaProduct.additives.push({ risk: "high" });
                yukaProduct.additives.push({ risk: "high" });
            }

            // Calculate Score based on Nutrients + Additives + Organic
            const y = window.YukaScore.compute(yukaProduct);
            let score = y.overall;

            // MANUAL OVERRIDES for obvious junk food thresholds (Per 100g)
            if (yukaProduct.nutrients.sodium_mg > 800) {
                score = Math.min(score, 35);
            }
            if (yukaProduct.nutrients.saturated_fat_g > 10) {
                score = Math.min(score, 35);
            }

            const scoreLabel = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Mediocre' : 'Bad';

            // Map Label to Colors
            let scoreColor = '#10b981'; // Excellent (Green)
            let scoreBg = 'bg-emerald-50';
            let labelColorClass = 'text-emerald-700';

            if (scoreLabel === 'Good') {
                scoreColor = '#84cc16'; // Light Green
                scoreBg = 'bg-lime-50';
                labelColorClass = 'text-lime-700';
            } else if (scoreLabel === 'Mediocre') {
                scoreColor = '#f59e0b'; // Orange
                scoreBg = 'bg-orange-50';
                labelColorClass = 'text-orange-700';
            } else if (scoreLabel === 'Bad') {
                scoreColor = '#ef4444'; // Red
                scoreBg = 'bg-red-50';
                labelColorClass = 'text-red-700';
            }

            // Suitability Tags Logic
            const tags = data.suitability_tags || ["General Use"];
            const tagsHtml = tags.map(tag => {
                let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                if (tag.toLowerCase().includes('allerg') || tag.toLowerCase().includes('avoid')) colorClass = 'bg-red-100 text-red-800 border-red-200';
                else if (tag.toLowerCase().includes('low') || tag.toLowerCase().includes('free')) colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                else if (tag.toLowerCase().includes('process') || tag.toLowerCase().includes('additiv')) colorClass = 'bg-orange-100 text-orange-800 border-orange-200';

                return `<span class="px-3 py-1 rounded-full text-xs font-bold border ${colorClass}">${tag}</span>`;
            }).join('');

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
    
                <!-- New Grid Layout -->
                <div class="grid md:grid-cols-2 gap-6 mb-8">
                
                    <!-- Card 1: AI Product Analysis (Score) -->
                    <div class="glass-panel rounded-[1.5rem] p-6 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50 flex flex-col justify-between">
                        <div class="flex items-center gap-2 mb-4">
                             <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                                    <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm14.25 6a.75.75 0 01-.22.53l-2.25 2.25a.75.75 0 11-1.06-1.06L15.44 12l-1.72-1.72a.75.75 0 111.06-1.06l2.25 2.25c.141.14.22.331.22.53zm-10.28-.53a.75.75 0 000 1.06l2.25 2.25a.75.75 0 101.06-1.06L8.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-2.25 2.25z" clip-rule="evenodd" />
                                </svg>
                             </div>
                             <h3 class="text-lg font-bold text-gray-900">AI Product Analysis</h3>
                        </div>
                        
                        <div class="flex items-center gap-6">
                            <!-- Circular Chart -->
                            <div class="relative w-24 h-24 shrink-0 rounded-full flex items-center justify-center font-black text-2xl text-gray-800" 
                                 style="background: conic-gradient(${scoreColor} ${score}%, #e5e7eb ${score}% 100%);">
                                <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner">
                                    ${score}
                                </div>
                            </div>
                            
                            <div class="flex-1 min-w-0"> <!-- allow shrinking -->
                                <h4 class="text-2xl font-bold text-gray-900 mb-1">Overall: <span class="text-sm px-2 py-1 rounded-full ${scoreBg} ${labelColorClass}">${scoreLabel}</span></h4>
                                <p class="text-sm text-gray-500 leading-tight mb-2">
                                    Breakdown by Nutrition, Additives and Processing.
                                </p>
                                <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-gray-400">
                                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Nutrition</span>
                                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-400"></span> Additives</span>
                                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400"></span> Processing</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card 2: Is it for me? (Suitability) -->
                    <div class="glass-panel rounded-[1.5rem] p-6 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50">
                        <div class="flex items-center gap-2 mb-4">
                             <div class="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                </svg>
                             </div>
                             <h3 class="text-lg font-bold text-gray-900">Is it for me?</h3>
                        </div>
                        <p class="text-sm text-gray-500 mb-4">Suitability by profile:</p>
                        <div class="flex flex-wrap gap-2">
                            ${tagsHtml}
                        </div>
                    </div>
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
            let allergensHtml = data.allergens.map(a => `
                <div class="bg-red-50 p-4 rounded-xl border border-red-100">
                   <p class="font-bold text-red-900">${a.name}</p>
                   <p class="text-sm text-red-700">${a.description}</p>
                </div>
            `).join('');

            allergenContainer.innerHTML = `
                <div class="bg-red-50/50 rounded-[1.5rem] p-1 border-2 border-red-100">
                    <div class="bg-red-100/50 p-4 rounded-t-[1.3rem] flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-600">
                            <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
                        </svg>
                        <h4 class="text-red-800 font-bold text-lg">Allergen Warning</h4>
                    </div>
                    <div class="p-4 space-y-2">
                        <div class="text-red-700 font-medium mb-2">
                            Contains ingredients that match your allergen profile:
                        </div>
                        ${allergensHtml}
                    </div>
                </div>
            `;
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


        const SHORT_STATUS = {
            "Recommended": "Rec.",
            "Low": "Low",
            "Medium": "Med.",
            "High": "High",
            "Excessive": "Bad"
        };

        let rows = '';
        if (data.portion_analysis) {
            for (const [group, nutrients] of Object.entries(data.portion_analysis)) {
                rows += `
    <tr class="group hover:bg-white/50 transition-colors border-b border-orange-100 last:border-0">
                    <td class="py-2 md:py-4 font-bold text-gray-800 capitalize pl-1 text-xs md:text-base w-1/4 break-words">${group.replace('Children', 'Child').replace('Adults', 'Adult').replace('Seniors', 'Senior')}</td>
                    <td class="py-2 md:py-4 text-center w-1/4">
                        <span class="px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${getColorClass(nutrients.sugar)} block w-full truncate">
                            ${SHORT_STATUS[nutrients.sugar] || nutrients.sugar}
                        </span>
                    </td>
                    <td class="py-2 md:py-4 text-center w-1/4">
                        <span class="px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${getColorClass(nutrients.sodium)} block w-full truncate">
                            ${SHORT_STATUS[nutrients.sodium] || nutrients.sodium}
                        </span>
                    </td>
                    <td class="py-2 md:py-4 text-center w-1/4">
                        <span class="px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${getColorClass(nutrients.saturated_fat)} block w-full truncate">
                            ${SHORT_STATUS[nutrients.saturated_fat] || nutrients.saturated_fat}
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
