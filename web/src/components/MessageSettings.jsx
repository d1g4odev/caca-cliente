import { useEffect, useState } from 'react';
import {
  loadMsgConfig, saveMsgConfig, DEFAULT_MSG_CONFIG,
  beneficiosToText, beneficiosFromText, montarMensagem,
} from '../lib/whatsapp.js';

// Editor da mensagem de abordagem do WhatsApp. A config fica no navegador
// (localStorage) — cada um ajusta o pitch sem mexer no código.
export default function MessageSettings({ open, onClose }) {
  const [template, setTemplate] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [padrao, setPadrao] = useState('');
  const [seuNome, setSeuNome] = useState('');
  const [seuInstagram, setSeuInstagram] = useState('');
  const [portfolio1, setPortfolio1] = useState('');
  const [portfolio2, setPortfolio2] = useState('');

  useEffect(() => {
    if (!open) return;
    const cfg = loadMsgConfig();
    setTemplate(cfg.template);
    setBeneficios(beneficiosToText(cfg.beneficios));
    setPadrao(cfg.beneficioPadrao);
    setSeuNome(cfg.seuNome || '');
    setSeuInstagram(cfg.seuInstagram || '');
    setPortfolio1(cfg.portfolio1 || '');
    setPortfolio2(cfg.portfolio2 || '');
  }, [open]);

  if (!open) return null;

  const cfgAtual = {
    template,
    beneficios: beneficiosFromText(beneficios),
    beneficioPadrao: padrao,
    seuNome: seuNome.trim(),
    seuInstagram: seuInstagram.trim().replace(/^@/, ''),
    portfolio1: portfolio1.trim(),
    portfolio2: portfolio2.trim(),
  };
  const preview = montarMensagem('Studio Aurora', 'salão de estética', cfgAtual);

  function salvar() {
    saveMsgConfig(cfgAtual);
    onClose();
  }
  // Volta o pitch de fábrica NA TELA (sem tocar no storage — só persiste no
  // Salvar). Perfil (nome/Instagram) é preservado de propósito.
  function restaurar() {
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
          <div className="msg-settings-notice" role="note">
            <strong>ℹ️ Template manual = fallback.</strong> O <strong>gerador inteligente</strong> (botão
            "Gerar mensagem" no detalhe do lead, e o Modo Disparo) segue o <em>Manual Mestre Prospector</em> —
            saudação por primeiro nome (pessoa) ou abertura neutra (empresa), ângulo por nicho, sem "posso te
            mandar um áudio". Este template aqui só aparece quando o motor falha ou para personalização avançada.
          </div>
          <div className="field-row">
            <label className="field">
              <span>👤 Seu nome</span>
              <input type="text" value={seuNome} onChange={(e) => setSeuNome(e.target.value)} placeholder="Ex: João" />
            </label>
            <label className="field">
              <span>📷 Seu Instagram <em>(sem @)</em></span>
              <input type="text" value={seuInstagram} onChange={(e) => setSeuInstagram(e.target.value)} placeholder="Ex: joao.dev" />
            </label>
          </div>
          <span className="muted" style={{ margin: 0, fontSize: 12 }}>
            Preenche automaticamente o <code>[Seu nome]</code> e o <code>@[seu-instagram]</code> em TODAS as
            mensagens — do gerador inteligente, do Modo Disparo e do e-mail. Configure uma vez e esqueça.
          </span>
          <div className="field-row">
            <label className="field">
              <span>🔗 Site exemplo 1</span>
              <input type="url" value={portfolio1} onChange={(e) => setPortfolio1(e.target.value)} placeholder="https://meusite.com.br" />
            </label>
            <label className="field">
              <span>🔗 Site exemplo 2</span>
              <input type="url" value={portfolio2} onChange={(e) => setPortfolio2(e.target.value)} placeholder="https://outro-site.com.br" />
            </label>
          </div>
          <span className="muted" style={{ margin: 0, fontSize: 12 }}>
            Os <code>[link-1]</code> e <code>[link-2]</code> dos templates são substituídos automaticamente pelos sites acima.
          </span>
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
