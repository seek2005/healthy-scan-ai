// netlify/functions/scan.js

export const handler = async (event) => {
  // Solo aceptamos peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. Obtenemos la imagen que nos envía el frontend
    const { imageBase64, fileType } = JSON.parse(event.body);
    
    // 2. Obtenemos la llave secreta desde las variables de entorno de Netlify
    // (NUNCA escribas la llave real aquí en el código)
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Falta la API Key en el servidor" }) };
    }

    // 3. Preparamos el mensaje para Gemini
    const modelName = 'gemini-1.5-flash'; // O gemini-2.0-flash si está disponible
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

    const payload = {
      contents: [{
        parts: [
          { 
             text: `You are a nutritionist AI. Analyze this nutrition label. 
                    1. Identify product. 2. Summarize health value. 3. Analyze Sugar, Sodium, Sat Fat for Children (4-8), Adults (19-50), Seniors (51+). Mark as 'Recommended', 'High', or 'EXCESSIVE'. 
                    4. Suggest REAL US market alternative product. 
                    CRITICAL: Output ONLY raw JSON. No intro text.
                    { 
                      "summary": "string", 
                      "portion_analysis": [
                        {"stage": "Children (4-8)", "sugar_recommendation": "string", "sodium_recommendation": "string", "fat_recommendation": "string"},
                        {"stage": "Adults (19-50)", "sugar_recommendation": "string", "sodium_recommendation": "string", "fat_recommendation": "string"},
                        {"stage": "Seniors (51+)", "sugar_recommendation": "string", "sodium_recommendation": "string", "fat_recommendation": "string"}
                      ], 
                      "alternative": { "name": "string", "brand": "string", "score": "string", "reason": "string", "search_term": "string" } 
                    }` 
          },
          { inline_data: { mime_type: fileType, data: imageBase64 } }
        ]
      }]
    };

    // 4. Llamamos a Google desde el servidor (Backend)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // 5. Devolvemos la respuesta limpia al Frontend
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Error en el backend:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error procesando la imagen en el servidor" })
    };
  }
};