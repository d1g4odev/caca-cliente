// Normalização de telefones brasileiros para o formato wa.me (55 + DDD + número).
// O wa.me aceita apenas dígitos (sem +, espaços, parênteses ou traços).
//
// Exemplos:
//   "(11) 98888-7777"   -> "5511988887777"
//   "11 98888-7777"     -> "5511988887777"
//   "+55 11 98888-7777" -> "5511988887777"
//   "0800 123 4567"     -> null (não é celular/fixo com DDD)
//
// Regras:
//   - Apenas dígitos sobrevivem.
//   - Se começar com 55 e tiver 12-13 dígitos, assume que o 55 já é o código do Brasil.
//   - Sem o 55, prefixa com 55.
//   - Aceita celulares (11 dígitos com 9 na frente) e fixos (10 dígitos).
//   - Rejeita números especiais (0800, 0300, 100, 190, etc.) e comprimentos inválidos.

const ONLY_DIGITS = (s) => (s ?? '').toString().replace(/\D+/g, '');

const SPECIAL_PREFIXES = ['0800', '0300', '0500', '0900', '100', '190', '192', '193', '197', '198', '199'];

export function normalizeWhatsApp(input) {
  const digits = ONLY_DIGITS(input);
  if (!digits) return null;

  // Serviços especiais / emergência: não são celulares válidos para WhatsApp.
  if (SPECIAL_PREFIXES.some((p) => digits.startsWith(p))) return null;

  let n = digits;

  // Se veio com código do Brasil (55) e o restante tem 10-11 dígitos, mantém.
  if (n.startsWith('55') && (n.length === 12 || n.length === 13)) {
    // ok, já está no formato wa.me
  } else {
    // Sem o 55: prefixa. Precisa ter 10 (fixo) ou 11 (celular) dígitos.
    if (n.length !== 10 && n.length !== 11) return null;
    n = '55' + n;
  }

  // Validação final: 12 (fixo) ou 13 (celular) dígitos no total.
  if (n.length !== 12 && n.length !== 13) return null;

  // DDD válido: 11 a 99 (não existe DDD 10 nem 0X).
  const ddd = Number(n.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;

  return n;
}

// Monta a URL completa do WhatsApp (https://wa.me/<numero>) ou devolve null.
export function toWhatsAppUrl(input) {
  const n = normalizeWhatsApp(input);
  return n ? `https://wa.me/${n}` : null;
}

// Verdadeiro se o telefone normaliza para um número brasileiro válido.
export function isValidWhatsApp(input) {
  return normalizeWhatsApp(input) !== null;
}
