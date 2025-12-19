export async function validateImage(file, opts) {
    if (file.size > opts.maxBytes) return { ok: false, reason: "Archivo demasiado grande (>5MB)" };
    const buf = await file.slice(0, 16).arrayBuffer();
    const b = new Uint8Array(buf);

    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) {
        if (file.type && file.type !== "image/png") return { ok: false, reason: "MIME inconsistente (PNG)" };
        return { ok: true, type: "image/png" };
    }
    if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xD8) {
        if (file.type && file.type !== "image/jpeg") return { ok: false, reason: "MIME inconsistente (JPEG)" };
        return { ok: true, type: "image/jpeg" };
    }
    const riff = String.fromCharCode(...b.slice(0, 4));
    const webp = String.fromCharCode(...b.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
        if (file.type && file.type !== "image/webp") return { ok: false, reason: "MIME inconsistente (WebP)" };
        return { ok: true, type: "image/webp" };
    }
    return { ok: false, reason: "Formato no soportado (solo PNG/JPEG/WebP)" };
}
