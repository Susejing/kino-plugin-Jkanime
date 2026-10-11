const BASE_URL = "https://jkanime.net";

// --- Búsqueda ---
export async function search(query) {
  // Endpoint AJAX que devuelve JSON, no HTML.
  const url = `${BASE_URL}/ajax/ajax_search/?q=${encodeURIComponent(query.q)}`;

  const response = await kino.fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 ... Chrome/131.0.0.0 Safari/537.36' }
  });
  if (!response.ok) throw new Error(`Jkanime respondió ${response.status}`);

  const data = await response.json();
  // La estructura real hay que confirmarla, pero suele ser algo como data.animes[]
  const animes = data.animes || data.data || [];

  return animes.map(a => ({
    id: a.slug || a.id,
    ref: `${BASE_URL}/${a.slug}/${a.episodes || '1'}`, // Ajustar según estructura real
    title: a.title,
    kind: "series",
    poster: a.image || a.thumbnail || "",
  }));
}

// --- Resolución ---
export async function resolve(ref) {
  const url = ref.startsWith("http") ? ref : `${BASE_URL}${ref}`;

  // Usamos kino.browser.capture porque la página del episodio carga
  // los servidores con JavaScript (var servers = [...]).
  const captured = await kino.browser.capture(url, { timeoutMs: 25000 });

  // Buscamos la petición que contenga el video real (mp4, m3u8) o el iframe del reproductor.
  const videoReq = captured.requests.find(r =>
    r.url && (
      r.url.includes('.mp4') ||
      r.url.includes('.m3u8') ||
      r.url.includes('player') ||
      r.url.includes('embed') ||
      r.url.includes('stream')
    )
  );

  if (!videoReq) throw new Error("No se encontró el video en Jkanime.");
  return { url: videoReq.url };
}
