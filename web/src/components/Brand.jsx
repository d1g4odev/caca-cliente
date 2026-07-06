// Rodapé da sidebar com a marca do curso Sites com IA do Zero.
// No dark mode: mostra o logo completo (logo-small.png, texto branco/verde).
// No light mode: mostra só o mascote + texto (logo branco não funciona em fundo claro).
export default function Brand() {
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
    </footer>
  );
}
