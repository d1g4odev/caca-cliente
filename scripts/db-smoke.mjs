#!/usr/bin/env node
// Smoke test da camada SQLite (server/src/db/sqlite.js) contra um diretório
// temporário. Roda no CI nas 3 plataformas — valida schema, escrita, reabertura
// de conexão (persistência real em disco), stats e dedup.
//
//   node scripts/db-smoke.mjs

import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

if (typeof process.getBuiltinModule !== 'function' || !process.getBuiltinModule('node:sqlite')?.DatabaseSync) {
  console.error(`node:sqlite indisponível neste Node (${process.versions.node}) — o smoke exige Node >= 22.5.`);
  process.exit(1);
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'caca-db-smoke-'));
process.env.CACA_DATA_DIR = tmp;
delete process.env.DATABASE_URL;

const searchId = '11111111-1111-4111-8111-111111111111';
const lead = (id, extra = {}) => ({
  id, name: `Lead ${id}`, address: 'Rua X, 1', phone: '(11) 98765-432' + id.slice(-1),
  lat: -29.19, lng: -54.87, hasWebsite: false, source: 'osm', niche: 'barbearia',
  rating: 4.5, reviewsCount: 10, enrichment: null, enrichmentStatus: 'pending',
  stage: 'novo', notes: '', followUpAt: null, tags: [], estimatedValue: null, waInvalid: false,
  ...extra,
});

// 1ª conexão: cria schema, grava busca + leads, edita campos.
{
  const db = await import('../server/src/db/sqlite.js');
  assert.equal(await db.initDb(), true, 'initDb deve retornar true');
  const leads = new Map([['a1', lead('a1')], ['a2', lead('a2')]]);
  await db.saveSearch({ id: searchId, leads }, { niche: 'barbearia', city: 'Santiago', lat: -29.19, lng: -54.87, radiusKm: 5, found: 2 });
  await db.saveEnrichment(searchId, { id: 'a1', enrichment: { email: 'x@y.com', instagram: 'insta1' }, enrichmentStatus: 'done' });
  await db.saveStage(searchId, 'a1', 'qualificado');
  await db.saveLeadFields(searchId, 'a2', { stage: 'ganho', notes: 'fechou!', tags: ['fechou'], estimatedValue: 700, phone: '(11) 3085-0000', waInvalid: true });
}

// 2ª "conexão" (novo processo simulado: reimporta com cache-bust não dá em ESM;
// reabrimos via nova instância chamando initDb de novo — o arquivo é o mesmo).
{
  const db = await import('../server/src/db/sqlite.js');
  await db.initDb();

  const s = await db.loadSearch(searchId);
  assert.ok(s, 'loadSearch deve achar a busca');
  assert.equal(s.niche, 'barbearia');
  assert.equal(s.leads.length, 2);

  const a1 = s.leads.find((l) => l.id === 'a1');
  assert.equal(a1.stage, 'qualificado');
  assert.equal(a1.enrichment.email, 'x@y.com', 'enrichment JSON deve reidratar');
  assert.equal(a1.enrichmentStatus, 'done');

  const a2 = s.leads.find((l) => l.id === 'a2');
  assert.equal(a2.stage, 'ganho');
  assert.equal(a2.notes, 'fechou!');
  assert.deepEqual(a2.tags, ['fechou'], 'tags JSON deve reidratar como array');
  assert.equal(a2.estimatedValue, 700);
  assert.equal(a2.phone, '(11) 3085-0000');
  assert.equal(a2.waInvalid, true, 'waInvalid deve voltar como boolean');

  const lista = await db.listSearches();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].leads, 2);
  assert.equal(lista[0].enriched, 1, 'só a1 saiu de pending');

  const stats = await db.statsConversao();
  assert.equal(stats.geral.total, 2);
  assert.equal(stats.geral.ganho, 1);
  assert.equal(stats.geral.qualificado, 1);
  assert.equal(stats.geral.won_value, 700);
  assert.equal(stats.porNicho[0].chave, 'barbearia');

  // Dedup: telefone do a2 (só dígitos) em OUTRA busca deve casar.
  const dup = await db.findDupLeads('22222222-2222-4222-8222-222222222222', [
    lead('b1', { phone: '11 30850000' }), // mesmo número, formatação diferente
    lead('b2', { phone: '(11) 90000-0000' }), // inédito
  ]);
  assert.equal(dup.size, 1, 'dedup por phone_digits deve casar 1');
  assert.equal(dup.get('b1').stage, 'ganho');
}

rmSync(tmp, { recursive: true, force: true });
console.log('✅ db-smoke: todos os asserts passaram (SQLite ok neste Node/OS).');
