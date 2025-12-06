const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const uploadPlaceholder = document.getElementById('uploadPlaceholder'); // Note: This element ID might not exist in HTML, checking usage.
const scanButton = document.getElementById('scanButton');
const statusMessage = document.getElementById('statusMessage');
const resultsContainer = document.getElementById('resultsContainer');
const welcomeMessage = document.getElementById('welcomeMessage');
const scannerModal = document.getElementById('scannerModal');

let uploadedImageBase64 = null;
let uploadedFileType = "image/jpeg";
let html5QrcodeScanner = null;

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

function switchTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => { btn.classList.remove('bg-emerald-50', 'text-emerald-600'); btn.classList.add('text-gray-600'); });
    document.getElementById('tab-' + tabName).classList.remove('hidden');
    const desktopBtn = document.getElementById('nav-' + tabName);
    if (desktopBtn) desktopBtn.classList.add('active-nav');
    document.getElementById('mobile-menu').classList.add('hidden');
    const header = document.getElementById('main-header');
    if (tabName === 'home') header.classList.remove('hidden'); else header.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        uploadedFileType = file.type || "image/jpeg";
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.parentElement.classList.remove('hidden');
            document.querySelector('#imageUpload').nextElementSibling.querySelector('div').classList.add('hidden');
            scanButton.disabled = false;
            scanButton.classList.remove('bg-gray-200', 'text-gray-400');
            scanButton.classList.add('bg-gradient-to-r', 'from-emerald-500', 'to-teal-500', 'text-white', 'shadow-xl');
            scanButton.innerHTML = `Analyze Image`;
            uploadedImageBase64 = e.target.result.split(',')[1];
        };
        reader.readAsDataURL(file);
    }
}

function showStatus(message, isError = false) {
    statusMessage.classList.remove('hidden', 'text-red-600', 'bg-red-50', 'text-blue-600', 'bg-blue-50');
    if (isError) {
        statusMessage.classList.add('text-red-600', 'bg-red-50');
        statusMessage.innerHTML = `Error: ${message}`;
    } else {
        statusMessage.classList.add('text-blue-600', 'bg-blue-50', 'flex', 'items-center', 'justify-center');
        statusMessage.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${message}`;
    }
}

function resetUI() {
    welcomeMessage.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    resultsContainer.classList.remove('flex', 'flex-col');
    statusMessage.classList.add('hidden');
}

async function startScan() {
    if (!uploadedImageBase64) return;

    resetUI();
    showStatus("Analyzing image with AI...");

    scanButton.disabled = true;
    scanButton.innerHTML = 'Thinking...';

    try {
        const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: uploadedImageBase64,
                mimeType: uploadedFileType
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error del Servidor (${response.status})`);
        }

        const analysisResult = await response.json();
        displayResults(analysisResult);
        statusMessage.classList.add('hidden');

    } catch (error) {
        console.error(error);
        showStatus(error.message, true);
    } finally {
        scanButton.disabled = false;
        scanButton.innerHTML = 'Analyze Image';
    }
}

function startBarcodeScan() {
    scannerModal.classList.remove('hidden');

    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess);
}

function stopBarcodeScan() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            scannerModal.classList.add('hidden');
            html5QrcodeScanner.clear();
        }).catch(err => console.error(err));
    } else {
        scannerModal.classList.add('hidden');
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    stopBarcodeScan();
    resetUI();
    showStatus(`Found Barcode: ${decodedText}. Fetching data...`);

    try {
        const response = await fetch('/api/analyze-barcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: decodedText })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to analyze barcode");
        }

        const analysisResult = await response.json();
        displayResults(analysisResult);
        statusMessage.classList.add('hidden');

    } catch (error) {
        console.error(error);
        showStatus(error.message, true);
    }
}

function displayResults(data) {
    // 1. Allergen Alerts
    const allergenContainer = document.getElementById('allergenContainer');
    if (allergenContainer) {
        allergenContainer.innerHTML = '';
        allergenContainer.classList.add('hidden');

        if (data.allergens && data.allergens.length > 0) {
            allergenContainer.classList.remove('hidden');
            const alertBox = document.createElement('div');
            alertBox.className = 'bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm';

            const title = document.createElement('h4');
            title.className = 'text-red-800 font-bold flex items-center gap-2 mb-2';
            title.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
                </svg>
                Allergen Warning
            `;

            const list = document.createElement('ul');
            list.className = 'list-disc list-inside text-red-700 text-sm space-y-1';

            data.allergens.forEach(allergen => {
                const item = document.createElement('li');
                item.innerHTML = `<span class="font-semibold">${allergen.name}</span> (${allergen.severity}): ${allergen.description}`;
                list.appendChild(item);
            });

            alertBox.appendChild(title);
            alertBox.appendChild(list);
            allergenContainer.appendChild(alertBox);
        }
    }

    // 2. Summary
    const summaryEl = document.getElementById('healthyScanSummary');
    if (summaryEl && data.summary) {
        summaryEl.innerHTML = data.summary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-800 font-extrabold">$1</strong>');
    }

    // 3. Hybrid Display: Positives/Negatives + Age-Based Table
    const tableElement = document.getElementById('portionAnalysisTable');
    if (tableElement) {
        const container = tableElement.closest('.glass-panel');

        // Generate Negatives List
        let negativesHTML = '';
        if (data.analysis && data.analysis.negatives && data.analysis.negatives.length > 0) {
            negativesHTML = data.analysis.negatives.map(item => `
                <li class="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-start gap-3">
                    <div class="mt-1 min-w-[20px] text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <div class="font-bold text-gray-800 text-sm">${item.title} <span class="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full ml-1">${item.value}</span></div>
                        <p class="text-xs text-gray-500 mt-0.5 leading-snug">${item.description}</p>
                    </div>
                </li>
            `).join('');
        } else {
            negativesHTML = '<p class="text-gray-400 italic text-sm text-center">No negatives detected.</p>';
        }

        // Generate Positives List
        let positivesHTML = '';
        if (data.analysis && data.analysis.positives && data.analysis.positives.length > 0) {
            positivesHTML = data.analysis.positives.map(item => `
                <li class="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-start gap-3">
                     <div class="mt-1 min-w-[20px] text-emerald-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <div class="font-bold text-gray-800 text-sm">${item.title} <span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full ml-1">${item.value}</span></div>
                        <p class="text-xs text-gray-500 mt-0.5 leading-snug">${item.description}</p>
                    </div>
                </li>
            `).join('');
        } else {
            positivesHTML = '<p class="text-gray-400 italic text-sm text-center">No highlights found.</p>';
        }

        // Generate Age-Based Table HTML (Badges Only)
        const getBadge = (text) => {
            if (!text) return "";
            const lower = text.toLowerCase();
            if (lower.includes("excessive")) return `<span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Excessive</span>`;
            if (lower.includes("high")) return `<span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">High</span>`;
            return `<span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Recommended</span>`;
        };

        let tableRows = '';
        if (data.portion_analysis) {
            data.portion_analysis.forEach(item => {
                tableRows += `
                    <tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td class="py-4 font-bold text-gray-800 text-sm pl-2">${item.stage}</td>
                        <td class="py-4 text-center">${getBadge(item.sugar_recommendation)}</td>
                        <td class="py-4 text-center">${getBadge(item.sodium_recommendation)}</td>
                        <td class="py-4 text-center">${getBadge(item.fat_recommendation)}</td>
                    </tr>`;
            });
        }

        // Inject Content
        container.innerHTML = `
            <div class="mb-10">
                <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div class="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7">
                            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    Product Analysis
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-red-50/50 rounded-2xl p-5 border border-red-100">
                        <h4 class="text-red-800 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <span class="w-2 h-2 rounded-full bg-red-500"></span> Negatives
                        </h4>
                        <ul class="space-y-3">${negativesHTML}</ul>
                    </div>
                    <div class="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
                        <h4 class="text-emerald-800 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Positives
                        </h4>
                        <ul class="space-y-3">${positivesHTML}</ul>
                    </div>
                </div>
            </div>

             <div class="border-t-2 border-dashed border-gray-100 pt-8">
                <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-indigo-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    Family Safety Guide
                </h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th class="pb-4 pl-2 text-xs md:text-sm font-extrabold text-gray-400 uppercase tracking-widest">Group</th>
                                <th class="pb-4 text-center text-xs md:text-sm font-extrabold text-gray-400 uppercase tracking-widest">Sugar</th>
                                <th class="pb-4 text-center text-xs md:text-sm font-extrabold text-gray-400 uppercase tracking-widest">Sodium</th>
                                <th class="pb-4 text-center text-xs md:text-sm font-extrabold text-gray-400 uppercase tracking-widest">Sat. Fat</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm md:text-base font-semibold text-gray-700">
                            ${tableRows || '<tr><td colspan="4" class="text-center py-4 text-gray-400 italic">No portion data available.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 4. Ingredients Cloud
    const ingredientsContainer = document.getElementById('ingredientsContainer');
    if (ingredientsContainer) {
        ingredientsContainer.innerHTML = '';
        if (data.ingredients_list && data.ingredients_list.length > 0) {
            data.ingredients_list.forEach(ing => {
                const chip = document.createElement('div');
                chip.className = `ingredient-tooltip group relative inline-flex items-center justify-center px-4 py-2 m-1 rounded-2xl border transition-all duration-200 cursor-help shadow-sm hover:shadow-md hover:-translate-y-0.5 ${ing.is_harmful ? 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`;

                chip.innerHTML = `
                    <span class="font-bold text-sm text-center">${ing.name}</span>
                    <div class="tooltip-text absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none text-center">
                        ${ing.description || 'No description available'}
                        <div class="absolute top-100 left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                `;
                ingredientsContainer.appendChild(chip);
            });
        } else {
            ingredientsContainer.innerHTML = '<p class="text-gray-400 italic w-full text-center">No ingredients data available.</p>';
        }
    }

    // 5. Smart Alternative
    if (data.alternative) {
        const searchTerm = data.alternative.search_term || `${data.alternative.brand} ${data.alternative.name} healthy`;
        const affiliateTag = "healthyscan-20";
        const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&tag=${affiliateTag}`;
        const cleanName = encodeURIComponent(data.alternative.name + " " + data.alternative.brand + " product packaging");
        const productImageUrl = `https://image.pollinations.ai/prompt/${cleanName}?width=300&height=300&nologo=true`;

        const altHTML = `
            <div class="flex items-center gap-4 mb-6 mt-8">
                <div class="bg-gradient-to-br from-orange-500 to-amber-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-orange-200 border-2 border-white">3</div>
                <h3 class="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Smart Alternative</h3>
            </div>
            <div class="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 group">
                <div class="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div class="absolute bottom-0 left-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl -ml-16 -mb-16"></div>
                <div class="relative p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                    <div class="w-40 h-40 bg-white rounded-3xl p-4 shadow-lg shadow-orange-100/50 flex items-center justify-center shrink-0 border-4 border-white transform group-hover:scale-105 transition-transform duration-300">
                        <img src="${productImageUrl}" alt="${data.alternative.name}" class="w-full h-full object-contain" onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                    </div>
                    <div class="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                                Recommended Swap
                            </div>
                            <h4 class="text-2xl md:text-3xl font-black text-gray-900 leading-tight">${data.alternative.name}</h4>
                            <p class="text-gray-500 font-medium text-lg">${data.alternative.brand}</p>
                        </div>
                        <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-orange-100/50">
                            <p class="text-gray-700 font-medium leading-relaxed"><span class="text-orange-600 font-bold">Why it's better:</span> ${data.alternative.reason}</p>
                        </div>
                        <div class="pt-2">
                            <a href="${amazonUrl}" target="_blank" class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold rounded-2xl shadow-lg shadow-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300 w-full md:w-auto group-hover:from-black group-hover:to-gray-900">
                                <span>Find on Amazon</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>`;
        document.getElementById('altContainer').innerHTML = altHTML;
    }

    resultsContainer.classList.remove('hidden');
    resultsContainer.classList.add('flex', 'flex-col');
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const dropArea = document.querySelector('.custom-file-upload');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
});
dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
        imageUpload.files = files;
        imageUpload.dispatchEvent(new Event('change'));
    }
}, false);
