// Formatação de moeda em BRL sem centavos (usado em Kanban, LeadCard, etc.)
export const fmtMoney = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Formatação compacta para valores grandes (ex: R$ 12,5k) — útil em headers de coluna
export const fmtMoneyCompact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1000) return `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return fmtMoney(n);
};
