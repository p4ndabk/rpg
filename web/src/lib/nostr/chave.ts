import { generateSecretKey, getPublicKey } from 'nostr-tools'
import { bytesToHex, hexToBytes } from 'nostr-tools/utils'

// Todo evento Nostr precisa de assinatura. O app NUNCA guarda a nsec da pessoa; quem assina é uma chave à parte,
// criada neste navegador e sem ligação com a identidade. Ela só prova "esta é a mesma aba do mestre de antes".
// Quem é a pessoa (pubkey e nome) vai dentro do evento, no mesmo nível de confiança do servidor.

const CHAVE = 'rpg:nostr:chave'

export function chaveDoNavegador(): Uint8Array {
  try {
    const salva = localStorage.getItem(CHAVE)
    if (salva && /^[0-9a-f]{64}$/.test(salva)) return hexToBytes(salva)
    const nova = generateSecretKey()
    localStorage.setItem(CHAVE, bytesToHex(nova))
    return nova
  } catch {
    // sem armazenamento: chave só desta aba
    return (memoria ??= generateSecretKey())
  }
}

let memoria: Uint8Array | undefined

/** Passa a assinar com esta chave (a de um arquivo de sala), para os convites antigos seguirem valendo. */
export function adotarChaveDoNavegador(hex: string): void {
  if (!/^[0-9a-f]{64}$/.test(hex)) return
  try {
    localStorage.setItem(CHAVE, hex)
  } catch {
    memoria = hexToBytes(hex)
  }
}

/** A chave do navegador em hexadecimal, para ir dentro de um arquivo de sala. */
export const chaveHexDoNavegador = (): string => bytesToHex(chaveDoNavegador())

export const chavePublicaDoNavegador = (): string => getPublicKey(chaveDoNavegador())
