import type { CSSProperties } from 'react'

const CORES = ['bg-verde', 'bg-tinta', 'bg-vermelho']

// Lascas de papel em círculo, com distância e giro variando para não parecer carimbo repetido.
const LASCAS = Array.from({ length: 14 }, (_, i) => {
  const angulo = (i / 14) * Math.PI * 2
  const distancia = 90 + (i % 3) * 30
  return {
    cor: CORES[i % CORES.length]!,
    estilo: {
      '--x': `${Math.cos(angulo) * distancia}px`,
      '--y': `${Math.sin(angulo) * distancia}px`,
      '--giro': `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
    } as CSSProperties,
  }
})

/** Comemoração do 20 natural: lascas de papel saindo do dado. Decorativa. */
export function Explosao() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
      {LASCAS.map((l, i) => (
        <span key={i} style={l.estilo} className={`col-start-1 row-start-1 size-3 rounded-cordel border-2 border-borda ${l.cor} animate-voar`} />
      ))}
    </span>
  )
}
