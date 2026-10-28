import { useRef, useState, type FormEvent } from 'react'
import { CONDICOES, type Condicao, type Peca, type Sala } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { Ficha } from './Ficha'

interface PainelPecaProps {
  /** Null: ninguém selecionado. O painel continua ocupando o mesmo espaço, para o tabuleiro não pular. */
  peca: Peca | null
  sala: Sala
  /** Último dado de dano rolado e ainda não aplicado. */
  dano: number | null
  aoAlterarPv: (delta: number) => void
  aoAplicarDano: () => void
  aoAlternarOculta: () => void
  aoCondicao: (c: Condicao) => void
  aoIniciativa: (valor: number) => void
  aoDuplicar: () => void
  aoAbrirFicha: () => void
  aoSoltar: () => void
  aoRemover: () => void
}

/**
 * Painel do mestre, fixo embaixo do tabuleiro. O mais usado fica à mão: dano e cura digitando o número
 * (Enter aplica dano), condições, esconder e duplicar.
 */
export function PainelPeca({
  peca,
  sala,
  dano,
  aoAlterarPv,
  aoAplicarDano,
  aoAlternarOculta,
  aoCondicao,
  aoIniciativa,
  aoDuplicar,
  aoAbrirFicha,
  aoSoltar,
  aoRemover,
}: PainelPecaProps) {
  const [valor, setValor] = useState('')
  const campo = useRef<HTMLInputElement>(null)
  const iniciativa = peca ? sala.combate?.ordem.find((o) => o.id === peca.id)?.iniciativa : undefined
  const numero = Number.parseInt(valor, 10)
  const valido = Number.isInteger(numero) && numero > 0

  function aplicar(sinal: 1 | -1) {
    if (!valido) return
    aoAlterarPv(sinal * numero)
    setValor('')
    campo.current?.focus()
  }

  // Enter = dano; Shift+Enter = cura.
  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    aplicar(sub?.dataset.cura === 'sim' ? 1 : -1)
  }

  return (
    <section aria-label="Painel do mestre" className="flex min-h-30 flex-col justify-center gap-2 rounded-cordel border-2 border-borda bg-superficie px-3 py-2">
      {peca ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <Ficha peca={peca} caida={peca.pv === 0} />
              <div className="min-w-0">
                <p className="max-w-40 truncate font-display text-lg leading-tight">{peca.nome}</p>
                <p className="text-sm font-bold">
                  PV {peca.pv}/{peca.pvMax}
                  {peca.pv === 0 && <span className="text-vermelho"> · caída</span>}
                  {peca.oculta && <span className="font-normal text-tinta-suave"> · escondida</span>}
                </p>
              </div>
            </div>

            <form onSubmit={aoEnviar} className="flex items-center gap-1" aria-label="Dano e cura">
              <label htmlFor="valor-pv" className="sr-only">
                Pontos de vida a tirar ou dar
              </label>
              <input
                ref={campo}
                id="valor-pv"
                type="number"
                inputMode="numeric"
                min={1}
                value={valor}
                placeholder="PV"
                title="Digite o número e aperte Enter para dar dano (D foca aqui)"
                onChange={(e) => setValor(e.target.value)}
                className="min-h-11 w-20 rounded-cordel border-2 border-borda bg-fundo px-2 text-center font-display text-xl text-tinta placeholder:font-sans placeholder:text-base placeholder:text-tinta-suave"
              />
              <Botao type="submit" variante="principal" tamanho="pequeno" disabled={!valido}>
                Dano
              </Botao>
              <Botao type="submit" data-cura="sim" tamanho="pequeno" disabled={!valido}>
                Cura
              </Botao>
              {dano !== null && (
                <Botao tamanho="pequeno" title="Desconta o último dado rolado" onClick={aoAplicarDano}>
                  Aplicar {dano}
                </Botao>
              )}
            </form>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Botao tamanho="pequeno" aria-pressed={peca.oculta === true} title="Atalho: H" onClick={aoAlternarOculta}>
                {peca.oculta ? 'Revelar' : 'Esconder'}
              </Botao>
              <Botao tamanho="pequeno" onClick={aoDuplicar}>
                Duplicar
              </Botao>
              <Botao tamanho="pequeno" aria-haspopup="dialog" title="Vida máxima e atual, dono da peça" onClick={aoAbrirFicha}>
                Ficha
              </Botao>
              <Botao tamanho="pequeno" onClick={aoSoltar}>
                Soltar
              </Botao>
              <Botao tamanho="pequeno" aria-label={`Remover ${peca.nome} do grid`} onClick={aoRemover}>
                Remover
              </Botao>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div role="group" aria-label="Condições" className="flex flex-wrap items-center gap-1">
              {CONDICOES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={(peca.condicoes ?? []).includes(c)}
                  onClick={() => aoCondicao(c)}
                  className="min-h-8 rounded-cordel border-2 border-borda px-2 text-sm font-bold aria-pressed:bg-tinta aria-pressed:text-fundo"
                >
                  {c}
                </button>
              ))}
            </div>
            {iniciativa !== undefined && (
              <div role="group" aria-label="Iniciativa" className="flex items-center gap-1 text-sm font-bold">
                Iniciativa
                <Botao tamanho="icone" aria-label="Diminuir iniciativa" className="min-h-8 min-w-8 text-base" onClick={() => aoIniciativa(iniciativa - 1)}>
                  −
                </Botao>
                <output className="min-w-6 text-center font-display text-lg">{iniciativa}</output>
                <Botao tamanho="icone" aria-label="Aumentar iniciativa" className="min-h-8 min-w-8 text-base" onClick={() => aoIniciativa(iniciativa + 1)}>
                  +
                </Botao>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-tinta-suave">
          Selecione uma peça (no tabuleiro ou na faixa de iniciativa) para dar dano, curar, esconder ou pôr condições.
          <span className="mt-1 block text-sm">Atalhos: N próxima vez · D dano · H esconder · M mover · C cenário · E destaque · Ctrl+Z desfaz · Ctrl+Shift+Z refaz · Esc solta</span>
        </p>
      )}
    </section>
  )
}
