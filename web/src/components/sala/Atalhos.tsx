import { useRef, useState, type FormEvent } from 'react'
import { ATALHOS, pvDaPeca, TIPOS, type Sala, type TipoPeca } from '../../lib/sala'
import { Contador } from '../Contador'
import { Botao } from '../ui/Botao'
import { Opcao } from '../ui/Opcao'
import { Ficha } from './Ficha'

interface AtalhosProps {
  /** Nome da casa escolhida para a próxima peça, como "C4". */
  alvo: string | null
  cheio: boolean
  /** `pv` só vem quando o mestre escolheu a vida; sem ele vale o padrão da peça. */
  aoAdicionar: (nome: string, tipo: TipoPeca, quantidade: number, pv?: number) => void
  /** Quem joga só chama personagem; monstro é do mestre. */
  somentePersonagem?: boolean
  /** O mestre pode chamar vários de uma vez (3 Goblins). */
  comQuantidade?: boolean
  /** O mestre escolhe os pontos de vida das peças novas. */
  comVida?: boolean
  /** Para mostrar a vida base de cada atalho. */
  sala?: Pick<Sala, 'pvBase'>
  /** Abre a tela de vida base (só o mestre). */
  aoEditarVidaBase?: () => void
  aoCancelarAlvo: () => void
}

/** Colocar peças com um toque: atalhos prontos e, se quiser, um nome próprio. */
export function Atalhos({ alvo, cheio, aoAdicionar, aoCancelarAlvo, somentePersonagem = false, comQuantidade = false, comVida = false, sala = {}, aoEditarVidaBase }: AtalhosProps) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoPeca>('personagem')
  const [quantidade, setQuantidade] = useState(1)
  // 0 quer dizer "o padrão da peça" (Goblin 7, Dragão 60…).
  const [vidaTexto, setVidaTexto] = useState('')
  const vida = Number.parseInt(vidaTexto, 10)
  const [aberto, setAberto] = useState(false)
  const campoNome = useRef<HTMLInputElement>(null)
  const pv = comVida && Number.isInteger(vida) && vida > 0 ? Math.min(999, vida) : undefined
  const quantos = comQuantidade ? quantidade : 1
  const tipos = somentePersonagem ? TIPOS.filter((t) => t.valor === 'personagem') : TIPOS

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || cheio) return
    aoAdicionar(nome, somentePersonagem ? 'personagem' : tipo, quantos, pv)
    setNome('')
  }

  /** "Outro": abre o nome já com o tipo do grupo (monstro ou herói) e põe o cursor no campo. */
  function outro(t: TipoPeca) {
    setTipo(t)
    setAberto(true)
    window.setTimeout(() => campoNome.current?.focus(), 0)
  }

  return (
    <section aria-labelledby="titulo-atalhos" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="titulo-atalhos" className="font-display text-xl">
          Colocar no grid
        </h3>
        {alvo && (
          <Botao tamanho="pequeno" onClick={aoCancelarAlvo}>
            Desmarcar {alvo}
          </Botao>
        )}
      </div>
      <p className="text-sm text-tinta-suave">
        {cheio
          ? 'O grid está cheio. Remova uma peça para chamar outra.'
          : alvo
            ? `Toque numa peça abaixo para colocá-la em ${alvo}.`
            : 'Toque numa peça para colocá-la. Quer escolher o lugar? Toque antes numa casa vazia.'}
      </p>

      {comQuantidade && (
        <Contador emLinha id="quantidade-peca" rotulo="Quantos de uma vez" valor={quantidade} min={1} max={10} aoMudar={(n) => setQuantidade(Math.min(10, Math.max(1, n)))} />
      )}

      {comVida && (
        <div className="flex flex-col gap-1">
          <label htmlFor="vida-peca" className="font-bold">
            Pontos de vida das próximas peças
          </label>
          {aoEditarVidaBase && (
            <button type="button" onClick={aoEditarVidaBase} className="self-start text-sm font-bold text-tinta-suave underline hover:text-vermelho">
              Editar a vida base de cada peça
            </button>
          )}
          <input
            id="vida-peca"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={vidaTexto}
            placeholder="Padrão de cada peça (Goblin 7, Dragão 60…)"
            onChange={(e) => setVidaTexto(e.target.value)}
            className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
          />
        </div>
      )}

      {tipos.map((t) => (
        <div key={t.valor} role="group" aria-label={t.valor === 'personagem' ? 'Personagens' : 'Monstros'}>
          <p className="mb-1 text-xs font-bold tracking-wide text-tinta-suave uppercase">
            {t.valor === 'personagem' ? 'Heróis' : 'Monstros'}
          </p>
          {/* Rola de lado no celular; as margens negativas evitam cortar a sombra dos botões. */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-0.5 pb-2">
            {ATALHOS[t.valor].map((n) => (
              <Botao
                key={n}
                tamanho="pequeno"
                disabled={cheio}
                className="shrink-0 pl-1.5"
                aria-label={`Colocar ${n} (${t.rotulo.toLowerCase()})${alvo ? ` em ${alvo}` : ''}`}
                onClick={() => aoAdicionar(n, t.valor, quantos, pv)}
              >
                <Ficha peca={{ nome: n, tipo: t.valor }} />
                {n}
                {comVida && <span className="text-xs font-normal text-tinta-suave">{pvDaPeca(sala, n, t.valor)} PV</span>}
              </Botao>
            ))}
            <Botao
              tamanho="pequeno"
              disabled={cheio}
              className="shrink-0 border-dashed"
              aria-label={t.valor === 'monstro' ? 'Outro monstro, com nome seu' : 'Outro herói, com nome seu'}
              onClick={() => outro(t.valor)}
            >
              Outro…
            </Botao>
          </div>
        </div>
      ))}

      <details open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold">Outra peça, com nome seu</summary>
        <form onSubmit={aoEnviar} className="mt-2 space-y-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="nome-peca" className="font-bold">
              Nome
            </label>
            <input
              id="nome-peca"
              ref={campoNome}
              value={nome}
              maxLength={30}
              placeholder={tipo === 'monstro' ? 'Ex.: Mímico' : 'Ex.: Shadowheart'}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
            />
          </div>
          <fieldset hidden={somentePersonagem}>
            <legend className="font-bold">Tipo</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {TIPOS.map((t) => (
                <Opcao key={t.valor} nome="tipo-peca" valor={t.valor} marcada={tipo === t.valor} aoMarcar={() => setTipo(t.valor)}>
                  {t.rotulo}
                </Opcao>
              ))}
            </div>
          </fieldset>
          <Botao type="submit" disabled={!nome.trim() || cheio}>
            Colocar no grid
          </Botao>
        </form>
      </details>
    </section>
  )
}
