// plugin.js - Latanime

const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
// Esta función se ejecuta cuando el usuario busca un anime en Kino.
export async function search(query) {
  // Construimos la URL de búsqueda de Latanime.
  const url = `${BASE_URL}/?s=${encodeURIComponent(query.q)}`;

  // Usamos kino.fetch para obtener el HTML de la página de búsqueda.
  const response = await kino.fetch(url);
  if (!response.ok) {
    throw new Error(`latanime.org respondió con ${response.status}`);
  }

  const html = await response.text();

  // --- Parseo del HTML ---
  // Aquí extraemos los resultados. La estructura de Latanime usa
  // un contenedor principal y luego artículos individuales.
  // Estos selectores son los que usa el sitio (pueden cambiar en el futuro).
  const results = [];
  // Usamos una expresión regular simple para extraer los enlaces y títulos.
  // Si el sitio cambia su HTML, esta parte necesitará ajustes.
  const articleRegex = /<article[^>]*>.*?<a href="([^"]+)"[^>]*>.*?<h2[^>]*>([^<]+)<\/h2>.*?<\/article>/gs;

  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const [, ref, title] = match;
    // Solo agregamos resultados que tengan un título y una referencia válida.
    if (title && ref) {
      results.push({
        id: ref, // Usamos la URL como ID único.
        ref: ref,
        title: title.trim(),
        kind: "series", // Latanime es principalmente series de anime.
        poster: "", // La URL del poster se puede extraer, pero la omitimos por simplicidad.
      });
    }
  }

  return results;
}

// --- Función de Resolución ---
// Esta función se ejecuta cuando el usuario elige un resultado y quiere ver un episodio.
export async function resolve(ref) {
  // `ref` es la URL del anime que devolvió la búsqueda.
  const url = ref.startsWith("http") ? ref : `${BASE_URL}${ref}`;

  // Para resolver el video, usamos el navegador oculto de Kino.
  // Esto carga la página como un navegador real, ejecuta su JavaScript
  // y espera a que el reproductor cargue.
  const page = await kino.browser.capture({
    url: url,
    // Esperamos a que aparezca un iframe de reproductor o un elemento <video>.
    waitFor: 'iframe[src*="player"], video',
    timeout: 30000, // 30 segundos de espera máxima.
  });

  // Ahora extraemos la URL del video desde el DOM de la página cargada.
  const videoUrl = await page.evaluate(() => {
    // Buscamos primero un elemento <video> y luego un iframe de reproductor.
    const video = document.querySelector("video source");
    if (video && video.src) return video.src;

    const iframe = document.querySelector('iframe[src*="player"]');
    if (iframe && iframe.src) return iframe.src;

    // Si no encontramos nada, devolvemos null.
    return null;
  });

  if (!videoUrl) {
    throw new Error("No se pudo encontrar el enlace del video en Latanime.");
  }

  // Devolvemos el objeto que Kino espera para reproducir el video.
  return { url: videoUrl };
}
