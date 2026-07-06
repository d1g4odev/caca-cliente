import { useEffect, useState } from 'react';

const fmtData = (s) => { try { return new Date(s).toLocaleDateString('pt-BR'); } catch { return ''; } };

// Histórico de buscas salvas no banco. Clicar reabre a busca (re-hidrata do banco).
export default function HistoryPanel({ onOpen, onClose }) {
  const [items, setItems] = useState(undefined); // undefined = carregando
  const [dbEnabled, setDbEnabled] = useState(true); // assume ON até confirmar

  useEffect(() => {
    let alive = true;
    fetch('/api/searches')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setItems(d.searches ?? []);
        setDbEnabled(d.dbEnabled !== false); // só falso quando o back explicita
      })
      .catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>🕑 Buscas anteriores</h2>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="modal-body">
          {items === undefined && <p className="empty">Carregando…</p>}

          {/* Banco DESATIVADO: explica que o histórico precisa de persistência */}
          {items !== undefined && !dbEnabled && (
            <div className="db-warning">
              <strong>⚠️ Banco de dados desativado nesta máquina.</strong>
              <p>
                O histórico de buscas exige PostgreSQL. Aqui sem banco, cada busca vive só em
                memória do servidor por <strong>30 minutos</strong> e some quando o servidor reinicia.
                A busca atual ainda volta após o F5 (cache no navegador), mas buscas antigas se perdem.
              </p>
              <p className="muted">
                Para ativar: crie <code>server/.env</code> com{' '}
                <code>DATABASE_URL=postgresql://usuario:senha@host:5432/banco</code> e reinicie a API.
              </p>
            </div>
          )}

          {/* Banco ATIVADO mas sem buscas ainda */}
          {items && items.length === 0 && dbEnabled && (
            <p className="empty">Nenhuma busca salva ainda. Faça uma busca para começar.</p>
          )}

          {items && items.length > 0 && (
            <ul className="history-list">
              {items.map((s) => (
                <li key={s.id} className="history-item" onClick={() => onOpen(s.id)}>
                  <div>
                    <strong className="history-niche">{s.niche}</strong> · {s.city || '—'}
                    <div className="muted">{s.leads} leads · {s.enriched} enriquecidos · {fmtData(s.created_at)}</div>
                  </div>
                  <span className="history-open">Abrir →</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
