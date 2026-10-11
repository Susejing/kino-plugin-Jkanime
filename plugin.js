// plugin.js - Latanime (versión corregida)

const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
export async function search(query) {
  const url = `${BASE_URL}/buscar?q=${encodeURIComponent(query.q)}`;

  // Usamos kino.browser.page: abre la página como un navegador real
  // y espera a que Cloudflare termine su revisión automática.
  const page = await kino.browser.page(url, {
    timeoutMs: 12000,
    // Esperamos a que el HTML ya no sea la página de revisión de Cloudflare
    // y contenga enlaces a animes.
    waitFor: 'a[href*="/anime/"]'
  });

  const html = page.html;

  // --- Parseo del HTML ---
  const results = [];
  const seen = new Set();
  // Expresión regular CORREGIDA (con la etiqueta <a al inicio)
  const linkRegex = /<a[^>]+href="([^"]*\/anime\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gs;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const [, href, inner] = match;
    if (seen.has(href) || !href) continue;
    seen.add(href);

    let title = '';
    // Expresión regular CORREGIDA (con la etiqueta <h al inicio)
    const headingMatch = inner.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else {
      title = inner.replace(/<[^>]+>/g, '').trim();
    }

    if (!title || title.length < 2) continue;

    let poster = '';
    // Expresión regular CORREGIDA (con la etiqueta <img al inicio)
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

  const captured = await kino.browser.capture(url, { timeoutMs: 30000 });

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
    throw new Error("No se pudo extraer la URL del video.");
  }

  return { url: videoRequest.url };
}
