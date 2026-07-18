// Processo principal do app desktop. Sobe o MESMO server Express do projeto
// (import direto, sem child process — SSE e env funcionam de graça) numa porta
// FIXA de loopback (origem estável entre aberturas) e abre uma janela
// apontando pra ele.
//
// Dev do desktop (usa o repo):  npm --prefix desktop start -- --dev
//   (requer web/dist buildado:  npm --prefix web run build)
import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV = process.argv.includes('--dev');

// Porta fixa: a origem http://127.0.0.1:PORTA precisa ser sempre a mesma
// entre aberturas do app, senão o localStorage do front (perfil, onboarding,
// última busca) zera a cada reabertura. Só varia se 47245 estiver ocupada
// (outra instância morrendo devagar, outro app do aluno etc).
const FIXED_PORT = 47245;
const PORT_RETRIES = 10; // tenta 47245..47254

async function startServerOnFixedPort(startServer) {
  let lastErr;
  for (let i = 0; i < PORT_RETRIES; i++) {
    const port = FIXED_PORT + i;
    try {
      return await startServer({ port, host: '127.0.0.1' });
    } catch (e) {
      if (e?.code !== 'EADDRINUSE') throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

// Uma instância só: reabrir o app foca a janela existente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // Fechar a janela desliga tudo, em qualquer plataforma (público leigo:
  // "fechei o programa" tem que significar desligado).
  app.on('window-all-closed', () => app.quit());

  app.whenReady().then(async () => {
    try {
      // Env ANTES do import do server (o db lê no load).
      process.env.CACA_DATA_DIR = app.getPath('userData');
      process.env.APP_VERSION = app.getVersion();
      // Empacotado: server/ e web/dist viajam dentro do app (electron-builder
      // extraFiles/files). Em --dev, usa o repo (pasta pai).
      const base = DEV ? path.resolve(__dirname, '..') : app.getAppPath();
      process.env.WEB_DIST = path.join(base, 'web', 'dist');

      const { startServer } = await import(
        pathToFileURL(path.join(base, 'server', 'src', 'app.js')).href
      );
      const { port } = await startServerOnFixedPort(startServer);

      win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'Caça-Cliente',
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: { contextIsolation: true, nodeIntegration: false },
      });
      // Links externos (wa.me, GitHub, Google) abrem no navegador do sistema.
      win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
      win.on('closed', () => { win = null; });
      await win.loadURL(`http://127.0.0.1:${port}`);
    } catch (e) {
      dialog.showErrorBox(
        'Caça-Cliente não conseguiu iniciar',
        `Erro: ${e.message}\n\nTente reiniciar o computador e abrir de novo. Se persistir, chame o suporte do curso.`
      );
      app.quit();
    }
  });
}
