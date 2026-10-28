// Onde está o servidor da sala. Ordem: o que a pessoa escolheu no painel Compartilhar, o `VITE_SERVIDOR` do build e,
// por fim, a mesma máquina que serve o app, na porta 8787 (assim funciona em localhost e na rede de casa).

export const PORTA_PADRAO = 8787
const CHAVE_SERVIDOR = 'rpg:servidor'

export function urlPadraoDoServidor(): string {
  const doBuild = (import.meta.env.VITE_SERVIDOR as string | undefined)?.trim()
  if (doBuild) return doBuild
  const seguro = location.protocol === 'https:'
  return `${seguro ? 'wss' : 'ws'}://${location.hostname || 'localhost'}:${PORTA_PADRAO}`
}

/** Só aceita endereços ws:// e wss://. */
export function normalizarServidor(texto: string): string | null {
  const url = texto.trim().replace(/\/+$/, '')
  return /^wss?:\/\/[^\s/]+(:\d+)?$/.test(url) ? url : null
}

export function urlDoServidor(): string {
  try {
    return normalizarServidor(localStorage.getItem(CHAVE_SERVIDOR) ?? '') ?? urlPadraoDoServidor()
  } catch {
    return urlPadraoDoServidor()
  }
}

/** Guarda o endereço escolhido; vazio volta ao padrão. Devolve o endereço em uso. */
export function guardarServidor(texto: string): string {
  try {
    const url = normalizarServidor(texto)
    if (url) localStorage.setItem(CHAVE_SERVIDOR, url)
    else localStorage.removeItem(CHAVE_SERVIDOR)
  } catch {
    // sem armazenamento: vale o padrão
  }
  return urlDoServidor()
}
