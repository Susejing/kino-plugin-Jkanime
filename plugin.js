// plugin.js - Latanime (corregido)

const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
export async function search(query) {
  const url = `${BASE_URL}/buscar?q=${encodeURIComponent(query.q)}`;

  // kino.browser.page lee la página ya renderizada, pasando Cloudflare.
  const page = await kino.browser.page(url, {
    timeoutMs: 15000,
    waitFor: 'a[href*="/anime/"]' // Espera a que existan enlaces a animes
  });

  const html = page.html;

  // --- Parseo del HTML (expresiones regulares CORREGIDAS) ---
  const results = [];
  const seen = new Set();

  // 1. Regex para encontrar enlaces a animes (ahora sí empieza con <a)
  const linkRegex = /<a[^>]+href="([^"]*\/anime\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gs;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const [, href, inner] = match;
    if (seen.has(href) || !href) continue;
    seen.add(href);

    // 2. Extraer título (regex CORREGIDA, empieza con <h)
    let title = '';
    const headingMatch = inner.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else {
      title = inner.replace(/<[^>]+>/g, '').trim();
    }

    if (!title || title.length < 2) continue;

    // 3. Extraer poster (regex CORREGIDA, empieza con <img)
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
export async function resolve(ref) {
  const url = ref.startsWith("http") ? ref : `${BASE_URL}${ref}`;

  // kino.browser.capture captura las peticiones de red para encontrar el video.
  const captured = await kino.browser.capture(url, { timeoutMs: 25000 });

  if (!captured || !captured.requests || captured.requests.length === 0) {
    throw new Error("No se capturó ninguna petición de video en Latanime.");
  }

  const videoRequest = captured.requests.find(req =>
    req.url && (
      req.url.includes('.mp4') ||
      req.url.includes('.m3u8') ||
      req.url.includes('player') ||
      req.url.includes('embed') ||
      req.url.includes('stream')
    )
  ) || captured.requests[0];

  if (!videoRequest || !videoRequest.url) {
    throw new Error("No se pudo extraer la URL del video de las peticiones capturadas.");
  }

  return { url: videoRequest.url };
}
