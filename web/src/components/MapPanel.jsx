import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { waLink } from '../lib/whatsapp.js';

// Pino via divIcon (CSS puro): a cor reflete o status do enriquecimento em
// tempo real E evita o problema clássico dos assets do ícone padrão do
// Leaflet em bundlers (Vite/Webpack).
function pinIcon(status, selected) {
  const cls = ['pin', `pin--${status}`, selected ? 'pin--selected' : ''].join(' ');
  return L.divIcon({ className: '', html: `<div class="${cls}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
}

// MapContainer ignora mudanças de `center` após montar (props imutáveis).
// Recentralizar é responsabilidade destes dois componentes imperativos:

function FitToResults({ leads, searchId }) {
  const map = useMap();
  useEffect(() => {
    if (!leads.length) return;
    map.fitBounds(L.latLngBounds(leads.map((l) => [l.lat, l.lng])), { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId]); // roda 1x por busca, não a cada update de lead
  return null;
}

function FlyToSelected({ lead }) {
  const map = useMap();
  useEffect(() => {
    if (!lead) return;
    map.flyTo([lead.lat, lead.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);
  return null;
}

function LeadMarker({ lead, selected, onSelect }) {
  const ref = useRef(null);
  const icon = useMemo(() => pinIcon(lead.enrichmentStatus, selected), [lead.enrichmentStatus, selected]);
  const wa = waLink(lead.phone, lead.name, lead.niche);

  useEffect(() => {
    if (selected) ref.current?.openPopup();
  }, [selected]);

  return (
    <Marker
      ref={ref}
      position={[lead.lat, lead.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(lead.id) }}
    >
      <Popup autoPan={false}>
        <strong>{lead.name}</strong>
        <br />
        {lead.phone ?? 'telefone não informado'}
        {lead.rating != null && (
          <>
            <br />⭐ {lead.rating} ({lead.reviewsCount} avaliações)
          </>
        )}
        {wa && (
          <>
            <br />
            <a href={wa} target="_blank" rel="noreferrer">
              💬 Chamar no WhatsApp
            </a>
          </>
        )}
      </Popup>
    </Marker>
  );
}

export default function MapPanel({ center, radiusKm, leads, selectedId, onSelect, searchId }) {
  const selected = leads.find((l) => l.id === selectedId);
  return (
    <MapContainer center={center} zoom={13} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {radiusKm && (
        <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#1f6feb', weight: 1, fillOpacity: 0.04 }} />
      )}
      {leads.map((l) => (
        <LeadMarker key={l.id} lead={l} selected={l.id === selectedId} onSelect={onSelect} />
      ))}
      <FitToResults leads={leads} searchId={searchId} />
      <FlyToSelected lead={selected} />
    </MapContainer>
  );
}
