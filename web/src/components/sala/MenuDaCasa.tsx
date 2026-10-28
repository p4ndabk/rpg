import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ATALHOS, nomeCasa, nomeTerreno, pvDaPeca, type Casa, type Sala, type Terreno, type TipoPeca } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { Ficha } from './Ficha'
import { SeletorDeTerreno } from './SeletorDeTerreno'
import { usarMenuFlutuante } from './usarMenuFlutuante'

interface MenuDaCasaProps {
  casa: Casa
  ponto: { x: number; y: number }
  sala: Pick<Sala, 'pvBase'>
  /** O mestre chama qualquer peça, escolhe a vida, quantas e pinta o terreno; quem joga chama só o seu herói. */
  mestre: boolean
  terrenoAtual?: Terreno
  /** Parede, árvore ou pedra: ninguém entra, então não há peça para colocar. */
  bloqueada: boolean
  aoFechar: () => void
  aoAdicionar: (nome: string, tipo: TipoPeca, quantidade: number, pv: number | undefined, casa: Casa) => void
  aoPintar: (terreno: Terreno | null, casa: Casa) => void
}

const campo = 'min-h-11 w-20 rounded-cordel border-2 border-borda bg-fundo px-2 text-center font-display text-xl text-tinta'

/**
 * Menu do botão direito numa casa vazia: chama uma peça direto naquela casa (herói, monstro ou "Outro…" com nome)
 * e, para o mestre, escolhe a vida, a quantidade e o terreno da casa.
 */
export function MenuDaCasa({ casa, ponto, sala, mestre, terrenoAtual, bloqueada, aoFechar, aoAdicionar, aoPintar }: MenuDaCasaProps) {
  const { raiz, lugar } = usarMenuFlutuante(ponto, aoFechar)
  const [vidaTxt, setVidaTxt] = useState('')
  const [quantosTxt, setQuantosTxt] = useState('1')
  const [outro, setOutro] = useState<TipoPeca | null>(null)
  const [nome, setNome] = useState('')
  const campoNome = useRef<HTMLInputElement>(null)
  const tipos: TipoPeca[] = mestre ? ['personagem', 'monstro'] : ['personagem']

  const vida = Number.parseInt(vidaTxt, 10)
  const pv = mestre && Number.isInteger(vida) && vida > 0 ? Math.min(999, vida) : undefined
  const quantos = mestre ? Math.min(10, Math.max(1, Number.parseInt(quantosTxt, 10) || 1)) : 1

  useEffect(() => {
    if (outro) campoNome.current?.focus()
  }, [outro])

  function colocar(n: string, tipo: TipoPeca) {
    aoAdicionar(n, tipo, quantos, pv, casa)
    aoFechar()
  }

  function enviarOutro(e: FormEvent) {
    e.preventDefault()
    if (outro && nome.trim()) colocar(nome, outro)
  }

  return (
    <div
      ref={raiz}
      role="dialog"
      aria-label={`Colocar em ${nomeCasa(casa.coluna, casa.linha)}`}
      style={{ left: lugar.x, top: lugar.y }}
      className="fixed z-40 w-80 animate-entrar space-y-3 rounded-cordel border-2 border-borda bg-superficie p-3 shadow-carimbo"
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 font-display text-lg">Colocar em {nomeCasa(casa.coluna, casa.linha)}</p>
        <button type="button" aria-label="Fechar menu" onClick={aoFechar} className="grid size-9 place-items-center rounded-cordel font-bold hover:bg-tinta/10">
          ×
        </button>
      </div>

      {bloqueada && <p className="text-sm text-tinta-suave">Esta casa está bloqueada ({terrenoAtual ? nomeTerreno(terrenoAtual).toLowerCase() : 'terreno'}): ninguém entra nela.</p>}

      {mestre && !bloqueada && (
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="menu-casa-vida" className="text-sm font-bold">
              Vida
            </label>
            <input id="menu-casa-vida" type="number" inputMode="numeric" min={1} max={999} value={vidaTxt} placeholder="padrão" onChange={(e) => setVidaTxt(e.target.value)} className={`${campo} placeholder:font-sans placeholder:text-sm placeholder:text-tinta-suave`} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="menu-casa-quantos" className="text-sm font-bold">
              Quantos
            </label>
            <input id="menu-casa-quantos" type="number" inputMode="numeric" min={1} max={10} value={quantosTxt} onChange={(e) => setQuantosTxt(e.target.value)} className={campo} />
          </div>
        </div>
      )}

      {!bloqueada && tipos.map((t) => (
        <div key={t} role="group" aria-label={t === 'personagem' ? 'Heróis' : 'Monstros'}>
          <p className="mb-1 text-xs font-bold tracking-wide text-tinta-suave uppercase">{t === 'personagem' ? 'Heróis' : 'Monstros'}</p>
          <div className="flex flex-wrap gap-1.5">
            {ATALHOS[t].map((n) => (
              <Botao key={n} tamanho="pequeno" className="pl-1.5" aria-label={`Colocar ${n} em ${nomeCasa(casa.coluna, casa.linha)}`} onClick={() => colocar(n, t)}>
                <Ficha peca={{ nome: n, tipo: t }} />
                {n}
                {mestre && <span className="text-xs font-normal text-tinta-suave">{pv ?? pvDaPeca(sala, n, t)}</span>}
              </Botao>
            ))}
            <Botao
              tamanho="pequeno"
              className="border-dashed"
              aria-label={t === 'monstro' ? 'Outro monstro, com nome seu' : 'Outro herói, com nome seu'}
              aria-pressed={outro === t}
              onClick={() => setOutro(t)}
            >
              Outro…
            </Botao>
          </div>
        </div>
      ))}

      {outro && !bloqueada && (
        <form onSubmit={enviarOutro} className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor="menu-casa-nome" className="text-sm font-bold">
              Nome {outro === 'monstro' ? 'do monstro' : 'do herói'}
            </label>
            <input
              id="menu-casa-nome"
              ref={campoNome}
              value={nome}
              maxLength={30}
              placeholder={outro === 'monstro' ? 'Ex.: Mímico' : 'Ex.: Shadowheart'}
              onChange={(e) => setNome(e.target.value)}
              className="min-h-11 rounded-cordel border-2 border-borda bg-fundo px-3 text-tinta placeholder:text-tinta-suave"
            />
          </div>
          <Botao type="submit" variante="principal" tamanho="pequeno" disabled={!nome.trim()}>
            Colocar
          </Botao>
        </form>
      )}

      {mestre && (
        <div role="group" aria-label="Terreno da casa" className={bloqueada ? '' : 'border-t-2 border-dashed border-tinta-suave pt-3'}>
          <p className="mb-1 text-xs font-bold tracking-wide text-tinta-suave uppercase">Terreno da casa{terrenoAtual ? `: ${nomeTerreno(terrenoAtual)}` : ''}</p>
          <SeletorDeTerreno
            terreno={terrenoAtual}
            comNome={false}
            aoEscolher={(t) => {
              aoPintar(t, casa)
              aoFechar()
            }}
          />
          <div className="mt-1.5">
            <Botao
              tamanho="pequeno"
              disabled={!terrenoAtual}
              onClick={() => {
                aoPintar(null, casa)
                aoFechar()
              }}
            >
              Limpar terreno
            </Botao>
          </div>
        </div>
      )}
    </div>
  )
}
