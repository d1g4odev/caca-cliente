import { useEffect, useState } from 'react';

// Banner de nova versão. Faz UM fetch silencioso de /api/app-info no mount.
// Se version && latest && latest !== version, mostra barra discreta no topo
// com link pra baixar a atualização. O X dispensa até reabrir o app.
export default function UpdateBanner() {
  const [info, setInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/app-info')
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => {}); // silencioso em erro
  }, []);

  if (dismissed || !info) return null;
  if (!info.version || !info.latest || info.latest === info.version) return null;

  return (
    <div className="update-banner" role="alert">
      <span>⬇️ Nova versão disponível (v{info.latest}) — </span>
      <a href={info.latestUrl} target="_blank" rel="noreferrer">Baixar atualização</a>
      <button type="button" className="update-banner-x" onClick={() => setDismissed(true)} aria-label="Fechar">✕</button>
    </div>
  );
}
