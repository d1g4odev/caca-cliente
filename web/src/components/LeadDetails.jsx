import { useEffect, useState } from 'react';
import { waLinkWithMessage } from '../lib/whatsapp.js';

// Detalhes/CRM de um lead: anotações, data de retorno (follow-up), tags e valor
// estimado. Salva via PATCH (que persiste no banco quando configurado).
// Inclui gerador de mensagem via IA (POST /api/leads/:leadId/message — Turbina).
const TAGS_SUGERIDAS = ['interessado', 'sem orçamento', 'follow-up', 'pediu proposta', 'fechou', 'sem interesse'];

export default function LeadDetails({ lead, searchId, onSave, onClose }) {
  const [notes, setNotes] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [tags, setTags] = useState([]);
  const [value, setValue] = useState('');

  // Estado do gerador de mensagem
  const [msgState, setMsgState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [msgData, setMsgData] = useState(null); // { mensagem, angulo, tipo, proximaAcao }
  const [msgError, setMsgError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setNotes(lead.notes ?? '');
    setFollowUpAt(lead.followUpAt ?? '');
    setTags(lead.tags ?? []);
    setValue(lead.estimatedValue != null ? String(lead.estimatedValue) : '');
    // reset gerador ao trocar de lead
    setMsgState('idle');
    setMsgData(null);
    setMsgError('');
    setCopied(false);
  }, [lead]);

  if (!lead) return null;

  const toggleTag = (t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  async function gerarMensagem() {
    setMsgState('loading');
    setMsgError('');
    setCopied(false);
    try {
      const url = `/api/leads/${encodeURIComponent(lead.id)}/message${searchId ? `?searchId=${encodeURIComponent(searchId)}` : ''}`;
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${r.status} ao gerar mensagem`);
      }
      const data = await r.json();
      setMsgData(data);
      setMsgState('success');
    } catch (e) {
      setMsgError(e.message || 'Não consegui gerar a mensagem.');
      setMsgState('error');
    }
  }

  async function copiarMensagem() {
    if (!msgData?.mensagem) return;
    try {
      await navigator.clipboard.writeText(msgData.mensagem);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: seleciona o <pre> manualmente
      const pre = document.getElementById('msg-gen-pre');
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  function abrirWhatsApp() {
    if (!msgData?.mensagem) return;
    const href = waLinkWithMessage(lead.phone, msgData.mensagem);
    if (href) window.open(href, '_blank', 'noopener');
  }

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

          {/* Gerador de mensagem via IA (Turbina) */}
          <div className="msg-gen">
            <div className="msg-gen-head">
              <span className="msg-gen-title">✨ Mensagem de abordagem</span>
              <button
                type="button"
                className="msg-gen-btn"
                onClick={gerarMensagem}
                disabled={msgState === 'loading'}
              >
                {msgState === 'loading' ? (
                  <>
                    <span className="msg-gen-spinner" /> Gerando…
                  </>
                ) : msgState === 'success' ? 'Gerar novamente' : 'Gerar mensagem'}
              </button>
            </div>

            {msgState === 'error' && (
              <div className="msg-gen-error" role="alert">
                <span>⚠️ {msgError}</span>
                <button type="button" className="link-btn" onClick={gerarMensagem} style={{ color: 'var(--danger)' }}>Tentar de novo</button>
              </div>
            )}

            {msgState === 'success' && msgData && (
              <>
                {msgData.angulo && (
                  <span className="muted" style={{ margin: 0, fontSize: 12 }}>
                    Ângulo: <strong style={{ color: 'var(--text)' }}>{msgData.angulo}</strong>
                    {msgData.tipo && <> · tipo: <strong style={{ color: 'var(--text)' }}>{msgData.tipo}</strong></>}
                  </span>
                )}
                <div className="msg-gen-preview">
                  <pre id="msg-gen-pre">{msgData.mensagem}</pre>
                </div>
                {msgData.proximaAcao && (
                  <span className="muted" style={{ margin: 0, fontSize: 12 }}>
                    💡 {msgData.proximaAcao}
                  </span>
                )}
                <div className="msg-gen-actions">
                  <button type="button" className="btn-secondary" onClick={copiarMensagem}>
                    {copied ? '✓ Copiado!' : '📋 Copiar'}
                  </button>
                  {lead.phone && (
                    <button type="button" className="btn-secondary" onClick={abrirWhatsApp} style={{ color: 'var(--wa)', borderColor: 'var(--wa)' }}>
                      💬 Abrir no WhatsApp
                    </button>
                  )}
                </div>
              </>
            )}

            {msgState === 'idle' && (
              <span className="muted" style={{ margin: 0, fontSize: 12 }}>
                Gera uma mensagem pronta para copiar e colar no WhatsApp, baseada no estágio do lead.
              </span>
            )}
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
