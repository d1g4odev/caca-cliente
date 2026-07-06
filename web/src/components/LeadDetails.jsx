import { useEffect, useState } from 'react';

// Detalhes/CRM de um lead: anotações, data de retorno (follow-up), tags e valor
// estimado. Salva via PATCH (que persiste no banco quando configurado).
const TAGS_SUGERIDAS = ['interessado', 'sem orçamento', 'follow-up', 'pediu proposta', 'fechou', 'sem interesse'];

export default function LeadDetails({ lead, onSave, onClose }) {
  const [notes, setNotes] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [tags, setTags] = useState([]);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!lead) return;
    setNotes(lead.notes ?? '');
    setFollowUpAt(lead.followUpAt ?? '');
    setTags(lead.tags ?? []);
    setValue(lead.estimatedValue != null ? String(lead.estimatedValue) : '');
  }, [lead]);

  if (!lead) return null;

  const toggleTag = (t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  function salvar() {
    onSave({ notes, followUpAt: followUpAt || null, tags, estimatedValue: value === '' ? null : Number(value) });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{lead.name}</h2>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="modal-body">
          <label className="field">
            <span>📝 Anotações</span>
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: liguei dia 12, pediu pra retornar quinta de manhã..." />
          </label>
          <div className="field-row">
            <label className="field">
              <span>🕑 Retornar em</span>
              <input type="date" value={followUpAt ?? ''} onChange={(e) => setFollowUpAt(e.target.value)} />
            </label>
            <label className="field">
              <span>💰 Valor estimado (R$)</span>
              <input type="number" min="0" step="50" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            </label>
          </div>
          <div className="field">
            <span>🏷️ Tags</span>
            <div className="tag-picker">
              {TAGS_SUGERIDAS.map((t) => (
                <button type="button" key={t} className={`tag-chip ${tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <footer className="modal-foot">
          <span className="spacer" />
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={salvar}>Salvar</button>
        </footer>
      </div>
    </div>
  );
}
