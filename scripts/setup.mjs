#!/usr/bin/env node
// Setup do Caça-Cliente — roda em Windows, Mac e Linux.
//
//   npm run setup
//
// O que ele faz, na ordem:
//   1. Confere Node 18+.
//   2. Instala as dependências npm (raiz, server e web).
// O worker de enriquecimento agora é JS nativo (enrichWorker.js) — sem dependência Python.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';

const ok = (msg) => console.log(`  \u2705 ${msg}`);
const step = (msg) => console.log(`\n\u25b6 ${msg}`);
const die = (msg) => {
  console.error(`\n\u274c ${msg}`);
  process.exit(1);
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: WIN, ...opts });
  return r.status === 0;
}

// ── 1. Pré-requisitos ────────────────────────────────────────────────────────
step('Conferindo pré-requisitos...');

const nodeMajor = +process.versions.node.split('.')[0];
if (nodeMajor < 18) {
  die(
    `Seu Node.js \u00e9 v${process.versions.node}, mas a ferramenta precisa da vers\u00e3o 18 ou mais nova.\n` +
      '   Baixe a vers\u00e3o LTS em https://nodejs.org e rode "npm run setup" de novo.'
  );
}
ok(`Node.js v${process.versions.node}`);

// ── 2. Dependências npm ──────────────────────────────────────────────────────
step('Instalando dependências do Node (pode levar alguns minutos na 1ª vez)...');
if (!run('npm', ['install'])) die('Falha ao instalar as dependências da raiz.');
if (!run('npm', ['--prefix', 'server', 'install'])) die('Falha ao instalar as dependências do server.');
if (!run('npm', ['--prefix', 'web', 'install'])) die('Falha ao instalar as dependências do web.');
ok('Dependências npm instaladas');

console.log('\n\uD83C\uDF89 Setup conclu\u00eddo! Agora rode:\n');
console.log('   npm run dev\n');
console.log('e abra http://localhost:5173 no navegador.');
