// Tela de boas-vindas de primeira visita: mascote grande + onboarding curto.
// Mostrada quando o usuário ainda não fez nenhuma busca.
export default function Welcome() {
  return (
    <div className="welcome">
      <img src="/brand/icon.png" alt="Mascote Caça-Cliente" className="welcome-mascot" width={96} height={96} />
      <h2 className="welcome-title">Bem-vindo ao Caça-Cliente</h2>
      <p className="welcome-text">
        O radar de negócios sem site — do clique ao WhatsApp.
      </p>
      <ol className="welcome-steps">
        <li><strong>Busque</strong> por nicho e cidade</li>
        <li><strong>Filtre</strong> quem tem WhatsApp e Instagram</li>
        <li><strong>Aborde</strong> com mensagem pronta para copiar</li>
      </ol>
      <p className="welcome-hint">Comece preenchendo a busca acima ↑</p>
    </div>
  );
}
