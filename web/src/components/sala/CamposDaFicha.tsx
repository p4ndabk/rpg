import { useState, type FormEvent } from 'react'
import { BONUS_INICIATIVA_MAX, CLASSES, BONUS_INICIATIVA_MIN, CD_FICHA_MAX, CD_FICHA_MIN, DESCRICAO_MAX, type CamposFicha, type Peca } from '../../lib/sala'
import { Botao } from '../ui/Botao'

interface CamposDaFichaProps {
  peca: Peca
  aoSalvar: (campos: CamposFicha) => void
  /** Texto do botão de salvar. */
  rotulo?: string
}

const campoNumero = 'w-24 rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-center font-display text-xl text-tinta placeholder:font-sans placeholder:text-base placeholder:text-tinta-suave'

/**
 * O que se escreve na ficha de um personagem: a descrição, a CD e o bônus de iniciativa. É o mesmo formulário para
 * quem joga (na ficha do próprio personagem) e para o mestre (na ficha de qualquer peça).
 */
export function CamposDaFicha({ peca, aoSalvar, rotulo = 'Salvar ficha' }: CamposDaFichaProps) {
  const [descricao, setDescricao] = useState(peca.descricao ?? '')
  const [cdTxt, setCdTxt] = useState(peca.cd !== undefined ? String(peca.cd) : '')
  const [bonusTxt, setBonusTxt] = useState(String(peca.bonusIniciativa ?? 0))
  const [classe, setClasse] = useState(peca.classe ?? '')

  const cdDigitada = Number.parseInt(cdTxt, 10)
  const cd = Number.isInteger(cdDigitada) ? Math.min(CD_FICHA_MAX, Math.max(CD_FICHA_MIN, cdDigitada)) : null
  const bonusDigitado = Number.parseInt(bonusTxt, 10)
  const bonus = Math.min(BONUS_INICIATIVA_MAX, Math.max(BONUS_INICIATIVA_MIN, Number.isInteger(bonusDigitado) ? bonusDigitado : 0))
  const mudou = descricao.trim() !== (peca.descricao ?? '') || cd !== (peca.cd ?? null) || bonus !== (peca.bonusIniciativa ?? 0) || (peca.tipo === 'personagem' && classe !== (peca.classe ?? ''))

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    aoSalvar({ descricao, cd, bonusIniciativa: bonus, ...(peca.tipo === 'personagem' ? { classe } : {}) })
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="ficha-descricao" className="font-bold">
          Descrição
        </label>
        <textarea
          id="ficha-descricao"
          value={descricao}
          maxLength={DESCRICAO_MAX}
          rows={6}
          placeholder="Quem é, como se parece, de onde vem, o que quer…"
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full resize-y rounded-cordel border-2 border-borda bg-superficie p-3 text-tinta placeholder:text-tinta-suave"
        />
        <p className="text-right text-xs text-tinta-suave">
          {descricao.length}/{DESCRICAO_MAX}
        </p>
      </div>

      {peca.tipo === 'personagem' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="ficha-classe" className="font-bold">
            Classe (o emblema na ficha)
          </label>
          <select
            id="ficha-classe"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            className="min-h-11 w-full max-w-64 rounded-cordel border-2 border-borda bg-superficie px-3 text-tinta"
          >
            <option value="">Pelo nome do personagem</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="ficha-cd" className="font-bold">
            CD
          </label>
          <input
            id="ficha-cd"
            type="number"
            inputMode="numeric"
            min={CD_FICHA_MIN}
            max={CD_FICHA_MAX}
            value={cdTxt}
            placeholder="—"
            aria-describedby="ajuda-cd"
            onChange={(e) => setCdTxt(e.target.value)}
            className={campoNumero}
          />
          <p id="ajuda-cd" className="max-w-48 text-xs text-tinta-suave">
            A CD do personagem (a de magia ou de resistência, por exemplo). De {CD_FICHA_MIN} a {CD_FICHA_MAX}; vazio tira.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ficha-bonus" className="font-bold">
            Bônus de iniciativa
          </label>
          <input
            id="ficha-bonus"
            type="number"
            inputMode="numeric"
            min={BONUS_INICIATIVA_MIN}
            max={BONUS_INICIATIVA_MAX}
            value={bonusTxt}
            aria-describedby="ajuda-bonus"
            onChange={(e) => setBonusTxt(e.target.value)}
            className={campoNumero}
          />
          <p id="ajuda-bonus" className="max-w-48 text-xs text-tinta-suave">
            Soma ao D20 quando o combate começa. Ex.: +3 de Destreza.
          </p>
        </div>
      </div>

      <Botao type="submit" variante="principal" disabled={!mudou}>
        {rotulo}
      </Botao>
    </form>
  )
}
