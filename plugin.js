// plugin.js - Latanime
const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
export async function search(query) {
  const url = `${BASE_URL}/?s=${encodeURIComponent(query.q)}`;
  const response = await kino.fetch(url);

  if (!response.ok) {
    throw new Error(`latanime.org respondió con ${response.status}`);
  }

  const html = await response.text();

  // Aquí va tu lógica de parseo del HTML
  const results = [];
  // ...
  return results;
}

// --- Función de Resolución ---
export async function resolve(ref) {
  const url = ref.startsWith('http') ? ref : `${BASE_URL}${ref}`;

  const page = await kino.browser.capture({
    url: url,
    waitFor: 'video, iframe[src*="player"]',
    timeout: 30000
  });

  const videoUrl = await page.evaluate(() => {
    const video = document.querySelector('video source');
    return video ? video.src : null;
  });

  if (!videoUrl) {
    throw new Error('No se pudo encontrar el enlace del video.');
  }

  return { url: videoUrl };
}
