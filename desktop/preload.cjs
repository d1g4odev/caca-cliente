// Ponte segura entre o front (React) e o processo principal do Electron.
// Expõe SÓ o necessário pro pop-up de atualização: disparar o download da
// versão nova e ouvir progresso/conclusão/erro. CommonJS de propósito —
// preload roda em sandbox e não aceita ESM.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cacaDesktop', {
  // true = Windows/Linux empacotado (baixa, instala e reabre sozinho).
  // false = macOS ou dev (o front abre a página de download, fluxo antigo).
  autoUpdateSuportado: () => ipcRenderer.invoke('updater:suportado'),
  baixarAtualizacao: () => ipcRenderer.invoke('updater:baixar'),
  aoProgresso: (cb) => ipcRenderer.on('updater:progresso', (_e, dados) => cb(dados)),
  aoBaixado: (cb) => ipcRenderer.on('updater:baixado', () => cb()),
  aoErro: (cb) => ipcRenderer.on('updater:erro', (_e, msg) => cb(msg)),
});
