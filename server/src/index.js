import { fileURLToPath } from 'node:url';

// Carrega server/.env (se existir) ANTES de importar módulos que leem process.env.
try { process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))); } catch {}

const { startServer } = await import('./app.js');
await startServer();
