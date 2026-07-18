import { useState } from 'react';
import { saveMsgConfig, loadMsgConfig } from '../lib/whatsapp.js';

// Modal de boas-vindas na primeira visita. Pede o perfil do aluno pra
// personalizar as mensagens, e os links de portfólio (opcionais). Tudo
// salvo no localStorage via saveMsgConfig.
export default function Onboarding({ onDone }) {
  const [nome, setNome] = useState('');
  const [instagram, setInstagram] = useState('');
  const [portfolio1, setPortfolio1] = useState('');
  const [portfolio2, setPortfolio2] = useState('');

  function começar() {
    const cfg = loadMsgConfig();
    cfg.seuNome = nome.trim();
    cfg.seuInstagram = instagram.trim().replace(/^@/, '');
    cfg.portfolio1 = portfolio1.trim();
    cfg.portfolio2 = portfolio2.trim();
    saveMsgConfig(cfg);
    onDone();
  }

  function pular() {
    // Salva config vazia pra não reaparecer
    saveMsgConfig(loadMsgConfig());
    onDone();
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--space-6) var(--space-5)', gap: 'var(--space-4)', alignItems: 'center' }}>
          <img src="/brand/icon.png" alt="" width={72} height={72}
               style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--shadow-md)' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', fontWeight: 700 }}>Bem-vindo ao Caça-Cliente!</h2>
            <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-muted)', fontSize: 'var(--font-base)' }}>
              Antes de começar, me conta seu nome e Instagram — isso
              personaliza automaticamente suas mensagens de abordagem.
            </p>
          </div>

          <label className="field" style={{ width: '100%', textAlign: 'left' }}>
            <span>👤 Seu nome</span>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                   placeholder="Ex: João" />
          </label>
          <label className="field" style={{ width: '100%', textAlign: 'left' }}>
            <span>📷 Seu Instagram <em>(sem @)</em></span>
            <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)}
                   placeholder="Ex: joao.dev" />
          </label>

          <div className="field-row" style={{ width: '100%' }}>
            <label className="field" style={{ textAlign: 'left' }}>
              <span>🔗 Site exemplo 1 <em>(opcional)</em></span>
              <input type="url" value={portfolio1} onChange={(e) => setPortfolio1(e.target.value)}
                     placeholder="https://meusite.com.br" />
            </label>
            <label className="field" style={{ textAlign: 'left' }}>
              <span>🔗 Site exemplo 2 <em>(opcional)</em></span>
              <input type="url" value={portfolio2} onChange={(e) => setPortfolio2(e.target.value)}
                     placeholder="https://outro-site.com.br" />
            </label>
          </div>

          <span className="muted" style={{ fontSize: 12, margin: 0 }}>
            💡 Você pode editar tudo isso depois no botão <strong>✏️ Editar mensagem</strong>.
          </span>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn-secondary" onClick={pular}>Pular</button>
            <button type="button" className="btn-primary" onClick={começar}>Começar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
