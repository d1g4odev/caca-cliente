# 📖 Tutorial do Captação

Guia completo, passo a passo, para **abrir** e **usar** o sistema — sem pressupor nada.

---

# Parte 1 — Como abrir o sistema

## ✅ Antes de começar (instalar uma vez só)

O sistema precisa de dois programas instalados no computador:

1. **Node.js** (versão 18 ou mais nova) → https://nodejs.org (baixe a versão "LTS").
2. **Python** (versão 3.10 ou mais nova) → https://python.org/downloads (na instalação, marque a caixa **"Add Python to PATH"**).

> 💡 Para conferir se já estão instalados, abra o terminal (veja o Passo 3) e digite `node --version` e `py --version`. Se aparecer um número de versão, está tudo certo.

E o editor que vamos usar:

3. **Visual Studio Code (VS Code)** → https://code.visualstudio.com

---

## 🟦 Passo 1 — Abrir a pasta certa no VS Code

⚠️ **Atenção:** a pasta do projeto está "dentro de outra pasta com o mesmo nome". A pasta certa é a **de dentro**:

```
I:\Captacao-main\Captacao-main
```

Para abrir:

1. Abra o **VS Code**.
2. No menu de cima, clique em **File** (Arquivo) → **Open Folder...** (Abrir Pasta...).
3. Navegue até `I:\Captacao-main\Captacao-main` e clique em **Selecionar Pasta**.
4. Se aparecer "Do you trust the authors?" (Você confia nos autores?), clique em **Yes, I trust the authors**.

✅ Deu certo se, na barra lateral esquerda, você vê as pastas `server`, `web`, `workers` e arquivos como `README.md` e `package.json`.

---

## 🟦 Passo 2 — Abrir o terminal

O terminal é a "caixinha preta" onde digitamos comandos.

- No menu de cima: **Terminal** → **New Terminal** (Novo Terminal).
- Atalho de teclado: segure **Ctrl** e aperte a tecla **`** (crase, fica acima do Tab).

✅ Deu certo se uma janela aparecer na parte de baixo, terminando com algo como:
```
PS I:\Captacao-main\Captacao-main>
```
O importante é terminar em **`Captacao-main\Captacao-main>`**. Se terminar só em `Captacao-main>` (uma pasta só), você abriu a pasta errada — volte ao Passo 1.

---

## 🟦 Passo 3 — Instalar as peças (só na primeira vez)

No terminal, digite o comando abaixo e aperte **Enter**:

```powershell
npm run setup
```

Isso baixa tudo que o sistema precisa (pode levar alguns minutos na primeira vez). Quando terminar e o terminal "voltar a aceitar comandos", pode seguir.

> Você só precisa fazer isso **uma vez**. Nas próximas vezes, pule direto para o Passo 4.

---

## 🟦 Passo 4 — Ligar o sistema

No terminal, digite:

```powershell
npm run dev
```

✅ Deu certo quando aparecerem duas linhas parecidas com:
```
[api] API de captação ouvindo em http://localhost:3001
[web] ➜ Local: http://localhost:5173
```

> ⚠️ **Deixe esse terminal aberto!** Enquanto o sistema estiver ligado, esse terminal fica "ocupado" mostrando mensagens. Isso é normal.

### Tem um modo de teste (sem internet)?
Sim. Se quiser só experimentar com dados de mentira (sem buscar negócios de verdade):
```powershell
npm run dev:mock
```

---

## 🟦 Passo 5 — Abrir no navegador

1. Abra o navegador (Chrome, Edge, etc.).
2. Na barra de endereço, digite e aperte Enter:

```
http://localhost:5173
```

🎉 **Pronto!** O Captação vai aparecer. Veja a **Parte 2** para aprender a usar.

---

## 🔴 Como desligar o sistema

1. Volte para o terminal que ficou aberto.
2. Segure **Ctrl** e aperte **C**. Isso desliga o sistema.
3. Pode fechar o VS Code.

---

## 💾 (Opcional) Banco de dados — para os leads não sumirem

Por padrão, o sistema funciona, mas as buscas **somem quando você desliga**. Para salvar tudo num banco de dados, existe o arquivo `server\.env`.

- **Neste computador já está configurado** (aponta para o PostgreSQL do home server via Tailscale). É só ligar o ZimaOS e ter o Tailscale ativo.
- **Em outro computador:** copie o arquivo `server\.env.example` para `server\.env` e ajuste a senha.

Sem esse arquivo, o sistema continua funcionando normalmente — só não guarda o histórico.

---

# Parte 2 — Como usar o sistema

## 🎯 O que o Captação faz

Ele encontra **negócios que NÃO têm site** (barbearias, clínicas, restaurantes, etc.) numa cidade e região que você escolher. Esses são exatamente os clientes que mais precisam de um site — ou seja, **leads para você vender sua criação de sites**.

Para cada negócio encontrado, o sistema ainda **procura sozinho os contatos** (e-mail, Instagram, Facebook, LinkedIn) na internet, e organiza tudo num **funil de vendas** estilo quadro de cartões.

## 🧭 Passo a passo de uso

### 1. Fazer uma busca
Na barra à esquerda:
1. **Nicho** — digite o tipo de negócio. Ex.: `barbearia`, `salão de estética`, `escritório de advocacia`.
2. **Cidade** — comece a digitar e escolha uma opção da lista que aparece.
3. **Raio** — arraste a barrinha para definir o tamanho da área (em km).
4. Clique em **Buscar leads sem site**.

Em segundos, os **pinos aparecem no mapa** e os cartões na lista à esquerda.

### 2. Os contatos chegam sozinhos
Você não precisa fazer nada: o sistema busca os contatos em segundo plano e eles **vão aparecendo nos cartões** conforme são encontrados (e-mail ✉️, Instagram 📷, etc.). Os pinos no mapa mudam de cor conforme isso acontece.

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

### 5. Chamar no WhatsApp
No cartão de um lead com telefone, clique em **💬 Chamar no WhatsApp**. Abre uma conversa **com a mensagem já escrita** (e personalizada conforme o ramo do negócio). Você só revisa e aperta enviar.

### 6. Organizar no funil (Kanban)
No topo da barra, clique em **🗂 Kanban**. Aparece um quadro com colunas:

`Novo · Qualificado · Contatado · Ganho · Descartado`

- **Arraste** os cartões de uma coluna para outra conforme avança a negociação.
- Marque as caixinhas de vários cartões e use **💬 Enviar no WhatsApp** para abrir várias conversas de uma vez (até 10, para não bloquear seu número).

### 7. Exportar a lista
Na barra à esquerda, em **Exportar**, baixe a planilha em **CSV** ou **Excel** com todos os leads e contatos — pronto para usar em outro lugar ou no seu CRM.

---

## ❓ Problemas comuns

| Problema | O que fazer |
|---|---|
| O navegador diz "não foi possível acessar" | Confira se o terminal com `npm run dev` está aberto e mostrando as duas linhas do Passo 4. |
| "Overpass ocupado" ao buscar | É o serviço de mapas gratuito sob carga. Espere alguns segundos e tente de novo, ou reduza o raio. |
| Poucos resultados | Alguns nichos são mais bem mapeados (restaurantes, beleza, clínicas, dentistas). Tente um raio maior. |
| Os leads somem ao reiniciar | Normal sem banco de dados. Veja a seção "Banco de dados" na Parte 1. |

---

