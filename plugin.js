// plugin.js - Latanime

const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
export async function search(query) {
  const url = `${BASE_URL}/buscar?q=${encodeURIComponent(query.q)}`;

  // Usamos el navegador oculto para pasar el challenge de Cloudflare
  const page = await kino.browser.capture({
    url: url,
    waitFor: '.anime__item, article, .card, a[href*="/anime/"]',
    timeout: 30000,
  });

  // Extraemos los resultados directamente del DOM ya renderizado
  const items = await page.evaluate(() => {
    const results = [];
    // Buscamos todos los enlaces que apunten a un anime
    const links = document.querySelectorAll('a[href*="/anime/"]');

    links.forEach((link) => {
      const href = link.getAttribute('href');
      // Ignoramos enlaces que no sean de un anime en concreto
      if (!href || !href.includes('/anime/')) return;

      // El título suele estar dentro del enlace o en un h3/h2 cercano
      let title = link.getAttribute('title') || link.textContent.trim();
      const heading = link.querySelector('h3, h2, h4');
      if (heading) title = heading.textContent.trim();

      if (!title || title.length < 2) return;

      // La imagen de portada (si existe)
      const img = link.querySelector('img');
      const poster = img ? img.getAttribute('src') : '';

      results.push({
        id: href,
        ref: href,
        title: title,
        kind: 'series',
        poster: poster || '',
      });
    });

    // Quitamos duplicados por si el mismo anime aparece varias veces
    const unique = [];
    const seen = new Set();
    for (const item of results) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  });

  return items;
}

// --- Función de Resolución ---
export async function resolve(ref) {
  const url = ref.startsWith('http') ? ref : `${BASE_URL}${ref}`;

  const page = await kino.browser.capture({
    url: url,
    waitFor: 'iframe[src*="player"], iframe[src*="stream"], video',
    timeout: 30000,
  });

  const videoUrl = await page.evaluate(() => {
    // 1. Buscamos un <video><source> directo
    const video = document.querySelector('video source');
    if (video && video.src) return video.src;

    // 2. Buscamos un iframe de reproductor
    const iframe = document.querySelector('iframe[src*="player"], iframe[src*="stream"], iframe[src*="embed"]');
    if (iframe && iframe.src) return iframe.src;

    return null;
  });

  if (!videoUrl) {
    throw new Error('No se pudo encontrar el enlace del video en Latanime.');
  }

  return { url: videoUrl };
}
