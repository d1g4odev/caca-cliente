import { useEffect, useState } from 'react';

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
const fmtMoney = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function Tabela({ titulo, linhas }) {
  if (!linhas?.length) return null;
  const max = Math.max(1, ...linhas.map((l) => l.total));
  return (
    <div className="stats-block">
      <h3>{titulo}</h3>
      <table className="stats-table">
        <thead>
          <tr><th></th><th>Leads</th><th>Contatados</th><th>Ganhos</th><th>Conversão</th></tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              <td className="stats-key">{l.chave || '—'}</td>
              <td className="stats-barcell">
                <div className="bar-wrap">
                  <div className="bar" style={{ width: `${pct(l.total, max)}%` }} />
                  <span>{l.total}</span>
                </div>
              </td>
              <td>{l.contatado}</td>
              <td className="stats-ganho">{l.ganho}</td>
              <td>{pct(l.ganho, l.total)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Painel de conversão. Lê de /api/stats (que só responde com o banco ligado).
// Também recebe leads para métricas do funil (client-side).
function FunnelMetrics({ leads }) {
  const STAGES = ['novo', 'qualificado', 'contatado', 'ganho', 'descartado'];
  const LABELS = { novo: '🆕 Novo', qualificado: '🔍 Qualificado', contatado: '💬 Contatado', ganho: '✅ Ganho', descartado: '🗑️ Descartado' };
  const counts = {};
  let negociacaoValor = 0, ganhoValor = 0;
  for (const l of leads) {
    const stage = l.stage || 'novo';
    counts[stage] = (counts[stage] || 0) + 1;
    const v = Number(l.estimatedValue) || 0;
    if (stage === 'qualificado' || stage === 'contatado') negociacaoValor += v;
    if (stage === 'ganho') ganhoValor += v;
  }
  return (
    <div className="stats-block">
      <h3>🎯 Funil</h3>
      <table className="stats-table">
        <thead><tr><th>Estágio</th><th>Leads</th></tr></thead>
        <tbody>
          {STAGES.map((s) => (
            <tr key={s}>
              <td className="stats-key">{LABELS[s]}</td>
              <td className="stats-barcell">
                <div className="bar-wrap">
                  <div className="bar" style={{ width: `${pct(counts[s] || 0, leads.length)}%` }} />
                  <span>{counts[s] || 0}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="stats-cards" style={{ marginTop: 'var(--space-3)' }}>
        <div className="stats-card"><strong>{fmtMoney(negociacaoValor)}</strong><span>em negociação</span></div>
        <div className="stats-card stats-card--win"><strong>{fmtMoney(ganhoValor)}</strong><span>ganhos</span></div>
      </div>
    </div>
  );
}

export default function StatsPanel({ leads }) {
  const [data, setData] = useState(undefined); // undefined = carregando; null = sem banco

  useEffect(() => {
    let alive = true;
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => alive && setData(d.stats ?? null))
      .catch(() => alive && setData(null));
    return () => { alive = false; };
  }, []);

  if (data === undefined) return (
    <div className="stats-panel">
      {leads.length > 0 && <FunnelMetrics leads={leads} />}
      <p className="empty">Carregando painel…</p>
    </div>
  );

  const g = data?.geral || {};
  return (
    <div className="stats-panel">
      {leads.length > 0 && <FunnelMetrics leads={leads} />}
      <h2>📊 Painel de conversão</h2>
      <div className="stats-cards">
        <div className="stats-card"><strong>{g.total ?? 0}</strong><span>leads</span></div>
        <div className="stats-card"><strong>{g.contatado ?? 0}</strong><span>contatados</span></div>
        <div className="stats-card stats-card--win"><strong>{g.ganho ?? 0}</strong><span>ganhos</span></div>
        <div className="stats-card"><strong>{pct(g.ganho, g.total)}%</strong><span>conversão</span></div>
        <div className="stats-card"><strong>{g.buscas ?? 0}</strong><span>buscas</span></div>
        <div className="stats-card"><strong>{fmtMoney(g.pipeline_value)}</strong><span>no funil</span></div>
        <div className="stats-card stats-card--win"><strong>{fmtMoney(g.won_value)}</strong><span>fechado (R$)</span></div>
      </div>
      <Tabela titulo="Por nicho" linhas={data?.porNicho} />
      <Tabela titulo="Por cidade" linhas={data?.porCidade} />
    </div>
  );
}
