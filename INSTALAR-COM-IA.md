<div align="center">

<img src="docs/assets/banner-horizontal.png" alt="Caça-Cliente — Sites com IA do Zero" width="100%" />

# 🤖 Instalar com IA — copiar e colar

### Deixe a sua IA instalar o Caça-Cliente pra você. Você só copia, cola e responde.

</div>

---

## Como funciona

Você vai colar **um único prompt** na sua IA e ela faz todo o trabalho: confere o que falta no seu computador, baixa a ferramenta, instala tudo e liga. No final, é só abrir o navegador.

**O que você precisa:**

- Uma IA que **rode comandos no seu computador** — qualquer uma destas serve:
  - **Cursor** (modo Agent) → https://cursor.com
  - **Claude Code** → https://claude.com/claude-code
  - **Windsurf** → https://windsurf.com
  - **GitHub Copilot** no VS Code (modo Agent)
- Só isso. A IA cuida do resto (inclusive de instalar Node e Python se faltarem).

> ⚠️ **ChatGPT no navegador NÃO serve** — ele não consegue rodar comandos no seu computador. Se você só tem ele, siga o **[TUTORIAL.md](./TUTORIAL.md)**, que ensina o caminho manual passo a passo (é tranquilo também).

---

## Passo único — copie o bloco abaixo e cole na sua IA

Clique no botão de copiar no canto do bloco (ou selecione tudo), cole no chat da sua IA e aperte Enter. Responda o que ela perguntar e deixe ela trabalhar.

````text
Você vai instalar a ferramenta "Caça-Cliente" (do curso Sites com IA do Zero) nesta máquina,
do zero até ela rodando no navegador. Eu sou iniciante: me explique cada etapa em 1 frase
simples ANTES de executá-la, em português. Não altere nenhum código da ferramenta.

Siga EXATAMENTE este roteiro:

1. DETECTAR O SISTEMA
   - Descubra se estou em Windows, macOS ou Linux e adapte todos os comandos a isso.

2. PRÉ-REQUISITOS (verifique um por um; só instale o que faltar, me avisando antes)
   - git  → se faltar: Windows `winget install Git.Git` · macOS `xcode-select --install` ·
     Linux `sudo apt install git`
   - Node.js 18+ (`node --version`) → se faltar/for antigo: Windows
     `winget install OpenJS.NodeJS.LTS` · macOS `brew install node` (instale o Homebrew
     antes se precisar) · Linux: via https://nodejs.org (versão LTS)
   - Python 3.10+ (`py --version` no Windows, `python3 --version` no resto) → se faltar:
     Windows `winget install Python.Python.3.12` · macOS `brew install python` ·
     Linux `sudo apt install python3 python3-venv python3-pip`
   - Se instalar qualquer um deles, feche e reabra o terminal (ou recarregue o PATH)
     antes de continuar, e confira a versão de novo.

3. BAIXAR A FERRAMENTA
   - Vá para a pasta do meu usuário (home) e rode:
       git clone https://github.com/d1g4odev/caca-cliente.git
       cd caca-cliente
   - Se a pasta já existir, entre nela e rode `git pull` em vez de clonar.

4. INSTALAR
   - Rode: npm run setup
   - Esse comando já confere Node/Python, instala as dependências e prepara o worker
     Python num ambiente isolado (workers/.venv). Ele imprime mensagens de erro claras
     em português — se falhar, leia a mensagem, corrija a causa e rode de novo.

5. LIGAR E VERIFICAR
   - Rode: npm run dev   (deixe rodando; não encerre o processo)
   - Aguarde até o log mostrar as linhas [api] (porta 3001) e [web] (porta 5173).
   - Confirme que http://localhost:5173 responde (ex.: com curl ou abrindo no navegador).
   - Se der "porta em uso": encerre o processo antigo que ocupa a porta 3001 ou 5173
     e rode `npm run dev` de novo.

6. ENTREGA FINAL — quando estiver tudo rodando, me diga em português:
   - que é só abrir http://localhost:5173 no navegador;
   - que para DESLIGAR é Ctrl+C no terminal, e para ligar de novo nos próximos dias é só
     abrir a pasta caca-cliente e rodar `npm run dev` (o setup não precisa ser repetido);
   - que o primeiro passo dentro da ferramenta é clicar em "✏️ Mensagem do WhatsApp"
     e trocar [Seu nome] pelo meu nome.

Regras: não use sudo no Windows; não instale nada além do listado; se algo falhar 2 vezes,
pare, me mostre o erro completo e explique em palavras simples o que ele significa.
````

---

## Deu certo?

Quando a IA terminar, abra **http://localhost:5173** no navegador. Se a ferramenta aparecer: 🎉 pronto. Agora aprenda a usar na **[Parte 2 do TUTORIAL.md](./TUTORIAL.md#parte-2--como-usar-a-ferramenta)**.

## Deu errado?

- **Cole a mensagem de erro na própria IA** e peça: *"esse erro apareceu, corrija e continue a instalação"*. Na maioria dos casos ela resolve sozinha.
- Se travar de vez, siga o caminho manual no **[TUTORIAL.md](./TUTORIAL.md)** — ou chame no grupo do curso. 😉

---

<div align="center">
<sub>Guia de instalação assistida do <strong>Caça-Cliente</strong> — ferramenta oficial do curso <strong>Sites com IA do Zero</strong>.</sub>
</div>
