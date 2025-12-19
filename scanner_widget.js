import { BrowserMultiFormatReader } from "@zxing/browser";

export function mountScannerWidget(root, opts) {
    root.innerHTML = `
    <div style="display:flex;gap:.75rem;align-items:center;margin:.5rem 0">
      <button id="btn-toggle" type="button" style="padding:.5rem .75rem;border:1px solid #cbd5e1;border-radius:.5rem">Activar cámara</button>
      <span id="status" style="color:#666">Estado: idle</span>
    </div>
    <video id="cam" muted playsinline></video>
  `;

    const video = root.querySelector("#cam");
    const btn = root.querySelector("#btn-toggle");
    const status = root.querySelector("#status");
    let enabled = false;
    let reader = null;
    let raf = 0;

    const setStatus = (s) => status.textContent = `Estado: ${s}`;

    btn.onclick = async () => { enabled ? stop() : start().catch(e => fail(e?.message || "No se pudo iniciar")); };

    async function start() {
        setStatus("starting"); btn.textContent = "Detener cámara";
        const hasNative = "BarcodeDetector" in window;
        if (hasNative) {
            enabled = true;
            setStatus("scanning (nativo)");
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
            video.srcObject = stream;
            await video.play();
            nativeLoop();
            return;
        }
        enabled = true;
        setStatus("scanning (ZXing)");
        reader = new BrowserMultiFormatReader();
        await reader.decodeFromVideoDevice(undefined, video, (res, err) => {
            if (res) {
                stop();
                const fmt = typeof res.getBarcodeFormat === "function" ? String(res.getBarcodeFormat()) : "unknown";
                opts.onDetected(res.getText(), { source: "zxing", format: fmt });
            }
            if (err && err.name !== "NotFoundException") { /* ignore frame errors */ }
        });
    }

    async function nativeLoop() {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"] });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const tick = async () => {
            if (!enabled) return;
            if (!video.videoWidth) { raf = requestAnimationFrame(tick); return; }
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
                // @ts-ignore
                const codes = await detector.detect(canvas);
                if (codes && codes.length) {
                    stop();
                    const c = codes[0];
                    opts.onDetected(c.rawValue, { source: "native", format: c.format });
                    return;
                }
            } catch { /* noop */ }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
    }

    function stop() {
        enabled = false;
        setStatus("stopped"); btn.textContent = "Activar cámara";
        cancelAnimationFrame(raf);
        if (reader?.reset) reader.reset();
        const s = video.srcObject;
        if (s) s.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }

    function fail(msg) { setStatus("error"); opts.onError?.(msg); }
}
