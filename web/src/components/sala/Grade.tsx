import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as EventoPonteiro } from 'react'
import { daVez, destaqueEm, nomeColuna, nomeCasa, nomeTerreno, pecaEm, TIPOS, type Casa, type Peca, type Sala, type Terreno as TipoTerreno } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { IconeEscondido } from '../ui/Icones'
import { Ficha } from './Ficha'
import { corNaMiniatura, trechosDoCenario } from './MiniMapa'
import { Terreno } from './Terreno'

const PASSOS: Record<string, [coluna: number, linha: number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
}

/** No modo automático a casa nunca passa de 120 px nem fica abaixo de 44 px (alvo de toque) ou 32 px (mouse); o zoom manual vai até 14 px. */
const CASA_MIN = 44
const CASA_MIN_MOUSE = 32
const CASA_MAX = 120
const ZOOM_MIN = 14
/** Espaço da moldura que não é casa: coluna e linha de coordenadas, padding e bordas. */
const FOLGA = 52
/** Quanto a moldura gasta antes da primeira casa (coluna de números, padding, cabeçalho de letras). */
const DESLOCAMENTO = { x: 34, y: 30 }
const PASSO_ZOOM = 1.25
/** Casa pequena demais para barra de vida e etiquetas de condição. */
const CASA_COM_DETALHES = 30
/** Acima disto, só as casas à vista (mais uma margem) viram elementos; o resto é espaço do mesmo tamanho. */
const CASAS_PARA_VIRTUALIZAR = 900
/** Casas a mais, além da janela, para a rolagem rápida não mostrar vazio. */
const MARGEM = 4

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
  /** Modo de montar o cenário (só o mestre): clicar ou arrastar pinta as casas com o terreno, em vez de selecionar. */
  pintura?: { terreno: TipoTerreno | null; aoPintar: (casas: Casa[]) => void }
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
 * As casas crescem até o tabuleiro inteiro caber no espaço que a tela dá a ele (nunca abaixo de 44 px). Mapa grande
 * passa disso e **rola**: dá para dar zoom (botões ou Ctrl + roda), arrastar o mapa (botão do meio ou o botão Mão),
 * ir até a peça e saltar pela miniatura.
 */
export function Grade({ sala, selecionada, alvo, podeMover, mostrarVida, pintura, aoMenuPeca, aoMenuCasa, aoAbrirFicha, aoTocarCasa, aoSoltar, aoCancelar }: GradeProps) {
  const [foco, setFoco] = useState({ coluna: 0, linha: 0 })
  // O espaço que a tela dá ao mapa e o zoom manual (null = automático: cresce até caber).
  const [area, setArea] = useState({ largura: 0, altura: 0 })
  const [zoom, setZoom] = useState<number | null>(null)
  const [mao, setMao] = useState(false)
  const [vista, setVista] = useState({ esquerda: 0, topo: 0, largura: 0, altura: 0, larguraTotal: 0, alturaTotal: 0 })
  const minimoAutomatico = matchMedia('(pointer: fine)').matches ? CASA_MIN_MOUSE : CASA_MIN
  const ajuste = area.largura > 0 ? Math.min((area.largura - FOLGA) / sala.colunas, (area.altura - FOLGA) / sala.linhas) : minimoAutomatico
  const casa = zoom !== null ? Math.min(CASA_MAX, Math.max(ZOOM_MIN, zoom)) : Math.min(CASA_MAX, Math.max(minimoAutomatico, Math.floor(ajuste)))
  const quadro = useRef<HTMLDivElement>(null)
  /** A casa sob o ponto do zoom, para ela não sair do lugar quando o tamanho muda. */
  const ancora = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const pan = useRef<{ x: number; y: number; esquerda: number; topo: number; moveu: boolean } | null>(null)
  // Arrastar peça: quem está no ar e a casa vazia sob ela.
  const [arrastada, setArrastada] = useState<string | null>(null)
  const [sobre, setSobre] = useState<Casa | null>(null)
  // Pintar: as casas por onde o arrasto passou (um toque é um arrasto de uma casa só).
  const [arrasto, setArrasto] = useState<Casa[] | null>(null)
  const aoPintar = pintura?.aoPintar

  // Soltar o botão em qualquer lugar fecha o desenho e pinta tudo de uma vez (um passo só no desfazer).
  useEffect(() => {
    if (!arrasto) return
    const soltar = () => {
      aoPintar?.(arrasto)
      setArrasto(null)
    }
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrasto])

  const espaco = useRef<HTMLDivElement>(null)
  const casas = useRef(new Map<string, HTMLButtonElement>())

  useLayoutEffect(() => {
    const el = espaco.current!
    const medir = () => {
      const { width, height } = el.getBoundingClientRect()
      setArea((a) => (a.largura === width && a.altura === height ? a : { largura: width, altura: height }))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  // Outra sala começa no zoom automático.
  useEffect(() => setZoom(null), [sala.id])

  const lerVista = () => {
    const q = quadro.current
    if (q) setVista({ esquerda: q.scrollLeft, topo: q.scrollTop, largura: q.clientWidth, altura: q.clientHeight, larguraTotal: q.scrollWidth, alturaTotal: q.scrollHeight })
  }
  // Rolar dispara muitos eventos por segundo: a vista só é lida uma vez por quadro.
  const quadroPendente = useRef(0)
  const aoRolarMapa = () => {
    if (quadroPendente.current) return
    quadroPendente.current = requestAnimationFrame(() => {
      quadroPendente.current = 0
      lerVista()
    })
  }
  useEffect(() => () => cancelAnimationFrame(quadroPendente.current), [])
  useLayoutEffect(() => {
    const q = quadro.current
    const a = ancora.current
    if (q && a) {
      q.scrollLeft = a.x * casa + DESLOCAMENTO.x - a.cx
      q.scrollTop = a.y * casa + DESLOCAMENTO.y - a.cy
      ancora.current = null
    }
    lerVista()
  }, [casa, sala.colunas, sala.linhas, area])

  /** Muda o zoom em torno de um ponto da janela (o meio, se não vier). */
  function aplicarZoom(novo: number, centro?: { x: number; y: number }) {
    const q = quadro.current
    const alvo = Math.round(Math.min(CASA_MAX, Math.max(ZOOM_MIN, novo)))
    if (!q || alvo === casa) return
    const cx = centro?.x ?? q.clientWidth / 2
    const cy = centro?.y ?? q.clientHeight / 2
    ancora.current = { x: (q.scrollLeft + cx - DESLOCAMENTO.x) / casa, y: (q.scrollTop + cy - DESLOCAMENTO.y) / casa, cx, cy }
    setZoom(alvo)
  }

  // Pinça: dois dedos no mapa dão zoom (a distância) e arrastam (o ponto do meio). Um dedo segue selecionando, pintando e rolando.
  const toques = useRef(new Map<number, { x: number; y: number }>())
  const pinca = useRef<{ distancia: number; casa: number; mundoX: number; mundoY: number } | null>(null)
  const pontoDosToques = () => {
    const [a, b] = [...toques.current.values()]
    const r = quadro.current!.getBoundingClientRect()
    return { distancia: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1, x: (a!.x + b!.x) / 2 - r.left, y: (a!.y + b!.y) / 2 - r.top }
  }
  function aoToque(e: EventoPonteiro, baixo: boolean) {
    if (e.pointerType !== 'touch' || !quadro.current) return
    if (baixo) toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    else if (toques.current.has(e.pointerId)) toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (toques.current.size !== 2) return
    const q = quadro.current
    const p = pontoDosToques()
    if (!pinca.current) {
      // Começou a pinça: quem estava pintando larga o traço, e o ponto do mapa sob os dedos vira a âncora.
      setArrasto(null)
      pinca.current = { distancia: p.distancia, casa, mundoX: (q.scrollLeft + p.x - DESLOCAMENTO.x) / casa, mundoY: (q.scrollTop + p.y - DESLOCAMENTO.y) / casa }
      return
    }
    const alvo = Math.round(Math.min(CASA_MAX, Math.max(ZOOM_MIN, pinca.current.casa * (p.distancia / pinca.current.distancia))))
    ancora.current = { x: pinca.current.mundoX, y: pinca.current.mundoY, cx: p.x, cy: p.y }
    if (alvo === casa) {
      // O tamanho não mudou, mas os dedos andaram: só arrasta.
      q.scrollLeft = pinca.current.mundoX * casa + DESLOCAMENTO.x - p.x
      q.scrollTop = pinca.current.mundoY * casa + DESLOCAMENTO.y - p.y
      ancora.current = null
    } else setZoom(alvo)
  }
  function aoSoltarToque(e: EventoPonteiro) {
    if (e.pointerType !== 'touch') return
    toques.current.delete(e.pointerId)
    if (toques.current.size < 2) pinca.current = null
  }

  // Ctrl (ou ⌘) + roda dá zoom no ponto do cursor. Precisa de ouvinte não passivo para segurar o zoom da página.
  useEffect(() => {
    const q = quadro.current
    if (!q) return
    const aoRolar = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = q.getBoundingClientRect()
      aplicarZoom(casa * (e.deltaY < 0 ? PASSO_ZOOM : 1 / PASSO_ZOOM), { x: e.clientX - r.left, y: e.clientY - r.top })
    }
    q.addEventListener('wheel', aoRolar, { passive: false })
    return () => q.removeEventListener('wheel', aoRolar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casa])

  function aoIniciarPan(e: EventoPonteiro) {
    // Botão do meio sempre arrasta o mapa; com a Mão ligada, o botão principal também.
    if (!(e.button === 1 || (mao && e.button === 0 && !pintura)) || !quadro.current) return
    e.preventDefault()
    quadro.current.setPointerCapture(e.pointerId)
    pan.current = { x: e.clientX, y: e.clientY, esquerda: quadro.current.scrollLeft, topo: quadro.current.scrollTop, moveu: false }
  }
  function aoMoverPan(e: EventoPonteiro) {
    const p = pan.current
    if (!p || !quadro.current) return
    if (Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > 4) p.moveu = true
    quadro.current.scrollLeft = p.esquerda - (e.clientX - p.x)
    quadro.current.scrollTop = p.topo - (e.clientY - p.y)
  }
  function aoSoltarPan(e: EventoPonteiro) {
    if (pan.current && quadro.current?.hasPointerCapture(e.pointerId)) quadro.current.releasePointerCapture(e.pointerId)
    // Quem arrastou o mapa não quis clicar na casa em que soltou.
    if (pan.current && !pan.current.moveu) pan.current = null
  }

  /** Leva a casa ao meio da janela. Conta pela posição, porque a casa pode nem estar desenhada ainda (mapa grande). */
  function irPara(coluna: number, linha: number, suave = true) {
    const q = quadro.current
    if (!q) return
    q.scrollTo({
      left: coluna * casa + DESLOCAMENTO.x + casa / 2 - q.clientWidth / 2,
      top: linha * casa + DESLOCAMENTO.y + casa / 2 - q.clientHeight / 2,
      behavior: suave && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',
    })
  }
  const pecaSelecionada = selecionada ? sala.pecas.find((p) => p.id === selecionada) : undefined
  // Peça escolhida ou na vez fora da janela: o mapa vai até ela (sem mexer se já está à vista).
  const idDaVez = daVez(sala)?.id
  useEffect(() => {
    const p = sala.pecas.find((x) => x.id === (selecionada ?? idDaVez))
    const q = quadro.current
    if (!q || !p || (q.scrollWidth <= q.clientWidth && q.scrollHeight <= q.clientHeight)) return
    const x = p.coluna * casa + DESLOCAMENTO.x
    const y = p.linha * casa + DESLOCAMENTO.y
    if (x < q.scrollLeft || x + casa > q.scrollLeft + q.clientWidth || y < q.scrollTop || y + casa > q.scrollTop + q.clientHeight) irPara(p.coluna, p.linha)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada, idDaVez])
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
    const botao = casas.current.get(nomeCasa(destino.coluna, destino.linha))
    if (botao) botao.focus()
    // Mapa grande: a casa de destino só passa a existir depois deste render.
    else focarDepois.current = destino
  }
  const focarDepois = useRef<Casa | null>(null)
  useEffect(() => {
    const d = focarDepois.current
    const botao = d && casas.current.get(nomeCasa(d.coluna, d.linha))
    if (botao) {
      botao.focus()
      focarDepois.current = null
    }
  }, [foco])

  // Quais casas viram elementos. Mapa grande: só as da janela (mais a margem) e as que precisam existir (foco, alvo, peça selecionada ou no ar).
  const virtualizar = sala.colunas * sala.linhas > CASAS_PARA_VIRTUALIZAR
  const janela = virtualizar ? (vista.largura > 0 ? vista : { ...vista, esquerda: 0, topo: 0, largura: 1200, altura: 800 }) : null
  const c0 = janela ? Math.max(0, Math.floor((janela.esquerda - DESLOCAMENTO.x) / casa) - MARGEM) : 0
  const c1 = janela ? Math.min(sala.colunas - 1, Math.ceil((janela.esquerda + janela.largura - DESLOCAMENTO.x) / casa) + MARGEM) : sala.colunas - 1
  const l0 = janela ? Math.max(0, Math.floor((janela.topo - DESLOCAMENTO.y) / casa) - MARGEM) : 0
  const l1 = janela ? Math.min(sala.linhas - 1, Math.ceil((janela.topo + janela.altura - DESLOCAMENTO.y) / casa) + MARGEM) : sala.linhas - 1
  const pecaNoAr = arrastada ? sala.pecas.find((p) => p.id === arrastada) : undefined

  // Rolar não muda nada disto (só a janela, e só quando ela anda de verdade): o React reaproveita os elementos.
  const desenho = useMemo(() => {
    const cenario = new Map((sala.cenario ?? []).map((c) => [`${c.coluna},${c.linha}`, c]))

    const renderCasa = (c: number, l: number) => {
        const peca = pecaEm(sala, c, l)
        const nome = nomeCasa(c, l)
        const marcada = peca !== undefined && peca.id === selecionada
        const ehAlvo = !peca && alvo?.coluna === c && alvo.linha === l
        const naVez = peca !== undefined && peca.id === vez?.id
        const tipo = peca && TIPOS.find((t) => t.valor === peca.tipo)!.rotulo.toLowerCase()
        const celula = cenario.get(`${c},${l}`)
        const terreno = celula?.terreno
        const escondido = celula?.oculta === true
        const destaque = destaqueEm(sala, c, l)
            const vida = peca !== undefined && mostrarVida(peca)
        const comDetalhes = casa >= CASA_COM_DETALHES
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
          ? `${nome}: ${peca.nome}, ${tipo}${detalhes.length ? `, ${detalhes.join(', ')}` : ''}${naVez ? ', na vez' : ''}${marcada ? ', selecionada' : ''}${terreno ? `, sobre ${nomeTerreno(terreno).toLowerCase()}${escondido ? (celula?.disfarce ? ` (escondido dos jogadores, que veem ${nomeTerreno(celula.disfarce).toLowerCase()})` : ' (escondido dos jogadores)') : ''}` : ''}${destaque ? `, destacada pelo mestre${destaque.texto ? `: ${destaque.texto}` : ''}` : ''}`
          : `${nome}: ${terreno ? `${nomeTerreno(terreno).toLowerCase()}${escondido ? (celula?.disfarce ? ` (escondido dos jogadores, que veem ${nomeTerreno(celula.disfarce).toLowerCase()})` : ' (escondido dos jogadores)') : ''}` : 'vazia'}${ehAlvo ? ', a próxima peça entra aqui' : ''}${destaque ? `, destacada pelo mestre${destaque.texto ? `: ${destaque.texto}` : ''}` : ''}`
        return (
          <button
            key={nome}
            style={{ gridColumn: c + 2, gridRow: l + 2 }}
            ref={(el) => {
              if (el) casas.current.set(nome, el)
              else casas.current.delete(nome)
            }}
            type="button"
            tabIndex={c === focoValido.coluna && l === focoValido.linha ? 0 : -1}
            onFocus={() => setFoco({ coluna: c, linha: l })}
            onClick={(e) => {
              if (pintura) {
                // O mouse e o dedo já pintaram no arrasto; o clique sem ponteiro (teclado) pinta a casa.
                if (e.detail === 0) pintura.aoPintar([{ coluna: c, linha: l }])
                return
              }
              aoTocarCasa(c, l)
            }}
            onPointerDown={(e) => {
              if (!pintura || e.button !== 0) return
              e.preventDefault()
              // No toque o ponteiro fica preso à primeira casa; soltar o prendimento deixa as outras casas receberem o arrasto.
              if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
              setArrasto([{ coluna: c, linha: l }])
            }}
            // Sem olhar `arrasto` aqui: estas casas são reaproveitadas enquanto se pinta, e a forma funcional sempre vê o traço atual.
            onPointerEnter={() => setArrasto((a) => (a && !a.some((v) => v.coluna === c && v.linha === l) ? [...a, { coluna: c, linha: l }] : a))}
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
            title={destaque?.texto}
            className={`@container relative grid place-items-center ${pintura ? 'cursor-crosshair' : ''} ${alvoDoArraste ? 'bg-tinta/20 outline-2 -outline-offset-4 outline-tinta outline-dashed' : ''} border-t border-l border-tinta/20 focus-visible:-outline-offset-4 ${
              marcada || ehAlvo ? 'bg-tinta/10 outline-2 -outline-offset-4 outline-dashed' : ''
            } ${marcada ? 'outline-vermelho' : ''} ${ehAlvo ? 'outline-tinta' : ''} ${
              naVez && !marcada ? 'bg-tinta/10' : ''
            } ${selecionada && !peca ? 'hover:bg-tinta/10' : ''}`}
          >
            {terreno && <Terreno tipo={terreno} className={escondido ? 'opacity-45' : ''} />}
            {escondido && (
              <>
                <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 z-10 border-2 border-dashed border-tinta" />
                {casa >= CASA_COM_DETALHES && (
                  <span aria-hidden="true" className="pointer-events-none absolute top-0.5 left-0.5 z-20 grid place-items-center rounded-cordel bg-superficie p-0.5 text-tinta">
                    <IconeEscondido className="size-3.5" />
                  </span>
                )}
              </>
            )}
            {destaque && (
              <>
                <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 z-20 border-4 border-vermelho motion-safe:animate-destacar" />
                {destaque.texto && casa >= 40 && (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 truncate bg-vermelho px-1 text-center text-xs leading-4 font-bold text-sobre-vermelho">
                    {destaque.texto}
                  </span>
                )}
              </>
            )}
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
                {vida && comDetalhes && <BarraVida pv={peca.pv} max={peca.pvMax} />}
                {condicoes.length > 0 && comDetalhes && (
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
    }

    const a: Casa[] = []
    for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) a.push({ coluna: c, linha: l })
    // Quem precisa existir mesmo fora da janela, sem repetir e sem sair da ordem do teclado (linha a linha).
    const extras = [focoValido, alvo, pecaSelecionada, pecaNoAr].filter((x): x is Casa | Peca => !!x)
    const vistas = new Set(a.map((x) => `${x.linha},${x.coluna}`))
    for (const x of extras) if (!vistas.has(`${x.linha},${x.coluna}`)) a.push({ coluna: x.coluna, linha: x.linha })
    a.sort((x, y) => x.linha - y.linha || x.coluna - y.coluna)

    return {
      rotulosColuna: Array.from({ length: c1 - c0 + 1 }, (_, i) => c0 + i).map((c) => (
        <span key={c} aria-hidden="true" style={{ gridColumn: c + 2, gridRow: 1 }} className="pb-1 text-center text-xs font-bold text-tinta-suave">
          {rotuloVisivel(c, casa) ? nomeColuna(c) : ''}
        </span>
      )),
      rotulosLinha: Array.from({ length: l1 - l0 + 1 }, (_, i) => l0 + i).map((l) => (
        <span key={l} aria-hidden="true" style={{ gridColumn: 1, gridRow: l + 2 }} className="self-center pr-1 text-right text-xs font-bold text-tinta-suave">
          {rotuloVisivel(l, casa) ? l + 1 : ''}
        </span>
      )),
      casas: a.map((x) => renderCasa(x.coluna, x.linha)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala, selecionada, alvo, casa, arrastada, sobre, focoValido.coluna, focoValido.linha, c0, c1, l0, l1, pintura, podeMover, mostrarVida, aoTocarCasa, aoMenuPeca, aoMenuCasa, aoAbrirFicha, aoSoltar, vez?.id])
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      {/* O espaço medido ocupa o que sobra da coluna (na tela estreita, um pedaço da altura da janela); a moldura fica no centro dele. */}
      <div ref={espaco} className="relative grid h-[62dvh] min-h-72 min-w-0 grid-cols-1 place-items-center overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
      <div
        ref={quadro}
        onScroll={aoRolarMapa}
        onPointerDown={(e) => {
          aoToque(e, true)
          aoIniciarPan(e)
        }}
        onPointerMove={(e) => {
          aoToque(e, false)
          aoMoverPan(e)
        }}
        onPointerUp={(e) => {
          aoSoltarToque(e)
          aoSoltarPan(e)
        }}
        onPointerCancel={(e) => {
          aoSoltarToque(e)
          aoSoltarPan(e)
        }}
        onClickCapture={(e) => {
          if (pan.current?.moveu) {
            e.stopPropagation()
            e.preventDefault()
          }
          pan.current = null
        }}
        // No modo de pintar, o dedo desenha em vez de rolar. Fora dele, um dedo rola (do navegador) e dois dedos dão zoom (daqui: sem `pinch-zoom` o navegador deixa a pinça para a página).
        style={{ maxWidth: area.largura || undefined, maxHeight: area.altura || undefined, touchAction: pintura ? 'none' : 'pan-x pan-y' }}
        className={`overflow-auto overscroll-contain rounded-cordel border-2 border-borda bg-superficie shadow-carimbo ${mao ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div
          role="group"
          aria-label={`Grid de ${sala.colunas} por ${sala.linhas} casas. Use as setas para andar e Enter para escolher.`}
          className="grid w-max p-2"
          style={{
            gridTemplateColumns: `${sala.colunas > 26 ? '1.75rem' : '1.5rem'} repeat(${sala.colunas}, ${casa}px)`,
            gridTemplateRows: `auto repeat(${sala.linhas}, ${casa}px)`,
          }}
        >
          {/* Cabeçalhos de coordenada: decorativos, o nome da casa já está no rótulo de cada botão. */}
          <span aria-hidden="true" style={{ gridColumn: 1, gridRow: 1 }} />
          {desenho.rotulosColuna}
          {desenho.rotulosLinha}
          {desenho.casas}
          {/* A prévia do traço é uma camada à parte: pintar não refaz as casas. */}
          {(arrasto ?? []).map((c) => (
            <span key={`${c.coluna},${c.linha}`} aria-hidden="true" style={{ gridColumn: c.coluna + 2, gridRow: c.linha + 2 }} className="pointer-events-none z-20 bg-vermelho/30 outline-2 -outline-offset-2 outline-vermelho" />
          ))}
        </div>
      </div>
      {vista.larguraTotal > vista.largura + 2 || vista.alturaTotal > vista.altura + 2 ? (
        <Miniatura sala={sala} vista={vista} casa={casa} lado={area.largura < 520 ? 88 : 128} aoIr={(esq, topo) => quadro.current?.scrollTo({ left: esq, top: topo })} />
      ) : null}
      </div>

      {/* Zoom e navegação: sempre à mão, ao lado do tabuleiro. */}
      <div role="group" aria-label="Zoom e navegação do mapa" className="flex flex-wrap items-center gap-2">
        <Botao tamanho="pequeno" aria-label="Menos zoom" title="Menos zoom (Ctrl + roda do mouse)" disabled={casa <= ZOOM_MIN} onClick={() => aplicarZoom(casa / PASSO_ZOOM)}>
          −
        </Botao>
        <Botao tamanho="pequeno" aria-label="Mais zoom" title="Mais zoom (Ctrl + roda do mouse)" disabled={casa >= CASA_MAX} onClick={() => aplicarZoom(casa * PASSO_ZOOM)}>
          +
        </Botao>
        <Botao tamanho="pequeno" title="Mostra o mapa todo" disabled={ajuste <= 0} onClick={() => setZoom(Math.max(ZOOM_MIN, Math.floor(ajuste)))}>
          Caber
        </Botao>
        <Botao tamanho="pequeno" title="Volta ao tamanho que a tela dá" disabled={zoom === null} onClick={() => setZoom(null)}>
          Automático
        </Botao>
        <Botao tamanho="pequeno" aria-pressed={mao} title="Arrastar o mapa com o mouse (o botão do meio também arrasta)" onClick={() => setMao((m) => !m)}>
          Mão
        </Botao>
        <Botao tamanho="pequeno" disabled={!pecaSelecionada} title="Leva o mapa até a peça selecionada" onClick={() => pecaSelecionada && irPara(pecaSelecionada.coluna, pecaSelecionada.linha)}>
          Ir à peça
        </Botao>
        <span className="ml-auto text-sm text-tinta-suave">
          {sala.colunas} × {sala.linhas} · casa de {casa} px
        </span>
      </div>
    </div>
  )
}

/** Com a casa pequena os nomes de coluna e linha não cabem: mostra a primeira e de 5 em 5 (o nome completo segue no rótulo de cada casa). */
function rotuloVisivel(indice: number, casa: number): boolean {
  return casa >= 28 || indice === 0 || (indice + 1) % 5 === 0
}

interface Vista {
  esquerda: number
  topo: number
  largura: number
  altura: number
  larguraTotal: number
  alturaTotal: number
}

/**
 * O mapa inteiro em miniatura, com um retângulo no pedaço que está na janela. Toque ou arraste para ir até lá.
 * Só aparece quando o mapa passa da janela.
 */
function Miniatura({ sala, vista, casa, lado, aoIr }: { sala: Sala; vista: Vista; casa: number; lado: number; aoIr: (esquerda: number, topo: number) => void }) {
  const e = Math.min(lado / sala.colunas, lado / sala.linhas)
  const largura = sala.colunas * e
  const altura = sala.linhas * e
  const [arrastando, setArrastando] = useState(false)
  const trechos = trechosDoCenario(sala.cenario ?? [])
  const ir = (ev: EventoPonteiro<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect()
    const coluna = ((ev.clientX - r.left) / r.width) * sala.colunas
    const linha = ((ev.clientY - r.top) / r.height) * sala.linhas
    aoIr(coluna * casa + DESLOCAMENTO.x - vista.largura / 2, linha * casa + DESLOCAMENTO.y - vista.altura / 2)
  }
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 z-20 rounded-cordel border-2 border-borda bg-superficie p-1 shadow-carimbo-pequeno">
      <svg
        role="img"
        aria-label="Mapa em miniatura. Toque ou arraste para ir a outro ponto do mapa."
        width={largura}
        height={altura}
        viewBox={`0 0 ${sala.colunas} ${sala.linhas}`}
        className={`pointer-events-auto touch-none ${arrastando ? 'cursor-grabbing' : 'cursor-pointer'}`}
        onPointerDown={(ev) => {
          ev.currentTarget.setPointerCapture(ev.pointerId)
          setArrastando(true)
          ir(ev)
        }}
        onPointerMove={(ev) => arrastando && ir(ev)}
        onPointerUp={() => setArrastando(false)}
        onPointerCancel={() => setArrastando(false)}
      >
        <rect width={sala.colunas} height={sala.linhas} className="fill-fundo" />
        {trechos.map((t, i) => (
          <rect key={i} x={t.de} y={t.l} width={t.ate - t.de + 1} height={1} className={corNaMiniatura(t.t)} />
        ))}
        {sala.pecas.map((p) => (
          <rect key={p.id} x={p.coluna - 0.3} y={p.linha - 0.3} width={1.6} height={1.6} className={p.tipo === 'monstro' ? 'fill-vermelho stroke-tinta' : 'fill-superficie stroke-tinta'} strokeWidth={0.35} />
        ))}
        <rect
          x={Math.max(0, (vista.esquerda - DESLOCAMENTO.x) / casa)}
          y={Math.max(0, (vista.topo - DESLOCAMENTO.y) / casa)}
          width={Math.min(sala.colunas, vista.largura / casa)}
          height={Math.min(sala.linhas, vista.altura / casa)}
          className="fill-none stroke-vermelho"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
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
