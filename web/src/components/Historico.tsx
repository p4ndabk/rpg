import { useEffect, useRef } from 'react'
import { descrever, nomeDado, notacao, type Rolagem } from '../lib/dados'
import { Botao } from './ui/Botao'
import { IconeRepetir } from './ui/Icones'
import { Selo } from './ui/Selo'

const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function titulo(r: Rolagem): string {
  return r.rotulo || (r.tipo === 'teste' ? 'Teste' : 'Rolagem')
}

function detalhe(r: Rolagem): string {
  return r.tipo === 'teste' ? `${nomeDado(20)} · CD ${r.cd}` : notacao(r.dados.length, r.faces, r.bonus)
}

interface HistoricoProps {
  titulo?: string
  rolagens: Rolagem[]
  aoLimpar: () => void
  aoRepetir: (r: Rolagem) => void
  /** Texto do estado vazio: diz o que fazer para o histórico ganhar a primeira linha. */
  vazio?: string
  /** Log discreto: recolhido, com a última rolagem no resumo e uma linha por rolagem. */
  compacto?: boolean
  podeLimpar?: boolean
}

export function Historico({ compacto = false, ...props }: HistoricoProps) {
  return compacto ? <HistoricoCompacto {...props} /> : <HistoricoCompleto {...props} />
}

function HistoricoCompleto({ titulo: tituloSecao = 'Histórico', rolagens, aoLimpar, aoRepetir, vazio }: HistoricoProps) {
  return (
    <section aria-labelledby="titulo-historico">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-historico" className="font-display text-2xl">
          {tituloSecao}
        </h2>
        {rolagens.length > 0 && (
          <Botao tamanho="pequeno" onClick={aoLimpar}>
            Limpar
          </Botao>
        )}
      </div>

      {rolagens.length === 0 ? (
        <p className="mt-2 rounded-cordel border-2 border-dashed border-tinta-suave p-4 text-tinta-suave">
          {vazio ?? 'Nenhuma rolagem ainda. Role um dado e ela aparece aqui, salva neste navegador.'}
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {rolagens.map((r) => (
            <li key={r.id} className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2 shadow-carimbo-pequeno">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-bold">
                  {titulo(r)} <span className="font-normal text-tinta-suave">· {detalhe(r)}</span>
                </p>
                {r.tipo === 'teste' ? (
                  <Selo desfecho={r.desfecho} />
                ) : (
                  <span className="shrink-0 rounded-cordel border-2 border-borda px-2 font-display text-lg">
                    <span className="sr-only">Total: </span>
                    {r.total}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="min-w-0 text-sm break-words text-tinta-suave">
                  {descrever(r)} · <time dateTime={new Date(r.quando).toISOString()}>{hora.format(r.quando)}</time>
                </p>
                <Botao tamanho="pequeno" aria-label={`Repetir: ${titulo(r)}, ${detalhe(r)}`} onClick={() => aoRepetir(r)}>
                  Repetir
                </Botao>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** Bloco do log: a iniciativa, uma rodada do combate ou o que aconteceu fora de combate. */
function bloco(r: Rolagem): string {
  if (r.iniciativa) return 'Iniciativa'
  return r.rodada ? `Rodada ${r.rodada}` : 'Fora de combate'
}

/** A frase da rolagem, curta, para quem lê o log como uma conversa de mesa. */
function frase(r: Rolagem): string {
  if (r.iniciativa) return r.tipo === 'soma' && r.bonus !== 0 ? `Tirou ${r.total} na iniciativa (${r.total - r.bonus} ${r.bonus > 0 ? '+' : '−'}${Math.abs(r.bonus)}).` : `Tirou ${r.total} na iniciativa.`
  if (r.tipo === 'teste') return `Tirou ${r.total} contra CD ${r.cd}.`
  return `Rolou ${notacao(r.dados.length, r.faces, r.bonus)} e tirou ${r.total}.`
}

/** Quem rolou: o nome dado à rolagem. Rolagens antigas de iniciativa traziam o prefixo "Iniciativa: ". */
function autor(r: Rolagem): string {
  return r.rotulo.replace(/^Iniciativa: /, '') || (r.tipo === 'teste' ? 'Teste' : 'Rolagem')
}

/**
 * Log da sala como conversa de mesa: sempre visível, mais antigo em cima e mais novo embaixo,
 * com um cabeçalho a cada rodada. Rola sozinho para a última linha.
 */
function HistoricoCompacto({ titulo: tituloSecao = 'Histórico', rolagens, aoLimpar, aoRepetir, vazio, podeLimpar = true }: HistoricoProps) {
  const lista = useRef<HTMLDivElement>(null)
  const ultima = rolagens[0]?.id
  // O histórico guarda a mais nova primeiro; o log lê de cima para baixo.
  const cronologico = [...rolagens].reverse()

  useEffect(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [ultima])

  return (
    <section aria-labelledby="titulo-log" className="flex min-h-64 flex-1 flex-col rounded-cordel border-2 border-borda bg-superficie">
      <div className="flex items-center justify-between gap-2 border-b-2 border-borda px-3 py-1.5">
        <h3 id="titulo-log" className="font-display text-lg">
          {tituloSecao} <span className="font-sans text-sm text-tinta-suave">({rolagens.length})</span>
        </h3>
        {rolagens.length > 0 && podeLimpar && (
          <button
            type="button"
            onClick={aoLimpar}
            className="min-h-11 rounded-cordel px-2 text-sm font-bold text-tinta-suave underline hover:text-vermelho"
          >
            Limpar
          </button>
        )}
      </div>

      {rolagens.length === 0 ? (
        <p className="p-3 text-sm text-tinta-suave">{vazio ?? 'Nenhuma rolagem ainda.'}</p>
      ) : (
        <div ref={lista} role="log" aria-label={tituloSecao} className="min-h-0 flex-1 overflow-y-auto">
          <ol>
            {cronologico.map((r, i) => {
              const novoBloco = i === 0 || bloco(cronologico[i - 1]!) !== bloco(r)
              return (
                <li key={r.id} title={hora.format(r.quando)}>
                  {novoBloco && (
                    <p className="sticky top-0 z-10 border-y-2 border-borda bg-fundo px-3 py-0.5 text-xs font-bold tracking-wide text-tinta-suave uppercase first:border-t-0">
                      {bloco(r)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 border-b border-dashed border-tinta-suave/50 py-1.5 pr-1 pl-3">
                    <div className="min-w-0 flex-1 leading-snug">
                      <p className="truncate font-bold">
                        {autor(r)}
                        {r.secreta && <span className="ml-2 rounded-cordel border border-borda px-1 text-xs font-bold tracking-wide uppercase">Secreta</span>}
                      </p>
                      <p className="text-sm text-tinta-suave">{frase(r)}</p>
                    </div>
                    {r.tipo === 'teste' && !r.iniciativa && <Selo desfecho={r.desfecho} />}
                    {!r.iniciativa && (
                      <button
                        type="button"
                        aria-label={`Repetir: ${titulo(r)}, ${detalhe(r)}`}
                        title="Repetir"
                        onClick={() => aoRepetir(r)}
                        className="grid size-11 shrink-0 place-items-center rounded-cordel text-tinta-suave hover:bg-tinta/10 hover:text-tinta"
                      >
                        <IconeRepetir />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}
