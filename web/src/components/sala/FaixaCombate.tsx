import { daVez, type Sala } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { Ficha } from './Ficha'

interface FaixaCombateProps {
  sala: Sala
  aoPassar: () => void
  /** Só o mestre, ou o dono da peça da vez, passa a vez. */
  podePassar: boolean
  /** O mestre vê a vida, as condições e as peças escondidas de cada um, e seleciona pela faixa. */
  detalhado?: boolean
  selecionada?: string | null
  aoSelecionar?: (id: string) => void
}

/**
 * Combate por turnos numa faixa fina acima do tabuleiro: rodada, ordem de iniciativa e o botão de passar a vez.
 * Só aparece durante o combate; iniciar fica na barra da sala.
 */
export function FaixaCombate({ sala, aoPassar, podePassar, detalhado = false, selecionada, aoSelecionar }: FaixaCombateProps) {
  const combate = sala.combate
  const vez = daVez(sala)
  if (!combate) return null

  return (
    <section
      aria-labelledby="titulo-combate"
      className="flex items-center gap-3 rounded-cordel border-2 border-borda bg-superficie py-1.5 pr-1.5 pl-3 shadow-carimbo-pequeno"
    >
      <h2 id="titulo-combate" className="shrink-0 font-display text-lg">
        Rodada {combate.rodada}
      </h2>

      <ol aria-label="Ordem de iniciativa" className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-0.5">
        {combate.ordem.map((o, i) => {
          const peca = sala.pecas.find((p) => p.id === o.id)
          if (!peca) return null
          const atual = i === combate.vez
          const marcada = peca.id === selecionada
          const caida = detalhado && peca.pv === 0
          const condicoes = peca.condicoes ?? []
          const miolo = (
            <>
              <Ficha peca={peca} naVez={atual} caida={caida} />
              <span className="text-left text-sm leading-tight">
                <span className={`block max-w-28 truncate font-bold ${atual ? '' : 'text-tinta-suave'}`}>{peca.nome}</span>
                <span className="flex items-center gap-1.5 text-xs text-tinta-suave">
                  {atual && <span className="font-bold text-tinta">Na vez ·</span>}
                  <span className="sr-only">iniciativa </span>
                  {o.iniciativa}
                  {detalhado && (
                    <>
                      <span className="sr-only">, {caida ? 'caída' : `${peca.pv} de ${peca.pvMax} pontos de vida`}</span>
                      <span aria-hidden="true" className="h-1.5 w-8 border border-borda bg-fundo">
                        <span className={`block h-full ${peca.pv / peca.pvMax <= 0.25 ? 'bg-vermelho' : 'bg-tinta'}`} style={{ width: `${(peca.pv / peca.pvMax) * 100}%` }} />
                      </span>
                      {condicoes.length > 0 && <span title={condicoes.join(', ')}>{condicoes.length}×</span>}
                      {peca.oculta && <span className="font-bold">oculta</span>}
                    </>
                  )}
                </span>
              </span>
            </>
          )
          const classe = `flex shrink-0 items-center gap-1.5 rounded-cordel border-2 py-0.5 pr-2.5 pl-0.5 ${
            atual ? 'border-borda bg-fundo' : 'border-transparent'
          } ${marcada ? 'outline-2 -outline-offset-2 outline-vermelho outline-dashed' : ''} ${peca.oculta ? 'opacity-60' : ''}`
          return (
            <li key={o.id} aria-current={atual ? 'step' : undefined}>
              {aoSelecionar ? (
                <button type="button" aria-pressed={marcada} aria-label={`Selecionar ${peca.nome}`} onClick={() => aoSelecionar(peca.id)} className={`${classe} min-h-11 cursor-pointer hover:bg-tinta/10`}>
                  {miolo}
                </button>
              ) : (
                <div className={classe}>{miolo}</div>
              )}
            </li>
          )
        })}
      </ol>

      {vez && (
        <p role="status" aria-live="polite" className="sr-only">
          Vez de {vez.nome}.
        </p>
      )}
      {podePassar && (
        <Botao variante="principal" tamanho="pequeno" className="shrink-0" title="Atalho: N" onClick={aoPassar}>
          Passar a vez
        </Botao>
      )}
    </section>
  )
}
