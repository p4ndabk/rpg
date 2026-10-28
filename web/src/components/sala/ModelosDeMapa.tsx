import { cenarioDoModelo, MODELOS, type Modelo } from '../../lib/modelos'
import { MiniMapa } from './MiniMapa'

interface ModelosDeMapaProps {
  /** O modelo marcado (ao criar a sala). */
  escolhido?: string
  aoEscolher: (modelo: Modelo) => void
  /** Texto do botão de cada cartão. */
  rotuloDoBotao?: string
  /** Numa gaveta estreita, os cartões vão um embaixo do outro. */
  umaColuna?: boolean
}

/** Lista de mapas prontos, com a miniatura, o tamanho e quando usar cada um. */
export function ModelosDeMapa({ escolhido, aoEscolher, rotuloDoBotao = 'Usar', umaColuna = false }: ModelosDeMapaProps) {
  return (
    <ul className={`grid gap-3 ${umaColuna ? '' : 'sm:grid-cols-2'}`}>
      {MODELOS.map((m) => {
        const marcado = escolhido === m.id
        return (
          <li key={m.id} className={`flex gap-3 rounded-cordel border-2 bg-superficie p-3 shadow-carimbo-pequeno ${marcado ? 'border-vermelho' : 'border-borda'}`}>
            <MiniMapa colunas={m.colunas} linhas={m.linhas} cenario={cenarioDoModelo(m)} lado={84} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-lg">{m.nome}</span>
                <span className="text-xs font-bold text-tinta-suave">
                  {m.colunas} × {m.linhas}
                </span>
              </p>
              <p className="text-sm">{m.descricao}</p>
              <p className="text-xs text-tinta-suave">{m.dica}</p>
              <button
                type="button"
                aria-pressed={escolhido === undefined ? undefined : marcado}
                aria-label={`${rotuloDoBotao} o modelo ${m.nome}`}
                onClick={() => aoEscolher(m)}
                className="mt-auto min-h-10 self-start rounded-cordel border-2 border-borda bg-superficie px-3 text-sm font-bold shadow-carimbo-pequeno aria-pressed:bg-tinta aria-pressed:text-fundo"
              >
                {marcado ? 'Escolhido' : rotuloDoBotao}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
