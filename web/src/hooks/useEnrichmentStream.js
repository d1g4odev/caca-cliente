import { useEffect, useRef } from 'react';

// Consome o stream SSE de uma busca. O EventSource reconecta sozinho se a
// conexão cair, e o servidor faz replay do que já foi enriquecido ao
// (re)conectar — nenhum evento se perde.
export function useEnrichmentStream(searchId, onEvent) {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!searchId) return;
    const es = new EventSource(`/api/search/${searchId}/stream`);
    es.addEventListener('enrichment', (e) => cb.current(JSON.parse(e.data)));
    es.addEventListener('done', () => es.close());
    return () => es.close();
  }, [searchId]);
}
