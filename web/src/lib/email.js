// Link mailto: com assunto e corpo prontos — 1ª abordagem por e-mail (sem risco
// de ban, ao contrário do WhatsApp em massa). Abre o cliente de e-mail do usuário.
import { aplicarPerfil } from './whatsapp.js';

const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// A oferta é SEMPRE site / landing page / site institucional pra apresentar o
// trabalho — nunca sistema, agendamento, pedidos online ou automação.
const BENEFICIOS = [
  { kw: ['estetic', 'beleza', 'salao', 'barbear', 'manicure', 'cabelei', 'spa', 'unha'], txt: 'um site pra mostrar o trabalho de vocês, com fotos dos resultados e os serviços, atrairia muito mais clientes' },
  { kw: ['restaurante', 'lanchonete', 'pizz', 'cafe', 'padaria', 'comida'], txt: 'um site institucional pra apresentar o cardápio e o espaço de vocês traria mais clientes de quem procura no Google' },
  { kw: ['advog', 'jurid', 'contab', 'contador'], txt: 'um site institucional pra apresentar o escritório e os serviços passaria mais credibilidade e captaria mais clientes' },
  { kw: ['clinic', 'medic', 'dent', 'odonto', 'fisio', 'psicol', 'nutri', 'saude'], txt: 'um site profissional pra apresentar os atendimentos passaria mais confiança pra quem procura no Google' },
  { kw: ['imobili', 'corretor', 'imovel'], txt: 'um site pra apresentar a imobiliária e os imóveis em destaque geraria mais contatos e passaria mais profissionalismo' },
];
const beneficio = (niche) => {
  const n = norm(niche);
  return (BENEFICIOS.find((b) => b.kw.some((k) => n.includes(k))) || {}).txt || 'um site profissional (uma landing page bem feita) pra apresentar o trabalho de vocês passaria mais confiança e atrairia mais clientes';
};

export function mailtoLink(email, nome, niche) {
  if (!email) return null;
  const assunto = `Um site para ${nome || 'o seu negócio'}?`;
  const corpo = `Olá! Tudo bem?

Sou o [Seu nome], crio sites com IA. Conheci o ${nome || 'seu negócio'} e percebi que vocês ainda não têm um site — e ${beneficio(niche)}.

Posso te mandar algumas ideias rápidas, sem compromisso. Faz sentido conversarmos?

Abraço,
[Seu nome]`;
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(aplicarPerfil(corpo))}`;
}
