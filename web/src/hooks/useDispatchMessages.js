import { useCallback, useEffect, useRef, useState } from 'react';
import { mensagemFallbackManual } from '../lib/nome.js';

// Hook que gerencia a geração de mensagens para o Modo Disparo.
// Estratégia (em ordem de preferência):
//   1) POST /api/search/:searchId/messages/batch  (lote — mais eficiente)
//   2) POST /api/leads/:leadId/message             (individual, com cache em sessão)
//   3) Fallback para template legado (montarMensagem) com aviso visual discreto
//
// Cache: Map<leadId, {mensagem, angulo, proximaAcao, fonte}> — não rebusca o
// mesmo lead na mesma sessão do modal.
//
// fonte: 'motor' | 'fallback'  (para o aviso visual)
export function useDispatchMessages({ searchId, leads }) {
  const cache = useRef(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Pré-gera mensagens para todos os leads da fila via endpoint de lote.
  // Chama uma única vez ao montar o modal (ou quando a fila muda).
  useEffect(() => {
    if (!leads?.length) return;
    let cancelled = false;

    async function gerarLote() {
      setLoading(true);
      setError(null);
      // Marcador de "carregando" no cache para cada lead
      for (const l of leads) {
        if (!cache.current.has(l.id)) cache.current.set(l.id, { loading: true });
      }

      // Tenta o endpoint de lote primeiro (chunk de 50 — limite do servidor, 413 se exceder)
      if (searchId) {
        try {
          const ids = leads.map((l) => l.id);
          const CHUNK = 50;
          const chunks = [];
          for (let k = 0; k < ids.length; k += CHUNK) chunks.push(ids.slice(k, k + CHUNK));

          for (const chunk of chunks) {
            if (cancelled) return;
            const r = await fetch(`/api/search/${encodeURIComponent(searchId)}/messages/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tipo: 'abordagem', leadIds: chunk }),
            });
            if (r.ok) {
              const data = await r.json();
              if (cancelled) return;
              for (const g of data.geracoes || []) {
                cache.current.set(g.leadId, {
                  mensagem: g.mensagem,
                  angulo: g.angulo,
                  proximaAcao: g.proximaAcao,
                  fonte: 'motor',
                });
              }
              for (const f of data.falhas || []) {
                // Falha individual dentro do lote — cai no fallback
                const lead = leads.find((l) => l.id === f.leadId);
                if (lead) aplicarFallback(lead, f.erro);
              }
            } else if (r.status !== 404 && r.status !== 501) {
              throw new Error(`Lote falhou: ${r.status}`);
            } else {
              // 404/501 = endpoint de lote ainda não implementado pelo Turbina → cai no individual
              break;
            }
          }
          if (!cancelled) {
            setLoading(false);
            return;
          }
        } catch {
          // cai para o endpoint individual abaixo
        }
      }

      // Fallback: endpoint individual com cache
      await gerarIndividual(leads, cancelled);
    }

    async function gerarIndividual(lista, cancelled) {
      try {
        await Promise.all(
          lista.map(async (lead) => {
            if (cancelled) return;
            if (cache.current.has(lead.id) && !cache.current.get(lead.id).loading) return;
            try {
              const url = `/api/leads/${encodeURIComponent(lead.id)}/message${searchId ? `?searchId=${encodeURIComponent(searchId)}` : ''}`;
              const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const data = await r.json();
              if (!cancelled) {
                cache.current.set(lead.id, {
                  mensagem: data.mensagem,
                  angulo: data.angulo,
                  proximaAcao: data.proximaAcao,
                  fonte: 'motor',
                });
              }
            } catch {
              if (!cancelled) aplicarFallback(lead);
            }
          })
        );
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      }
    }

    function aplicarFallback(lead, motivo) {
      cache.current.set(lead.id, {
        mensagem: mensagemFallbackManual(lead.name, lead.niche),
        angulo: null,
        proximaAcao: null,
        fonte: 'fallback',
        motivo,
      });
      setUsedFallback(true);
    }

    gerarLote();
    return () => {
      cancelled = true;
    };
  }, [searchId, leads]);

  const getMensagem = useCallback((leadId) => cache.current.get(leadId), []);

  return { loading, error, usedFallback, getMensagem };
}
