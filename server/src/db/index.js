// Seletor da camada de persistência. Prioridade:
//   1. DATABASE_URL definida  -> Postgres (home server / avançado)
//   2. node:sqlite disponível -> SQLite local automático (Node >=22.5 e Electron)
//   3. senão                  -> memória (Node antigo; nada persiste, como antes)
//
// A API pública é idêntica nos três drivers; quem consome (enricher, rotas)
// não sabe qual está ativo. `dbKind` sai no GET /api/status pra debug/UI.

function memoryDriver() {
  const noop = async () => {};
  return {
    dbEnabled: false,
    initDb: async () => {
      console.log('[db] sem DATABASE_URL e sem node:sqlite (Node < 22.5) — rodando em memória. Atualize pro Node 22+ pra ter histórico salvo.');
      return false;
    },
    saveSearch: noop,
    saveEnrichment: noop,
    saveStage: noop,
    saveLeadFields: noop,
    loadSearch: async () => null,
    statsConversao: async () => null,
    findDupLeads: async () => new Map(),
    listSearches: async () => [],
  };
}

let impl;
let kind;
if (process.env.DATABASE_URL) {
  impl = await import('./postgres.js');
  kind = 'postgres';
} else if (typeof process.getBuiltinModule === 'function' && process.getBuiltinModule('node:sqlite')?.DatabaseSync) {
  impl = await import('./sqlite.js');
  kind = 'sqlite';
} else {
  impl = memoryDriver();
  kind = 'memory';
}

export const dbKind = kind;
export const { dbEnabled, initDb, saveSearch, saveEnrichment, saveStage, saveLeadFields, loadSearch, statsConversao, findDupLeads, listSearches } = impl;
