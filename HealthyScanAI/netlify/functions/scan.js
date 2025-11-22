// netlify/functions/scan.js
export const handler = async (event) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. Recibir la imagen desde tu página web
    const body = JSON.parse(event.body);
    const imageBase64 = body.contents[0].parts[1].inline_data.data;
    const mimeType = body.contents[0].parts[1].inline_data.mime_type;

    // 2. Tomar la llave secreta de la configuración de Netlify (NO del código)
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Falta la API Key en el servidor" }) };
    }

    // 3. Preguntar a Google Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: body.contents[0].parts[0].text }, // Pasamos tu prompt
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();

    // 4. Devolver la respuesta a tu página
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error en el servidor: " + error.message })
    };
  }
};