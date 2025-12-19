# 🏠 Mudar Dominio de Netlify a Render

Si compraste tu dominio en Netlify (ej. `midominio.com`) pero ahora usas Render, necesitas cambiar los registros DNS.

## Paso 1: Configurar en Render
1.  Ve a tu Dashboard de **Render** > Selecciona tu servicio `healthyscan-ai`.
2.  Ve a la pestaña **Settings** > baja a **Custom Domains**.
3.  Haz clic en **Add Custom Domain**.
4.  Escribe tu dominio (ej. `midominio.com`) y guarda.
5.  Render te pedirá verificarlo. Anota el valor que te da (usualmente te pide apuntar a `healthyscan-ai.onrender.com` o a la IP `216.24.57.1`).

## Paso 2: Configurar en Netlify
1.  Ve a [app.netlify.com](https://app.netlify.com) > Pestaña **Domains**.
2.  Selecciona tu dominio.
3.  Ve a **DNS settings**.
4.  **BORRA** cualquier registro que diga **NETLIFY** o **NETLIFYv6** (estos apuntan a tu sitio viejo).
5.  Añade dos registros nuevos:

### Registro 1 (Para la raíz)
*   **Type:** `A`
*   **Name:** `@` (o déjalo vacío si no te deja)
*   **Value:** `216.24.57.1`
*   **TTL:** 3600 (default)

### Registro 2 (Para www)
*   **Type:** `CNAME`
*   **Name:** `www`
*   **Value:** `healthyscan-ai.onrender.com`
*   **TTL:** 3600

## Paso 3: Esperar (HTTPS)
Render detectará el cambio en unos minutos/horas.
Una vez detectado, Render generará automáticamente el certificado **SSL (candado verde)** para tu dominio.

¡Listo! Tu dominio antiguo ahora muestra tu nueva App.
