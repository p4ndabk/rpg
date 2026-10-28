import { ler } from './armazenamento'

// Preferências da pessoa, só neste navegador.

/** Toca um som quando chega a vez da pessoa no combate. Liga por padrão. */
export const CHAVE_SOM = 'rpg:som'

export const lerLigado = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)

/** O som do aviso de vez está ligado? (Lido na hora, para valer sem recarregar a página.) */
export const somLigado = (): boolean => ler(CHAVE_SOM, true, lerLigado)
