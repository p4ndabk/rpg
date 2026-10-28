import { lerGuardada, type Guardada } from './salas'

// A sala num arquivo .json, para levar a outro navegador ou computador. Os relays guardam só a foto pública; o resto
// (escondidos, notas, vida base) mora no navegador do mestre, e este arquivo é o jeito de não perdê-lo.
// Leva também a chave que assina a foto nos relays: com ela o convite antigo continua valendo no navegador novo.
// O arquivo NÃO leva a nsec da pessoa.

const MARCA = 'rpg-sala'
const CHAVE_HEX = /^[0-9a-f]{64}$/

export interface ArquivoDeSala {
  guardada: Guardada
  /** Chave (hex) que assina a foto nos relays; null se o arquivo não traz uma válida. */
  chaveNostr: string | null
}

export function montarArquivoSala(g: Guardada, chaveNostr: string | null): string {
  return JSON.stringify({ v: 1, tipo: MARCA, ...g, ...(chaveNostr ? { chaveNostr } : {}) }, null, 1)
}

/** Lê o texto de um arquivo de sala; null se não for um (ou se a sala dentro estiver corrompida). */
export function lerArquivoSala(texto: string): ArquivoDeSala | null {
  let v: unknown
  try {
    v = JSON.parse(texto)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null || (v as { tipo?: unknown }).tipo !== MARCA) return null
  const guardada = lerGuardada(v)
  if (!guardada) return null
  const chave = (v as { chaveNostr?: unknown }).chaveNostr
  return { guardada, chaveNostr: typeof chave === 'string' && CHAVE_HEX.test(chave) ? chave : null }
}

export function nomeDoArquivoSala(nome: string): string {
  const slug = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
  return `rpg-sala-${slug || 'sem-nome'}.json`
}
