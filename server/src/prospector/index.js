// Ponto único de import do módulo prospector. Engine puro, sem side effects,
// sem depender de Express ou banco — fácil de testar isoladamente.
export { gerarMensagem, ANGULOS, TIPOS_MENSAGEM, PROXIMAS_ACOES } from './engine.js';
