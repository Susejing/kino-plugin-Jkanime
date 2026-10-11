// plugin.js - Latanime (versión corregida)

const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
export async function search(query) {
  const url = `${BASE_URL}/buscar?q=${encodeURIComponent(query.q)}`;

  // Usamos browser.page para obtener el HTML YA renderizado (pasa Cloudflare)
  const html = await kino.browser.page(url, { timeout: 30000 });

  // Extraemos los enlaces a animes del HTML
  const results = [];
  const seen = new Set();
  const linkRegex = /<a[^>]+href="([^"]*\/anime\/[^"]*)"[^>]*>(.*?)<\/a>/gs;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const [, href, inner] = match;
    if (seen.has(href)) continue;
    seen.add(href);

    // Intentamos sacar el título del texto interno o de un heading dentro
    const titleMatch = inner.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/);
    const title = titleMatch ? titleMatch[1].trim() : inner.replace(/<[^>]+>/g, '').trim();

    if (!title || title.length < 2) continue;

    // Intentamos sacar el poster
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/);
    const poster = imgMatch ? imgMatch[1] : '';

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

  // kino.browser.capture SOLO se puede usar dentro de resolve.
  // Devuelve las peticiones de video capturadas, no un objeto de página.
  const captured = await kino.browser.capture(url, { timeout: 25000 });

  // captured suele ser un arreglo de peticiones de red. Buscamos la primera
  // que parezca un video o un enlace de reproductor.
  if (!captured || captured.length === 0) {
    throw new Error("No se capturó ninguna petición de video en Latanime.");
  }

  // Buscamos la primera petición que contenga una URL de video o embed.
  // La estructura exacta depende de lo que devuelva Kino; ajusta según la
  // documentación de kino.browser.capture.
  const videoRequest = captured.find(req =>
    req.url && (req.url.includes('.mp4') || req.url.includes('player') || req.url.includes('embed') || req.url.includes('stream'))
  ) || captured[0];

  if (!videoRequest || !videoRequest.url) {
    throw new Error("No se pudo extraer la URL del video de las peticiones capturadas.");
  }

  return { url: videoRequest.url };
}
