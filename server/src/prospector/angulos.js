// Catálogo de ângulos de venda extraídos do Manual Mestre Prospector do Juninho
// (docs/manual-prospector.md, seção 2). Cada ângulo aponta o template de
// primeira abordagem e a próxima ação recomendada pelo fluxo do manual.

export const ANGULOS = {
  PERFIL_BONITO_SEM_SITE: 'perfil_bonito_sem_site',
  LINKTREE_FORA_DO_AR: 'linktree_fora_do_ar',
  LINK_SO_WHATSAPP: 'link_so_whatsapp',
  SEM_PRESENCA_DIGITAL: 'sem_presenca_digital',
  SAUDE_GERAL: 'saude_geral',
  ODONTOPEDIATRA: 'odontopediatra',
  ESTETICA_PROCEDIMENTOS: 'estetica_procedimentos',
  INSTITUTO_CLINICA: 'instituto_clinica',
  FOLLOW_UP: 'follow_up',
  OBJECAO_AGORA_NAO: 'objecao_agora_nao',
  OBJECAO_VO_PENSAR: 'objecao_vo_pensar',
  OBJECAO_MANDA_INSTAGRAM: 'objecao_manda_instagram',
  OBJECAO_SECRETARIA_ANALISA: 'objecao_secretaria_analiza',
  PRECO_PADRAO: 'preco_padrao',
  PRECO_CURTO: 'preco_curto',
  PORTFOLIO: 'portfolio',
  REUNIAO_ONLINE: 'reuniao_online',
  REUNIAO_PRESENCIAL: 'reuniao_presencial',
  FECHAMENTO_LEVE: 'fechamento_leve',
};

// Próxima ação conforme o estágio do Kanban e o tipo de mensagem gerada.
// Espelha o fluxo da seção 5 do manual: nunca pular direto para preço.
export const PROXIMAS_ACOES = {
  ABORDAGEM: 'Aguardar resposta. Se autorizar, enviar portfólio (1 a 3 links com contexto).',
  PORTFOLIO: 'Aguardar feedback. Se perguntar preço, apresentar valor antes do número.',
  PRECO: 'Reforçar pagamento único, sem mensalidade, com suporte e cartão. Oferecer prévia.',
  OBJECAO: 'Oferecer prévia de como ficaria o site para reduzir risco percebido.',
  FOLLOW_UP: 'Reenviar mensagem leve em 2-3 dias. Não insistir se lead descartado.',
  REUNIAO: 'Marcar reunião online rápida e montar prévia do site antes da data.',
  FECHAMENTO: 'Montar primeira prévia. Se gostar, seguir com projeto; senão, sem problema.',
};
