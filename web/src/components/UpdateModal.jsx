import { useEffect, useRef, useState } from 'react';

// Pop-up de atualização — bloqueia o centro da tela com fundo borrado até o
// aluno decidir. Consulta /api/app-info ao abrir o app e, havendo versão nova,
// mostra o que mudou (bullets da release no modo desktop; assuntos dos commits
// no modo git) e pede a atualização.
//
//   - Instalação GIT (npm run dev): "Atualizar agora" chama POST /api/app-update
//     (git pull + npm install no servidor). O node --watch e o Vite reiniciam
//     sozinhos com o código novo; quando /api/app-info voltar a dizer que está
//     tudo em dia, a página recarrega automaticamente.
//   - Instalação DESKTOP (Electron): "Baixar atualização" abre a página da
//     release nova no GitHub.
//
// "Deixar pra depois" (link discreto) dispensa ESTA versão (localStorage) — o
// pop-up volta assim que uma atualização mais nova ainda for publicada.
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

  const novidades = (info.novidades || []).slice(0, 6);

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
            <div className="update-modal-icon update-modal-bounce">🚀</div>
            <h2 id="update-title" className="update-modal-title">Atualização detectada!</h2>
            <p className="update-modal-sub">
              Saiu uma versão nova do Caça-Cliente
              {info.mode === 'desktop' && info.latest ? <> — <strong>v{info.latest}</strong></> : null}
              . Atualize para continuar com a versão mais recente da ferramenta.
            </p>
            {novidades.length > 0 && (
              <div className="update-modal-news">
                <span className="update-modal-news-title">✨ O que chegou nessa versão</span>
                <ul>
                  {novidades.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}
            <button type="button" className="btn-primary update-modal-cta" onClick={atualizar}>
              {info.mode === 'desktop' ? '⬇️ Baixar atualização agora' : '⬇️ Atualizar agora'}
            </button>
            {info.mode === 'git' && (
              <span className="update-modal-hint">A ferramenta se atualiza e recarrega sozinha — leva um minutinho.</span>
            )}
            <button type="button" className="update-modal-later" onClick={dispensar}>Deixar pra depois</button>
          </>
        )}
        {fase === 'atualizando' && (
          <>
            <div className="update-modal-icon update-modal-spin">⏳</div>
            <h2 id="update-title" className="update-modal-title">Atualizando…</h2>
            <p className="update-modal-sub">Baixando a versão nova e instalando. Isso pode levar um ou dois minutos.</p>
            <p className="muted">Não feche o terminal. A ferramenta recarrega sozinha quando terminar.</p>
          </>
        )}
        {fase === 'falhou' && (
          <>
            <div className="update-modal-icon">😕</div>
            <h2 id="update-title" className="update-modal-title">Não consegui confirmar a atualização</h2>
            <p className="update-modal-sub">
              Pode ser só a internet lenta. Se a ferramenta não recarregar sozinha, feche o terminal
              (Ctrl+C), rode <code>git pull</code> na pasta <code>caca-cliente</code> e depois <code>npm run dev</code>.
            </p>
            <button type="button" className="btn-primary update-modal-cta" onClick={() => window.location.reload()}>Recarregar a página</button>
          </>
        )}
      </div>
    </div>
  );
}
