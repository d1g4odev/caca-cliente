// Fachada de compatibilidade: a implementação mora em db/ (postgres | sqlite |
// memória — ver db/index.js). Mantém os imports existentes ('../db.js') válidos.
export * from './db/index.js';
