import { Router } from 'express';

// GET /api/app-info — versão instalada (setada pelo Electron) + última release
// publicada no GitHub, pro front mostrar o banner "nova versão disponível".
// Offline-safe: falha na consulta -> latest null, nunca quebra o app.
const router = Router();

const REPO = 'd1g4odev/caca-cliente';
const CACHE_MS = 6 * 60 * 60 * 1000; // 6h
let cache = { at: 0, latest: null, latestUrl: null };

async function fetchLatest() {
  if (Date.now() - cache.at < CACHE_MS) return cache;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'caca-cliente' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const data = await r.json();
      cache = {
        at: Date.now(),
        latest: (data.tag_name ?? '').replace(/^v/, '') || null,
        latestUrl: data.html_url ?? null,
      };
    } else {
      cache = { at: Date.now(), latest: null, latestUrl: null };
    }
  } catch {
    cache = { at: Date.now(), latest: null, latestUrl: null };
  }
  return cache;
}

router.get('/api/app-info', async (_req, res) => {
  const { latest, latestUrl } = await fetchLatest();
  res.json({ version: process.env.APP_VERSION ?? null, latest, latestUrl });
});

export default router;
