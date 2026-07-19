import { Router } from 'express';
import { exec, spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// GET  /api/app-info   — detecta se existe atualização disponível.
//   - Instalação DESKTOP (Electron seta APP_VERSION): compara com a última
//     release publicada no GitHub. Atualizar = baixar o instalador novo.
//   - Instalação GIT (aluno clonou o repo e roda npm run dev): faz git fetch
//     e conta quantos commits o origin/main está à frente do HEAD local.
//     Atualizar = git pull (endpoint abaixo).
// POST /api/app-update — aplica a atualização git: git pull + npm install.
//     Roda desanexado (o node --watch reinicia o servidor no meio do pull e
//     mataria um processo filho comum). Log em .update.log na raiz do repo.
// Offline-safe: qualquer falha de rede/git -> updateAvailable false, nunca
// quebra o app.
const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..'); // raiz do repo (acima de server/)
const REPO = 'd1g4odev/caca-cliente';

// Executa um comando na raiz do repo; devolve stdout limpo ou null em erro.
const sh = (cmd, timeout = 8000) =>
  new Promise((resolve) => {
    exec(cmd, { cwd: ROOT, timeout, windowsHide: true }, (err, stdout) =>
      resolve(err ? null : String(stdout).trim())
    );
  });

// ── Desktop: última release no GitHub (cache 6h) ────────────────────────────
const RELEASE_CACHE_MS = 6 * 60 * 60 * 1000;
let releaseCache = { at: 0, latest: null, latestUrl: null };

async function fetchLatestRelease() {
  if (Date.now() - releaseCache.at < RELEASE_CACHE_MS) return releaseCache;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'caca-cliente' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const data = await r.json();
      releaseCache = {
        at: Date.now(),
        latest: (data.tag_name ?? '').replace(/^v/, '') || null,
        latestUrl: data.html_url ?? null,
      };
    } else {
      releaseCache = { at: Date.now(), latest: null, latestUrl: null };
    }
  } catch {
    releaseCache = { at: Date.now(), latest: null, latestUrl: null };
  }
  return releaseCache;
}

// ── Git: commits atrás do origin/main (cache 10min) ─────────────────────────
const GIT_CACHE_MS = 10 * 60 * 1000;
let gitCache = { at: 0, data: null };

async function checkGit() {
  if (Date.now() - gitCache.at < GIT_CACHE_MS) return gitCache.data;
  const inRepo = await sh('git rev-parse --is-inside-work-tree');
  if (inRepo !== 'true') {
    gitCache = { at: Date.now(), data: null };
    return null;
  }
  // fetch pode demorar em conexão lenta; falhar em silêncio é ok (fica o
  // origin/main da última vez, ou behind 0 se nunca buscou).
  await sh('git fetch --quiet origin main', 15000);
  const behindRaw = await sh('git rev-list --count HEAD..origin/main');
  const remoteSha = await sh('git rev-parse --short origin/main');
  const behind = behindRaw == null ? 0 : Number(behindRaw) || 0;
  gitCache = { at: Date.now(), data: { behind, remoteSha } };
  return gitCache.data;
}

router.get('/api/app-info', async (_req, res) => {
  const version = process.env.APP_VERSION ?? null;
  if (version) {
    const { latest, latestUrl } = await fetchLatestRelease();
    return res.json({
      mode: 'desktop',
      version,
      latest,
      latestUrl,
      updateAvailable: Boolean(latest && latest !== version),
    });
  }
  const git = await checkGit();
  if (git) {
    return res.json({
      mode: 'git',
      version: null,
      behind: git.behind,
      remoteSha: git.remoteSha,
      updateAvailable: git.behind > 0,
    });
  }
  res.json({ mode: null, version: null, updateAvailable: false });
});

router.post('/api/app-update', async (_req, res) => {
  const git = await checkGit();
  if (!git) {
    return res.status(400).json({ error: 'Instalação sem git — baixe a nova versão manualmente.' });
  }
  try {
    const logFd = openSync(path.join(ROOT, '.update.log'), 'w');
    const cmd = [
      'git pull --ff-only origin main',
      'npm --prefix server install --no-audit --no-fund',
      'npm --prefix web install --no-audit --no-fund',
    ].join(' && ');
    // detached + unref: o pull troca arquivos de server/src e o node --watch
    // reinicia este processo — o filho precisa sobreviver a isso.
    const child = spawn(cmd, { cwd: ROOT, shell: true, detached: true, stdio: ['ignore', logFd, logFd], windowsHide: true });
    child.unref();
    gitCache = { at: 0, data: null }; // força rechecagem no próximo /api/app-info
    res.json({ started: true });
  } catch (e) {
    res.status(500).json({ error: `Não consegui iniciar a atualização: ${e.message}` });
  }
});

export default router;
