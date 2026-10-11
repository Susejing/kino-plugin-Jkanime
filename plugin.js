// plugin.js - Latanime
const BASE_URL = "https://latanime.org";

// --- Función de Búsqueda ---
export async function search(query) {
  // Latanime usa un parámetro de búsqueda simple. Ajusta si es necesario.
  const url = `${BASE_URL}/?s=${encodeURIComponent(query.q)}`;
  const response = await kino.fetch(url);

  if (!response.ok) {
    throw new Error(`latanime.org respondió con ${response.status}`);
  }

  const html = await response.text();

  // --- AQUÍ DEBES PARSEAR EL HTML ---
  // Busca los contenedores de los resultados de búsqueda.
  // Ejemplo con expresiones regulares (frágil, pero sirve para empezar):
  const results = [];
  // ... tu lógica de parseo ...
  // Cada resultado debe ser un objeto:
  // { id: "...", ref: "...", title: "...", kind: "series", poster: "..." }

  return results;
}

// --- Función de Resolución ---
export async function resolve(ref) {
  // `ref` es la URL o ID del anime/episodio que devolvió tu búsqueda.
  const url = ref.startsWith('http') ? ref : `${BASE_URL}${ref}`;
  const response = await kino.fetch(url);
  const html = await response.text();

  // --- AQUÍ DEBES EXTRAER EL ENLACE DEL VIDEO ---
  // 1. Encuentra el reproductor embebido (iframe, script, etc.).
  // 2. Si el enlace se genera con JavaScript, necesitarás
  //    `kino.browser.capture` para esperar a que aparezca.
  // 3. Retorna la URL del stream.
  // return { url: "https://.../video.mp4" };
  return {};
}
