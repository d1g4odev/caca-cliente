# Spec — Endpoint Gerador de Mensagens de Abordagem

> Gera mensagens prontas para copiar e colar no WhatsApp, seguindo o
> [Manual Mestre Prospector do Juninho](./manual-prospector.md).
> Motor puro em `server/src/prospector/` (templates parametrizados, custo zero,
> funciona offline). Provider de LLM opcional via variável de ambiente.

## Endpoint

```
POST /api/leads/:leadId/message
```

### Path params

| Campo    | Tipo   | Descrição                                  |
|----------|--------|--------------------------------------------|
| `leadId` | string | ID do lead (chave primária composta por `search_id` + `lead_id` no banco) |

### Query params (opcional)

| Campo       | Tipo   | Default       | Descrição                                                                 |
|-------------|--------|---------------|---------------------------------------------------------------------------|
| `searchId`  | string | —             | Necessário porque `leadId` só é único dentro de uma busca (sessão Kanban). |
| `tipo`      | string | inferido      | Tipo de mensagem desejada (ver catálogo abaixo).                          |

### Body (opcional — sobrescreve campos do lead)

Quando o lead não está no banco (sessão expirou) ou o usuário quer gerar uma
mensagem para um lead hipotético, o body pode trazer os campos do lead
diretamente. Campos do body têm prioridade sobre os persistidos.

```json
{
  "nome": "Dra. Marina",
  "nicho": "odontopediatria",
  "cidade": "Santiago",
  "temSite": false,
  "temInstagram": true,
  "linkQuebrado": false,
  "estagio": "novo",
  "instagram": "dra.marina",
  "tipo": "abordagem"
}
```

## Catálogo de tipos de mensagem

| `tipo`                  | Quando usar                                              | Ângulo do manual            |
|-------------------------|----------------------------------------------------------|-----------------------------|
| `abordagem`             | Primeira mensagem para lead novo                         | Seção 3 ou 4 (auto-seleção) |
| `follow_up`             | Lead parado em `contatado` sem resposta                  | Seção 9, regra 4            |
| `portfolio`             | Lead autorizou receber exemplos                          | Seção 5                     |
| `preco`                 | Lead perguntou preço                                     | Seção 6                     |
| `objecao_agora_nao`     | "Agora não vou querer"                                   | Seção 7                     |
| `objecao_vo_pensar`     | "Vou pensar"                                            | Seção 7                     |
| `objecao_manda_instagram` | "Me manda seu Instagram"                              | Seção 7                     |
| `objecao_secretaria`    | Secretária diz que vai analisar                          | Seção 7                     |
| `reuniao_online`        | Oferecer reunião online + prévia                         | Seção 8                     |
| `reuniao_presencial`    | Oferecer reunião presencial                              | Seção 8                     |
| `fechamento`            | Fechamento leve com prévia                               | Seção 8                     |

Quando `tipo` é omitido, o engine infere pelo estágio do Kanban:

| Estágio       | Tipo inferido   |
|---------------|-----------------|
| `novo`        | `abordagem`     |
| `qualificado` | `portfolio`     |
| `contatado`   | `follow_up`     |
| `ganho`       | `fechamento`    |
| `descartado`  | `follow_up`     |

## Resposta

```json
{
  "mensagem": "Oi, Dra. Marina! Tudo bem?\nVi seu perfil pelo Instagram...",
  "angulo": "odontopediatra",
  "tipo": "abordagem",
  "proximaAcao": "Aguardar resposta. Se autorizar, enviar portfólio (1 a 3 links com contexto)."
}
```

| Campo        | Tipo   | Descrição                                                        |
|--------------|--------|------------------------------------------------------------------|
| `mensagem`   | string | Texto pronto para copiar e colar no WhatsApp (com `\n` entre linhas) |
| `angulo`     | string | Identificador do ângulo usado (para analytics/auditoria)         |
| `tipo`       | string | Tipo efetivamente gerado (pode diferir do input se inferido)     |
| `proximaAcao`| string | Orientação para o vendedor seguir o fluxo do manual             |

### Erros

| Status | Quando                                              |
|--------|-----------------------------------------------------|
| 400    | `leadId` ausente ou lead não encontrado sem body    |
| 404    | Lead não está nem no banco nem no body              |
| 500    | Falha interna no engine (logar + retornar mensagem genérica) |

## Implementação (Turbina)

1. Montar router em `server/src/routes/messages.js` (seguir padrão de `search.js`).
2. Importar `gerarMensagem` de `../prospector/index.js`.
3. Resolver o lead: tentar `reopenSearch(searchId)` → `leads.get(leadId)`; se não
   achar, usar o body do request. Campos do body têm prioridade.
4. Chamar `await gerarMensagem(lead, tipo)` e devolver o resultado como JSON.
5. Montar router em `server/src/index.js`:
   ```js
   const { default: messagesRouter } = await import('./routes/messages.js');
   app.use(messagesRouter);
   ```
6. Não persistir a mensagem gerada — o histórico de mensagens enviadas é
   responsabilidade de outro módulo (futuro). Aqui é só geração sob demanda.

## Provider de LLM opcional

Por padrão o sistema usa só templates (custo zero, offline). Para ativar
variação com IA, definir no `server/.env`:

```
PROSPECTOR_LLM_PROVIDER=openai
PROSPECTOR_LLM_API_KEY=sk-...
PROSPECTOR_LLM_MODEL=gpt-4o-mini
PROSPECTOR_LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
```

Quando o provider falha ou retorna vazio, o engine cai automaticamente no
template equivalente — o aluno nunca fica sem resposta.

## Contrato do motor (referência)

```js
// server/src/prospector/engine.js
gerarMensagem(lead, tipo) → Promise<{
  mensagem: string,
  angulo: string,
  tipo: string,
  proximaAcao: string,
}>
```

Lead shape: `{ nome, nicho, cidade, temSite, temInstagram, linkQuebrado,
estagio, instagram }`. Todos os campos têm defaults seguros — o motor nunca
quebra por input incompleto.
