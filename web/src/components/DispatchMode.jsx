import { useState } from 'react';
import { waLink } from '../lib/whatsapp.js';
import { waLinkWithMessage } from '../lib/whatsapp.js';
import { useDispatchMessages } from '../hooks/useDispatchMessages.js';

// "Modo disparo" — abordagem em sequência, com humano no loop (respeita as
// regras do WhatsApp). Abre cada lead com a mensagem pronta; ao confirmar, o
// lead vai para "Contatado" e avança automaticamente para o próximo.
//
// As mensagens vêm do motor (server/src/prospector/) via endpoint de lote ou
// individual — NÃO usa mais o template legado de whatsapp.js como fonte
// primária. O template legado só aparece como fallback discreto se a API falhar.
export default function DispatchMode({ leads, searchId, onContacted, onClose }) {
  const fila = leads.filter((l) => waLink(l.phone, l.name, l.niche)); // só quem tem WhatsApp
  const [i, setI] = useState(0);
  const { loading, usedFallback, getMensagem } = useDispatchMessages({ searchId, leads: fila });

  const done = i >= fila.length;
  const lead = fila[i];
  const msg = lead ? getMensagem(lead.id) : null;

  function enviarEAvancar() {
    if (!lead || !msg?.mensagem) return;
    const href = waLinkWithMessage(lead.phone, msg.mensagem);
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

            {loading && !msg?.mensagem ? (
              <div className="preview">
                <span>Gerando mensagem…</span>
                <pre className="dispatch-skeleton">
                  <span className="msg-gen-spinner" /> preparando abordagem…
                </pre>
              </div>
            ) : msg?.mensagem ? (
              <div className="preview">
                <span>
                  Mensagem que será aberta:
                  {msg.fonte === 'fallback' && (
                    <em className="dispatch-fallback-badge" title={msg.motivo || 'Motor indisponível'}>
                      ⚠️ fallback manual
                    </em>
                  )}
                </span>
                <pre>{msg.mensagem}</pre>
                {msg.proximaAcao && <p className="dispatch-next">💡 {msg.proximaAcao}</p>}
              </div>
            ) : (
              <div className="preview">
                <span>Não consegui gerar a mensagem.</span>
              </div>
            )}

            {usedFallback && (
              <p className="dispatch-hint dispatch-hint--warn">
                ⚠️ Algumas mensagens usaram o template manual (motor indisponível). Revise antes de enviar.
              </p>
            )}
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
            <button type="button" className="wa-btn dispatch-send" onClick={enviarEAvancar} disabled={loading && !msg?.mensagem}>
              💬 Abrir e marcar contatado →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
