// plugin.js - Latanime (versión corregida 2)

const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
// Usa kino.fetch, que es la herramienta permitida para 'search'.
// Añadimos un User-Agent de Chrome para intentar evitar el bloqueo de Cloudflare.
export async function search(query) {
  const url = `${BASE_URL}/buscar?q=${encodeURIComponent(query.q)}`;

  let html;
  try {
    const response = await kino.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`latanime.org respondió con ${response.status}`);
    }
    html = await response.text();
  } catch (e) {
    // Si Cloudflare bloquea, kino.fetch lanzará un error.
    // Lo relanzamos para que Kino muestre el problema.
    throw new Error(`Error al conectar con latanime.org: ${e.message}`);
  }

  // --- Parseo del HTML (con expresiones regulares corregidas) ---
  const results = [];
  const seen = new Set();

  // Regex para encontrar enlaces a animes dentro del HTML.
  // Nota: esta estructura puede cambiar si Latanime actualiza su web.
  const linkRegex = /<a[^>]+href="([^"]*\/anime\/[^"]*)"[^>]*>(.*?)<\/a>/gs;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const [, href, inner] = match;

    // Evitamos duplicados y enlaces vacíos
    if (seen.has(href) || !href) continue;
    seen.add(href);

    // Intentamos extraer el título: primero buscamos un encabezado interno,
    // si no, usamos el texto del enlace limpiando las etiquetas HTML.
    let title = '';
    const headingMatch = inner.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else {
      title = inner.replace(/<[^>]+>/g, '').trim();
    }

    // Descartamos títulos vacíos o demasiado cortos
    if (!title || title.length < 2) continue;

    // Intentamos extraer la imagen de portada
    let poster = '';
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/);
    if (imgMatch) {
      poster = imgMatch[1];
    }

    results.push({
      id: href,
      ref: href,
      title: title,
      kind: "series",
      poster: poster,
    });
  }

  return results;
}

// --- Función de Resolución ---
// Usa kino.browser.capture, que es la herramienta permitida en 'resolve'
// para ejecutar la página y capturar las peticiones de video.
export async function resolve(ref) {
  const url = ref.startsWith("http") ? ref : `${BASE_URL}${ref}`;

  // kino.browser.capture SOLO se puede usar dentro de resolve.
  // Devuelve un arreglo de las peticiones de red capturadas.
  const captured = await kino.browser.capture(url, { timeout: 25000 });

  if (!captured || captured.length === 0) {
    throw new Error("No se capturó ninguna petición de video en Latanime.");
  }

  // Buscamos la primera petición que parezca un video o un enlace de reproductor.
  const videoRequest = captured.find(req =>
    req.url && (
      req.url.includes('.mp4') ||
      req.url.includes('player') ||
      req.url.includes('embed') ||
      req.url.includes('stream')
    )
  ) || captured[0]; // Si no encontramos una obvia, usamos la primera.

  if (!videoRequest || !videoRequest.url) {
    throw new Error("No se pudo extraer la URL del video de las peticiones capturadas.");
  }

  return { url: videoRequest.url };
}
