#!/usr/bin/env node
// Setup do Caça-Cliente — roda em Windows, Mac e Linux.
//
//   npm run setup
//
// O que ele faz, na ordem:
//   1. Confere Node 18+ e localiza um Python 3.10+ (py/python3/python).
//   2. Instala as dependências npm (raiz, server e web).
//   3. Cria um ambiente Python isolado em workers/.venv e instala o httpx lá
//      (evita o erro "externally-managed-environment" de pip em Mac/Linux).
// O server usa workers/.venv automaticamente quando ele existe.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';
const VENV = path.join(ROOT, 'workers', '.venv');
const VENV_PY = WIN ? path.join(VENV, 'Scripts', 'python.exe') : path.join(VENV, 'bin', 'python');

const ok = (msg) => console.log(`  ✅ ${msg}`);
const step = (msg) => console.log(`\n▶ ${msg}`);
const die = (msg) => {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: WIN, ...opts });
  return r.status === 0;
}

function tryVersion(cmd) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: WIN });
  if (r.status !== 0) return null;
  const m = `${r.stdout}${r.stderr}`.match(/Python (\d+)\.(\d+)/);
  return m ? { cmd, major: +m[1], minor: +m[2] } : null;
}

// ── 1. Pré-requisitos ────────────────────────────────────────────────────────
step('Conferindo pré-requisitos...');

const nodeMajor = +process.versions.node.split('.')[0];
if (nodeMajor < 18) {
  die(
    `Seu Node.js é v${process.versions.node}, mas a ferramenta precisa da versão 18 ou mais nova.\n` +
      '   Baixe a versão LTS em https://nodejs.org e rode "npm run setup" de novo.'
  );
}
ok(`Node.js v${process.versions.node}`);

const candidates = WIN ? ['py', 'python', 'python3'] : ['python3', 'python'];
const python = candidates.map(tryVersion).find((p) => p && (p.major > 3 || (p.major === 3 && p.minor >= 10)));
if (!python) {
  die(
    'Python 3.10+ não encontrado.\n' +
      '   Instale em https://python.org/downloads' +
      (WIN ? ' e MARQUE a caixa "Add Python to PATH" na instalação.' : '.') +
      '\n   Depois feche e abra o terminal de novo e rode "npm run setup".'
  );
}
ok(`Python ${python.major}.${python.minor} (comando "${python.cmd}")`);

// ── 2. Dependências npm ──────────────────────────────────────────────────────
step('Instalando dependências do Node (pode levar alguns minutos na 1ª vez)...');
if (!run('npm', ['install'])) die('Falha ao instalar as dependências da raiz.');
if (!run('npm', ['--prefix', 'server', 'install'])) die('Falha ao instalar as dependências do server.');
if (!run('npm', ['--prefix', 'web', 'install'])) die('Falha ao instalar as dependências do web.');
ok('Dependências npm instaladas');

// ── 3. Ambiente Python isolado (venv) ────────────────────────────────────────
step('Preparando o ambiente Python do worker...');
if (!existsSync(VENV_PY)) {
  if (!run(python.cmd, ['-m', 'venv', VENV])) {
    die(
      'Falha ao criar o ambiente Python (venv).\n' +
        '   No Linux (Ubuntu/Debian), instale o pacote: sudo apt install python3-venv\n' +
        '   Depois rode "npm run setup" de novo.'
    );
  }
}
if (!run(VENV_PY, ['-m', 'pip', 'install', '--quiet', '-r', path.join('workers', 'requirements.txt')])) {
  die('Falha ao instalar as dependências Python do worker (workers/requirements.txt).');
}
ok('Worker Python pronto (workers/.venv)');

console.log('\n🎉 Setup concluído! Agora rode:\n');
console.log('   npm run dev\n');
console.log('e abra http://localhost:5173 no navegador.');
