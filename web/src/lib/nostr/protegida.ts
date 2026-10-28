import type { Event, EventTemplate } from 'nostr-tools'
import { abrir, chaveDoCofre, trancar } from '../cofre'

// Sala com senha (só nos relays). A foto e os pedidos vão trancados com uma chave tirada da senha (ver cofre.ts), então
// quem não sabe a senha lê só texto ilegível e não consegue mandar um pedido que o mestre aceite. A etiqueta pública
// `protegida` serve para a tela de entrada saber que é preciso pedir a senha. Sem senha, nada muda.

export const ETIQUETA_PROTEGIDA = 'protegida'
export const TAMANHO_MINIMO_SENHA_SALA = 4

/** A chave da sala: o sal é o id da sala, então a mesma senha em duas salas dá chaves diferentes. */
export const chaveDaSala = (senha: string, salaId: string, voltas?: number): Promise<CryptoKey> => chaveDoCofre(senha, `sala:${salaId}`, voltas)

type Corpo = Pick<Event, 'tags' | 'content'>

export const ehProtegida = (e: Pick<Event, 'tags'>): boolean => e.tags.some((t) => t[0] === ETIQUETA_PROTEGIDA && t[1] === '1')

/** Tranca o conteúdo do evento e marca como protegido (as etiquetas, como `d` e `expiration`, continuam abertas). */
export async function proteger(modelo: EventTemplate, chave: CryptoKey): Promise<EventTemplate> {
  return { ...modelo, tags: [...modelo.tags, [ETIQUETA_PROTEGIDA, '1']], content: await trancar(modelo.content, chave) }
}

/**
 * O evento com o conteúdo aberto, ou null se não vale: protegido sem chave, chave errada, ou evento aberto numa sala
 * que tem senha (quem não sabe a senha não pode se passar por quem sabe).
 */
export async function desproteger<E extends Corpo>(e: E, chave: CryptoKey | null): Promise<E | null> {
  if (!ehProtegida(e)) return chave ? null : e
  if (!chave) return null
  const claro = await abrir(e.content, chave)
  return claro === null ? null : { ...e, content: claro }
}

/** A senha que o mestre pôs numa sala, como fica guardada neste navegador. */
export function lerSenhaDaSala(v: unknown): { sala: string; senha: string } | null {
  if (typeof v !== 'object' || v === null) return null
  const { sala, senha } = v as { sala?: unknown; senha?: unknown }
  return typeof sala === 'string' && typeof senha === 'string' && senha.length > 0 ? { sala, senha: senha.slice(0, 100) } : null
}
