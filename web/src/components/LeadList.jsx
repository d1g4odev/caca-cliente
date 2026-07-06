import { useEffect, useRef } from 'react';
import LeadCard from './LeadCard.jsx';

function Skeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-line--w60" style={{ height: 14 }} />
      <div className="skeleton-line skeleton-line--w40" />
      <div className="skeleton-line skeleton-line--w80" />
      <div className="skeleton-line skeleton-line--w40" />
    </div>
  );
}

export default function LeadList({ leads, selectedId, onSelect, onOpenDetails, loading }) {
  const refs = useRef({});

  // Clicou no pino do mapa → o card correspondente rola até ficar visível
  useEffect(() => {
    if (selectedId) refs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  if (loading) {
    return (
      <div className="lead-list">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }
  if (!leads.length) {
    return (
      <div className="empty">
        <span className="empty-icon">🗺️</span>
        <p className="empty-title">Nenhum lead por aqui</p>
        <p className="empty-hint">Faça uma busca para ver os negócios sem site da sua região.</p>
      </div>
    );
  }

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
