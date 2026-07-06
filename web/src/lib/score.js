// Score de qualificação (0-100): quão bom prospecto é o lead p/ vender site.
// Como TODOS os leads já não têm site, o que diferencia é contactabilidade +
// sinais de presença online. (OSM não traz avaliações, então não entram aqui.)
export function leadScore(lead) {
  // Se o back (Turbina) já enviou lead.score, usa ele (precedência).
  if (typeof lead?.score === 'number') return Math.max(0, Math.min(100, lead.score));
  const e = lead?.enrichment || {};
  let s = 0;
  if (lead.phone) s += 30; // dá pra chamar no WhatsApp (canal principal de abordagem)
  if (e.instagram) s += 30; // tem Instagram mas não tem site = alvo ideal
  if (e.email) s += 20;
  if (e.facebook) s += 12;
  if (e.linkedin) s += 8;
  return Math.min(100, s);
}

export function scoreTier(score) {
  if (score >= 60) return { key: 'quente', label: 'Quente' };
  if (score >= 35) return { key: 'morno', label: 'Morno' };
  return { key: 'frio', label: 'Frio' };
}

// Token de cor da barra de score, por faixa
export function scoreBarClass(score) {
  if (score >= 60) return 'score-bar-fill--quente';
  if (score >= 35) return 'score-bar-fill--morno';
  return 'score-bar-fill--frio';
}
