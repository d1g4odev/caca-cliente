# Spec — Endpoint Gerador de Mensagens de Abordagem

> Gera mensagens prontas para copiar e colar no WhatsApp, seguindo o
> [Manual Mestre Prospector do Juninho](./manual-prospector.md).
> Motor puro em `server/src/prospector/` (templates parametrizados, custo zero,
> funciona offline). Provider de LLM opcional via variável de ambiente.

## Tratamento de nome (obrigatório em toda geração)

O motor detecta se o `nome` do lead é **PESSOA** ou **EMPRESA** antes de gerar
a saudação. Implementação em `server/src/prospector/nome.js`.

### Heurística

- **EMPRESA** se o nome contém:
  - Keyword de negócio: `clínica`, `salão`, `studio`, `barbearia`, `restaurante`,
    `pizzaria`, `hotel`, `pousada`, `mercado`, `farmácia`, `ótica`, `petshop`,
    `oficina`, `auto`, `imobiliária`, `advocacia`, `escritório`, `consultório`,
    `academia`, `instituto`, `centro`, `espaço`, `loja`, `boutique`, `drogaria`,
    `supermercado`, `padaria`, `cafeteria`, `lanchonete`, `estética`, `agência`,
    `construtora`, `distribuidora`, `comércio`, etc.
  - Sufixo jurídico: `LTDA`, `EIRELI`, `MEI`, `CIA`, `S/A`, `S/R`
  - `&` comercial (ex: "João & Maria Lanches")
  - Números no nome (CNPJ, telefone, filial)
  - Sigla toda em maiúsculas com 2+ letras (ex: "IMB Consultoria")
  - Mais de 5 palavras alfabéticas sem keyword
- **PESSOA** se o nome tem 2 a 5 palavras alfabéticas sem keyword de empresa.
- **Desconhecido** se vazio — cai em abertura neutra.

### Saudação gerada

| Tipo     | Saudação                                    | Exemplo                                  |
|----------|---------------------------------------------|------------------------------------------|
| PESSOA   | `Oi, <primeiroNome>! Tudo bem?`             | `Oi, Carmem! Tudo bem?`                  |
| PESSOA com título | `Oi, <título> <primeiroNome>! Tudo bem?` | `Oi, Dra. Ana! Tudo bem?` / `Oi, Dr. João! Tudo bem?` |
| EMPRESA  | `Oi, tudo bem?` (neutro, manual seção 4)   | `Oi, tudo bem?`                          |

**Regras:**
- NUNCA inferir gênero nem inventar título. Só preservar `Dr.`/`Dra.`/`Sr.`/`Sra.` se já vier no nome.
- Primeiro nome = primeira palavra após o título (quando houver), senão primeira palavra do nome.
- Empresa nunca é cumprimentada pelo nome fantasia — abertura neutra conforme manual seção 4.

### Exemplos validados

| Input                              | Tipo    | Primeiro nome | Saudação                       |
|------------------------------------|---------|---------------|--------------------------------|
| `Carmem Lucia de Toledo Tiecher`   | pessoa  | Carmem        | `Oi, Carmem! Tudo bem?`        |
| `Dra. Ana Paula Souza`             | pessoa  | Dra. Ana      | `Oi, Dra. Ana! Tudo bem?`      |
| `Dr. João Pedro Lima`              | pessoa  | Dr. João      | `Oi, Dr. João! Tudo bem?`      |
| `Clinica Sorriso Ltda`             | empresa | —             | `Oi, tudo bem?`                |
| `Barbearia do Ze`                  | empresa | —             | `Oi, tudo bem?`                |
| `Otica Central`                    | empresa | —             | `Oi, tudo bem?`                |
| `Pizzaria Bella Italia`            | empresa | —             | `Oi, tudo bem?`                |
| `João & Maria Lanches`             | empresa | —             | `Oi, tudo bem?`                |

## Endpoint (lead individual)

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

## Endpoint de lote (Modo Disparo)

Para o Modo Disparo (DispatchMode) do Vitral gerar mensagens para vários leads
de uma busca de uma vez, combinar com o Turbina um endpoint de lote:

```
POST /api/search/:searchId/messages/batch
```

### Body

```json
{
  "tipo": "abordagem",
  "leadIds": ["lead-1", "lead-2", "lead-3"]
}
```

`leadIds` é opcional — se omitido, gera para todos os leads da busca que estão
no estágio informado (default: `novo`).

### Resposta

```json
{
  "searchId": "...",
  "tipo": "abordagem",
  "geracoes": [
    {
      "leadId": "lead-1",
      "mensagem": "Oi, Carmem! Tudo bem?\n...",
      "angulo": "perfil_bonito_sem_site",
      "proximaAcao": "Aguardar resposta. Se autorizar, enviar portfólio..."
    },
    {
      "leadId": "lead-2",
      "mensagem": "Oi, tudo bem?\n...",
      "angulo": "instituto_clinica",
      "proximaAcao": "..."
    }
  ],
  "falhas": []
}
```

### Implementação (Turbina)

1. Reaproveitar `gerarMensagem` do módulo `server/src/prospector/`.
2. Iterar sobre os leads da busca (via `reopenSearch` + `getSearchLeads`).
3. Paralelismo limitado (ex: `Promise.all` com chunk de 5) pra não estourar
   o event loop nem o provider de LLM quando ativo.
4. Cada geração é independente — falha em um lead não derruba o lote.
5. Não persistir mensagens — só geração sob demanda. Histórico é outro módulo.

### Importante para o Vitral

O Modo Disparo NÃO deve mais usar `web/src/lib/whatsapp.js` (template legado
com "posso te mandar um audio curto" e saudação por nome completo). Toda
geração passa pelo motor em `server/src/prospector/` — seja via endpoint
individual (`POST /api/leads/:leadId/message`) ou via lote
(`POST /api/search/:searchId/messages/batch`). O motor garante:
- Saudação inteligente (primeiro nome pra pessoa, neutra pra empresa).
- Sem áudio curto, sem textão, sem criticar o lead.
- Elogio específico + oportunidade + pedido de permissão (manual seções 3 e 4).
- Preço só quando o tipo é `preco` (nunca na abordagem).
