// netlify/functions/scan.js

export const handler = async (event) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const imageBase64 = body.imageBase64;
    const fileType = body.fileType;

    // IMPORTANTE: La clave se toma de la configuración de Netlify, no del código
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "API Key no configurada en el servidor" }) };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `You are a nutritionist AI. Analyze this nutrition label. 
                     1. Identify product. 
                     2. Summarize health value accurately. 
                     3. Analyze Sugar, Sodium, Sat Fat for Children (4-8), Adults (19-50), Seniors (51+). Mark as 'Recommended', 'High', or 'EXCESSIVE'. 
                     4. Suggest REAL US market alternative product. 
                     CRITICAL: Output ONLY raw JSON. No markdown. No intro text.
                     { 
                       "summary": "string (use **bold** for emphasis)", 
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
      })
    });

    if (!response.ok) {
         throw new Error(`Google API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};