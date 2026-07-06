// Link mailto: com assunto e corpo prontos — 1ª abordagem por e-mail (sem risco
// de ban, ao contrário do WhatsApp em massa). Abre o cliente de e-mail do usuário.
const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const BENEFICIOS = [
  { kw: ['estetic', 'beleza', 'salao', 'barbear', 'manicure', 'cabelei', 'spa', 'unha'], txt: 'um site com agendamento online ajudaria a encher a agenda e atrair mais clientes' },
  { kw: ['restaurante', 'lanchonete', 'pizz', 'cafe', 'padaria', 'comida'], txt: 'um site com cardápio digital e pedidos facilitaria o delivery e traria mais clientes' },
  { kw: ['advog', 'jurid', 'contab', 'contador'], txt: 'um site profissional passaria mais credibilidade e captaria mais clientes' },
  { kw: ['clinic', 'medic', 'dent', 'odonto', 'fisio', 'psicol', 'nutri', 'saude'], txt: 'um site com agendamento atrairia mais pacientes e organizaria os atendimentos' },
  { kw: ['imobili', 'corretor', 'imovel'], txt: 'um site com os imóveis geraria mais contatos e fecharia mais negócios' },
];
const beneficio = (niche) => {
  const n = norm(niche);
  return (BENEFICIOS.find((b) => b.kw.some((k) => n.includes(k))) || {}).txt || 'um site profissional ajudaria a atrair mais clientes e automatizar o atendimento';
};

export function mailtoLink(email, nome, niche) {
  if (!email) return null;
  const assunto = `Um site para ${nome || 'o seu negócio'}?`;
  const corpo = `Olá! Tudo bem?

Sou o Lorenzo, desenvolvedor web. Conheci o ${nome || 'seu negócio'} e percebi que vocês ainda não têm um site — e ${beneficio(niche)}.

Posso te mandar algumas ideias rápidas, sem compromisso. Faz sentido conversarmos?

Abraço,
Lorenzo`;
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}
