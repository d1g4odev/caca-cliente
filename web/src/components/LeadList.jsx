import { useEffect, useRef } from 'react';
import LeadCard from './LeadCard.jsx';

export default function LeadList({ leads, selectedId, onSelect, onOpenDetails, loading }) {
  const refs = useRef({});

  // Clicou no pino do mapa → o card correspondente rola até ficar visível
  useEffect(() => {
    if (selectedId) refs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  if (loading) return <div className="empty">Consultando estabelecimentos…</div>;
  if (!leads.length) return <div className="empty">Faça uma busca para ver aqui os negócios sem site. 🗺️</div>;

  return (
    <div className="lead-list">
      {leads.map((lead) => (
        <div key={lead.id} ref={(el) => (refs.current[lead.id] = el)}>
          <LeadCard lead={lead} selected={lead.id === selectedId} onSelect={onSelect} onOpenDetails={onOpenDetails} />
        </div>
      ))}
    </div>
  );
}
