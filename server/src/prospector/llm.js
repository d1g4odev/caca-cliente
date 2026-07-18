// Provider opcional de LLM para o gerador de mensagens. ATIVO APENAS quando
// PROSPECTOR_LLM_PROVIDER está definido — por padrão o sistema usa só os
// templates parametrizados (custo zero pro aluno, funciona offline).
//
// Mantém o estilo do manual: curto, natural, brasileiro de WhatsApp, sem
// textão, sem criticar o lead, sempre pedindo permissão antes de vender.
// O prompt instrui o modelo a seguir o manual; o template equivalente é
// usado como fallback quando a chamada falha ou retorna vazio.

const SYSTEM_PROMPT = `Você é o gerador de mensagens de abordagem do Caça-Cliente, baseado no Manual Mestre Prospector do Juninho.
Estilo OBRIGATÓRIO: curto, natural, brasileiro de WhatsApp. Profissional sem parecer formal demais. Sem textão. Sem prometer milagre. Sem criticar o lead. Sempre pedir permissão antes de vender ("posso te mostrar?", "faz sentido?").
Oferta padrão: site profissional personalizado (site institucional ou landing page) pra APRESENTAR o trabalho/serviço do lead — pagamento único de R$ 700,00, sem mensalidade, com suporte após entrega e cartão.
A oferta é SEMPRE site. NUNCA ofereça sistemas, agendamento online, pedidos online ou automação.
NUNCA comece falando preço. Primeiro venda valor.
Devolva APENAS a mensagem pronta para copiar e colar no WhatsApp, sem comentários, sem aspas, sem markdown.`;

export async function gerarComLLM(lead, tipo) {
  const provider = process.env.PROSPECTOR_LLM_PROVIDER;
  const apiKey = process.env.PROSPECTOR_LLM_API_KEY;
  const model = process.env.PROSPECTOR_LLM_MODEL || 'gpt-4o-mini';
  const endpoint = process.env.PROSPECTOR_LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    throw new Error('PROSPECTOR_LLM_PROVIDER definido mas PROSPECTOR_LLM_API_KEY ausente.');
  }

  const userPrompt = `Lead:
- Nome: ${lead.nome}
- Nicho: ${lead.nicho || 'não informado'}
- Cidade: ${lead.cidade || 'não informada'}
- Tem site: ${lead.temSite === null ? 'desconhecido' : lead.temSite ? 'sim' : 'não'}
- Tem Instagram: ${lead.temInstagram === null ? 'desconhecido' : lead.temInstagram ? 'sim' : 'não'}
- Link quebrado: ${lead.linkQuebrado ? 'sim' : 'não'}
- Estágio no Kanban: ${lead.estagio}

Tipo de mensagem desejada: ${tipo}

Gere a mensagem agora, seguindo o manual à risca.`;

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 400,
  };

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!r.ok) {
    throw new Error(`LLM HTTP ${r.status}: ${await r.text().catch(() => '')}`);
  }
  const data = await r.json();
  const mensagem = data?.choices?.[0]?.message?.content?.trim();
  return mensagem ? { mensagem } : null;
}
