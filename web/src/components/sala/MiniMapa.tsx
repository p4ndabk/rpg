import { TERRENOS, type CasaDeCenario } from '../../lib/sala'

/** Cor de cada terreno na miniatura: só tokens. */
export function corNaMiniatura(terreno: string): string {
  const t = TERRENOS.find((x) => x.valor === terreno)
  if (!t) return 'fill-tinta-suave'
  if (terreno === 'lava' || terreno === 'armadilha' || terreno === 'fogueira') return 'fill-vermelho'
  if (t.bloqueia) return 'fill-tinta'
  if (t.grupo === 'Piso') return 'fill-tinta/10'
  return 'fill-tinta-suave'
}

export interface Trecho {
  t: string
  l: number
  de: number
  ate: number
}

/** Casas seguidas da mesma linha e terreno viram um retângulo só (mapa de 2500 casas fica com poucas centenas). */
export function trechosDoCenario(cenario: CasaDeCenario[]): Trecho[] {
  const trechos: Trecho[] = []
  for (const c of [...cenario].sort((a, b) => a.linha - b.linha || a.coluna - b.coluna)) {
    const u = trechos[trechos.length - 1]
    if (u && u.t === c.terreno && u.l === c.linha && u.ate === c.coluna - 1) u.ate = c.coluna
    else trechos.push({ t: c.terreno, l: c.linha, de: c.coluna, ate: c.coluna })
  }
  return trechos
}

/** O cenário em miniatura, para escolher um modelo. Decorativo: o nome e a descrição vão ao lado. */
export function MiniMapa({ colunas, linhas, cenario, lado = 112, className = '' }: { colunas: number; linhas: number; cenario: CasaDeCenario[]; lado?: number; className?: string }) {
  const e = Math.min(lado / colunas, lado / linhas)
  return (
    <svg aria-hidden="true" width={colunas * e} height={linhas * e} viewBox={`0 0 ${colunas} ${linhas}`} className={`shrink-0 border-2 border-borda ${className}`}>
      <rect width={colunas} height={linhas} className="fill-fundo" />
      {trechosDoCenario(cenario).map((t, i) => (
        <rect key={i} x={t.de} y={t.l} width={t.ate - t.de + 1} height={1} className={corNaMiniatura(t.t)} />
      ))}
    </svg>
  )
}
