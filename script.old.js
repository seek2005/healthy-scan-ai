```javascript
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const scanButton = document.getElementById('scanButton');
const statusMessage = document.getElementById('statusMessage');
const resultsContainer = document.getElementById('resultsContainer');
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

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
        // Reset to default inactive style
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
        // Remove inactive styles so active-nav takes full effect without !important
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

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        uploadedFileType = file.type || "image/jpeg";
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadedImageBase64 = e.target.result.split(',')[1];

            document.getElementById('defaultView').classList.add('hidden');
            document.getElementById('previewView').classList.remove('hidden');
            document.getElementById('previewView').classList.add('flex');

            scanButton.disabled = false;
            scanButton.innerHTML = `
    < svg xmlns = "http://www.w3.org/2000/svg" fill = "none" viewBox = "0 0 24 24" stroke - width="2" stroke = "currentColor" class="w-6 h-6" >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg >
    Start Analysis
            `;
        };
        reader.readAsDataURL(file);
    }
}

function showStatus(message, isError = false) {
    statusMessage.classList.remove('hidden', 'text-red-600', 'bg-red-50', 'text-blue-600', 'bg-blue-50');
    statusMessage.classList.add('block');
    if (isError) {
        statusMessage.classList.add('text-red-600', 'bg-red-50');
        statusMessage.innerHTML = `Error: ${ message } `;
    } else {
        statusMessage.classList.add('text-blue-600', 'bg-blue-50', 'flex', 'items-center', 'justify-center');
        statusMessage.innerHTML = `< svg class="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns = "http://www.w3.org/2000/svg" fill = "none" viewBox = "0 0 24 24" ><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg > ${ message } `;
    }
}

function resetUI() {
    document.getElementById('defaultView').classList.remove('hidden');
    document.getElementById('previewView').classList.add('hidden');
    document.getElementById('previewView').classList.remove('flex');

    resultsContainer.classList.add('hidden');
    resultsContainer.classList.remove('flex', 'flex-col');
    statusMessage.classList.add('hidden');

    imageUpload.value = '';
    uploadedImageBase64 = null;
}

async function startScan() {
    if (!uploadedImageBase64) return;
    const imageData = uploadedImageBase64;
    const fileType = uploadedFileType;

    resetUI();
    showStatus("Analyzing image with AI...");

    scanButton.disabled = true;
    scanButton.innerHTML = 'Thinking...';

    try {
        const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData, mimeType: fileType })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error del Servidor(${ response.status })`);
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
    showStatus(`Found Barcode: ${ decodedText }. Fetching data...`);

    try {
        const response = await fetch('/api/analyze-barcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: decodedText })
        });

        if (!response.ok) throw new Error("Barcode analysis failed");

        const analysisResult = await response.json();
        displayResults(analysisResult);
        statusMessage.classList.add('hidden');
    } catch (err) {
        console.error(err);
        showStatus(err.message, true);
    }
}

function displayResults(data) {
    if (resultsContainer) {
        resultsContainer.classList.remove('hidden');
        resultsContainer.classList.add('flex', 'flex-col');
    }

    // 0. AI Product Analysis (Summary) - BACKGROUND CHANGED TO ORANGE/AMBER GRADIENT
    const summaryContainer = document.getElementById('productAnalysisContainer');
    if (summaryContainer) {
        summaryContainer.classList.remove('hidden');
        if (data.summary) {
            summaryContainer.innerHTML = `
    < div class="glass-panel rounded-[2rem] p-8 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50" >
                    <h3 class="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                         <div class="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white">
                            <!-- Custom Nutrition Label + Magnifying Glass Icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
                                <!-- The Label/Document -->
                                <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 017.5 15zm0-3.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm0-3.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clip-rule="evenodd" opacity="0.8" />
                                <!-- The Magnifying Glass Overlay -->
                                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                                <path fill-rule="evenodd" d="M16 11a4 4 0 10-8 0 4 4 0 008 0zm-1.5 4.5l3.5 3.5-1.5 1.5-3.5-3.5a6 6 0 111.5-1.5z" clip-rule="evenodd" transform="translate(4, 4) scale(0.8)" />
                            </svg>
                        </div>
                         AI Product Analysis
                    </h3>
                    <p class="text-gray-700 leading-relaxed font-medium text-lg">
                        ${data.summary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-900">$1</strong>')}
                    </p>
                </div >
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
            let html = `< div class="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm" >
                <h4 class="text-red-800 font-bold flex items-center gap-2 mb-3 text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                        <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
                    </svg>
                    Allergen Warning
                </h4>
                <ul class="list-disc list-inside text-red-700 text-base space-y-2">`;
            data.allergens.forEach(a => html += `<li><span class="font-bold text-red-900">${a.name}</span>: ${a.description}</li>`);
            html += `</ul></div > `;
            allergenContainer.innerHTML = html;
        }
    }

    // 2. Table (Age Breakdown)
    const tableElement = document.getElementById('portionAnalysisTable');
    if (tableElement) {
        // Find the parent container to apply the style
        const parentCard = tableElement.closest('.glass-panel');
        if (parentCard) {
            // Remove glass panel generic and add specific gradient
            parentCard.className = 'rounded-[2rem] p-8 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50';
            // We need to update the header as well to match
            const headerIcon = parentCard.querySelector('.p-3');
            if (headerIcon) headerIcon.className = 'p-3 bg-white text-orange-500 rounded-xl shadow-sm';
        }

        let rows = '';
        if (data.portion_analysis) {
            for (const [group, nutrients] of Object.entries(data.portion_analysis)) {
                // Group is now "Children (4-8)", "Adults (19-50)", etc.
                rows += `
    < tr class="group hover:bg-white/50 transition-colors border-b border-orange-100 last:border-0" >
                    <td class="py-4 font-bold text-gray-800 capitalize pl-2 text-sm md:text-base">${group}</td>
                    <td class="py-4 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${getColorClass(nutrients.sugar)}">
                            ${nutrients.sugar}
                        </span>
                    </td>
                    <td class="py-4 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${getColorClass(nutrients.sodium)}">
                            ${nutrients.sodium}
                        </span>
                    </td>
                    <td class="py-4 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${getColorClass(nutrients.saturated_fat)}">
                            ${nutrients.saturated_fat}
                        </span>
                    </td>
                </tr > `;
            }
        }
        tableElement.innerHTML = rows;
    }

    // 3. Ingredients - NEW TOOLTIP LOGIC
    const ingContainer = document.getElementById('ingredientsContainer');
    if (ingContainer) {
        ingContainer.innerHTML = '';
        // Apply gradient to Ingredients parent too
        const parentCard = ingContainer.closest('.glass-panel');
        if (parentCard) {
            parentCard.className = 'rounded-[2rem] p-8 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 shadow-xl border border-orange-100/50';
            const headerIcon = parentCard.querySelector('.p-3');
            if (headerIcon) headerIcon.className = 'p-3 bg-white text-orange-600 rounded-xl shadow-sm';
        }

        if (data.ingredients_list) {
            data.ingredients_list.forEach(ing => {
                const el = document.createElement('div');
                // Added 'group relative' for tooltip alignment
                el.className = `group relative px - 4 py - 2 rounded - full text - xs font - bold flex items - center gap - 1 cursor - help transition - all hover: scale - 105 shadow - sm hover: shadow - md ${ ing.is_harmful ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-emerald-700 border border-emerald-100' } `;
                el.innerHTML = `
                    ${ ing.name }
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
            <div class="p-8 md:p-10 bg-gradient-to-r from-orange-50 to-amber-50 rounded-[2.5rem] border border-orange-100 shadow-xl mt-8">
                <!-- Header moved INSIDE -->
                <div class="flex items-center gap-4 mb-8">
                     <div class="p-2 bg-white text-orange-600 rounded-xl shadow-sm">
                        <!-- Custom Smart Alternative/Award Icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
                          <path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.352-.172-2.67-.51-3.903a.75.75 0 00-.722-.515 11.208 11.208 0 01-7.877-3.08zM12 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" />
                          <path d="M10 14.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z" />
                        </svg>
                     </div>
                     <h3 class="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Smart Alternative</h3>
                </div>

                <div class="flex flex-col md:flex-row gap-8 items-start">
                     <!-- Image Placeholder -->
                    <div class="w-full md:w-48 h-48 bg-white rounded-3xl p-4 shadow-lg shadow-orange-100/50 flex items-center justify-center shrink-0 border-4 border-white transform group-hover:scale-105 transition-transform duration-300">
                        <img src="${productImageUrl}" alt="${data.alternative.name}" class="w-full h-full object-contain" onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                    </div>

                    <!-- Data Visualization / Text Side -->
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

resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getColorClass(val) {
    if (!val) return 'bg-gray-100 text-gray-500';
    const v = val.toLowerCase();
    if (v.includes('low') || v.includes('safe') || v.includes('health') || v.includes('recommend')) return 'bg-emerald-100 text-emerald-700';
    if (v.includes('moderate') || v.includes('limit')) return 'bg-yellow-100 text-yellow-700';
    if (v.includes('high') || v.includes('excess') || v.includes('avoid')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
}
