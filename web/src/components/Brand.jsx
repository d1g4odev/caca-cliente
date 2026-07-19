import { useEffect, useState } from 'react';

// Rodapé da sidebar com a marca do curso Sites com IA do Zero.
// No dark mode: mostra o logo completo (logo-small.png, texto branco/verde).
// No light mode: mostra só o mascote + texto (logo branco não funciona em fundo claro).
// Mostra também a versão instalada e se está atualizada — resposta visual
// imediata pra "meu app é o novo ou o velho?" (/api/app-info é cacheado no
// servidor; esta segunda chamada não gera consulta extra ao GitHub).
export default function Brand() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch('/api/app-info')
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => {}); // sem info, sem selo — nunca quebra o rodapé
  }, []);

  const versao = info?.version ? `v${info.version}` : null;
  const selo = info == null ? null : info.updateAvailable
    ? { classe: 'brand-version--velha', texto: '● atualização disponível' }
    : { classe: 'brand-version--ok', texto: '✓ atualizado' };

  return (
    <footer className="sidebar-foot">
      <a
        href="https://sitescomiazero.com"
        target="_blank"
        rel="noopener noreferrer"
        className="brand-link"
        title="Sites com IA do Zero — curso do DevJuninho"
      >
        {/* Dark mode: logo completo (visível em fundo escuro) */}
        <img
          src="/brand/logo-small.png"
          alt="Sites com IA do Zero"
          className="brand-logo brand-logo--dark"
          width={120}
          height={36}
        />
        {/* Light mode: mascote + texto (logo branco não funciona em fundo claro) */}
        <span className="brand-logo brand-logo--light">
          <img src="/brand/icon.png" alt="" className="brand-mascot" width={28} height={28} />
          <span className="brand-text">
            <strong>Sites com IA do Zero</strong>
            <span className="brand-sub">curso do DevJuninho</span>
          </span>
        </span>
        <span className="brand-tagline">ferramenta do curso</span>
      </a>
      {selo && (
        <span className="brand-version" title="Versão instalada do Caça-Cliente">
          {versao && <strong>{versao}</strong>}
          <span className={selo.classe}>{selo.texto}</span>
        </span>
      )}
    </footer>
  );
}
