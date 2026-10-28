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

export const chavePublicaDoNavegador = (): string => getPublicKey(chaveDoNavegador())
