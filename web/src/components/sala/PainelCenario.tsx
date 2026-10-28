import { TERRENOS, type Forma, type Terreno } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { AmostraTerreno } from './Terreno'

const FORMAS: { valor: Forma; rotulo: string; dica: string }[] = [
  { valor: 'pincel', rotulo: 'Pincel', dica: 'Arraste pintando casa por casa' },
  { valor: 'linha', rotulo: 'Linha', dica: 'Arraste de um ponto a outro para uma linha reta' },
  { valor: 'retangulo', rotulo: 'Retângulo', dica: 'Arraste na diagonal para preencher uma área' },
  { valor: 'contorno', rotulo: 'Contorno', dica: 'Arraste na diagonal para só o contorno (as paredes de uma sala)' },
]

interface PainelCenarioProps {
  forma: Forma
  /** Null é a borracha. */
  terreno: Terreno | null
  aoForma: (f: Forma) => void
  aoTerreno: (t: Terreno | null) => void
  aoLimpar: () => void
  aoConcluir: () => void
  temCenario: boolean
}

/**
 * Painel de montar o cenário, no lugar do painel da peça enquanto o mestre estiver no modo Cenário.
 * Escolha o terreno e a forma e arraste no tabuleiro.
 */
export function PainelCenario({ forma, terreno, aoForma, aoTerreno, aoLimpar, aoConcluir, temCenario }: PainelCenarioProps) {
  return (
    <section aria-label="Montar cenário" className="flex min-h-30 flex-col justify-center gap-2 rounded-cordel border-2 border-borda bg-superficie px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-display text-lg">Cenário</p>
        <div role="group" aria-label="Forma" className="flex flex-wrap gap-1">
          {FORMAS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={forma === f.valor}
              title={f.dica}
              onClick={() => aoForma(f.valor)}
              className="min-h-9 rounded-cordel border-2 border-borda px-3 text-sm font-bold aria-pressed:bg-tinta aria-pressed:text-fundo"
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Botao tamanho="pequeno" disabled={!temCenario} onClick={aoLimpar}>
            Limpar tudo
          </Botao>
          <Botao variante="principal" tamanho="pequeno" onClick={aoConcluir}>
            Concluir
          </Botao>
        </div>
      </div>

      <div role="group" aria-label="Terreno" className="flex flex-wrap items-center gap-1.5">
        {TERRENOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            aria-pressed={terreno === t.valor}
            title={t.bloqueia ? `${t.rotulo}: barra o caminho` : t.rotulo}
            onClick={() => aoTerreno(t.valor)}
            className="flex min-h-11 items-center gap-2 rounded-cordel border-2 border-transparent pr-2 pl-1 text-sm font-bold aria-pressed:border-borda aria-pressed:bg-fundo"
          >
            <AmostraTerreno tipo={t.valor} />
            {t.rotulo}
          </button>
        ))}
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
