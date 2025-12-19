import { mountScannerWidget } from "./scanner_widget.js";
import { validateImage } from "./upload_validation.js";

const out = document.getElementById("out");
const scannerRoot = document.getElementById("scanner-root");
const upload = document.getElementById("file-input");
const uploadMsg = document.getElementById("upload-msg");
const authBtn = document.getElementById("auth-btn");

let isAuth = false; // integrate with your auth.js later
function renderAuth() { authBtn.textContent = isAuth ? "Logout" : "Login"; }
authBtn.addEventListener("click", () => { isAuth = !isAuth; renderAuth(); });
renderAuth();

mountScannerWidget(scannerRoot, {
    onDetected: (code, meta) => {
        out.textContent = `Código: ${code}\nFuente: ${meta.source}\nFormato: ${meta.format ?? "n/d"}`;
    },
    onError: (msg) => { out.textContent = `Error: ${msg}`; }
});

upload.addEventListener("change", async () => {
    const f = upload.files?.[0];
    if (!f) return;
    const verdict = await validateImage(f, { maxBytes: 5 * 1024 * 1024 });
    if (!verdict.ok) {
        uploadMsg.textContent = verdict.reason;
        upload.value = "";
        return;
    }
    uploadMsg.textContent = `OK (${verdict.type}) · ${(f.size / 1024).toFixed(1)} KB`;
});
