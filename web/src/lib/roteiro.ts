import type { Sala } from './sala'

// O roteiro do mestre: quatro passos para uma mesa pronta. Cada um se marca sozinho a partir do estado da sala.

export type PassoId = 'mapa' | 'monstros' | 'turma' | 'combate'

export interface Passo {
  id: PassoId
  rotulo: string
  feito: boolean
}

/** Os passos, na ordem, e quais já estão feitos. `jogadores` é quem já entrou além do mestre. */
export function passosDoRoteiro(sala: Pick<Sala, 'cenario' | 'pecas' | 'combate'>, jogadores: number, combateJaIniciado = false): Passo[] {
  return [
    { id: 'mapa', rotulo: 'Escolha um mapa', feito: (sala.cenario?.length ?? 0) > 0 },
    { id: 'monstros', rotulo: 'Coloque os monstros', feito: sala.pecas.some((p) => p.tipo === 'monstro') },
    { id: 'turma', rotulo: 'Chame a turma', feito: jogadores > 0 },
    { id: 'combate', rotulo: 'Inicie o combate', feito: sala.combate !== null || combateJaIniciado },
  ]
}

export const roteiroCompleto = (passos: Passo[]): boolean => passos.every((p) => p.feito)

/** Lê a lista de salas em que o roteiro foi dispensado. */
export function lerDispensadas(v: unknown): string[] | null {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-50) : null
}
