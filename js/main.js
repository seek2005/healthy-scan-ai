import { analyzeImage, analyzeBarcode } from './api.js';
import { renderHistory, saveToHistory, getHistory } from './history.js';
import {
    toggleMobileMenu,
    switchTab,
    previewImage,
    showStatus,
    resetUI,
    displayResults
} from './ui.js';
import { initAuth } from './auth.js';
import { getCurrentProfile } from './profile.js';

// Global State
console.log("Main.js loaded!");
let uploadedImageBase64 = null;
let uploadedFileType = "image/jpeg";
let html5QrcodeScanner = null;

const imageUpload = document.getElementById('imageUpload');
const imagePreviewElement = document.getElementById('imagePreview');
const scanButton = document.getElementById('scanButton');
const scannerModal = document.getElementById('scannerModal');

// --- Main Logic Wiring ---

// Handle File Input
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        uploadedFileType = file.type || "image/jpeg";
        uploadedImageBase64 = await previewImage(file, imagePreviewElement, scanButton);
    }
}
// Fix ReferenceError by binding event listener
if (imageUpload) {
    imageUpload.addEventListener('change', handleImageUpload);
}

// Start Image Scan
async function startScan() {
    if (!uploadedImageBase64) return;

    resetUI(imageUpload);
    showStatus("Analyzing image with AI...");

    scanButton.disabled = true;
    scanButton.innerHTML = 'Thinking...';

    try {
        const userProfile = getCurrentProfile(); // Get loaded profile
        const data = await analyzeImage(uploadedImageBase64, uploadedFileType, userProfile);
        displayResults(data);
        saveToHistory(data);
        showStatus(''); // Clear status or hiding it is handled in resetUI/ui
        document.getElementById('statusMessage').classList.add('hidden');
    } catch (error) {
        console.error(error);
        showStatus(error.message, true);
    } finally {
        scanButton.disabled = false;
        scanButton.innerHTML = 'Analyze Image';
    }
}

// Barcode Logic
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

async function onScanSuccess(decodedText) {
    stopBarcodeScan();
    resetUI(imageUpload);
    showStatus(`Fetching data for ${decodedText}...`);

    try {
        const t0 = performance.now();
        // Fast Path
        const result = await window.fastFetchProduct(decodedText);
        const { product } = result;
        console.log(`[FastBarcode] Resolved in ${Math.round(performance.now() - t0)}ms`, result);

        displayResults(product);

        // Optional: Trigger AI analysis in background if needed, but for now fast path is the priority.
        saveToHistory(product);

        document.getElementById('statusMessage').classList.add('hidden');
    } catch (err) {
        console.error(err);
        showStatus('Product not found or network error.', true);
    }
}

function loadFromHistoryAndDisplay(data) {
    displayResults(data);
    // Do not save to history again
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Render History
    renderHistory('recentScansContainer', 'historyList', loadFromHistoryAndDisplay);
    initAuth();

    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
});

// Expose functions to window for HTML onclick compatibility
window.toggleMobileMenu = toggleMobileMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.switchTab = (tabName) => {
    switchTab(tabName);
    if (tabName === 'history') {
        renderHistory('history-grid');
    }
};
window.startScan = startScan;
window.startBarcodeScan = startBarcodeScan;
window.stopBarcodeScan = stopBarcodeScan;
window.resetUI = () => resetUI(imageUpload); // Helper wrapper
// QR Code scanner needs global access if not careful, but here we pass callback directly.
// However, the close button in html might call stopBarcodeScan
