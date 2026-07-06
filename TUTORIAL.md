# 📖 Tutorial — Captação

Guia completo, passo a passo, para **abrir** e **usar** a ferramenta — sem pressupor nada. Se você nunca abriu um terminal na vida, comece aqui.

> 💡 **Já sabe usar terminal?** Pule direto pro [Passo 4](#-passo-4--ligar-a-ferramenta) — o resumo é `npm run setup` (1ª vez) e `npm run dev`.

---

# Parte 1 — Como abrir a ferramenta

## ✅ Antes de começar (instalar uma vez só)

A ferramenta precisa de dois programas instalados no computador:

1. **Node.js** (versão 18 ou mais nova) → https://nodejs.org (baixe a versão "LTS").
2. **Python** (versão 3.10 ou mais nova) → https://python.org/downloads (na instalação, marque a caixa **"Add Python to PATH"**).

> 💡 Para conferir se já estão instalados, abra o terminal (veja o Passo 3) e digite `node --version` e `py --version`. Se aparecer um número de versão, está tudo certo.

E o editor que vamos usar:

3. **Visual Studio Code (VS Code)** → https://code.visualstudio.com

---

## 🟦 Passo 1 — Baixar a ferramenta

Se você ainda não baixou a ferramenta, baixe o arquivo `.zip` que o Rodrigo te passou no curso e **extraia** numa pasta fácil de achar.

> 💡 **Dica:** extraia direto na pasta do usuário (Windows: `C:\Users\SeuNome\Captacao`; Mac: `/Users/SeuNome/Captacao`). Evite pastas profundas tipo `Downloads > Curso > Módulo 3 > Captacao` — quanto mais perto da raiz, melhor.

Se você está usando **Git** (avançado), pode clonar:
```bash
git clone <repo-do-curso>.git
cd Captacao
```

---

## 🟦 Passo 2 — Abrir a pasta no VS Code

1. Abra o **VS Code**.
2. No menu de cima, clique em **File** (Arquivo) → **Open Folder...** (Abrir Pasta...).
3. Navegue até a pasta `Captacao` que você extraiu e clique em **Selecionar Pasta**.
4. Se aparecer "Do you trust the authors?" (Você confia nos autores?), clique em **Yes, I trust the authors**.

✅ Deu certo se, na barra lateral esquerda, você vê as pastas `server`, `web`, `workers` e arquivos como `README.md` e `package.json`.

> ⚠️ **Atenção:** se você extraiu o zip e ficou uma pasta dentro da outra (tipo `Captacao-main/Captacao`), abra a **de dentro** — a que tem as pastas `server`, `web`, `workers`.

---

## 🟦 Passo 3 — Abrir o terminal

O terminal é a "caixinha preta" onde digitamos comandos.

- No menu de cima: **Terminal** → **New Terminal** (Novo Terminal).
- Atalho de teclado: segure **Ctrl** (Windows) ou **Cmd** (Mac) e aperte a tecla **`** (crase, fica acima do Tab).

✅ Deu certo se uma janela aparecer na parte de baixo, terminando com algo como:
```
PS C:\Users\SeuNome\Captacao>
```
ou no Mac:
```
rodrigo@macbook Captacao %
```

O importante é terminar em **`Captacao>`** (ou `Captacao %`).

---

## 🟦 Passo 4 — Instalar as peças (só na primeira vez)

No terminal, digite o comando abaixo e aperte **Enter**:

```bash
npm run setup
```

Isso baixa tudo que a ferramenta precisa (pode levar alguns minutos na primeira vez). Quando terminar e o terminal "voltar a aceitar comandos", pode seguir.

> Você só precisa fazer isso **uma vez**. Nas próximas vezes, pule direto pro Passo 5.

---

## 🟦 Passo 5 — Ligar a ferramenta

No terminal, digite:

```bash
npm run dev
```

✅ Deu certo quando aparecerem duas linhas parecidas com:
```
[api] API de captação ouvindo em http://localhost:3001
[web] ➜ Local: http://localhost:5173
```

> ⚠️ **Deixe esse terminal aberto!** Enquanto a ferramenta estiver ligada, esse terminal fica "ocupado" mostrando mensagens. Isso é normal.

### Tem um modo de teste (sem internet)?

Sim. Se quiser só experimentar com dados de mentira (sem buscar negócios de verdade):
```bash
npm run dev:mock
```

---

## 🟦 Passo 6 — Abrir no navegador

1. Abra o navegador (Chrome, Edge, Safari, etc.).
2. Na barra de endereço, digite e aperte Enter:

```
http://localhost:5173
```

🎉 **Pronto!** A ferramenta vai aparecer. Veja a **Parte 2** para aprender a usar.

---

## 🔴 Como desligar a ferramenta

1. Volte para o terminal que ficou aberto.
2. Segure **Ctrl** (Windows) ou **Cmd** (Mac) e aperte **C**. Isso desliga a ferramenta.
3. Pode fechar o VS Code.

---

## 💾 (Opcional) Banco de dados — para os leads não sumirem

Por padrão, a ferramenta funciona, mas as buscas **somem quando você desliga**. Para salvar tudo num banco de dados (PostgreSQL), veja **[docs/deploy-avancado.md](./docs/deploy-avancado.md)**.

Sem banco configurado, a ferramenta continua funcionando normalmente — só não guarda o histórico de buscas antigas.

---

# Parte 2 — Como usar a ferramenta

## 🎯 O que a ferramenta faz

Ela encontra **negócios que NÃO têm site** (barbearias, clínicas, restaurantes, etc.) numa cidade e região que você escolher. Esses são exatamente os clientes que mais precisam de um site — ou seja, **leads para você vender sua criação de sites**.

Para cada negócio encontrado, a ferramenta ainda **procura sozinha os contatos** (e-mail, Instagram, Facebook, LinkedIn) na internet, e organiza tudo num **funil de vendas** estilo quadro de cartões.

---

## 🧭 Passo a passo de uso

### 1. Fazer uma busca

Na barra à esquerda:

1. **Nicho** — digite o tipo de negócio. Ex.: `barbearia`, `salão de estética`, `escritório de advocacia`. Tem um dropdown com nichos prontos se você não souber o que digitar.
2. **Cidade** — comece a digitar e escolha uma opção da lista que aparece.
3. **Raio** — arraste a barrinha para definir o tamanho da área (em km).
4. Clique em **Buscar leads sem site**.

Em segundos, os **pinos aparecem no mapa** e os cartões na lista à esquerda.

### 2. Os contatos chegam sozinhos

Você não precisa fazer nada: a ferramenta busca os contatos em segundo plano e eles **vão aparecendo nos cartões** conforme são encontrados (e-mail ✉️, Instagram 📷, etc.). Os pinos no mapa mudam de cor conforme isso acontece.

> Quer dar prioridade a um negócio específico? **Clique nele** — ele "fura a fila" e é processado na frente.

### 3. Filtrar e ordenar

Acima da lista você pode:

- **Ordenar** por **Relevância (score)** ou por **Nome**.
- Ligar **filtros**: mostrar só quem tem 📞 WhatsApp, 📷 Instagram ou ✉️ E-mail.

### 4. Entender o "score" (a cor de cada lead)

Cada lead ganha uma nota de 0 a 100 (quanto mais fácil de contatar, maior):

- 🔴 **Quente** (60+) — tem vários contatos, vá com tudo.
- 🟡 **Morno** (35–59).
- 🔵 **Frio** (abaixo de 35).

### 5. Abrir os detalhes do lead

Clique num cartão pra abrir os **detalhes** do lead. Lá você pode:

- Ver todos os contatos encontrados (e-mail, Instagram, Facebook, LinkedIn).
- Adicionar **anotações** (ex.: "liguei dia 12, pediu pra retornar quinta").
- Marcar **data de retorno** (follow-up) — a ferramenta te avisa quando vencer.
- Estimar o **valor** da venda.
- Adicionar **tags** (interessado, sem orçamento, pediu proposta, etc.).

### 6. Personalizar a mensagem do WhatsApp (recomendado)

Antes de começar a abordar, clique no botão **✏️ Mensagem do WhatsApp** no topo. Você pode:

- Mudar o **template** da mensagem (use `{nome}` e `{beneficio}` como variáveis).
- Criar **ganchos diferentes por nicho** (barbearia recebe um gancho, salão de estética recebe outro).
- Definir um **benefício padrão** pra quando nenhum nicho casar.

A config fica salva no seu navegador (localStorage) — você só precisa fazer isso uma vez.

> ⚠️ **Importante:** o template padrão vem com o nome do autor original. **Edite e coloque seu nome** antes de começar a abordar leads.

### 7. Chamar no WhatsApp

No cartão de um lead com telefone, clique em **💬 WhatsApp**. Abre uma conversa **com a mensagem já escrita** (e personalizada conforme o ramo do negócio). Você só revisa e aperta enviar.

### 8. Organizar no funil (Kanban)

No topo da barra, clique em **🗂 Kanban**. Aparece um quadro com colunas:

`Novo · Qualificado · Contatado · Ganho · Descartado`

- **Arraste** os cartões de uma coluna para outra conforme avança a negociação.
- Marque as caixinhas de vários cartões e use **💬 Enviar no WhatsApp** para abrir várias conversas de uma vez (até 10, para não bloquear seu número). Isso abre o **Modo disparo**: a ferramenta te guia lead a lead, em sequência.

### 9. Exportar a lista

Na barra à esquerda, em **Exportar**, baixe a planilha em **CSV** ou **Excel** com todos os leads e contatos — pronto para usar em outro lugar ou no seu CRM.

---

## ❓ Problemas comuns

| Problema | O que fazer |
|---|---|
| O navegador diz "não foi possível acessar" | Confira se o terminal com `npm run dev` está aberto e mostrando as duas linhas do Passo 5. |
| "Overpass ocupado" ao buscar | É o serviço de mapas gratuito sob carga. Espere alguns segundos e tente de novo, ou reduza o raio. |
| Poucos resultados | Alguns nichos são mais bem mapeados (restaurantes, beleza, clínicas, dentistas). Tente um raio maior. |
| Os leads somem ao reiniciar | Normal sem banco de dados. Veja a seção "Banco de dados" acima. |
| O WhatsApp não abre | Confira se o lead tem telefone. Se tem e mesmo assim não abre, confira se o navegador não está bloqueando pop-ups pra `wa.me`. |
| A mensagem veio com nome errado | Clique em **✏️ Mensagem do WhatsApp** no topo e edite o template — coloque seu nome. |

---

## 💡 Dicas de ouro

- **Comece pela sua própria cidade.** Você conhece o território, sabe quais bairros têm mais negócios sem site, e pode até visitar o cliente presencialmente se fizer sentido.
- **Foque em nichos bem mapeados no OSM:** restaurantes, salões de beleza, barbearias, clínicas, dentistas, academias. Esses rendem mais leads.
- **Aborde os "Alvo ideal" primeiro:** são os leads sem site mas com Instagram ativo — já têm presença digital mínima, entendem o valor de aparecer online.
- **Não dispare 50 mensagens iguais no mesmo dia.** O WhatsApp pode bloquear seu número. Use o Modo disparo (até 10 por vez) e personalize a mensagem pra cada lead.
- **Mova no Kanban conforme avança.** A ferramenta é um CRM — quanto mais você usa, mais ela te ajuda a não perder leads no caminho.
- **Configure o banco de dados** se quiser histórico de buscas. Veja **[docs/deploy-avancado.md](./docs/deploy-avancado.md)**.

---

<div align="center">
<sub>Tutorial do Captação — ferramenta oficial do curso <strong>Sites com IA do Zero</strong>.</sub>
</div>
