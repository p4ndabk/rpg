import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CONDICOES, PV_MAX, PV_MIN, type Condicao, type Peca } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { Ficha } from './Ficha'
import { usarMenuFlutuante } from './usarMenuFlutuante'

interface MenuDaPecaProps {
  peca: Peca
  /** Onde o botão direito foi apertado (coordenadas da janela). */
  ponto: { x: number; y: number }
  aoFechar: () => void
  /** Define a vida: o atual e, se mudou, o máximo. */
  aoDefinirVida: (pvMax: number, pv: number) => void
  /** Dano (negativo) ou cura (positivo). */
  aoAlterarPv: (delta: number) => void
  aoCondicao: (c: Condicao) => void
  aoAlternarOculta: () => void
  aoDuplicar: () => void
  aoRemover: () => void
}

/**
 * Menu do botão direito sobre uma peça (mestre). O cursor já cai no campo da vida: digite o número e Enter, e a
 * vida da peça fica exatamente nele. Também dá para dar dano ou cura, mudar condições, esconder, duplicar e remover.
 */
export function MenuDaPeca({ peca, ponto, aoFechar, aoDefinirVida, aoAlterarPv, aoCondicao, aoAlternarOculta, aoDuplicar, aoRemover }: MenuDaPecaProps) {
  const { raiz, lugar } = usarMenuFlutuante(ponto, aoFechar)
  const campoVida = useRef<HTMLInputElement>(null)
  const [atualTxt, setAtualTxt] = useState(String(peca.pv))
  const [maximoTxt, setMaximoTxt] = useState(String(peca.pvMax))
  const [danoTxt, setDanoTxt] = useState('')

  useEffect(() => {
    campoVida.current?.focus()
    campoVida.current?.select()
  }, [])

  const maximo = Math.min(PV_MAX, Math.max(PV_MIN, Number.parseInt(maximoTxt, 10) || peca.pvMax))
  const atualDigitado = Number.parseInt(atualTxt, 10)
  const atual = Math.min(maximo, Math.max(0, Number.isInteger(atualDigitado) ? atualDigitado : peca.pv))
  const dano = Number.parseInt(danoTxt, 10)
  const danoValido = Number.isInteger(dano) && dano > 0

  function definirVida(e: FormEvent) {
    e.preventDefault()
    aoDefinirVida(maximo, atual)
    aoFechar()
  }

  function aplicar(e: FormEvent) {
    e.preventDefault()
    if (!danoValido) return
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    aoAlterarPv(sub?.dataset.cura === 'sim' ? dano : -dano)
    aoFechar()
  }

  return (
    <div
      ref={raiz}
      role="dialog"
      aria-label={`Menu de ${peca.nome}`}
      style={{ left: lugar.x, top: lugar.y }}
      className="fixed z-40 w-72 animate-entrar space-y-3 rounded-cordel border-2 border-borda bg-superficie p-3 shadow-carimbo"
    >
      <div className="flex items-center gap-2">
        <Ficha peca={peca} caida={peca.pv === 0} />
        <p className="min-w-0 flex-1 truncate font-display text-lg">{peca.nome}</p>
        <button type="button" aria-label="Fechar menu" onClick={aoFechar} className="grid size-9 place-items-center rounded-cordel font-bold hover:bg-tinta/10">
          ×
        </button>
      </div>

      <form onSubmit={definirVida} aria-label="Definir a vida" className="space-y-1">
        <p className="text-sm font-bold">Vida</p>
        <div className="flex items-center gap-2">
          <label htmlFor="menu-pv-atual" className="sr-only">
            Vida atual
          </label>
          <input
            id="menu-pv-atual"
            ref={campoVida}
            type="number"
            inputMode="numeric"
            min={0}
            max={maximo}
            value={atualTxt}
            onChange={(e) => setAtualTxt(e.target.value)}
            className="min-h-11 w-20 rounded-cordel border-2 border-borda bg-fundo px-2 text-center font-display text-xl text-tinta"
          />
          <span aria-hidden="true" className="font-bold">
            /
          </span>
          <label htmlFor="menu-pv-max" className="sr-only">
            Vida máxima
          </label>
          <input
            id="menu-pv-max"
            type="number"
            inputMode="numeric"
            min={PV_MIN}
            max={PV_MAX}
            value={maximoTxt}
            onChange={(e) => setMaximoTxt(e.target.value)}
            className="min-h-11 w-20 rounded-cordel border-2 border-borda bg-fundo px-2 text-center font-display text-xl text-tinta"
          />
          <Botao type="submit" variante="principal" tamanho="pequeno">
            Definir
          </Botao>
        </div>
        <p className="text-xs text-tinta-suave">Digite a vida que quiser e aperte Enter. O segundo número é o máximo.</p>
      </form>

      <form onSubmit={aplicar} aria-label="Dano e cura" className="flex items-center gap-2">
        <label htmlFor="menu-dano" className="sr-only">
          Pontos a tirar ou dar
        </label>
        <input
          id="menu-dano"
          type="number"
          inputMode="numeric"
          min={1}
          value={danoTxt}
          placeholder="PV"
          onChange={(e) => setDanoTxt(e.target.value)}
          className="min-h-11 w-20 rounded-cordel border-2 border-borda bg-fundo px-2 text-center font-display text-xl text-tinta placeholder:font-sans placeholder:text-base placeholder:text-tinta-suave"
        />
        <Botao type="submit" tamanho="pequeno" disabled={!danoValido}>
          Dano
        </Botao>
        <Botao type="submit" data-cura="sim" tamanho="pequeno" disabled={!danoValido}>
          Cura
        </Botao>
      </form>

      <div role="group" aria-label="Condições" className="flex flex-wrap gap-1">
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

      <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-tinta-suave pt-3">
        <Botao
          tamanho="pequeno"
          onClick={() => {
            aoAlternarOculta()
            aoFechar()
          }}
        >
          {peca.oculta ? 'Revelar' : 'Esconder'}
        </Botao>
        <Botao
          tamanho="pequeno"
          onClick={() => {
            aoDuplicar()
            aoFechar()
          }}
        >
          Duplicar
        </Botao>
        <Botao
          tamanho="pequeno"
          aria-label={`Remover ${peca.nome} do grid`}
          onClick={() => {
            aoRemover()
            aoFechar()
          }}
        >
          Remover
        </Botao>
      </div>
    </div>
  )
}
