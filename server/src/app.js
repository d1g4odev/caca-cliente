import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Monta o Express e sobe o servidor. Usado por dois chamadores:
//   - server/src/index.js  (fluxo git: npm run dev / npm start, porta 3001)
//   - desktop/main.js      (app Electron: porta dinâmica em 127.0.0.1)
//
// Quando web/dist existe (build do front), serve o app completo — front e API
// na mesma origem, sem proxy. WEB_DIST permite apontar pro dist empacotado.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServer({ port = process.env.PORT ?? 3001, host } = {}) {
  // Imports dinâmicos: garantem que o .env/env vars do chamador já estão em
  // process.env quando o db.js inicializa o pool (mesmo padrão do index.js).
  const { default: searchRouter } = await import('./routes/search.js');
  const { default: messagesRouter } = await import('./routes/messages.js');
  const { default: appInfoRouter } = await import('./routes/appInfo.js');
  const { initDb } = await import('./db.js');

  const app = express();
  app.use(express.json());
  app.use(searchRouter);
  app.use(messagesRouter);
  app.use(appInfoRouter);

  // Front buildado (produção/app desktop). No dev o Vite serve na 5173 e faz
  // proxy pra cá — o dist pode nem existir, e tudo segue como antes.
  const webDist = process.env.WEB_DIST ?? path.resolve(__dirname, '../../web/dist');
  if (existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist));
    // Fallback SPA: qualquer rota não-API devolve o index.html.
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
    console.log(`[web] servindo front buildado de ${webDist}`);
  }

  await initDb();

  return new Promise((resolve, reject) => {
    const server = app.listen(Number(port), host, () => {
      const addr = server.address();
      console.log(`API de captação ouvindo em http://${host ?? 'localhost'}:${addr.port}`);
      resolve({ server, port: addr.port });
    });
    server.on('error', reject);
  });
}
