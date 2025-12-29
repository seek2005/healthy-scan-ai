export async function analyzeImage(imageBase64, mimeType, userProfile) {
    const response = await fetch(`/api/analyze-image?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify({ image: imageBase64, mimeType: mimeType, userProfile })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del Servidor(${response.status})`);
    }

    return await response.json();
}

export async function analyzeBarcode(barcode, userProfile) {
    const response = await fetch(`/api/analyze-barcode?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify({ barcode: barcode, userProfile })
    });

    if (!response.ok) {
        throw new Error("Barcode analysis failed");
    }

    return await response.json();
}
