import express from 'express';
import { fileURLToPath } from 'node:url';

// Carrega server/.env (se existir) ANTES de importar módulos que leem process.env.
try { process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))); } catch {}

// Imports dinâmicos: garantem que o .env já está em process.env quando o db.js inicializa o pool.
const { default: searchRouter } = await import('./routes/search.js');
const { default: messagesRouter } = await import('./routes/messages.js');
const { initDb } = await import('./db.js');

const app = express();
app.use(express.json());
app.use(searchRouter);
app.use(messagesRouter);

await initDb();

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`API de captação ouvindo em http://localhost:${PORT}`);
});
