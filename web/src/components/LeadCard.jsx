import { waLink } from '../lib/whatsapp.js';
import { mailtoLink } from '../lib/email.js';
import { leadScore, scoreTier, scoreBarClass } from '../lib/score.js';
import { fmtMoney } from '../lib/format.js';

const stop = (ev) => ev.stopPropagation();
const hoje = () => new Date().toISOString().slice(0, 10);

export default function LeadCard({ lead, selected, onSelect, onOpenDetails }) {
  const e = lead.enrichment;
  const wa = waLink(lead.phone, lead.name, lead.niche);
  const mail = mailtoLink(e?.email, lead.name, lead.niche);
  const score = leadScore(lead);
  const tier = scoreTier(score);
  const alvoIdeal = Boolean(e?.instagram); // sem site (todos são) + Instagram ativo = melhor prospecto
  const followVencido = lead.followUpAt && lead.followUpAt <= hoje();

  return (
    <article className={`card ${selected ? 'card--selected' : ''} ${alvoIdeal ? 'card--alvo' : ''} ${e?.discoveredWebsite ? 'card--has-site' : ''}`} onClick={() => onSelect(lead.id)}>
      <header>
        <h3>{lead.name}</h3>
        <span className="score-bar" title={`Score de prospecção: ${score}/100`}>
          <span className={`score score--${tier.key}`}>{tier.label}</span>
          <span className="score-bar-track">
            <span className={`score-bar-fill ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
          </span>
          <span className="muted" style={{ fontSize: 11 }}>{score}</span>
        </span>
      </header>
      {e?.discoveredWebsite && (
        <a className="badge-has-site" href={e.discoveredWebsite} target="_blank" rel="noreferrer" onClick={stop}
           title="O OpenStreetMap dizia que não tem site, mas o enriquecimento achou um. Provavelmente NÃO é um bom prospecto.">
          ⚠️ Site encontrado: {e.discoveredWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
        </a>
      )}
      {alvoIdeal && !e?.discoveredWebsite && (
        <span className="badge-alvo" title="Sem site, mas com Instagram ativo — alvo ideal para vender um site">
          🎯 Alvo ideal
        </span>
      )}
      {lead.rating != null && (
        <p className="muted">⭐ {lead.rating} ({lead.reviewsCount} avaliações)</p>
      )}
      <p className="muted">{lead.address}</p>
      {lead.phone && <p className="muted">📞 {lead.phone}</p>}

      {(lead.followUpAt || lead.estimatedValue != null || (lead.tags && lead.tags.length > 0)) && (
        <div className="crm-summary">
          {lead.followUpAt && (
            <span className={`crm-chip ${followVencido ? 'crm-chip--due' : ''}`} title="Data de retorno">
              🕑 {lead.followUpAt.split('-').reverse().join('/')}
            </span>
          )}
          {lead.estimatedValue != null && <span className="crm-chip" title="Valor estimado">💰 {fmtMoney(lead.estimatedValue)}</span>}
          {(lead.tags ?? []).map((t) => <span key={t} className="crm-chip crm-chip--tag">{t}</span>)}
        </div>
      )}

      <div className="card-actions">
        {wa && (
          <a className="wa-btn wa-btn--sm" href={wa} target="_blank" rel="noreferrer" onClick={stop}>💬 WhatsApp</a>
        )}
        {mail && (
          <a className="mail-btn" href={mail} onClick={stop}>✉️ E-mail</a>
        )}
        <button type="button" className="details-btn" onClick={(ev) => { stop(ev); onOpenDetails?.(lead.id); }}>📝 Detalhes</button>
      </div>

      <footer className="contacts">
        {lead.enrichmentStatus === 'pending' && <span className="chip chip--pending">🔎 buscando contatos…</span>}
        {lead.enrichmentStatus === 'not_found' && <span className="chip">nenhum contato encontrado</span>}
        {lead.enrichmentStatus === 'done' && e && (
          <>
            {e.email && (
              <a className="chip chip--ok" href={`mailto:${e.email}`} onClick={stop}>✉️ {e.email}</a>
            )}
            {e.instagram && (
              <a className="chip chip--ok" href={e.instagram} target="_blank" rel="noreferrer" onClick={stop}>📷 Instagram</a>
            )}
            {e.facebook && (
              <a className="chip" href={e.facebook} target="_blank" rel="noreferrer" onClick={stop}>Facebook</a>
            )}
            {e.linkedin && (
              <a className="chip" href={e.linkedin} target="_blank" rel="noreferrer" onClick={stop}>LinkedIn</a>
            )}
          </>
        )}
      </footer>
    </article>
  );
}
