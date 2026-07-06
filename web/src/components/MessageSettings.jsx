import { useEffect, useState } from 'react';
import {
  loadMsgConfig, saveMsgConfig, resetMsgConfig, DEFAULT_MSG_CONFIG,
  beneficiosToText, beneficiosFromText, montarMensagem,
} from '../lib/whatsapp.js';

// Editor da mensagem de abordagem do WhatsApp. A config fica no navegador
// (localStorage) — cada um ajusta o pitch sem mexer no código.
export default function MessageSettings({ open, onClose }) {
  const [template, setTemplate] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [padrao, setPadrao] = useState('');

  useEffect(() => {
    if (!open) return;
    const cfg = loadMsgConfig();
    setTemplate(cfg.template);
    setBeneficios(beneficiosToText(cfg.beneficios));
    setPadrao(cfg.beneficioPadrao);
  }, [open]);

  if (!open) return null;

  const cfgAtual = { template, beneficios: beneficiosFromText(beneficios), beneficioPadrao: padrao };
  const preview = montarMensagem('Studio Aurora', 'salão de estética', cfgAtual);

  function salvar() {
    saveMsgConfig(cfgAtual);
    onClose();
  }
  function restaurar() {
    resetMsgConfig();
    setTemplate(DEFAULT_MSG_CONFIG.template);
    setBeneficios(beneficiosToText(DEFAULT_MSG_CONFIG.beneficios));
    setPadrao(DEFAULT_MSG_CONFIG.beneficioPadrao);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>✏️ Mensagem do WhatsApp</h2>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="modal-body">
          <label className="field">
            <span>Modelo da mensagem <em>(use {'{nome}'} e {'{beneficio}'})</em></span>
            <textarea rows={7} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </label>
          <label className="field">
            <span>Benefício por nicho <em>(1 por linha: palavras-chave =&gt; texto)</em></span>
            <textarea rows={6} value={beneficios} onChange={(e) => setBeneficios(e.target.value)} />
          </label>
          <label className="field">
            <span>Benefício padrão <em>(quando nenhum nicho casa)</em></span>
            <textarea rows={2} value={padrao} onChange={(e) => setPadrao(e.target.value)} />
          </label>
          <div className="preview">
            <span>Prévia — exemplo "Studio Aurora" (estética)</span>
            <pre>{preview}</pre>
          </div>
        </div>
        <footer className="modal-foot">
          <button type="button" className="link-btn" onClick={restaurar}>Restaurar padrão</button>
          <span className="spacer" />
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={salvar}>Salvar</button>
        </footer>
      </div>
    </div>
  );
}
