// Retry com backoff exponencial + mensagens de erro amigáveis para o front.
//
// Uso típico:
//   const data = await withRetry(fetchOverpass, {
//     label: 'Overpass',
//     retries: 3,
//     baseMs: 800,
//   });
//
// - retries: quantas tentativas após a primeira falha (default 3).
// - baseMs: atraso da 1ª retry; cresce exponencialmente (baseMs * 2^k).
// - onRetry: callback opcional (attempt, error, waitMs) para logging/SSE.
// - shouldRetry: filtro opcional — se retorn false, relança imediatamente
//   (ex: erro 400 do Nominatim não adianta repetir).
//
// A mensagem final é amigável: inclui o label do serviço, quantas tentativas
// falharam, e o último erro. O front pode exibir direto pro usuário.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class RetryError extends Error {
  constructor(label, attempts, lastErr) {
    const last = lastErr?.message ?? String(lastErr);
    super(`${label} indisponível após ${attempts} tentativa(s). Último erro: ${last}`);
    this.name = 'RetryError';
    this.label = label;
    this.attempts = attempts;
    this.lastError = lastErr;
  }
}

export async function withRetry(fn, opts = {}) {
  const {
    label = 'serviço',
    retries = 3,
    baseMs = 800,
    factor = 2,
    jitter = 0.25,
    shouldRetry = () => true,
    onRetry,
  } = opts;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err, attempt)) {
        throw new RetryError(label, attempt + 1, err);
      }
      const waitMs = Math.round(baseMs * Math.pow(factor, attempt) * (1 + (Math.random() - 0.5) * jitter));
      if (onRetry) {
        try { onRetry(attempt + 1, err, waitMs); } catch {}
      }
      await sleep(waitMs);
    }
  }
  // Inalcançável: o loop acima sempre retorna ou lança.
  throw new RetryError(label, retries + 1, lastErr);
}

// Helper para classificar erros HTTP: 4xx (exceto 429) não vale retry.
export function isTransientHttpError(err) {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status;
  if (!status) return true; // erro de rede (ECONNRESET, ETIMEDOUT, etc.) — vale retry.
  if (status === 429) return true; // rate limit — vale retry com backoff.
  if (status >= 500) return true; // erro do servidor — vale retry.
  return false; // 4xx (exceto 429) — não vale retry.
}
