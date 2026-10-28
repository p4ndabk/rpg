import { useState, type FormEvent } from 'react'
import { ATALHOS, BASE_OUTRO, pvDaPeca, PV_MAX, PV_MIN, VIDA_DE_FABRICA, type Sala, type TipoPeca } from '../../lib/sala'
import { Botao } from '../ui/Botao'

interface VidaBaseProps {
  sala: Sala
  /** `valores`: nome (ou `#personagem` / `#monstro`) para PV; null volta ao valor de fábrica. */
  aoSalvar: (valores: Record<string, number | null>, nasPecas: boolean) => void
  aoCancelar: () => void
}

const GRUPOS: { tipo: TipoPeca; titulo: string; outro: string }[] = [
  { tipo: 'personagem', titulo: 'Heróis', outro: 'Outros heróis (com nome seu)' },
  { tipo: 'monstro', titulo: 'Monstros', outro: 'Outros monstros (com nome seu)' },
]

const campo = 'w-24 rounded-cordel border-2 border-borda bg-superficie px-2 py-2 text-center font-display text-xl text-tinta placeholder:font-sans placeholder:text-base placeholder:text-tinta-suave'

/**
 * A vida base de cada peça: com quantos pontos de vida ela nasce nesta sala. Vale para quem o mestre chamar daqui
 * em diante e, se ele marcar, também para as peças que já estão no tabuleiro.
 */
export function VidaBase({ sala, aoSalvar, aoCancelar }: VidaBaseProps) {
  // Só o que foi mexido: texto digitado por chave. Vazio quer dizer "valor de fábrica".
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [nasPecas, setNasPecas] = useState(false)

  const atual = (chave: string): string => rascunho[chave] ?? (sala.pvBase?.[chave] !== undefined ? String(sala.pvBase[chave]) : '')
  const mudou = Object.keys(rascunho).length > 0

  function digitar(chave: string, texto: string) {
    setRascunho((r) => {
      const guardado = sala.pvBase?.[chave] !== undefined ? String(sala.pvBase[chave]) : ''
      const { [chave]: _antigo, ...resto } = r
      return texto === guardado ? resto : { ...r, [chave]: texto }
    })
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const valores: Record<string, number | null> = {}
    for (const [chave, texto] of Object.entries(rascunho)) {
      const n = Number.parseInt(texto, 10)
      valores[chave] = texto.trim() === '' || !Number.isInteger(n) ? null : Math.min(PV_MAX, Math.max(PV_MIN, n))
    }
    aoSalvar(valores, nasPecas)
  }

  function restaurar() {
    const todas = new Set([...ATALHOS.personagem, ...ATALHOS.monstro, BASE_OUTRO.personagem, BASE_OUTRO.monstro])
    setRascunho(Object.fromEntries([...todas].filter((c) => sala.pvBase?.[c] !== undefined).map((c) => [c, ''])))
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-6">
      <p className="text-sm text-tinta-suave">
        Escolha com quantos pontos de vida cada peça nasce nesta sala. Campo vazio usa o valor de fábrica (mostrado de leve).
      </p>

      {GRUPOS.map((g) => (
        <section key={g.tipo} aria-labelledby={`vida-${g.tipo}`} className="space-y-2">
          <h3 id={`vida-${g.tipo}`} className="font-display text-xl">
            {g.titulo}
          </h3>
          <ul className="space-y-1">
            {[...ATALHOS[g.tipo], BASE_OUTRO[g.tipo]].map((chave) => {
              const outro = chave === BASE_OUTRO[g.tipo]
              const nome = outro ? g.outro : chave
              const fabrica = outro ? pvDaPeca({}, 'x', g.tipo) : VIDA_DE_FABRICA[chave]!
              const id = `pv-base-${chave.replace('#', 'tipo-')}`
              return (
                <li key={chave} className="flex items-center justify-between gap-3 border-b border-dashed border-tinta-suave/50 py-1">
                  <label htmlFor={id} className="min-w-0 flex-1 truncate font-bold">
                    {nome}
                  </label>
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={PV_MIN}
                    max={PV_MAX}
                    value={atual(chave)}
                    placeholder={String(fabrica)}
                    onChange={(e) => digitar(chave, e.target.value)}
                    className={campo}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <label className="flex items-start gap-3">
        <input type="checkbox" checked={nasPecas} onChange={(e) => setNasPecas(e.target.checked)} className="mt-1 size-5 accent-vermelho" />
        <span>
          <span className="font-bold">Também nas peças que já estão no tabuleiro</span>
          <span className="block text-sm text-tinta-suave">A vida delas é refeita para o novo valor, cheia. Desmarcado, só as próximas peças mudam.</span>
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <Botao type="submit" variante="principal" disabled={!mudou}>
          Salvar
        </Botao>
        <Botao onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={restaurar} disabled={!sala.pvBase}>
          Voltar aos valores de fábrica
        </Botao>
      </div>
    </form>
  )
}
