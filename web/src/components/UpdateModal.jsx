import { useEffect, useRef, useState } from 'react';

// Pop-up de atualização. Consulta /api/app-info ao abrir o app e, se o GitHub
// tiver versão mais nova que a instalada, mostra "ATUALIZAÇÃO DETECTADA".
//
//   - Instalação GIT (npm run dev): "Atualizar agora" chama POST /api/app-update
//     (git pull + npm install no servidor). O node --watch e o Vite reiniciam
//     sozinhos com o código novo; quando /api/app-info voltar a dizer que está
//     tudo em dia, a página recarrega automaticamente.
//   - Instalação DESKTOP (Electron): "Baixar atualização" abre a página da
//     release nova no GitHub.
//
// "Agora não" dispensa ESTA versão (localStorage) — o pop-up só volta quando
// uma atualização mais nova ainda for publicada.
const DISMISS_KEY = 'captacao.updateDismissed';

export default function UpdateModal() {
  const [info, setInfo] = useState(null);
  const [fase, setFase] = useState('oferta'); // oferta | atualizando | falhou
  const pollRef = useRef(null);

  useEffect(() => {
    fetch('/api/app-info')
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => {}); // silencioso em erro
    return () => clearInterval(pollRef.current);
  }, []);

  if (!info || !info.updateAvailable) return null;

  // Identificador da atualização oferecida (sha do git ou versão da release).
  const updateId = info.mode === 'git' ? info.remoteSha : info.latest;
  let dismissed = null;
  try { dismissed = localStorage.getItem(DISMISS_KEY); } catch { /* ignora */ }
  if (fase === 'oferta' && dismissed && dismissed === updateId) return null;

  function dispensar() {
    try { localStorage.setItem(DISMISS_KEY, updateId); } catch { /* ignora */ }
    setInfo(null);
  }

  async function atualizar() {
    if (info.mode === 'desktop') {
      window.open(info.latestUrl, '_blank', 'noreferrer');
      return;
    }
    setFase('atualizando');
    // O POST pode nem responder: o git pull troca arquivos do servidor e o
    // node --watch reinicia o processo no meio da requisição. Erro aqui não é
    // fracasso — seguimos pro polling, que descobre o desfecho real.
    try { await fetch('/api/app-update', { method: 'POST' }); } catch { /* esperado */ }

    const inicio = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/app-info');
        if (r.ok) {
          const d = await r.json();
          if (d.mode === 'git' && !d.updateAvailable) {
            clearInterval(pollRef.current);
            window.location.reload();
            return;
          }
        }
      } catch { /* servidor reiniciando — tenta de novo */ }
      if (Date.now() - inicio > 4 * 60 * 1000) {
        clearInterval(pollRef.current);
        setFase('falhou');
      }
    }, 5000);
  }

  return (
    <div className="modal-overlay update-modal-overlay">
      <div className="modal update-modal" role="alertdialog" aria-labelledby="update-title" onClick={(e) => e.stopPropagation()}>
        {fase === 'oferta' && (
          <>
            <div className="update-modal-icon">🚀</div>
            <h2 id="update-title">Atualização detectada!</h2>
            <p>
              Saiu uma versão nova do Caça-Cliente
              {info.mode === 'desktop' && info.latest ? <> (v{info.latest})</> : null}
              {info.mode === 'git' && info.behind > 0 ? <> ({info.behind} melhoria{info.behind > 1 ? 's' : ''} nova{info.behind > 1 ? 's' : ''})</> : null}
              .
            </p>
            <p><strong>Deseja atualizar para a última versão?</strong></p>
            <div className="update-modal-actions">
              <button type="button" className="btn-secondary" onClick={dispensar}>Agora não</button>
              <button type="button" className="btn-primary" onClick={atualizar}>
                {info.mode === 'desktop' ? '⬇️ Baixar atualização' : '⬇️ Atualizar agora'}
              </button>
            </div>
          </>
        )}
        {fase === 'atualizando' && (
          <>
            <div className="update-modal-icon update-modal-spin">⏳</div>
            <h2 id="update-title">Atualizando…</h2>
            <p>Baixando a versão nova e instalando. Isso pode levar um ou dois minutos.</p>
            <p className="muted">Não feche o terminal. A ferramenta recarrega sozinha quando terminar.</p>
          </>
        )}
        {fase === 'falhou' && (
          <>
            <div className="update-modal-icon">😕</div>
            <h2 id="update-title">Não consegui confirmar a atualização</h2>
            <p>
              Pode ser só a internet lenta. Se a ferramenta não recarregar sozinha, feche o terminal
              (Ctrl+C), rode <code>git pull</code> na pasta <code>caca-cliente</code> e depois <code>npm run dev</code>.
            </p>
            <div className="update-modal-actions">
              <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Recarregar a página</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
