import { type Terreno } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { SeletorDeTerreno } from './SeletorDeTerreno'

interface PainelCenarioProps {
  /** Null é a borracha. */
  terreno: Terreno | null
  aoTerreno: (t: Terreno | null) => void
  aoLimpar: () => void
  aoConcluir: () => void
  /** Abre os modelos de mapa (troca o cenário todo). */
  aoModelos: () => void
  temCenario: boolean
}

/**
 * Painel de montar o cenário, no lugar do painel da peça enquanto o mestre estiver no modo Cenário.
 * Escolha o terreno e clique ou arraste sobre o tabuleiro: as casas por onde passar são pintadas de uma vez. Para o mapa pronto, use um modelo.
 */
export function PainelCenario({ terreno, aoTerreno, aoLimpar, aoConcluir, aoModelos, temCenario }: PainelCenarioProps) {
  return (
    <section aria-label="Montar cenário" className="flex min-h-30 flex-col justify-center gap-2 rounded-cordel border-2 border-borda bg-superficie px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-display text-lg">Cenário</p>
        <p className="text-sm text-tinta-suave">Clique ou arraste no mapa para pintar.</p>
        <div className="ml-auto flex gap-2">
          <Botao tamanho="pequeno" aria-haspopup="dialog" onClick={aoModelos}>
            Modelos de mapa
          </Botao>
          <Botao tamanho="pequeno" disabled={!temCenario} onClick={aoLimpar}>
            Limpar tudo
          </Botao>
          <Botao variante="principal" tamanho="pequeno" onClick={aoConcluir}>
            Concluir
          </Botao>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
        <SeletorDeTerreno terreno={terreno} aoEscolher={aoTerreno} />
        <button
          type="button"
          aria-pressed={terreno === null}
          onClick={() => aoTerreno(null)}
          className="flex min-h-11 items-center gap-2 rounded-cordel border-2 border-transparent px-2 text-sm font-bold aria-pressed:border-borda aria-pressed:bg-fundo"
        >
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-cordel border-2 border-dashed border-borda font-display text-lg">
            ×
          </span>
          Apagar
        </button>
      </div>
    </section>
  )
}
