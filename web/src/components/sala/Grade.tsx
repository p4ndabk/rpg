import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { casasDaForma, daVez, nomeCasa, nomeTerreno, pecaEm, TIPOS, type Casa, type Forma, type Peca, type Sala, type Terreno as TipoTerreno } from '../../lib/sala'
import { Ficha } from './Ficha'
import { Terreno } from './Terreno'

const PASSOS: Record<string, [coluna: number, linha: number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
}

/** Alvo de toque mínimo (44 px) e um teto para casas não virarem cartazes num grid pequeno. */
const CASA_MIN = 44
const CASA_MAX = 120
/** Espaço da moldura que não é casa: coluna e linha de coordenadas, padding e bordas. */
const FOLGA = 52
const TELA_LARGA = '(min-width: 64rem)'

interface GradeProps {
  sala: Sala
  selecionada: string | null
  /** Casa vazia escolhida para receber a próxima peça. */
  alvo: Casa | null
  aoTocarCasa: (coluna: number, linha: number) => void
  /** Quem pode arrastar e mover a peça: o mestre, ou o dono dela. */
  podeMover: (peca: Peca) => boolean
  /** Quem vê a barra de vida da peça. */
  mostrarVida: (peca: Peca) => boolean
  /** Modo de montar o cenário (só o mestre): arrastar pinta, em vez de mover peças. */
  pintura?: { forma: Forma; terreno: TipoTerreno | null; aoPintar: (casas: Casa[]) => void }
  /** Botão direito sobre uma peça (só o mestre usa): abre o menu dela no ponto do cursor. */
  aoMenuPeca?: (peca: Peca, ponto: { x: number; y: number }) => void
  /** Duplo clique numa peça que a pessoa pode mexer: abre a ficha dela. */
  aoAbrirFicha?: (peca: Peca) => void
  /** Botão direito numa casa vazia: abre o menu de colocar peça (mestre e quem ainda não tem personagem). */
  aoMenuCasa?: (casa: Casa, ponto: { x: number; y: number }) => void
  /** Peça arrastada e solta numa casa vazia. */
  aoSoltar: (id: string, coluna: number, linha: number) => void
  aoCancelar: () => void
}

/**
 * Grid da sala. Cada casa é um botão; só uma recebe Tab por vez e as setas andam entre elas
 * (roving tabindex), para o teclado não ter que passar por centenas de casas.
 *
 * Na tela larga, as casas crescem até o tabuleiro inteiro caber no espaço que a tela dá a ele.
 * Na estreita, ficam com 44 px e o grid rola de lado.
 */
export function Grade({ sala, selecionada, alvo, podeMover, mostrarVida, pintura, aoMenuPeca, aoMenuCasa, aoAbrirFicha, aoTocarCasa, aoSoltar, aoCancelar }: GradeProps) {
  const [foco, setFoco] = useState({ coluna: 0, linha: 0 })
  const [casa, setCasa] = useState(CASA_MIN)
  // Arrastar peça: quem está no ar e a casa vazia sob ela.
  const [arrastada, setArrastada] = useState<string | null>(null)
  const [sobre, setSobre] = useState<Casa | null>(null)
  // Pintar: de onde o arrasto saiu, onde está agora e, no pincel, as casas por onde passou.
  const [arrasto, setArrasto] = useState<{ inicio: Casa; atual: Casa; visitadas: Casa[] } | null>(null)
  const forma = pintura?.forma
  const aoPintar = pintura?.aoPintar
  const casasDoArrasto = (a: NonNullable<typeof arrasto>): Casa[] => (forma === 'pincel' ? a.visitadas : casasDaForma(forma ?? 'pincel', a.inicio, a.atual))
  const previa = new Set((arrasto ? casasDoArrasto(arrasto) : []).map((c) => `${c.coluna},${c.linha}`))
  const cenario = new Map((sala.cenario ?? []).map((c) => [`${c.coluna},${c.linha}`, c.terreno]))

  // Soltar o botão em qualquer lugar fecha o desenho.
  useEffect(() => {
    if (!arrasto) return
    const soltar = () => {
      aoPintar?.(casasDoArrasto(arrasto))
      setArrasto(null)
    }
    window.addEventListener('pointerup', soltar)
    return () => window.removeEventListener('pointerup', soltar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrasto])
  const espaco = useRef<HTMLDivElement>(null)
  const casas = useRef(new Map<string, HTMLButtonElement>())

  useLayoutEffect(() => {
    const el = espaco.current!
    const medir = () => {
      if (!matchMedia(TELA_LARGA).matches) {
        setCasa(CASA_MIN)
        return
      }
      const { width, height } = el.getBoundingClientRect()
      const lado = Math.min((width - FOLGA) / sala.colunas, (height - FOLGA) / sala.linhas, CASA_MAX)
      setCasa(Math.max(CASA_MIN, Math.floor(lado)))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [sala.colunas, sala.linhas])
  const vez = daVez(sala)
  // A sala pode ter mudado de tamanho; o foco não pode ficar fora dela.
  const focoValido = {
    coluna: Math.min(foco.coluna, sala.colunas - 1),
    linha: Math.min(foco.linha, sala.linhas - 1),
  }

  function aoTeclar(e: KeyboardEvent, coluna: number, linha: number) {
    if (e.key === 'Escape') {
      aoCancelar()
      return
    }
    const passo = PASSOS[e.key]
    if (!passo) return
    e.preventDefault()
    const destino = {
      coluna: Math.min(sala.colunas - 1, Math.max(0, coluna + passo[0])),
      linha: Math.min(sala.linhas - 1, Math.max(0, linha + passo[1])),
    }
    setFoco(destino)
    casas.current.get(nomeCasa(destino.coluna, destino.linha))?.focus()
  }

  const colunas = Array.from({ length: sala.colunas }, (_, i) => i)
  const linhas = Array.from({ length: sala.linhas }, (_, i) => i)

  return (
    // O espaço medido ocupa o que sobra da coluna; a moldura fica no centro dele.
    <div ref={espaco} className="grid min-h-0 min-w-0 flex-1 grid-cols-1 place-items-center lg:grid-rows-1 lg:overflow-hidden">
      <div className="max-w-full overflow-auto rounded-cordel border-2 border-borda bg-superficie shadow-carimbo">
        <div
          role="group"
          aria-label={`Grid de ${sala.colunas} por ${sala.linhas} casas. Use as setas para andar e Enter para escolher.`}
          className="grid w-max p-2"
          style={{
            gridTemplateColumns: `1.5rem repeat(${sala.colunas}, ${casa}px)`,
            gridTemplateRows: `auto repeat(${sala.linhas}, ${casa}px)`,
          }}
        >
          {/* Cabeçalhos de coordenada: decorativos, o nome da casa já está no rótulo de cada botão. */}
          <span aria-hidden="true" />
          {colunas.map((c) => (
            <span key={c} aria-hidden="true" className="pb-1 text-center text-xs font-bold text-tinta-suave">
              {nomeCasa(c, 0).slice(0, 1)}
            </span>
          ))}
          {linhas.map((l) => (
            <div key={l} className="contents">
              <span aria-hidden="true" className="self-center pr-1 text-right text-xs font-bold text-tinta-suave">
                {l + 1}
              </span>
              {colunas.map((c) => {
                const peca = pecaEm(sala, c, l)
                const nome = nomeCasa(c, l)
                const marcada = peca !== undefined && peca.id === selecionada
                const ehAlvo = !peca && alvo?.coluna === c && alvo.linha === l
                const naVez = peca !== undefined && peca.id === vez?.id
                const tipo = peca && TIPOS.find((t) => t.valor === peca.tipo)!.rotulo.toLowerCase()
                const terreno = cenario.get(`${c},${l}`)
                const naPrevia = previa.has(`${c},${l}`)
                const vida = peca !== undefined && mostrarVida(peca)
                const caida = vida && peca.pv === 0
                const movel = peca !== undefined && podeMover(peca)
                const condicoes = peca?.condicoes ?? []
                const alvoDoArraste = !peca && arrastada !== null && sobre?.coluna === c && sobre.linha === l
                const detalhes = peca
                  ? [
                      peca.oculta ? 'escondida dos jogadores' : '',
                      vida ? (caida ? 'caída' : `${peca.pv} de ${peca.pvMax} pontos de vida`) : '',
                      ...condicoes.map((c) => c.toLowerCase()),
                    ].filter(Boolean)
                  : []
                const rotulo = peca
                  ? `${nome}: ${peca.nome}, ${tipo}${detalhes.length ? `, ${detalhes.join(', ')}` : ''}${naVez ? ', na vez' : ''}${marcada ? ', selecionada' : ''}${terreno ? `, sobre ${nomeTerreno(terreno).toLowerCase()}` : ''}`
                  : `${nome}: ${terreno ? nomeTerreno(terreno).toLowerCase() : 'vazia'}${ehAlvo ? ', a próxima peça entra aqui' : ''}`
                return (
                  <button
                    key={nome}
                    ref={(el) => {
                      if (el) casas.current.set(nome, el)
                      else casas.current.delete(nome)
                    }}
                    type="button"
                    tabIndex={c === focoValido.coluna && l === focoValido.linha ? 0 : -1}
                    onFocus={() => setFoco({ coluna: c, linha: l })}
                    onClick={(e) => {
                      if (pintura) {
                        // O mouse já pintou no arrasto; o clique sem mouse (teclado) pinta a casa.
                        if (e.detail === 0) pintura.aoPintar([{ coluna: c, linha: l }])
                        return
                      }
                      aoTocarCasa(c, l)
                    }}
                    onPointerDown={(e) => {
                      if (!pintura || e.button !== 0) return
                      e.preventDefault()
                      setArrasto({ inicio: { coluna: c, linha: l }, atual: { coluna: c, linha: l }, visitadas: [{ coluna: c, linha: l }] })
                    }}
                    onPointerEnter={() => {
                      if (!arrasto) return
                      setArrasto((a) =>
                        a && {
                          ...a,
                          atual: { coluna: c, linha: l },
                          visitadas: a.visitadas.some((v) => v.coluna === c && v.linha === l) ? a.visitadas : [...a.visitadas, { coluna: c, linha: l }],
                        },
                      )
                    }}
                    onKeyDown={(e) => aoTeclar(e, c, l)}
                    onDoubleClick={() => peca && !pintura && aoAbrirFicha && podeMover(peca) && aoAbrirFicha(peca)}
                    onContextMenu={(e) => {
                      if (pintura) return
                      if (peca) {
                        if (!aoMenuPeca || !podeMover(peca)) return
                        e.preventDefault()
                        aoMenuPeca(peca, { x: e.clientX, y: e.clientY })
                      } else if (aoMenuCasa) {
                        e.preventDefault()
                        aoMenuCasa({ coluna: c, linha: l }, { x: e.clientX, y: e.clientY })
                      }
                    }}
                    onDragOver={(e) => {
                      if (arrastada === null || peca) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (sobre?.coluna !== c || sobre.linha !== l) setSobre({ coluna: c, linha: l })
                    }}
                    onDrop={(e) => {
                      if (arrastada === null || peca) return
                      e.preventDefault()
                      aoSoltar(arrastada, c, l)
                      setArrastada(null)
                      setSobre(null)
                    }}
                    aria-label={rotulo}
                    className={`@container relative grid place-items-center ${pintura ? 'cursor-crosshair' : ''} ${naPrevia ? 'bg-vermelho/30 outline-2 -outline-offset-2 outline-vermelho' : ''} ${alvoDoArraste ? 'bg-tinta/20 outline-2 -outline-offset-4 outline-tinta outline-dashed' : ''} border-t border-l border-tinta/20 focus-visible:-outline-offset-4 ${
                      marcada || ehAlvo ? 'bg-tinta/10 outline-2 -outline-offset-4 outline-dashed' : ''
                    } ${marcada ? 'outline-vermelho' : ''} ${ehAlvo ? 'outline-tinta' : ''} ${
                      naVez && !marcada ? 'bg-tinta/10' : ''
                    } ${selecionada && !peca ? 'hover:bg-tinta/10' : ''}`}
                  >
                    {terreno && <Terreno tipo={terreno} />}
                    {peca ? (
                      <>
                        {/* Só a ficha é arrastável: botão como origem de arraste falha em alguns navegadores. */}
                        <span
                          draggable={movel && !pintura}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', peca.id)
                            e.dataTransfer.effectAllowed = 'move'
                            setArrastada(peca.id)
                          }}
                          onDragEnd={() => {
                            setArrastada(null)
                            setSobre(null)
                          }}
                          className={`relative z-10 grid size-full place-items-center ${movel && !pintura ? 'cursor-grab' : ''} ${arrastada === peca.id ? 'opacity-40' : ''} ${peca.oculta ? 'opacity-50' : ''}`}
                        >
                          <Ficha peca={peca} erguida={marcada} naVez={naVez} noTabuleiro caida={caida} />
                        </span>
                        {vida && <BarraVida pv={peca.pv} max={peca.pvMax} />}
                        {condicoes.length > 0 && (
                          <span
                            aria-hidden="true"
                            title={condicoes.join(', ')}
                            className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-cordel border border-borda bg-vermelho px-0.5 text-xs leading-4 font-bold text-sobre-vermelho"
                          >
                            {condicoes.length > 1 ? condicoes.length : condicoes[0]![0]}
                          </span>
                        )}
                      </>
                    ) : (
                      ehAlvo && (
                        <span aria-hidden="true" className="relative z-10 font-display text-xl text-tinta-suave @[4rem]:text-3xl">
                          +
                        </span>
                      )
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Barra fina de vida no pé da casa. Vermelha quando sobra um quarto ou menos (perigo). */
function BarraVida({ pv, max }: { pv: number; max: number }) {
  return (
    <span aria-hidden="true" className="absolute inset-x-1.5 bottom-0.5 h-1.5 border border-borda bg-fundo">
      <span className={`block h-full ${pv / max <= 0.25 ? 'bg-vermelho' : 'bg-tinta'}`} style={{ width: `${(pv / max) * 100}%` }} />
    </span>
  )
}
