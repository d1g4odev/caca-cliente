// Templates parametrizados extraídos do Manual Mestre Prospector do Juninho
// (docs/manual-prospector.md). Cada template é uma função pura que recebe o
// contexto do lead e devolve a string pronta para copiar e colar no WhatsApp.
//
// Estilo obrigatório (manual, seção 1): curto, natural, brasileiro de WhatsApp,
// profissional sem parecer formal demais. Sem textão. Sem criticar o lead.
// Sempre pedir permissão antes de vender: "posso te mostrar?", "faz sentido?".

import { saudacao as saudacaoInteligente, extrairPrimeiroNomePessoa, detectarTipoNome } from './nome.js';

// Saudação unificada: detecta PESSOA vs EMPRESA e extrai primeiro nome
// preservando Dr./Dra. Pessoa -> "Oi, Carmem! Tudo bem?". Empresa -> "Oi, tudo bem?".
const saudacao = (nome) => saudacaoInteligente(nome);

// Primeiro nome para uso inline (ex: "Entendo, Carmem."). Pessoa -> primeiro
// nome (com Dr./Dra. se houver). Empresa -> vazio (abertura sem nome).
const primeiroNomeOuVazio = (nome) => {
  const { tipo, primeiroNome } = detectarTipoNome(nome);
  if (tipo !== 'pessoa') return '';
  return primeiroNome;
};

// ─── Primeira abordagem (manual seção 3 e 4) ────────────────────────────────

// Perfil bonito, sem site — ângulo genérico para profissional da saúde.
export const perfilBonitoSemSite = (lead) => {
  const { nome } = lead;
  return [
    saudacao(nome),
    'Vi seu perfil pelo Instagram e achei muito profissional. Dá pra perceber um cuidado grande com a imagem e com o conteúdo.',
    'Sou desenvolvedor de software e trabalho com sites personalizados para profissionais da saúde.',
    'Acredito que um site próprio poderia valorizar ainda mais seu trabalho, apresentar melhor seus serviços e passar mais confiança para quem chega pelo Instagram ou Google.',
    'Posso te mostrar uma ideia rápida?',
  ].join('\n');
};

// Linktree fora do ar — oportunidade concreta de não perder contato.
export const linktreeForaDoAr = (lead) => {
  const { nome } = lead;
  return [
    saudacao(nome),
    'Vi seu perfil pelo Instagram e achei muito bonito e profissional. Só notei que o Linktree da bio parece não estar funcionando.',
    'Sou desenvolvedor e faço sites personalizados para profissionais da saúde. Acredito que um site próprio poderia deixar sua presença digital mais organizada e no mesmo nível do seu perfil.',
    'Posso te mostrar uma ideia rápida?',
  ].join('\n');
};

// Link só para WhatsApp — ajuda, mas site apresenta melhor antes da pessoa chamar.
export const linkSoWhatsapp = (lead) => {
  const { nome } = lead;
  return [
    saudacao(nome),
    'Vi seu perfil pelo Instagram e achei bem profissional. Vi que hoje o link da bio leva direto para o WhatsApp, o que ajuda bastante no contato.',
    'Mas acredito que um site próprio poderia valorizar ainda mais sua imagem, apresentar melhor seus procedimentos e facilitar para pacientes encontrarem você no Google.',
    'Posso te mostrar alguns trabalhos que já desenvolvi?',
  ].join('\n');
};

// Odontopediatra — nicho específico do manual (seção 4).
export const odontopediatra = (lead) => {
  const { nome } = lead;
  return [
    saudacao(nome),
    'Conheci seu perfil pelo Instagram e achei muito bonito, leve e profissional. Dá pra perceber um cuidado grande com a imagem e com o público infantil.',
    'Acredito que um site próprio poderia ajudar bastante a apresentar seus diferenciais com mais clareza e passar ainda mais confiança para os pais que chegam até você.',
    'Sou desenvolvedor e faço sites personalizados para profissionais da saúde. Posso te mostrar uma ideia rápida?',
  ].join('\n');
};

// Estética, harmonização ou procedimentos específicos (seção 4).
export const esteticaProcedimentos = (lead) => {
  const { nome } = lead;
  return [
    saudacao(nome),
    'Vi seu anúncio no Instagram e achei muito interessante o seu trabalho, principalmente por ser algo específico e com bastante apelo visual.',
    'Seu perfil passa profissionalismo, mas um site próprio poderia valorizar ainda mais sua imagem, explicar melhor os procedimentos e passar mais confiança para quem te conhece pelo anúncio.',
    'Posso te mostrar uma ideia rápida de como isso poderia funcionar para o seu trabalho?',
  ].join('\n');
};

// Instituto, clínica ou qualquer EMPRESA com setor administrativo (seção 4).
// Abertura neutra porque o lead é empresa — saudação inteligente devolve
// "Oi, tudo bem?". Funciona pra barbearia, ótica, pizzaria, instituto, etc.
export const institutoClinica = (lead) => {
  const { nome } = lead;
  return [
    saudacao(nome),
    'Me chamo [Seu nome], sou desenvolvedor de software. Entrei em contato pelo Instagram e me passaram esse número para falar com o setor administrativo.',
    'Queria apresentar uma ideia simples: o perfil de vocês é muito profissional, e acredito que um site próprio, bem construído e no mesmo nível da imagem que vocês já passam, poderia fortalecer ainda mais a presença digital.',
    'Posso te mostrar alguns trabalhos que já desenvolvi?',
  ].join('\n');
};

// ─── Portfólio (manual seção 5) ──────────────────────────────────────────────

// Quando o lead autoriza enviar trabalhos: 1 a 3 links com contexto, nunca seco.
export const portfolio = (_lead) => [
  'Perfeito, obrigado.',
  'Vou te mandar dois exemplos de sites que desenvolvi, só para você ter uma ideia da qualidade visual, organização e estilo de entrega.',
  'Esse primeiro é de uma médica aqui de Santiago. A proposta foi criar um site profissional, elegante e focado em transmitir confiança:',
  '[link]',
  'Esse segundo tem uma pegada mais visual e institucional:',
  '[link]',
  'A ideia para o seu trabalho seria algo personalizado para sua área, apresentando seus serviços, diferenciais, localização, contato e informações importantes de forma mais profissional.',
].join('\n');

// ─── Preço (manual seção 6) ──────────────────────────────────────────────────

// Preço padrão R$ 700 — versão completa (não responder seco).
export const precoPadrao = (_lead) => [
  'O investimento para um site profissional nesse estilo fica em R$ 700,00, pagamento único.',
  'Não tem mensalidade. O site fica seu, com uma estrutura personalizada para apresentar melhor seu trabalho, procedimentos, localização, contato direto pelo WhatsApp e passar mais confiança para quem chega pelo Instagram ou pelo Google.',
  'Também aceito cartão, se preferir.',
  'E depois da entrega você não fica desamparada. Sigo dando suporte para ajustes simples e orientação.',
].join('\n');

// Versão curta do preço.
export const precoCurto = (_lead) => [
  'O site profissional fica em R$ 700,00, pagamento único.',
  'Sem mensalidade, com suporte depois da entrega e posso fazer no cartão também.',
  'A ideia é deixar sua presença mais profissional no Instagram e no Google, com informações, localização, procedimentos e botão direto para WhatsApp.',
].join('\n');

// ─── Objeções (manual seção 7) ──────────────────────────────────────────────

export const objecaoAgoraNao = (lead) => {
  const { nome } = lead;
  const pn = primeiroNomeOuVazio(nome);
  return [
    pn ? `Entendo, ${pn}.` : 'Entendo.',
    'Só pra deixar claro: não é só o site. Inclui também organizar sua presença para aparecer melhor no Google quando alguém pesquisar pelo seu serviço.',
    'O valor fica R$ 700,00, pagamento único, sem mensalidade e com suporte depois.',
    'Pelo tipo de procedimento que você oferece, um cliente novo já pode pagar esse investimento. Sem pressão, mas acredito que faria bastante sentido pro seu trabalho.',
  ].join('\n');
};

export const objecaoVouPensar = (_lead) => [
  'Claro, sem problema.',
  'Pra facilitar, posso montar uma prévia simples de como ficaria o seu site. Assim você consegue visualizar melhor antes de decidir.',
].join('\n');

// [seu-instagram] é placeholder: o aluno troca pelo @ dele antes de enviar.
export const objecaoMandaInstagram = (_lead) => [
  'Meu Instagram pessoal é @[seu-instagram]. Ainda estou organizando o perfil da marca, então por enquanto uso esse.',
  'Se fizer sentido pra você, podemos agendar uma reunião online rápida. Até lá, eu já monto uma prévia de como poderia ficar o seu site, para você visualizar melhor a ideia.',
].join('\n');

export const objecaoSecretariaAnalisa = (lead) => {
  const { nome } = lead;
  const pn = primeiroNomeOuVazio(nome);
  return [
    pn ? `Claro, ${pn}. Sem problema.` : 'Claro, sem problema.',
    'Fiquem à vontade para analisar com calma. Obrigado pela atenção e fico à disposição caso queiram conversar melhor sobre a ideia.',
  ].join('\n');
};

// ─── Reunião, prévia e fechamento (manual seção 8) ──────────────────────────

export const reuniaoOnline = (_lead) => [
  'Se fizer sentido pra você, podemos agendar uma reunião online rápida.',
  'Até lá, eu já monto uma prévia de como poderia ficar o seu site, assim você não precisa imaginar do zero e já consegue visualizar uma ideia mais pronta para o seu trabalho.',
].join('\n');

export const reuniaoPresencial = (_lead) => [
  'Se preferirem, podemos marcar uma reunião presencial rápida para eu apresentar melhor a ideia, entender como vocês trabalham hoje e mostrar como um site institucional, feito pra apresentar o trabalho e os serviços de vocês, poderia ajudar.',
].join('\n');

export const fechamentoLeve = (_lead) => [
  'Acredito que faz bastante sentido para o seu trabalho.',
  'Posso montar a primeira prévia e te apresentar. Se você gostar, seguimos com o projeto; se não fizer sentido, sem problema nenhum.',
].join('\n');

// ─── Follow-up (manual seção 9, regra 4) ────────────────────────────────────

// Quando o lead está parado no Kanban (contatado sem resposta há dias).
export const followUp = (lead) => {
  const { nome } = lead;
  return [
    saudacao(nome),
    'Voltei aqui pra saber se você teve oportunidade de ver a ideia que mandei. Sem pressa nenhuma — se fizer sentido, a gente retoma; se não, tudo certo também.',
    'Se quiser, posso montar uma prévia simples de como ficaria o seu site, pra você visualizar melhor.',
  ].join('\n');
};
