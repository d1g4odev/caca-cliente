import { useMemo, useState } from 'react';
import { waLink, WA_LIMIT } from '../lib/whatsapp.js';
import { leadScore, scoreTier, scoreBarClass } from '../lib/score.js';
import { fmtMoneyCompact } from '../lib/format.js';

// Estágios do funil (espelham o back-end em enricher.js -> STAGES).
const STAGES = [
  { key: 'novo', label: 'Novo' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'contatado', label: 'Contatado' },
  { key: 'ganho', label: 'Ganho' },
  { key: 'descartado', label: 'Descartado' },
];

export default function KanbanBoard({ leads, selectedId, onSelect, onMove, onDispatch }) {
  const [overCol, setOverCol] = useState(null);
  const [chosen, setChosen] = useState(() => new Set()); // seleção p/ envio em massa

  const byStage = useMemo(() => {
    const m = Object.fromEntries(STAGES.map((s) => [s.key, []]));
    for (const l of leads) (m[l.stage] ?? m.novo).push(l);
    return m;
  }, [leads]);

  // Valor total estimado por coluna (soma de estimatedValue dos leads)
  const totalsByStage = useMemo(() => {
    const t = Object.fromEntries(STAGES.map((s) => [s.key, 0]));
    for (const l of leads) {
      const stage = l.stage && t[l.stage] != null ? l.stage : 'novo';
      t[stage] += Number(l.estimatedValue) || 0;
    }
    return t;
  }, [leads]);

  function toggleChoose(id) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= WA_LIMIT) {
        alert(`Máximo de ${WA_LIMIT} leads por envio — pra não derrubar seu WhatsApp.`);
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  function sendBulk() {
    const sel = leads.filter((l) => chosen.has(l.id));
    if (!sel.length) return;
    onDispatch?.(sel); // abre o Modo disparo (em sequência), sem despejar várias abas de uma vez
    setChosen(new Set());
  }

  return (
    <div className="kanban-wrap">
      <div className="kanban-toolbar">
        <span className="kanban-toolbar-info">
          <strong>{chosen.size}</strong>/{WA_LIMIT} selecionados
        </span>
        <button className="wa-btn" disabled={chosen.size === 0} onClick={sendBulk}>
          💬 Enviar no WhatsApp ({chosen.size})
        </button>
        {chosen.size > 0 && (
          <button className="link-btn" onClick={() => setChosen(new Set())}>
            limpar
          </button>
        )}
        <span className="kanban-toolbar-hint">marque a caixinha dos cards (até {WA_LIMIT}) para o envio em massa</span>
      </div>

      <div className="kanban">
        {STAGES.map((st) => (
          <section
            key={st.key}
            className={`kanban-col ${overCol === st.key ? 'kanban-col--over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (overCol !== st.key) setOverCol(st.key);
            }}
            onDragLeave={() => setOverCol((c) => (c === st.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) onMove(id, st.key);
            }}
          >
            <header className="kanban-col-head">
              <div className="kanban-col-head-left">
                <span>{st.label}</span>
                <span className="kanban-count">{byStage[st.key].length}</span>
              </div>
              {totalsByStage[st.key] > 0 && (
                <span className="kanban-col-value" title="Valor total estimado">{fmtMoneyCompact(totalsByStage[st.key])}</span>
              )}
            </header>
            <div className="kanban-cards">
              {byStage[st.key].map((l) => {
                const wa = waLink(l.phone, l.name, l.niche);
                const score = leadScore(l);
                const tier = scoreTier(score);
                return (
                  <article
                    key={l.id}
                    className={`kanban-card ${l.id === selectedId ? 'kanban-card--sel' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', l.id);
                      e.currentTarget.classList.add('kanban-card--dragging');
                    }}
                    onDragEnd={(e) => e.currentTarget.classList.remove('kanban-card--dragging')}
                    onClick={() => onSelect(l.id)}
                  >
                    {wa && (
                      <input
                        type="checkbox"
                        className="kanban-check"
                        title="selecionar para envio em massa"
                        checked={chosen.has(l.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleChoose(l.id)}
                      />
                    )}
                    <strong>{l.name}</strong>
                    <span className="score-bar" title={`Score ${score}/100`}>
                      <span className={`score score--${tier.key}`}>{tier.label}</span>
                      <span className="score-bar-track">
                        <span className={`score-bar-fill ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
                      </span>
                    </span>
                    {l.phone && <div className="muted">📞 {l.phone}</div>}
                    <div className="kanban-contacts">
                      {l.enrichmentStatus === 'pending' && <span className="dot dot--wait" title="buscando contatos…" />}
                      {l.enrichment?.email && <span title={l.enrichment.email}>✉️</span>}
                      {l.enrichment?.instagram && <span title="Instagram">📷</span>}
                      {l.enrichment?.facebook && <span title="Facebook">📘</span>}
                      {l.enrichment?.linkedin && <span title="LinkedIn">🔗</span>}
                      {l.enrichmentStatus === 'not_found' && (
                        <span className="muted" style={{ fontSize: 11 }}>sem contato</span>
                      )}
                    </div>
                    {wa && (
                      <a
                        className="wa-btn wa-btn--sm"
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </article>
                );
              })}
              {byStage[st.key].length === 0 && <div className="kanban-empty">arraste leads aqui</div>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
