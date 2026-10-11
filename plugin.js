// plugin.js - AnimeYT

const BASE_URL = "https://animeyt.cc";

// --- Función de Búsqueda ---
export async function search(query) {
  // La búsqueda en AnimeYT se realiza en /tv/?s=
  const url = `${BASE_URL}/tv/?s=${encodeURIComponent(query.q)}`;

  // Usamos kino.fetch con un User-Agent de navegador para asegurar una respuesta correcta.
  const response = await kino.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`animeyt.cc respondió con ${response.status}`);
  }

  const html = await response.text();

  // --- Parseo del HTML ---
  const results = [];
  const seen = new Set();

  // 1. Regex para encontrar los enlaces a las obras (series/películas).
  //    Los resultados de búsqueda apuntan a URLs como /tv/nombre-de-la-obra/
  const linkRegex = /<a[^>]+href="([^"]*\/tv\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gs;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const [, href, inner] = match;
    // Evitamos duplicados y enlaces que no sean de una obra específica.
    if (seen.has(href) || !href || href === '/tv/') continue;
    seen.add(href);

    // 2. Extraer el título: buscamos un encabezado dentro del enlace o usamos el texto.
    let title = '';
    const headingMatch = inner.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else {
      title = inner.replace(/<[^>]+>/g, '').trim();
    }

    // Descartamos títulos vacíos o demasiado cortos.
    if (!title || title.length < 2) continue;

    // 3. Extraer la imagen de portada (poster).
    let poster = '';
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/);
    if (imgMatch) {
      poster = imgMatch[1];
    }

    results.push({
      id: href,
      ref: href,
      title: title,
      kind: "series", // AnimeYT muestra series y películas.
      poster: poster,
    });
  }

  return results;
}

// --- Función de Resolución ---
export async function resolve(ref) {
  // `ref` es la URL relativa de la obra (ej. "/tv/one-piece-heroines/").
  const url = ref.startsWith("http") ? ref : `${BASE_URL}${ref}`;

  // Usamos kino.browser.capture para ejecutar la página y capturar las peticiones de red.
  // Esto es necesario porque los episodios se cargan dinámicamente con JavaScript.
  const captured = await kino.browser.capture(url, { timeoutMs: 25000 });

  if (!captured || !captured.requests || captured.requests.length === 0) {
    throw new Error("No se capturó ninguna petición de red en AnimeYT.");
  }

  // Buscamos la primera petición que parezca un video o un enlace de reproductor.
  // Los sitios de anime suelen usar archivos .mp4 o .m3u8 (HLS).
  const videoRequest = captured.requests.find(req =>
    req.url && (
      req.url.includes('.mp4') ||
      req.url.includes('.m3u8') ||
      req.url.includes('player') ||
      req.url.includes('embed') ||
      req.url.includes('stream')
    )
  ) || captured.requests[0]; // Si no encontramos una obvia, usamos la primera.

  if (!videoRequest || !videoRequest.url) {
    throw new Error("No se pudo extraer la URL del video de las peticiones capturadas.");
  }

  return { url: videoRequest.url };
}
