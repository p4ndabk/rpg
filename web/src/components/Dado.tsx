import type { Faces } from '../lib/dados'

export type EstadoDado = 'parado' | 'rolando' | 'normal' | 'destaque' | 'sucesso' | 'alerta' | 'descartado'

type Ponto = readonly [number, number]

interface Geometria {
  contorno: readonly Ponto[]
  linhas: readonly (readonly [Ponto, Ponto])[]
  /** Onde o número fica. */
  centro: Ponto
  /** Tamanho da fonte por quantidade de dígitos (índice 0 = um dígito). */
  fonte: readonly number[]
}

// Coordenadas no viewBox 0..100.

// d20: projeção de um icosaedro. Hexágono por fora, a face de cima no meio e as arestas ligando os dois.
const ICOSAEDRO: Geometria = (() => {
  const face: Ponto[] = [[50, 24], [75, 67], [25, 67]]
  const ligacoes: [Ponto, Ponto][] = [
    [face[0]!, [50, 4]],
    [face[0]!, [10.2, 27]],
    [face[0]!, [89.8, 27]],
    [face[1]!, [89.8, 27]],
    [face[1]!, [89.8, 73]],
    [face[1]!, [50, 96]],
    [face[2]!, [10.2, 73]],
    [face[2]!, [10.2, 27]],
    [face[2]!, [50, 96]],
  ]
  return {
    contorno: [[50, 4], [89.8, 27], [89.8, 73], [50, 96], [10.2, 73], [10.2, 27]],
    linhas: [...ligacoes, ...face.map((p, i) => [p, face[(i + 1) % 3]!] as const)],
    centro: [50, 53],
    fonte: [19, 17],
  }
})()

/** Demais dados: o contorno com uma face lapidada no meio, ligada aos cantos. */
function lapidado(contorno: Ponto[], centro: Ponto, recuo: number, fonte: number[]): Geometria {
  const [cx, cy] = centro
  const face = contorno.map(([x, y]): Ponto => [cx + (x - cx) * recuo, cy + (y - cy) * recuo])
  return {
    contorno,
    linhas: [
      ...contorno.map((p, i) => [p, face[i]!] as const),
      ...face.map((p, i) => [p, face[(i + 1) % face.length]!] as const),
    ],
    centro,
    fonte,
  }
}

const pentagono = Array.from({ length: 5 }, (_, i): Ponto => {
  const angulo = ((-90 + 72 * i) * Math.PI) / 180
  return [50 + 47 * Math.cos(angulo), 54 + 47 * Math.sin(angulo)]
})

const CUBO = lapidado([[8, 8], [92, 8], [92, 92], [8, 92]], [50, 50], 0.68, [32, 28])
// d10: pipa com a ponta de baixo bem mais longa, para não confundir com o losango do d8.
const PIPA = lapidado([[50, 4], [95, 32], [50, 96], [5, 32]], [50, 40], 0.62, [26, 24, 19, 14])

// d8: octaedro visto de frente, um losango dividido em duas faces pela linha do meio.
const OCTAEDRO: Geometria = {
  contorno: [[50, 4], [94, 50], [50, 96], [6, 50]],
  linhas: [[[6, 50], [94, 50]]],
  centro: [50, 36],
  fonte: [26, 22],
}

// d100 e d1000 usam a forma do d10, como o par de dados de porcentagem.
const GEOMETRIAS: Record<Faces, Geometria> = {
  3: CUBO,
  4: lapidado([[50, 5], [95, 88], [5, 88]], [50, 61], 0.52, [24]),
  6: CUBO,
  8: OCTAEDRO,
  10: PIPA,
  12: lapidado(pentagono, [50, 54], 0.6, [28, 24]),
  20: ICOSAEDRO,
  100: PIPA,
  1000: PIPA,
}

const CORES: Record<EstadoDado, { corpo: string; traco: string; numero: string }> = {
  parado: { corpo: 'fill-superficie', traco: 'stroke-tinta', numero: 'fill-tinta-suave' },
  rolando: { corpo: 'fill-superficie', traco: 'stroke-tinta', numero: 'fill-tinta' },
  normal: { corpo: 'fill-superficie', traco: 'stroke-tinta', numero: 'fill-tinta' },
  descartado: { corpo: 'fill-superficie', traco: 'stroke-tinta', numero: 'fill-tinta' },
  destaque: { corpo: 'fill-tinta', traco: 'stroke-fundo', numero: 'fill-fundo' },
  sucesso: { corpo: 'fill-verde', traco: 'stroke-sobre-verde', numero: 'fill-sobre-verde' },
  alerta: { corpo: 'fill-vermelho', traco: 'stroke-sobre-vermelho', numero: 'fill-sobre-vermelho' },
}

const pontos = (lista: readonly Ponto[]) => lista.map((p) => p.join(',')).join(' ')

interface DadoProps {
  faces: Faces
  /** Sem valor, desenha só o contorno em currentColor, para usar como ícone. */
  valor?: number
  estado?: EstadoDado
  className?: string
}

/** Desenho do dado. É decorativo: o resultado é anunciado em texto por quem usa. */
export function Dado({ faces, valor, estado = 'normal', className = '' }: DadoProps) {
  const g = GEOMETRIAS[faces]
  const linhas = g.linhas.map(([[x1, y1], [x2, y2]]) => (
    <line key={`${x1},${y1},${x2},${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
  ))

  if (valor === undefined) {
    return (
      <svg viewBox="-4 -4 108 108" aria-hidden="true" fill="none" stroke="currentColor" strokeLinejoin="round" className={className}>
        <polygon points={pontos(g.contorno)} strokeWidth={8} />
        <g strokeWidth={4}>{linhas}</g>
      </svg>
    )
  }

  const cores = CORES[estado]
  const digitos = String(valor).length
  return (
    <svg
      viewBox="-2 -2 108 108"
      aria-hidden="true"
      className={`${className} ${estado === 'rolando' ? 'animate-rolar' : ''} ${estado === 'descartado' ? 'opacity-40' : ''}`}
    >
      {/* Sombra carimbo: o mesmo contorno deslocado, sem blur. */}
      <polygon points={pontos(g.contorno)} transform="translate(4 4)" className="fill-tinta" />
      <polygon points={pontos(g.contorno)} strokeWidth={3} strokeLinejoin="round" className={`${cores.corpo} stroke-tinta`} />
      <g strokeWidth={1.75} strokeLinecap="round" className={cores.traco}>
        {linhas}
      </g>
      <text
        x={g.centro[0]}
        y={g.centro[1]}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={g.fonte[Math.min(digitos, g.fonte.length) - 1]}
        className={`font-display ${cores.numero}`}
      >
        {valor}
      </text>
    </svg>
  )
}
