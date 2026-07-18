<div align="center">

# ⬇️ Baixar e instalar o Caça-Cliente

### O jeito mais fácil: baixar o app pronto, sem terminal, sem instalar nada além dele.

</div>

---

## Qual arquivo baixar?

Na página **[github.com/d1g4odev/caca-cliente/releases/latest](https://github.com/d1g4odev/caca-cliente/releases/latest)**, procure o arquivo certo pro seu sistema:

| Seu sistema | Arquivo para baixar |
|---|---|
| **Windows** | `CacaCliente-X.Y.Z-win-x64.exe` |
| **Mac com chip Apple Silicon** (M1, M2, M3, M4) | `CacaCliente-X.Y.Z-mac-arm64.dmg` |
| **Mac com chip Intel** | `CacaCliente-X.Y.Z-mac-x64.dmg` |
| **Linux** | `CacaCliente-X.Y.Z-linux-x86_64.AppImage` |

> 💡 **Não sabe qual Mac você tem?** Clique no menu 🍎 (canto superior esquerdo) → **Sobre Este Mac**. Se aparecer "Apple M1", "Apple M2", "M3", "M4" — é Apple Silicon, baixe o `arm64`. Se aparecer "Intel" — baixe o `x64`.

> 📦 O arquivo tem **~100 MB**. É o tamanho normal de um app desktop moderno (já vem com o navegador embutido dentro).

---

## 🟦 Windows — instalar

1. Baixe o arquivo `.exe` e dê **dois cliques** nele.
2. ⚠️ O Windows pode mostrar uma tela azul **"Windows protegeu o seu PC"** (SmartScreen). Isso é normal — o app é novo e ainda não pagamos por um certificado de R$ 2.000/ano. Clique em **"Mais informações"** e depois em **"Executar assim mesmo"**.
3. O instalador (NSIS) abre. Clique em **Avançar** → **Avançar** → **Instalar** → **Concluir**.
4. O app aparece no **Menu Iniciar** e na **Área de Trabalho**. Pronto, é só abrir.

---

## 🟦 Mac — instalar

1. Baixe o arquivo `.dmg` e dê **dois cliques** nele.
2. Uma janela abre com o ícone do app e uma seta apontando pra pasta **Applications**. **Arraste o ícone do Caça-Cliente pra dentro da pasta Applications**.
3. Agora vá no **Finder** → **Applications** e dê **dois cliques** no Caça-Cliente.
4. ⚠️ O Mac vai mostrar **"Caça-Cliente não pode ser aberto porque o desenvolvedor não foi identificado"** (Gatekeeper). Isso é normal — o app não tem o certificado da Apple (que custa $99/ano). Para abrir:
   - **Clique com o botão direito** (ou Ctrl+clique) no app → **Abrir** → **Abrir** (na janela que aparecer).
   - Isso só precisa ser feito **na primeira vez**. Nas próximas, é só clicar duas vezes normal.
5. Se mesmo assim aparecer **"O app está danificado"**, abra o **Terminal** (Finder → Aplicativos → Utilitários → Terminal) e cole:
   ```bash
   xattr -cr /Applications/Caça-Cliente.app
   ```
   Depois tente abrir de novo. Esse comando só remove um aviso de quarentena — não modifica o app.

---

## 🟦 Linux — instalar

1. Baixe o arquivo `.AppImage`.
2. Abra o terminal na pasta onde baixou e torne o arquivo executável:
   ```bash
   chmod +x CacaCliente-*-linux-x86_64.AppImage
   ```
3. Dê **dois cliques** no arquivo (ou rode `./CacaCliente-*` no terminal).

---

## 📂 Onde ficam os dados

O app cria um banco SQLite automaticamente na primeira vez que você abre. Os dados (leads, buscas, anotações, Kanban) ficam salvos aí — **nada some quando você fecha o app**.

| Sistema | Local do banco de dados |
|---|---|
| **Windows** | `%APPDATA%\caca-cliente-desktop\caca-cliente.db` (ex.: `C:\Users\SeuNome\AppData\Roaming\caca-cliente-desktop`) |
| **Mac** | `~/Library/Application Support/caca-cliente-desktop/caca-cliente.db` |
| **Linux** | `~/.config/caca-cliente-desktop/caca-cliente.db` |

### Como fazer backup

Copie o arquivo `caca-cliente.db` para um pendrive, Google Drive, Dropbox, etc. Para restaurar, cole o arquivo de volta no mesmo lugar — todos os leads, anotações e configurações voltam.

---

## 🔄 Como atualizar

Quando sair uma versão nova, o app mostra um **aviso no topo da tela** (um banner azul). Para atualizar:

1. Clique no link do banner (ou vá em [releases/latest](https://github.com/d1g4odev/caca-cliente/releases/latest)).
2. Baixe o instalador novo (mesmo arquivo que da primeira vez).
3. **Windows**: rode o novo `.exe` — ele atualiza por cima do antigo, seus dados não são perdidos.
4. **Mac**: arraste o novo app pra pasta Applications por cima do antigo.
5. **Linux**: baixe o novo `.AppImage` e substitua o arquivo velho.

> 💡 Seu banco de dados SQLite **não é afetado pela atualização** — ele fica na pasta de dados do sistema, separado do app. Pode atualizar sem medo de perder leads.

---

## ❓ Problemas comuns

| Problema | O que fazer |
|---|---|
| Windows: "O acesso a este arquivo foi bloqueado" | Clique com botão direito no `.exe` → **Propriedades** → **Desbloquear** → **OK**. Depois abra de novo. |
| Windows: sumiu o ícone da Área de Trabalho | Procure "Caça-Cliente" no Menu Iniciar. |
| Mac: "não pode ser aberto" mesmo com botão direito | Execute `xattr -cr /Applications/Caça-Cliente.app` no Terminal e tente de novo. |
| Mac: "arquivo danificado" ao abrir o `.dmg` | Baixe de novo — talvez o download corrompeu. |
| Linux: AppImage não abre | Instale o `libfuse2`: `sudo apt install libfuse2` (Ubuntu/Debian). |
| O app abriu mas a tela fica em branco | Feche e abra de novo. Se persistir, [baixe a versão mais nova](https://github.com/d1g4odev/caca-cliente/releases/latest). |

---

<div align="center">
<sub>Guia de instalação do <strong>Caça-Cliente</strong> — ferramenta oficial do curso <strong>Sites com IA do Zero</strong>.</sub>
</div>
