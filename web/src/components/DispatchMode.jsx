import { useState } from 'react';
import { waLink, montarMensagem } from '../lib/whatsapp.js';

// "Modo disparo" — abordagem em sequência, com humano no loop (respeita as
// regras do WhatsApp). Abre cada lead com a mensagem pronta; ao confirmar, o
// lead vai para "Contatado" e avança automaticamente para o próximo.
export default function DispatchMode({ leads, onContacted, onClose }) {
  const fila = leads.filter((l) => waLink(l.phone, l.name, l.niche)); // só quem tem WhatsApp
  const [i, setI] = useState(0);
  const done = i >= fila.length;
  const lead = fila[i];

  function enviarEAvancar() {
    const href = waLink(lead.phone, lead.name, lead.niche);
    if (href) window.open(href, '_blank', 'noopener');
    onContacted?.(lead.id);
    setI((n) => n + 1);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>🚀 Modo disparo</h2>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Fechar">×</button>
        </header>

        {fila.length === 0 ? (
          <div className="modal-body"><p className="empty">Nenhum lead com WhatsApp na lista atual.</p></div>
        ) : done ? (
          <div className="modal-body"><p className="dispatch-done">✅ Você passou por todos os {fila.length} leads!</p></div>
        ) : (
          <div className="modal-body">
            <div className="dispatch-progress">
              <div className="dispatch-bar"><div style={{ width: `${(i / fila.length) * 100}%` }} /></div>
              <span>{i + 1} de {fila.length}</span>
            </div>
            <div className="dispatch-lead">
              <h3>{lead.name}</h3>
              <p className="muted">📞 {lead.phone}</p>
            </div>
            <div className="preview">
              <span>Mensagem que será aberta:</span>
              <pre>{montarMensagem(lead.name, lead.niche)}</pre>
            </div>
            <p className="dispatch-hint">
              Ao clicar, a conversa abre pronta no WhatsApp (você só aperta enviar) e o lead vai para <strong>Contatado</strong>.
            </p>
          </div>
        )}

        <footer className="modal-foot">
          {!done && fila.length > 0 && (
            <button type="button" className="link-btn" onClick={() => setI((n) => n + 1)}>Pular</button>
          )}
          <span className="spacer" />
          <button type="button" className="btn-secondary" onClick={onClose}>{done || fila.length === 0 ? 'Fechar' : 'Parar'}</button>
          {!done && fila.length > 0 && (
            <button type="button" className="wa-btn dispatch-send" onClick={enviarEAvancar}>💬 Abrir e marcar contatado →</button>
          )}
        </footer>
      </div>
    </div>
  );
}
