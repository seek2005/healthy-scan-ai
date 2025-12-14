export async function analyzeImage(imageBase64, mimeType) {
    const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, mimeType: mimeType })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del Servidor(${response.status})`);
    }

    return await response.json();
}

export async function analyzeBarcode(barcode) {
    const response = await fetch('/api/analyze-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode })
    });

    if (!response.ok) {
        throw new Error("Barcode analysis failed");
    }

    return await response.json();
}
