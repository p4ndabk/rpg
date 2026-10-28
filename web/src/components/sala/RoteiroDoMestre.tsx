import type { Passo, PassoId } from '../../lib/roteiro'
import { Botao } from '../ui/Botao'
import { IconeCheck } from '../ui/Icones'

interface RoteiroDoMestreProps {
  passos: Passo[]
  /** O que cada botão faz. Passo feito não tem botão. */
  acoes: Record<PassoId, { rotulo: string; aoClicar: () => void; desabilitado?: boolean; dica?: string }>
  aoDispensar: () => void
}

/** Quatro passos para a mesa ficar pronta. Cada um se marca sozinho; o próximo pendente leva o botão principal. */
export function RoteiroDoMestre({ passos, acoes, aoDispensar }: RoteiroDoMestreProps) {
  const proximo = passos.find((p) => !p.feito)
  const feitos = passos.filter((p) => p.feito).length
  return (
    <section aria-labelledby="titulo-roteiro" className="space-y-2 rounded-cordel border-2 border-borda bg-superficie p-3 shadow-carimbo-pequeno">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="titulo-roteiro" className="font-display text-lg">
          Prepare a mesa
        </h2>
        <span className="text-xs font-bold text-tinta-suave">
          {feitos} de {passos.length}
        </span>
      </div>
      <ol className="space-y-1.5">
        {passos.map((p) => {
          const acao = acoes[p.id]
          return (
            <li key={p.id} className="flex min-h-11 items-center justify-between gap-2">
              <span className={`flex items-center gap-2 ${p.feito ? 'text-tinta-suave line-through' : 'font-bold'}`}>
                {/* Quadrado cheio com o visto = feito; vazio = falta. Nunca só a cor. */}
                <span aria-hidden className={`grid size-5 shrink-0 place-items-center border-2 border-borda ${p.feito ? 'bg-verde text-sobre-verde' : ''}`}>
                  {p.feito && <IconeCheck className="size-3.5" />}
                </span>
                {p.rotulo}
                <span className="sr-only">{p.feito ? ' (feito)' : ' (falta)'}</span>
              </span>
              {!p.feito && (
                <Botao
                  tamanho="pequeno"
                  variante={p === proximo ? 'principal' : 'secundario'}
                  disabled={acao.desabilitado}
                  title={acao.dica}
                  onClick={acao.aoClicar}
                >
                  {acao.rotulo}
                </Botao>
              )}
            </li>
          )
        })}
      </ol>
      <button type="button" onClick={aoDispensar} className="min-h-11 text-sm font-bold text-tinta-suave underline hover:text-vermelho">
        Já sei, esconder
      </button>
    </section>
  )
}
