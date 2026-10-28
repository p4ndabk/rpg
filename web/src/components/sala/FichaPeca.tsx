import { useState, type FormEvent } from 'react'
import { PV_MAX, PV_MIN, type CamposFicha, type Peca } from '../../lib/sala'
import { lerEntrada, npubCurta } from '../../lib/usuario'
import { Botao } from '../ui/Botao'
import { CamposDaFicha } from './CamposDaFicha'
import { Ficha } from './Ficha'

interface FichaPecaProps {
  peca: Peca
  aoDono: (pubkey: string | undefined) => void
  /** Muda a descrição, a CD e o bônus de iniciativa da ficha. */
  aoFicha: (campos: CamposFicha) => void
  /** Muda os pontos de vida da peça: o máximo e o atual. */
  aoPv: (pvMax: number, pv: number) => void
}

const campo = 'rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave'

/** O resto da ficha da peça, para o mestre: vida, descrição, CD, iniciativa e quem joga com ela. (Dano e condições ficam no painel do tabuleiro.) */
export function FichaPeca({ peca, aoDono, aoPv, aoFicha }: FichaPecaProps) {
  // Texto digitado: dá para apagar tudo e escrever de novo. Os limites valem ao salvar.
  const [maximoTxt, setMaximoTxt] = useState(String(peca.pvMax))
  const [atualTxt, setAtualTxt] = useState(String(peca.pv))
  const maximo = Math.min(PV_MAX, Math.max(PV_MIN, Number.parseInt(maximoTxt, 10) || peca.pvMax))
  const atual = Math.min(maximo, Math.max(0, Number.isInteger(Number.parseInt(atualTxt, 10)) ? Number.parseInt(atualTxt, 10) : peca.pv))
  const mudouPv = maximo !== peca.pvMax || atual !== peca.pv
  const [npub, setNpub] = useState('')
  const [erro, setErro] = useState('')

  function darPeca(e: FormEvent) {
    e.preventDefault()
    const r = lerEntrada(npub)
    // A nsec nunca deve ser colada aqui: só a npub, que é pública.
    if (!r.ok || r.tipo !== 'npub') return setErro('Cole a npub (começa com npub1) de quem vai jogar com esta peça.')
    aoDono(r.pubkey)
    setNpub('')
    setErro('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ficha peca={peca} />
        <div className="min-w-0">
          <p className="truncate font-display text-xl">{peca.nome}</p>
          <p className="text-sm text-tinta-suave">{peca.oculta ? 'Escondida dos jogadores' : 'Visível para a mesa'}</p>
        </div>
      </div>

      <section aria-labelledby="titulo-pv" className="space-y-3">
        <h3 id="titulo-pv" className="font-bold">
          Pontos de vida
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="pv-max-peca" className="font-bold">
              Máximo
            </label>
            <input
              id="pv-max-peca"
              type="number"
              inputMode="numeric"
              min={PV_MIN}
              max={PV_MAX}
              value={maximoTxt}
              onChange={(e) => {
                // Se a vida estava cheia, aumentar o máximo enche junto.
                if (atualTxt === maximoTxt) setAtualTxt(e.target.value)
                setMaximoTxt(e.target.value)
              }}
              className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-center font-display text-xl text-tinta"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pv-atual-peca" className="font-bold">
              Atual
            </label>
            <input
              id="pv-atual-peca"
              type="number"
              inputMode="numeric"
              min={0}
              max={maximo}
              value={atualTxt}
              onChange={(e) => setAtualTxt(e.target.value)}
              className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-center font-display text-xl text-tinta"
            />
          </div>
        </div>
        <Botao tamanho="pequeno" disabled={!mudouPv} onClick={() => aoPv(maximo, atual)}>
          Salvar vida
        </Botao>
      </section>

      <section aria-labelledby="titulo-ficha" className="space-y-3">
        <h3 id="titulo-ficha" className="font-bold">
          Ficha
        </h3>
        <CamposDaFicha peca={peca} aoSalvar={aoFicha} />
      </section>

      {peca.tipo === 'personagem' && (
        <section aria-labelledby="titulo-dono" className="space-y-2">
          <h3 id="titulo-dono" className="font-bold">
            Quem joga com esta peça
          </h3>
          <p className="text-sm text-tinta-suave">
            {peca.dono ? `Dona ou dono: ${npubCurta(peca.dono)}. Só essa pessoa (e você) move a peça.` : 'Sem dono: só você move a peça.'}
          </p>
          <form onSubmit={darPeca} className="space-y-2">
            <label htmlFor="npub-dono" className="sr-only">
              npub de quem joga
            </label>
            <input
              id="npub-dono"
              value={npub}
              autoComplete="off"
              spellCheck={false}
              placeholder="npub1…"
              aria-invalid={erro !== ''}
              aria-describedby={erro ? 'erro-dono' : undefined}
              onChange={(e) => {
                setNpub(e.target.value)
                setErro('')
              }}
              className={`w-full ${campo}`}
            />
            {erro && (
              <p id="erro-dono" role="alert" className="text-sm font-bold text-vermelho">
                {erro}
              </p>
            )}
            <div className="flex gap-2">
              <Botao type="submit" tamanho="pequeno" disabled={!npub.trim()}>
                Dar a esta pessoa
              </Botao>
              {peca.dono && (
                <Botao tamanho="pequeno" onClick={() => aoDono(undefined)}>
                  Tirar o dono
                </Botao>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
