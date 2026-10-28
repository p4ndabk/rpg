import { useEffect, useMemo, useRef, useState } from 'react'
import { usarJornada } from '../components/jornada/Jornada'
import { Rolador } from '../components/Rolador'
import { AnuncioRolagem } from '../components/sala/AnuncioRolagem'
import { AvisoDaVez } from '../components/sala/AvisoDaVez'
import { Atalhos } from '../components/sala/Atalhos'
import { CriarSala } from '../components/sala/CriarSala'
import { EditarSala } from '../components/sala/EditarSala'
import { FaixaCombate } from '../components/sala/FaixaCombate'
import { FichaPeca } from '../components/sala/FichaPeca'
import { GavetaPecas } from '../components/sala/GavetaPecas'
import { Grade } from '../components/sala/Grade'
import { MenuDaCasa } from '../components/sala/MenuDaCasa'
import { MenuDaPeca } from '../components/sala/MenuDaPeca'
import { CamposDaFicha } from '../components/sala/CamposDaFicha'
import { MeuPersonagem } from '../components/sala/MeuPersonagem'
import { PainelCenario } from '../components/sala/PainelCenario'
import { PainelPeca } from '../components/sala/PainelPeca'
import { aplicarModelo, salaDoModelo, type Modelo } from '../lib/modelos'
import { ModelosDeMapa } from '../components/sala/ModelosDeMapa'
import { PainelDestaque } from '../components/sala/PainelDestaque'
import { Ferramentas, type Ferramenta } from '../components/sala/Ferramentas'
import { RoteiroDoMestre } from '../components/sala/RoteiroDoMestre'
import { PainelMesa } from '../components/sala/PainelMesa'
import { PainelRede, TEXTO_FASE, TEXTO_FASE_RELAYS } from '../components/sala/PainelRede'
import { Pecas } from '../components/sala/Pecas'
import { VidaBase } from '../components/sala/VidaBase'
import { Botao } from '../components/ui/Botao'
import { IconeCompartilhar, IconeDesfazer, IconeRefazer } from '../components/ui/Icones'
import { usarUsuario } from '../components/usuario/Usuario'
import { usarArmazenado } from '../lib/armazenamento'
import { lerHistorico, noHistorico, noMomento, rolagemAvulsa, type Rolagem } from '../lib/dados'
import { type Estado, type Jogador, type MensagemCliente, type MensagemServidor } from '../lib/rede/protocolo'
import { guardarServidor, urlDoServidor } from '../lib/rede/servidor'
import { usarServidor } from '../lib/rede/usarServidor'
import { lerDispensadas, passosDoRoteiro, roteiroCompleto } from '../lib/roteiro'
import { haQuanto, idadeS, mestreAusente, situacaoDe, type Presenca, type Vistos } from '../lib/presenca'
import { chavePublicaDoNavegador } from '../lib/nostr/chave'
import { baseDoConvite, guardarBase, lerConexaoSala, montarConvite } from '../lib/nostr/convite'
import { guardarRelays, RELAYS_PADRAO, relaysDoMestre } from '../lib/nostr/relays'
import { usarNostrJogador, usarNostrMestre } from '../lib/nostr/usarNostr'
import { linkPara } from '../lib/rota'
import { CHAVE_CONEXAO, CHAVE_JOGADORES, CHAVE_LOG, CHAVE_NOTAS, CHAVE_REDE_MESTRE, CHAVE_REDE_MODO, CHAVE_SALA, CHAVES_SALA_REMOTA } from '../lib/rede/chaves'
import {
  adicionarPeca,
  alterarPv,
  alternarCondicao,
  alternarOculta,
  alternarDestaque,
  cenarioVisivel,
  disfarcarCenario,
  casaBloqueada,
  destaqueEm,
  limparDestaques,
  ocultarCenario,
  casaLivrePerto,
  criarSala,
  daVez,
  editarFicha,
  definirDono,
  definirPv,
  definirPvBase,
  definirIniciativa,
  editarSala,
  ehMestre,
  encerrarCombate,
  iniciarCombate,
  lerSala,
  moverPeca,
  motivoDoMovimento,
  type MotivoDoMovimento,
  nomeCasa,
  nomeTerreno,
  passarVez,
  pecaEm,
  pintar,
  pecasVisiveis,
  terrenoEm,
  podeMover,
  primeiraCasaLivre,
  removerPeca,
  type Casa,
  type CamposFicha,
  type Condicao,
  type Peca,
  type Sala,
  type Terreno,
  type TipoPeca,
} from '../lib/sala'

const CHAVE_PEDIDO = 'rpg:sala:pedido'
const MAX_DESFAZER = 30

const lerNotas = (v: unknown): string | null => (typeof v === 'string' ? v.slice(0, 20000) : null)
const lerBooleano = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)
type ModoRede = 'servidor' | 'nostr'
const lerModo = (v: unknown): ModoRede | null => (v === 'servidor' || v === 'nostr' ? v : null)
// O padrão é compartilhar por relays Nostr (funciona em qualquer hospedagem estática); o servidor Node é opcional.
const modoPadrao = (): ModoRede => 'nostr'
const lerJogadoresSalvos = (v: unknown): Jogador[] | null =>
  Array.isArray(v) ? v.filter((j): j is Jogador => typeof j?.pubkey === 'string' && typeof j?.nome === 'string') : null

interface Passo {
  sala: Sala
  rotulo: string
}

/** Atalho de teclado só vale fora de campos de texto e sem gaveta aberta. */
function digitando(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * Sala, feita para desktop: o tabuleiro ocupa a tela e as ferramentas ficam em volta dele.
 * Dados e log numa bandeja à direita; peças, ficha e notas em gavetas; combate numa faixa fina.
 *
 * Dois papéis: quem criou a sala é o **mestre** (vê tudo e cuida de monstros, vida, dano e combate, com um
 * painel fixo, atalhos de teclado e desfazer); as outras pessoas **jogam** (veem só o que o mestre mostrou
 * e movem só a própria peça).
 */
export function TelaSala() {
  const { usuario } = usarUsuario()
  // Em rede, quem joga não tem a sala de verdade: guarda a última foto que o mestre publicou, em chaves à parte.
  const [conexao, setConexao] = usarArmazenado(CHAVE_CONEXAO, null, lerConexaoSala)
  const remoto = conexao !== null
  const [salaLocal, setSalaLocal] = usarArmazenado<Sala | null>(CHAVE_SALA, null, lerSala)
  const [salaRemota, setSalaRemota] = usarArmazenado<Sala | null>(CHAVES_SALA_REMOTA[0]!, null, lerSala)
  const [logLocal, setLogLocal] = usarArmazenado<Rolagem[]>(CHAVE_LOG, [], lerHistorico)
  const [logRemoto, setLogRemoto] = usarArmazenado<Rolagem[]>(CHAVES_SALA_REMOTA[1]!, [], lerHistorico)
  const [jogadoresLocal, setJogadoresLocal] = usarArmazenado<Jogador[]>(CHAVE_JOGADORES, [], lerJogadoresSalvos)
  const [jogadoresRemoto, setJogadoresRemoto] = usarArmazenado<Jogador[]>(CHAVES_SALA_REMOTA[2]!, [], lerJogadoresSalvos)
  const sala = remoto ? salaRemota : salaLocal
  const setSala = remoto ? setSalaRemota : setSalaLocal
  const log = remoto ? logRemoto : logLocal
  const setLog = remoto ? setLogRemoto : setLogLocal
  const jogadores = remoto ? jogadoresRemoto : jogadoresLocal
  const [redeAtiva, setRedeAtiva] = usarArmazenado<boolean>(CHAVE_REDE_MESTRE, false, lerBooleano)
  const [modo, setModo] = usarArmazenado<ModoRede>(CHAVE_REDE_MODO, modoPadrao(), lerModo)
  const [relays, setRelays] = useState(relaysDoMestre)
  const [baseConvite, setBaseConvite] = useState(baseDoConvite)
  const [notas, setNotas] = usarArmazenado<string>(CHAVE_NOTAS, '', lerNotas)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<Casa | null>(null)
  const [aviso, setAviso] = useState('')
  // Presença (só nos relays): sinais que o mestre recebeu e um relógio que gira a cada 30 s para o "visto há…" andar.
  const [vistosMestre, setVistosMestre] = useState<Vistos>({})
  const [agoraMs, setAgoraMs] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setAgoraMs(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const [gaveta, setGaveta] = useState<'pecas' | 'ficha' | 'notas' | 'sala' | 'rede' | 'vida' | 'minha' | 'mesa' | 'modelos' | null>(null)
  const [anunciada, setAnunciada] = useState<Rolagem | null>(null)
  // A última rolagem (inclusive as secretas) e a última de dano já aplicada, para o botão não aplicar duas vezes.
  const [ultima, setUltima] = useState<Rolagem | null>(null)
  const [danoAplicado, setDanoAplicado] = useState<string | null>(null)
  const [secreta, setSecreta] = useState(false)
  // Menu do botão direito sobre uma peça (mestre).
  const [menuPeca, setMenuPeca] = useState<{ id: string; x: number; y: number } | null>(null)
  // Menu do botão direito numa casa vazia: colocar peça ali.
  const [menuCasa, setMenuCasa] = useState<{ casa: Casa; x: number; y: number } | null>(null)
  // Montar o cenário: o mestre escolhe o terreno e toca nas casas.
  const [cenarioAberto, setCenarioAberto] = useState(false)
  // Destacar casas para a mesa toda ver, com uma frase curta opcional.
  const [destaqueAberto, setDestaqueAberto] = useState(false)
  const [textoDestaque, setTextoDestaque] = useState('')
  // O que o mestre pintar já nasce escondido de quem joga (armadilha, porta secreta).
  const [pintarEscondido, setPintarEscondido] = useState(false)
  const [terreno, setTerreno] = useState<Terreno | null>('parede')
  // Desfazer: as últimas mudanças da sala, da mais nova para a mais velha. Só vale enquanto a página estiver aberta.
  const [pilha, setPilha] = useState<Passo[]>([])
  // Salas em que o mestre dispensou o roteiro "Prepare a mesa".
  const [roteiroDispensado, setRoteiroDispensado] = usarArmazenado<string[]>('rpg:sala:roteiro', [], lerDispensadas)
  // Refazer: o que foi desfeito, até a próxima mudança.
  const [futuro, setFuturo] = useState<Passo[]>([])
  const menu = useRef<HTMLDetailsElement>(null)
  // Os atalhos de teclado chamam as funções da renderização atual por aqui.
  const atalhos = useRef<Record<string, () => void>>({})
  const { registrar } = usarJornada()

  // Sala de antes dos papéis: quem abrir primeiro vira o mestre.
  useEffect(() => {
    if (!remoto && sala && !sala.mestre && usuario) setSala({ ...sala, mestre: usuario.pubkey })
  }, [remoto, sala, usuario, setSala])

  // Rede. O servidor guarda a sala. O mestre manda o estado completo; quem joga manda ações e recebe a foto pública.
  const estado = useMemo<Estado | null>(() => (sala ? { sala, log, jogadores } : null), [sala, log, jogadores])
  const estadoRef = useRef(estado)
  estadoRef.current = estado
  const souMestre = !remoto && sala !== null && usuario !== null && sala.mestre === usuario.pubkey
  const [urlServidor, setUrlServidor] = useState(urlDoServidor)
  const [enderecoDigitado, setEnderecoDigitado] = useState(urlServidor)
  // Versão que o servidor nos deu e o estado (em JSON) que ele já conhece: evita devolver o que ele acabou de mandar.
  const versaoRef = useRef(0)
  const sincronizado = useRef('')
  const emVoo = useRef(false)
  const [ack, setAck] = useState(0)
  const cabecaDoLog = useRef<string | null>(null)

  // Quem joga é avisado quando o mestre destaca uma casa nova (a primeira leitura da sala não conta).
  const destaquesVistos = useRef<Set<string> | null>(null)
  useEffect(() => {
    const atuais = new Map((sala?.destaques ?? []).map((d) => [`${d.coluna},${d.linha}`, d]))
    const antes = destaquesVistos.current
    destaquesVistos.current = new Set(atuais.keys())
    if (!antes || souMestre) return
    const nova = [...atuais].find(([k]) => !antes.has(k))?.[1]
    if (nova) setAviso(`O mestre destacou ${nomeCasa(nova.coluna, nova.linha)}${nova.texto ? `: ${nova.texto}` : ''}.`)
  }, [sala?.destaques, souMestre])

  /** Guarda um estado que veio do servidor como sendo o da sala. */
  function adotar(e: Estado) {
    estadoRef.current = e
    sincronizado.current = JSON.stringify(e)
    setSalaLocal(e.sala)
    setLogLocal(e.log)
    setJogadoresLocal(e.jogadores)
  }

  /** Rolagem nova de outra pessoa aparece em destaque para a mesa toda (iniciativa não). */
  function anunciarSeNova(novoLog: Rolagem[], primeira: boolean) {
    const cabeca = novoLog[0]
    if (!cabeca || cabeca.id === cabecaDoLog.current) return
    cabecaDoLog.current = cabeca.id
    if (!primeira && !cabeca.iniciativa) setAnunciada((prev) => (prev?.id === cabeca.id ? prev : cabeca))
  }

  const inicialDoMestre = (): MensagemCliente | null => {
    emVoo.current = false
    const e = estadoRef.current
    return e && usuario ? { t: 'abrir', sala: e.sala.id, pubkey: usuario.pubkey, nome: usuario.nome, estado: e, versao: versaoRef.current } : null
  }
  const aoMensagemDoMestre = (m: MensagemServidor) => {
    if (m.t === 'ok') {
      versaoRef.current = m.versao
      emVoo.current = false
      setAck((a) => a + 1)
    } else if (m.t === 'ola' && m.papel === 'mestre') {
      versaoRef.current = m.versao
      emVoo.current = false
      anunciarSeNova(m.estado.log, true)
      adotar(m.estado)
    } else if (m.t === 'estado') {
      versaoRef.current = m.versao
      anunciarSeNova(m.estado.log, false)
      adotar(m.estado)
    } else if (m.t === 'presenca') {
      setVistosMestre(m.vistos)
    } else if (m.t === 'conflito') {
      versaoRef.current = m.versao
      emVoo.current = false
      adotar(m.estado)
      setAviso('A sala mudou enquanto você editava (alguém jogou). Veja como ficou e refaça o que faltou.')
    }
  }

  const mestreNoServidor = usarServidor(souMestre && redeAtiva && modo === 'servidor' ? urlServidor : null, inicialDoMestre, aoMensagemDoMestre)
  const mestreNoNostr = usarNostrMestre(souMestre && redeAtiva && modo === 'nostr' ? relays : null, inicialDoMestre, aoMensagemDoMestre)
  const conexaoMestre = modo === 'nostr' ? mestreNoNostr : mestreNoServidor

  // O mestre devolve ao servidor cada mudança sua, uma de cada vez (espera o "ok" antes de mandar a próxima).
  useEffect(() => {
    if (!souMestre || !redeAtiva || conexaoMestre.fase !== 'ok' || !estado || emVoo.current) return
    const json = JSON.stringify(estado)
    if (json === sincronizado.current) return
    const t = window.setTimeout(() => {
      if (emVoo.current) return
      emVoo.current = true
      sincronizado.current = json
      conexaoMestre.enviar({ t: 'estado', base: versaoRef.current, estado })
    }, 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, souMestre, redeAtiva, conexaoMestre.fase, ack])

  const inicialDoJogador = (): MensagemCliente | null => (conexao && usuario ? { t: 'entrar', sala: conexao.salaId, pubkey: usuario.pubkey, nome: usuario.nome } : null)
  const aoMensagemDoJogador = (m: MensagemServidor) => {
    if (m.t === 'foto' || (m.t === 'ola' && m.papel === 'jogador')) {
      anunciarSeNova(m.foto.log, m.t === 'ola')
      setSalaRemota(m.foto.sala)
      setLogRemoto(m.foto.log)
      setJogadoresRemoto(m.foto.jogadores)
    }
  }
  const convite = conexao?.nostr ? { salaId: conexao.salaId, mestre: conexao.nostr.mestre, relays: conexao.nostr.relays.length > 0 ? conexao.nostr.relays : [...RELAYS_PADRAO] } : null
  const jogadorNoServidor = usarServidor(remoto && !convite ? urlServidor : null, inicialDoJogador, aoMensagemDoJogador)
  const jogadorNoNostr = usarNostrJogador(remoto ? convite : null, inicialDoJogador, aoMensagemDoJogador)
  const conexaoJogador = convite ? jogadorNoNostr : jogadorNoServidor
  const fase = remoto ? conexaoJogador.fase : conexaoMestre.fase
  // Quem está na mesa: só existe nos relays. Para o mestre, os sinais vêm da ponte; para quem joga, da foto.
  const comPresenca = remoto ? !!convite : redeAtiva && modo === 'nostr'
  const vistos = remoto ? (conexaoJogador.presenca?.vistos ?? {}) : vistosMestre
  const mestreEm = remoto ? (conexaoJogador.presenca?.mestreEm ?? null) : null
  // O mestre recusou uma jogada (parede escondida, por exemplo): a foto já trouxe a sala real, aqui só se explica.
  const recusadas = remoto ? conexaoJogador.recusadas?.n ?? 0 : 0
  useEffect(() => {
    if (recusadas > 0) setAviso(conexaoJogador.recusadas?.acao === 'mover' ? 'Algo impediu o movimento. A peça voltou.' : 'O mestre não aceitou essa jogada.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recusadas])
  const mestreSumido = remoto && !!convite && mestreEm !== null && mestreAusente(agoraMs, mestreEm)
  const presencaDaMesa: Presenca | undefined = comPresenca ? { vistos, mestreEm, agoraMs } : undefined
  const emitir = (acao: Parameters<typeof conexaoJogador.enviar>[0] extends infer M ? (M extends { t: 'acao'; acao: infer A } ? A : never) : never) =>
    conexaoJogador.enviar({ t: 'acao', acao })

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (digitando(e.target) || document.querySelector('dialog[open]')) return
      const tecla = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && tecla === 'z') {
        e.preventDefault()
        // Ctrl+Shift+Z refaz; Ctrl+Z desfaz.
        if (e.shiftKey) atalhos.current.y?.()
        else atalhos.current.z?.()
      } else if ((e.ctrlKey || e.metaKey) && tecla === 'y') {
        e.preventDefault()
        atalhos.current.y?.()
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && ['n', 'h', 'd', 'm', 'c', 'e'].includes(tecla)) {
        if (atalhos.current[tecla]) {
          e.preventDefault()
          atalhos.current[tecla]!()
        }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  if (!usuario) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:pb-12">
        <h1 tabIndex={-1} className="font-display text-4xl">
          Sala
        </h1>
        <section className="mt-6 space-y-3 rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
          <h2 className="font-display text-2xl">Entre para sentar à mesa</h2>
          <p className="text-tinta-suave">
            A mesa precisa saber quem é você: quem conduz a sessão e quem joga. Entre com a sua chave Nostr (ou crie uma, leva um minuto).
          </p>
          <a
            href={linkPara('perfil')}
            className="inline-flex min-h-11 items-center justify-center rounded-cordel border-2 border-borda bg-vermelho px-5 py-2.5 font-bold text-sobre-vermelho shadow-carimbo"
          >
            Entrar
          </a>
        </section>
      </main>
    )
  }

  function sairDaSalaRemota() {
    setConexao(null)
    setSalaRemota(null)
    setLogRemoto([])
    setJogadoresRemoto([])
    setSelecionada(null)
    setAlvo(null)
    setAviso('')
  }

  if (remoto && !sala) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:pb-12">
        <h1 tabIndex={-1} className="font-display text-4xl">
          Sala
        </h1>
        <section className="mt-6 space-y-3 rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
          <h2 className="font-display text-2xl">Esperando o mestre</h2>
          {convite ? (
            <>
              <p role="status" aria-live="polite" className="text-tinta-suave">
                {fase === 'erro'
                  ? 'Não consegui falar com nenhum relay.'
                  : fase === 'conectando'
                    ? 'Conectando aos relays…'
                    : 'Ainda não achei a sala. Ela aparece assim que o mestre abrir a aba dele.'}
              </p>
              <p className="text-sm text-tinta-suave">
                Relays: <code>{convite.relays.join(', ')}</code>. A sala só existe enquanto o mestre estiver com ela aberta.
              </p>
            </>
          ) : (
            <>
              <p role="status" aria-live="polite" className="text-tinta-suave">
                {conexaoJogador.recusa === 'sala-nao-existe'
                  ? 'Essa sala não existe no servidor. Peça ao mestre para abri-la em "Compartilhar".'
                  : fase === 'erro'
                    ? 'Não consegui falar com o servidor.'
                    : fase === 'conectando'
                      ? 'Conectando ao servidor…'
                      : 'A sala aparece assim que o mestre abrir.'}
              </p>
              {fase === 'erro' && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-tinta-suave">
                  <li>
                    O servidor está rodando? Em outro terminal: <code>cd server &amp;&amp; npm start</code>
                  </li>
                  <li>
                    O endereço abaixo é o da máquina do servidor? Se ele está em outro computador, troque <code>localhost</code> pelo IP dele.
                  </li>
                </ul>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setUrlServidor(guardarServidor(enderecoDigitado))
                }}
              >
                <label htmlFor="endereco-servidor-espera" className="sr-only">
                  Endereço do servidor
                </label>
                <input
                  id="endereco-servidor-espera"
                  value={enderecoDigitado}
                  spellCheck={false}
                  onChange={(e) => setEnderecoDigitado(e.target.value)}
                  className="min-w-0 flex-1 rounded-cordel border-2 border-borda bg-fundo px-3 py-2.5 text-sm text-tinta"
                />
                <Botao type="submit" tamanho="pequeno" disabled={enderecoDigitado.trim() === urlServidor}>
                  Usar
                </Botao>
              </form>
            </>
          )}
          <Botao tamanho="pequeno" onClick={sairDaSalaRemota}>
            Sair desta sala
          </Botao>
        </section>
      </main>
    )
  }

  if (!sala) {
    return (
      <CriarSala
        aoCriar={(nome, colunas, linhas, modelo) => {
          setSala(modelo ? salaDoModelo(modelo, nome, undefined, usuario.pubkey) : criarSala(nome, colunas, linhas, undefined, usuario.pubkey))
          setPilha([])
          setFuturo([])
          registrar({ tipo: 'sala-criada' })
        }}
      />
    )
  }

  const atual = sala
  const eu = usuario.pubkey
  const mestre = ehMestre(atual, eu)
  // Quem joga não vê peça escondida: a tela inteira trabalha com esta "visão" da sala.
  // Quem joga não vê peça nem cenário escondidos (na rede a foto já vem sem eles; isto cobre a sala só neste navegador).
  const visao: Sala = mestre ? { ...atual, pecas: pecasVisiveis(atual, mestre) } : { ...atual, pecas: pecasVisiveis(atual, false), ...(atual.cenario ? { cenario: cenarioVisivel(atual.cenario) } : {}) }
  const vez = daVez(visao)
  const vezReal = daVez(atual)
  const pecaSelecionada = visao.pecas.find((p) => p.id === selecionada)
  const minhaPeca = atual.pecas.find((p) => p.dono === eu)
  const podeColocar = mestre || !minhaPeca
  const poucas = atual.pecas.length < 2
  const podePassar = mestre || (vezReal !== undefined && vezReal.dono === eu)
  const logVisivel = mestre ? log : log.filter((r) => !r.secreta)
  const dano = mestre && ultima && ultima.tipo === 'soma' && ultima.id !== danoAplicado ? ultima : null
  const ultimoPasso = pilha[pilha.length - 1]

  const moveEu = (p: Peca) => podeMover(p, mestre, eu)

  /** Toda mudança da sala passa por aqui, para dar para desfazer. */
  function mudar(nova: Sala, rotulo: string) {
    setPilha((p) => [...p.slice(-(MAX_DESFAZER - 1)), { sala: atual, rotulo }])
    setFuturo([])
    setSala(nova)
  }

  function desfazer() {
    const passo = pilha[pilha.length - 1]
    if (!passo) return
    setPilha((p) => p.slice(0, -1))
    setFuturo((f) => [...f, { sala: atual, rotulo: passo.rotulo }])
    setSala(passo.sala)
    if (selecionada && !passo.sala.pecas.some((p) => p.id === selecionada)) setSelecionada(null)
    setAviso(`Desfeito: ${passo.rotulo}.`)
  }

  function refazer() {
    const passo = futuro[futuro.length - 1]
    if (!passo) return
    setFuturo((f) => f.slice(0, -1))
    setPilha((p) => [...p.slice(-(MAX_DESFAZER - 1)), { sala: atual, rotulo: passo.rotulo }])
    setSala(passo.sala)
    if (selecionada && !passo.sala.pecas.some((p) => p.id === selecionada)) setSelecionada(null)
    setAviso(`Refeito: ${passo.rotulo}.`)
  }

  const ferramenta: Ferramenta = cenarioAberto ? 'cenario' : destaqueAberto ? 'destaque' : 'mover'
  function escolherFerramenta(f: Ferramenta) {
    setCenarioAberto(f === 'cenario')
    setDestaqueAberto(f === 'destaque')
  }

  function selecionar(id: string | null) {
    setSelecionada(id)
    setAlvo(null)
    const peca = visao.pecas.find((p) => p.id === id)
    setAviso(peca ? `Selecionou ${peca.nome}.${mestre ? '' : ' Toque numa casa vazia para levar até lá.'}` : '')
  }

  const textoDoMotivo = (m: MotivoDoMovimento, coluna: number, linha: number) =>
    m === 'fora' ? `${nomeCasa(coluna, linha)} fica fora do mapa.` : m === 'ocupada' ? `${nomeCasa(coluna, linha)} está ocupada.` : `Algo bloqueia o caminho em ${nomeCasa(coluna, linha)}.`

  function aoTocarCasa(coluna: number, linha: number) {
    // No modo Destaque o toque liga ou desliga o destaque da casa, em vez de selecionar.
    if (mestre && destaqueAberto) {
      const ligando = !destaqueEm(atual, coluna, linha)
      mudar(alternarDestaque(atual, { coluna, linha }, textoDestaque), `destaque em ${nomeCasa(coluna, linha)}`)
      setAviso(ligando ? `${nomeCasa(coluna, linha)} destacada para a mesa.` : `Destaque de ${nomeCasa(coluna, linha)} tirado.`)
      return
    }
    const peca = pecaEm(visao, coluna, linha)
    if (peca) {
      if (peca.id === selecionada) selecionar(null)
      else if (moveEu(peca)) selecionar(peca.id)
      else setAviso(`${peca.nome} é de outra pessoa. Você move só a sua peça.`)
      return
    }
    if (pecaSelecionada) {
      const nova = moverPeca(atual, pecaSelecionada.id, coluna, linha)
      if (nova === atual) return setAviso(textoDoMotivo(motivoDoMovimento(atual, pecaSelecionada.id, coluna, linha) ?? 'bloqueada', coluna, linha))
      mudar(nova, `mover ${pecaSelecionada.nome}`)
      setSelecionada(null)
      setAviso(`${pecaSelecionada.nome} foi para ${nomeCasa(coluna, linha)}.`)
      registrar({ tipo: 'peca-movida' })
      if (remoto) emitir({ tipo: 'mover', peca: pecaSelecionada.id, coluna, linha })
      return
    }
    if (!podeColocar) return
    // Casa vazia sem ninguém selecionado: marca onde a próxima peça vai entrar.
    const mesma = alvo?.coluna === coluna && alvo.linha === linha
    setAlvo(mesma ? null : { coluna, linha })
    setAviso(mesma ? '' : `A próxima peça entra em ${nomeCasa(coluna, linha)}.`)
  }

  function aoAdicionar(nome: string, tipo: TipoPeca, quantidade: number, pv?: number, casa?: Casa) {
    const destino = casa ?? alvo ?? undefined
    if (remoto) {
      // Quem joga em rede pede a peça ao mestre; ela volta na próxima foto.
      emitir({ tipo: 'colocar', nome, ...(destino ? { casa: destino } : {}) })
      setGaveta(null)
      setAlvo(null)
      setAviso('Pedido enviado. Seu personagem aparece em instantes.')
      return
    }
    let nova = atual
    let primeira: string | undefined
    for (let i = 0; i < (mestre ? quantidade : 1); i++) {
      const antes = nova
      // Quem joga só chama personagem, e a peça já é dela.
      nova = adicionarPeca(nova, nome, mestre ? tipo : 'personagem', undefined, i === 0 ? destino : (destino && casaLivrePerto(nova, destino)) || undefined, mestre ? pv : undefined, mestre ? undefined : eu)
      if (nova === antes) break
      primeira ??= nova.pecas[nova.pecas.length - 1]!.id
    }
    if (nova === atual || !primeira) return
    const peca = nova.pecas.find((p) => p.id === primeira)!
    const criadas = nova.pecas.length - atual.pecas.length
    mudar(nova, criadas > 1 ? `${criadas} peças` : `chamar ${peca.nome}`)
    // A gaveta fecha para mostrar a peça no tabuleiro, já selecionada: o próximo toque numa casa vazia leva ela até lá.
    setGaveta(null)
    setSelecionada(peca.id)
    setAlvo(null)
    setAviso(
      criadas > 1
        ? `${criadas} peças entraram a partir de ${nomeCasa(peca.coluna, peca.linha)}.`
        : `${peca.nome} entrou em ${nomeCasa(peca.coluna, peca.linha)}.${mestre ? '' : ' Toque numa casa vazia para mudar de lugar.'}`,
    )
    registrar({
      tipo: 'peca-adicionada',
      peca: peca.tipo,
      personagens: nova.pecas.filter((p) => p.tipo === 'personagem').length,
      monstros: nova.pecas.filter((p) => p.tipo === 'monstro').length,
    })
  }

  /** O mestre coloca no mapa o personagem de quem entrou na sala (a peça já é da pessoa). */
  function colocarJogador(jogador: Jogador, classe: string) {
    const nova = adicionarPeca(atual, classe || jogador.nome, 'personagem', undefined, alvo ?? undefined, undefined, jogador.pubkey)
    if (nova === atual) return setAviso('Não deu para colocar: o grid está cheio ou a casa está ocupada.')
    const peca = nova.pecas[nova.pecas.length - 1]!
    mudar(nova, `colocar ${jogador.nome}`)
    setSelecionada(peca.id)
    setAlvo(null)
    setGaveta(null)
    setAviso(`${jogador.nome} entrou em ${nomeCasa(peca.coluna, peca.linha)} como ${peca.nome}.`)
    registrar({ tipo: 'peca-adicionada', peca: 'personagem', personagens: nova.pecas.filter((p) => p.tipo === 'personagem').length, monstros: nova.pecas.filter((p) => p.tipo === 'monstro').length })
  }

  /** Mais uma peça igual à selecionada (outro Goblin), na primeira casa livre. */
  function aoDuplicar() {
    if (!pecaSelecionada) return
    const nova = adicionarPeca(atual, pecaSelecionada.nome.replace(/ \d+$/, ''), pecaSelecionada.tipo, undefined, undefined, pecaSelecionada.pvMax)
    if (nova === atual) return setAviso('O grid está cheio.')
    const copia = nova.pecas[nova.pecas.length - 1]!
    mudar(nova, `duplicar ${pecaSelecionada.nome}`)
    setSelecionada(copia.id)
    setAviso(`${copia.nome} entrou em ${nomeCasa(copia.coluna, copia.linha)}.`)
  }

  /** Arrastar e soltar faz o mesmo que tocar na peça e depois na casa. */
  function aoSoltar(id: string, coluna: number, linha: number) {
    const peca = visao.pecas.find((p) => p.id === id)
    if (!peca || !moveEu(peca)) return
    const nova = moverPeca(atual, id, coluna, linha)
    if (nova === atual) return setAviso(textoDoMotivo(motivoDoMovimento(atual, id, coluna, linha) ?? 'bloqueada', coluna, linha))
    mudar(nova, `mover ${peca.nome}`)
    setSelecionada(null)
    setAlvo(null)
    setAviso(`${peca.nome} foi para ${nomeCasa(coluna, linha)}.`)
    registrar({ tipo: 'peca-movida' })
    if (remoto) emitir({ tipo: 'mover', peca: id, coluna, linha })
  }

  function aoAlterarPv(delta: number) {
    if (!pecaSelecionada) return
    const nova = alterarPv(atual, pecaSelecionada.id, delta)
    const pv = nova.pecas.find((p) => p.id === pecaSelecionada.id)!.pv
    mudar(nova, delta < 0 ? `dano em ${pecaSelecionada.nome}` : `cura em ${pecaSelecionada.nome}`)
    setAviso(
      pv === 0
        ? `${pecaSelecionada.nome} caiu.`
        : `${pecaSelecionada.nome} ${delta < 0 ? `levou ${-delta} de dano` : `recebeu ${delta} de cura`}: ${pv}/${pecaSelecionada.pvMax} PV.`,
    )
  }

  function aoAplicarDano() {
    if (!dano) return
    aoAlterarPv(-dano.total)
    setDanoAplicado(dano.id)
  }

  function aoAlternarOculta() {
    if (!pecaSelecionada) return
    mudar(alternarOculta(atual, pecaSelecionada.id), pecaSelecionada.oculta ? `revelar ${pecaSelecionada.nome}` : `esconder ${pecaSelecionada.nome}`)
    setAviso(pecaSelecionada.oculta ? `${pecaSelecionada.nome} apareceu para a mesa.` : `${pecaSelecionada.nome} sumiu da vista da mesa.`)
  }

  function aoRemover(id: string) {
    const peca = atual.pecas.find((p) => p.id === id)
    mudar(removerPeca(atual, id), `remover ${peca?.nome ?? 'peça'}`)
    if (id === selecionada) setSelecionada(null)
    if (peca) setAviso(`${peca.nome} saiu do grid.`)
    if (remoto) emitir({ tipo: 'remover', peca: id })
  }

  function aoPintar(casas: Casa[]) {
    const nova = pintar(atual, casas, terreno, pintarEscondido)
    if (nova === atual || JSON.stringify(nova.cenario) === JSON.stringify(atual.cenario)) return
    mudar(nova, terreno ? `pintar ${nomeTerreno(terreno).toLowerCase()}${pintarEscondido ? ' escondido' : ''}` : 'apagar cenário')
  }

  /** Esconde ou revela o cenário de quem joga: uma casa, todas do mesmo terreno ou tudo. */
  function aoOcultarCenario(oculta: boolean, filtro?: (c: NonNullable<Sala['cenario']>[number]) => boolean, rotulo = 'o cenário') {
    const nova = ocultarCenario(atual, oculta, filtro)
    if (nova === atual) return
    const n = (nova.cenario ?? []).filter((c, i) => c !== atual.cenario?.[i]).length
    mudar(nova, `${oculta ? 'esconder' : 'revelar'} ${rotulo}`)
    setAviso(`${n} ${n === 1 ? 'casa' : 'casas'} de cenário ${oculta ? 'escondidas dos jogadores' : 'reveladas'}.`)
  }

  /** Faz quem joga ver outra coisa no lugar do terreno escondido (a porta secreta que parece parede). */
  function aoDisfarcar(casa: Casa, como: Terreno | null) {
    const nova = disfarcarCenario(atual, casa, como)
    if (nova === atual) return
    mudar(nova, como ? `disfarçar ${nomeCasa(casa.coluna, casa.linha)} de ${nomeTerreno(como).toLowerCase()}` : `tirar o disfarce de ${nomeCasa(casa.coluna, casa.linha)}`)
    setAviso(como ? `${nomeCasa(casa.coluna, casa.linha)} aparece como ${nomeTerreno(como).toLowerCase()} para quem joga.` : `${nomeCasa(casa.coluna, casa.linha)} voltou a ficar escondida.`)
  }

  /** Pinta (ou limpa) uma casa só, pelo menu do botão direito. */
  function aoPintarCasa(t: Terreno | null, casa: Casa) {
    const nova = pintar(atual, [casa], t)
    if (JSON.stringify(nova.cenario) === JSON.stringify(atual.cenario)) return
    mudar(nova, t ? `pintar ${nomeTerreno(t).toLowerCase()}` : 'limpar terreno')
  }

  /** Salva a ficha de uma peça (descrição, CD, bônus de iniciativa). Em rede, também avisa o servidor. */
  function aoSalvarFicha(id: string, campos: CamposFicha) {
    const peca = atual.pecas.find((p) => p.id === id)
    if (!peca) return
    mudar(editarFicha(atual, id, campos), `ficha de ${peca.nome}`)
    if (remoto) emitir({ tipo: 'ficha', peca: id, ...campos })
    setGaveta(null)
    setAviso(`Ficha de ${peca.nome} salva.`)
  }

  function aoLimparCenario() {
    if (!atual.cenario || !window.confirm('Apagar todo o cenário? Dá para desfazer.')) return
    mudar(pintar(atual, atual.cenario, null), 'limpar o cenário')
  }

  /** Troca o cenário e o tamanho pelo do modelo. As peças ficam e nenhuma entra numa parede. */
  function aoAplicarModelo(modelo: Modelo) {
    if ((atual.cenario?.length ?? 0) > 0 && !window.confirm(`Trocar o cenário atual pelo modelo "${modelo.nome}"? As peças ficam. Dá para desfazer.`)) return
    mudar(aplicarModelo(atual, modelo), `modelo ${modelo.nome}`)
    setGaveta(null)
    setAviso(`Modelo "${modelo.nome}" aplicado: ${modelo.colunas} × ${modelo.linhas} casas.`)
  }

  function aoIniciarCombate() {
    const { sala: nova, iniciativas } = iniciarCombate(atual)
    mudar(nova, 'iniciar o combate')
    // Iniciativas vão para o log na ordem em que foram roladas.
    setLog((l) => noHistorico(l, ...iniciativas.map(({ peca, dado, bonus }) => noMomento(rolagemAvulsa(peca.nome, 20, [dado], bonus), { iniciativa: true }))))
    const primeira = daVez(nova)!
    setSelecionada(primeira.id)
    setAlvo(null)
    setAviso(`Combate! ${primeira.nome} age primeiro.`)
    registrar({ tipo: 'combate-iniciado' })
  }

  function aoPassarVez() {
    if (!atual.combate || !podePassar) return
    const nova = passarVez(atual)
    mudar(nova, 'passar a vez')
    const proxima = daVez(nova)!
    // A peça da vez já vem selecionada, para quem pode mexer nela.
    setSelecionada(moveEu(proxima) ? proxima.id : null)
    setAviso(proxima.oculta && !mestre ? 'Passou a vez.' : `Vez de ${proxima.nome}.`)
    if (nova.combate!.rodada > atual.combate!.rodada) registrar({ tipo: 'nova-rodada', rodada: nova.combate!.rodada })
    if (remoto) emitir({ tipo: 'passar' })
  }

  function fecharMenu() {
    menu.current?.removeAttribute('open')
  }

  function aoEditarSala(nome: string, colunas: number, linhas: number) {
    const nova = editarSala(atual, nome, colunas, linhas)
    setGaveta(null)
    if (nova.nome === atual.nome && nova.colunas === atual.colunas && nova.linhas === atual.linhas) return
    mudar(nova, 'editar a sala')
    setAviso(`Sala atualizada: ${nova.nome}, ${nova.colunas} × ${nova.linhas} casas.`)
  }

  function aoSalvarVidaBase(valores: Record<string, number | null>, nasPecas: boolean) {
    const nova = definirPvBase(atual, valores, nasPecas)
    setGaveta(null)
    if (JSON.stringify(nova) === JSON.stringify(atual)) return
    mudar(nova, 'vida base')
    setAviso(nasPecas ? 'Vida base salva e aplicada às peças do tabuleiro.' : 'Vida base salva para as próximas peças.')
  }

  function aoEncerrarCombate() {
    fecharMenu()
    mudar(encerrarCombate(atual), 'encerrar o combate')
    setSelecionada(null)
    setAviso('Combate encerrado. Hora de respirar.')
  }

  function aoApagarSala() {
    fecharMenu()
    if (!window.confirm(`Apagar a sala "${atual.nome}" com as peças, o log e as notas? Seu XP e seus selos continuam.`)) return
    setLog([])
    setJogadoresLocal([])
    setRedeAtiva(false)
    setNotas('')
    setPilha([])
    setFuturo([])
    setSelecionada(null)
    setAlvo(null)
    setAviso('')
    setSala(null)
  }

  // Atalhos do mestre: N passa a vez, H esconde ou revela, D vai para o campo de dano, Ctrl+Z desfaz.
  atalhos.current = mestre
    ? {
        n: aoPassarVez,
        h: aoAlternarOculta,
        d: () => document.getElementById('valor-pv')?.focus(),
        z: desfazer,
        y: refazer,
        m: () => escolherFerramenta('mover'),
        c: () => escolherFerramenta('cenario'),
        e: () => escolherFerramenta('destaque'),
      }
    : {}

  const dicaPadrao = !visao.pecas.length
    ? mestre
      ? 'Tabuleiro vazio. Abra "+ Peça" e chame um herói ou um monstro, ou toque antes numa casa para escolher onde ele entra.'
      : 'Tabuleiro vazio. Abra "+ Peça" e chame o seu personagem.'
    : minhaPeca || mestre
      ? 'Toque numa peça e depois numa casa vazia, ou arraste, para mover.'
      : 'Abra "+ Peça" para chamar o seu personagem.'

  return (
    // Na tela larga, a sala ocupa exatamente a altura que sobra abaixo do cabeçalho: o tabuleiro cabe sem rolar a página.
    <main className="flex flex-col gap-3 px-4 pt-4 pb-32 sm:pb-6 lg:h-[calc(100dvh-4.25rem)] lg:px-6 lg:pb-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 shrink-0 lg:max-w-60">
          <h1 tabIndex={-1} className="truncate font-display text-2xl">
            {atual.nome}
          </h1>
          <p className="text-sm text-tinta-suave">
            {atual.colunas} × {atual.linhas} casas · {visao.pecas.length} {visao.pecas.length === 1 ? 'peça' : 'peças'} ·{' '}
            <span className="font-bold text-tinta" title={mestre ? 'Você conduz a sessão' : 'Você joga'}>
              {mestre ? 'Mestre' : 'Jogador'}
            </span>
            {(remoto || (mestre && redeAtiva)) && (
              <>
                {' · '}
                <span
                  role="status"
                  aria-live="polite"
                  className={fase === 'ok' ? 'font-bold text-verde' : fase === 'erro' ? 'font-bold text-vermelho' : ''}
                >
                  {fase === 'ok' ? 'Conectado' : (remoto ? !!convite : modo === 'nostr') ? TEXTO_FASE_RELAYS[fase].split(';')[0] : TEXTO_FASE[fase].split(';')[0]}
                </span>
                {remoto && !!convite && fase === 'ok' && (
                  <>
                    {' · '}
                    <span role="status" className={`inline-flex items-center gap-1 font-bold ${mestreEm !== null && !mestreSumido ? 'text-verde' : 'text-vermelho'}`}>
                      <span aria-hidden className={`size-2.5 border-2 border-current ${mestreEm !== null && !mestreSumido ? 'bg-current' : ''}`} />
                      {mestreEm === null ? 'Esperando o mestre' : mestreSumido ? `Mestre sem sinal ${haQuanto(idadeS(agoraMs, mestreEm))}` : 'Mestre na mesa'}
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex min-w-0 flex-[2] basis-72 flex-wrap items-center gap-x-3 gap-y-1">
          <p role="status" aria-live="polite" className="min-w-0 flex-1 font-bold">
            {aviso || (mestreSumido ? 'O mestre saiu da mesa. Suas jogadas ficam esperando ele voltar.' : dicaPadrao)}
          </p>
          {!mestre && pecaSelecionada && (
            <div className="flex flex-wrap items-center gap-2">
              <Botao tamanho="pequeno" onClick={() => selecionar(null)}>
                Soltar
              </Botao>
              <Botao tamanho="pequeno" aria-label={`Remover ${pecaSelecionada.nome} do grid`} onClick={() => aoRemover(pecaSelecionada.id)}>
                Remover
              </Botao>
            </div>
          )}
          {alvo && !pecaSelecionada && (
            <div className="flex gap-2">
              <Botao tamanho="pequeno" aria-haspopup="dialog" onClick={() => setGaveta('pecas')}>
                Colocar peça em {nomeCasa(alvo.coluna, alvo.linha)}
              </Botao>
              <Botao
                tamanho="pequeno"
                onClick={() => {
                  setAlvo(null)
                  setAviso('')
                }}
              >
                Desmarcar
              </Botao>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mestre && (
            <>
              <Ferramentas ativa={ferramenta} aoEscolher={escolherFerramenta} />
              <div className="flex gap-1.5">
                <Botao
                  tamanho="pequeno"
                  disabled={!ultimoPasso}
                  className="gap-1.5"
                  aria-label={ultimoPasso ? `Desfazer: ${ultimoPasso.rotulo}` : 'Desfazer'}
                  title={ultimoPasso ? `Desfazer: ${ultimoPasso.rotulo} (Ctrl+Z)` : 'Nada para desfazer (Ctrl+Z)'}
                  onClick={desfazer}
                >
                  <IconeDesfazer />
                  <span className="max-2xl:sr-only">Desfazer</span>
                </Botao>
                <Botao
                  tamanho="pequeno"
                  disabled={futuro.length === 0}
                  className="gap-1.5"
                  aria-label={futuro.length > 0 ? `Refazer: ${futuro[futuro.length - 1]!.rotulo}` : 'Refazer'}
                  title={futuro.length > 0 ? `Refazer: ${futuro[futuro.length - 1]!.rotulo} (Ctrl+Shift+Z)` : 'Nada para refazer (Ctrl+Shift+Z)'}
                  onClick={refazer}
                >
                  <IconeRefazer />
                  <span className="max-2xl:sr-only">Refazer</span>
                </Botao>
              </div>
              <span aria-hidden className="mx-1 hidden h-8 w-0.5 bg-tinta-suave/50 lg:block" />
            </>
          )}
          {mestre && !atual.combate && (
            <>
              <Botao
                variante="principal"
                tamanho="pequeno"
                disabled={poucas}
                aria-describedby={poucas ? 'dica-combate' : undefined}
                title={poucas ? 'Coloque pelo menos duas peças para começar uma briga.' : 'Cada peça rola um D20 de iniciativa.'}
                onClick={aoIniciarCombate}
              >
                Iniciar combate
              </Botao>
              {poucas && (
                <span id="dica-combate" className="sr-only">
                  Coloque pelo menos duas peças para começar uma briga.
                </span>
              )}
            </>
          )}
          {podeColocar && (
            <Botao tamanho="pequeno" aria-haspopup="dialog" onClick={() => setGaveta('pecas')}>
              + Peça
            </Botao>
          )}
          <Botao tamanho="pequeno" aria-haspopup="dialog" onClick={() => setGaveta('mesa')}>
            {presencaDaMesa && sala
              ? `Mesa (${[...(sala.mestre ? [sala.mestre] : []), ...jogadores.filter((j) => j.pubkey !== sala.mestre).map((j) => j.pubkey)].filter((pk) => situacaoDe(pk, { eu: usuario.pubkey, mestre: sala.mestre, presenca: presencaDaMesa }).online).length} de ${jogadores.length + 1} online)`
              : `Mesa (${jogadores.length + 1})`}
          </Botao>
          {mestre && (
            <Botao tamanho="pequeno" className="gap-1.5" aria-haspopup="dialog" onClick={() => setGaveta('rede')}>
              <IconeCompartilhar />
              Compartilhar
            </Botao>
          )}
          {remoto && (
            <Botao tamanho="pequeno" onClick={() => window.confirm('Sair desta sala em rede? A sala some deste navegador.') && sairDaSalaRemota()}>
              Sair da sala
            </Botao>
          )}
          {mestre && (
            <details ref={menu} className="relative">
              <summary
                aria-label="Mais ações da sala"
                className="grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-cordel border-2 border-borda bg-superficie font-bold shadow-carimbo-pequeno [&::-webkit-details-marker]:hidden"
              >
                ⋯
              </summary>
              <div className="absolute right-0 z-10 mt-2 flex w-56 flex-col gap-2 rounded-cordel border-2 border-borda bg-superficie p-2 shadow-carimbo-pequeno">
                <Botao
                  tamanho="pequeno"
                  className="w-full"
                  aria-haspopup="dialog"
                  onClick={() => {
                    fecharMenu()
                    setGaveta('notas')
                  }}
                >
                  Notas do mestre
                </Botao>
                <Botao
                  tamanho="pequeno"
                  className="w-full"
                  aria-haspopup="dialog"
                  onClick={() => {
                    fecharMenu()
                    setGaveta('sala')
                  }}
                >
                  Editar sala
                </Botao>
                <Botao
                  tamanho="pequeno"
                  className="w-full"
                  aria-haspopup="dialog"
                  onClick={() => {
                    fecharMenu()
                    setGaveta('vida')
                  }}
                >
                  Vida base das peças
                </Botao>
                {atual.combate && (
                  <Botao tamanho="pequeno" className="w-full" onClick={aoEncerrarCombate}>
                    Encerrar combate
                  </Botao>
                )}
                <Botao tamanho="pequeno" className="w-full" onClick={aoApagarSala}>
                  Apagar sala
                </Botao>
                <p className="px-1 text-xs text-tinta-suave">Apagar tira as peças, o log e as notas. XP e selos continuam.</p>
              </div>
            </details>
          )}
        </div>
      </div>

      <FaixaCombate
        sala={visao}
        aoPassar={aoPassarVez}
        podePassar={podePassar}
        detalhado
        selecionada={selecionada}
        aoSelecionar={mestre ? (id) => selecionar(id === selecionada ? null : id) : undefined}
      />

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Tabuleiro" className="relative flex min-h-0 min-w-0 flex-col gap-2">
          {mestre && !cenarioAberto && !destaqueAberto && atual.pecas.length === 0 && (atual.cenario?.length ?? 0) === 0 && (
            <div className="absolute top-14 left-1/2 z-10 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 space-y-3 rounded-cordel border-2 border-borda bg-superficie p-4 shadow-carimbo">
              <p className="font-display text-xl">Mapa em branco</p>
              <p className="text-sm text-tinta-suave">Comece com um mapa pronto ou pinte o seu do zero. Você pode trocar a qualquer hora.</p>
              <div className="flex flex-wrap gap-2">
                <Botao variante="principal" tamanho="pequeno" aria-haspopup="dialog" onClick={() => setGaveta('modelos')}>
                  Escolher um modelo
                </Botao>
                <Botao tamanho="pequeno" onClick={() => escolherFerramenta('cenario')}>
                  Pintar do zero
                </Botao>
              </div>
            </div>
          )}
          <Grade
            sala={visao}
            selecionada={selecionada}
            alvo={alvo}
            podeMover={moveEu}
            mostrarVida={() => true}
            pintura={mestre && cenarioAberto ? { terreno, aoPintar } : undefined}
            aoMenuCasa={
              mestre || podeColocar
                ? (casa, ponto) => {
                    setMenuPeca(null)
                    setMenuCasa({ casa, ...ponto })
                  }
                : undefined
            }
            aoMenuPeca={
              mestre
                ? (p, ponto) => {
                    // Botão direito também seleciona a peça, para o painel e os atalhos (N, H, D) valerem para ela.
                    setSelecionada(p.id)
                    setAlvo(null)
                    setMenuCasa(null)
                    setMenuPeca({ id: p.id, ...ponto })
                  }
                : () => setGaveta('minha')
            }
            aoAbrirFicha={(p) => {
              // Duplo clique: abre a ficha da peça (a do mestre, ou a minha para quem joga).
              setSelecionada(p.id)
              setGaveta(mestre ? 'ficha' : 'minha')
            }}
            aoTocarCasa={aoTocarCasa}
            aoSoltar={aoSoltar}
            aoCancelar={() => selecionar(null)}
          />
          {mestre && cenarioAberto && (
            <PainelCenario
              terreno={terreno}
              aoTerreno={setTerreno}
              aoLimpar={aoLimparCenario}
              aoConcluir={() => setCenarioAberto(false)}
              aoModelos={() => setGaveta('modelos')}
              temCenario={(atual.cenario?.length ?? 0) > 0}
              escondido={pintarEscondido}
              aoEscondido={setPintarEscondido}
              escondidas={(atual.cenario ?? []).filter((c) => c.oculta).length}
              total={atual.cenario?.length ?? 0}
              aoOcultarTudo={(oculta) => aoOcultarCenario(oculta)}
            />
          )}
          {mestre && destaqueAberto && (
            <PainelDestaque
              texto={textoDestaque}
              aoTexto={setTextoDestaque}
              destaques={atual.destaques ?? []}
              aoLimpar={() => mudar(limparDestaques(atual), 'limpar os destaques')}
              aoConcluir={() => setDestaqueAberto(false)}
            />
          )}
          {mestre && !cenarioAberto && !destaqueAberto && (
            <PainelPeca
              peca={pecaSelecionada ?? null}
              sala={atual}
              dano={dano ? dano.total : null}
              aoAlterarPv={aoAlterarPv}
              aoAplicarDano={aoAplicarDano}
              aoAlternarOculta={aoAlternarOculta}
              aoCondicao={(c: Condicao) => pecaSelecionada && mudar(alternarCondicao(atual, pecaSelecionada.id, c), `condição de ${pecaSelecionada.nome}`)}
              aoIniciativa={(v) => pecaSelecionada && mudar(definirIniciativa(atual, pecaSelecionada.id, v), `iniciativa de ${pecaSelecionada.nome}`)}
              aoDuplicar={aoDuplicar}
              aoAbrirFicha={() => setGaveta('ficha')}
              aoSoltar={() => selecionar(null)}
              aoRemover={() => pecaSelecionada && aoRemover(pecaSelecionada.id)}
            />
          )}
          <AnuncioRolagem rolagem={anunciada} />
          {!mestre && <AvisoDaVez sala={visao} pubkey={eu} />}
        </section>

        <aside aria-label="Dados e log" className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:pr-1 lg:pb-1">
          {!mestre && (
            <MeuPersonagem
              sala={visao}
              pubkey={eu}
              nome={usuario.nome}
              aoEditar={() => setGaveta('minha')}
              aoColocar={() => aoAdicionar(usuario.nome, 'personagem', 1)}
              aoEscolher={() => setGaveta('pecas')}
            />
          )}
          {mestre && !roteiroDispensado.includes(atual.id) && !roteiroCompleto(passosDoRoteiro(atual, jogadores.length, log.some((r) => r.iniciativa))) && (
            <RoteiroDoMestre
              passos={passosDoRoteiro(atual, jogadores.length, log.some((r) => r.iniciativa))}
              aoDispensar={() => setRoteiroDispensado((d) => [...d.filter((x) => x !== atual.id), atual.id])}
              acoes={{
                mapa: { rotulo: 'Modelos', aoClicar: () => setGaveta('modelos') },
                monstros: { rotulo: '+ Peça', aoClicar: () => setGaveta('pecas') },
                turma: { rotulo: 'Compartilhar', aoClicar: () => setGaveta('rede') },
                combate: { rotulo: 'Iniciar', aoClicar: aoIniciarCombate, desabilitado: poucas, dica: poucas ? 'Coloque pelo menos duas peças para começar uma briga.' : undefined },
              }}
            />
          )}
          {mestre && (
            <label className="flex min-h-11 items-center gap-3 rounded-cordel border-2 border-dashed border-tinta-suave px-3 font-bold">
              <input type="checkbox" checked={secreta} onChange={(e) => setSecreta(e.target.checked)} className="size-5 accent-vermelho" />
              <span>
                Rolagem secreta
                <span className="block text-sm font-normal text-tinta-suave">Só você vê: não vai para o log nem para o centro da mesa.</span>
              </span>
            </label>
          )}
          <Rolador
            key={atual.id}
            compacto
            chavePedido={CHAVE_PEDIDO}
            historico={logVisivel}
            aoRolar={(r) => {
              const escondida = mestre && secreta
              if (remoto) {
                // O log vem do mestre; aqui só mostramos o resultado e avisamos a mesa.
                setUltima(r)
                setAnunciada(r)
                emitir({ tipo: 'rolar', rolagem: r })
                registrar({ tipo: 'rolagem', rolagem: r, naSala: true })
                return
              }
              setLog((l) => noHistorico(l, noMomento(r, { rodada: atual.combate?.rodada, ...(escondida ? { secreta: true as const } : {}) })))
              setUltima(r)
              if (!escondida) setAnunciada(r)
              registrar({ tipo: 'rolagem', rolagem: r, naSala: true })
            }}
            aoLimparHistorico={() => setLog([])}
            podeLimpar={mestre}
            tituloHistorico="Log da sala"
            historicoVazio="O log conta a história da sessão: rolagens e iniciativas aparecem aqui."
            rotuloPadrao={vez?.nome ?? usuario.nome}
          />
        </aside>
      </div>

      {menuCasa && (mestre || podeColocar) && (
        <MenuDaCasa
          casa={menuCasa.casa}
          ponto={menuCasa}
          sala={atual}
          mestre={mestre}
          terrenoAtual={terrenoEm(atual, menuCasa.casa.coluna, menuCasa.casa.linha)}
          terrenoOculto={atual.cenario?.find((c) => c.coluna === menuCasa.casa.coluna && c.linha === menuCasa.casa.linha)?.oculta === true}
          terrenoDisfarce={atual.cenario?.find((c) => c.coluna === menuCasa.casa.coluna && c.linha === menuCasa.casa.linha)?.disfarce}
          aoDisfarcar={aoDisfarcar}
          bloqueada={casaBloqueada(atual, menuCasa.casa.coluna, menuCasa.casa.linha)}
          aoFechar={() => setMenuCasa(null)}
          aoAdicionar={aoAdicionar}
          aoPintar={aoPintarCasa}
          aoOcultar={(casa, oculta, so) => {
            const t = terrenoEm(atual, casa.coluna, casa.linha)
            aoOcultarCenario(oculta, (c) => (so === 'casa' ? c.coluna === casa.coluna && c.linha === casa.linha : c.terreno === t), so === 'casa' ? `${t ? nomeTerreno(t).toLowerCase() : 'terreno'} em ${nomeCasa(casa.coluna, casa.linha)}` : `todos (${t ? nomeTerreno(t).toLowerCase() : 'terreno'})`)
          }}
        />
      )}

      {mestre && menuPeca && atual.pecas.find((p) => p.id === menuPeca.id) && (
        <MenuDaPeca
          peca={atual.pecas.find((p) => p.id === menuPeca.id)!}
          ponto={menuPeca}
          aoFechar={() => setMenuPeca(null)}
          aoDefinirVida={(max, pv) => {
            const peca = atual.pecas.find((p) => p.id === menuPeca.id)!
            mudar(definirPv(atual, peca.id, max, pv), `vida de ${peca.nome}`)
            setAviso(pv === 0 ? `${peca.nome} caiu.` : `${peca.nome} está com ${pv} de ${max} PV.`)
          }}
          aoAlterarPv={aoAlterarPv}
          aoCondicao={(c) => {
            const peca = atual.pecas.find((p) => p.id === menuPeca.id)!
            mudar(alternarCondicao(atual, peca.id, c), `condição de ${peca.nome}`)
          }}
          aoAlternarOculta={aoAlternarOculta}
          aoDuplicar={aoDuplicar}
          aoRemover={() => aoRemover(menuPeca.id)}
        />
      )}

      {!mestre && (
        <GavetaPecas aberta={gaveta === 'minha' && !!minhaPeca} aoFechar={() => setGaveta(null)} titulo="Minha ficha">
          {minhaPeca && (
            <div className="space-y-5">
              <p className="font-display text-2xl">{minhaPeca.nome}</p>
              <CamposDaFicha key={minhaPeca.id} peca={minhaPeca} aoSalvar={(campos) => aoSalvarFicha(minhaPeca.id, campos)} />
            </div>
          )}
        </GavetaPecas>
      )}

        <GavetaPecas aberta={gaveta === 'mesa'} aoFechar={() => setGaveta(null)} titulo="Quem está na mesa">
          {gaveta === 'mesa' && (
            <PainelMesa
              mestre={atual.mestre}
              jogadores={jogadores}
              pecas={visao.pecas}
              eu={eu}
              mestreVendo={mestre}
              destino={alvo && nomeCasa(alvo.coluna, alvo.linha)}
              presenca={presencaDaMesa}
              aoColocar={colocarJogador}
              aoSelecionar={(id) => {
                setSelecionada(id)
                setGaveta(null)
              }}
            />
          )}
        </GavetaPecas>
      <GavetaPecas aberta={gaveta === 'pecas'} aoFechar={() => setGaveta(null)}>
        <Atalhos
          alvo={alvo && nomeCasa(alvo.coluna, alvo.linha)}
          cheio={primeiraCasaLivre(atual) === null}
          somentePersonagem={!mestre}
          comQuantidade={mestre}
          comVida={mestre}
          sala={atual}
          aoEditarVidaBase={mestre ? () => setGaveta('vida') : undefined}
          aoAdicionar={aoAdicionar}
          aoCancelarAlvo={() => {
            setAlvo(null)
            setAviso('')
          }}
        />
        {mestre && (
          <Pecas
            sala={atual}
            selecionada={selecionada}
            aoSelecionar={(id) => {
              // Mover fecha a gaveta: o próximo passo é tocar no tabuleiro.
              if (id !== selecionada) setGaveta(null)
              selecionar(id === selecionada ? null : id)
            }}
            aoRemover={aoRemover}
          />
        )}
      </GavetaPecas>

      {mestre && (
        <>
          <GavetaPecas aberta={gaveta === 'ficha' && !!pecaSelecionada} aoFechar={() => setGaveta(null)} titulo="Ficha da peça">
            {pecaSelecionada && (
              <FichaPeca
                key={pecaSelecionada.id}
                peca={pecaSelecionada}
                aoFicha={(campos) => aoSalvarFicha(pecaSelecionada.id, campos)}
                aoPv={(max, pv) => mudar(definirPv(atual, pecaSelecionada.id, max, pv), `vida de ${pecaSelecionada.nome}`)}
                aoDono={(pubkey) => mudar(definirDono(atual, pecaSelecionada.id, pubkey), `dono de ${pecaSelecionada.nome}`)} />
            )}
          </GavetaPecas>
          <GavetaPecas aberta={gaveta === 'rede'} aoFechar={() => setGaveta(null)} titulo="Compartilhar a sala">
            <PainelRede
              ativa={redeAtiva}
              aoAlternar={setRedeAtiva}
              modo={modo}
              aoMudarModo={setModo}
              relays={relays}
              aoMudarRelays={(texto) => setRelays(guardarRelays(texto))}
              baseConvite={baseConvite}
              aoMudarBase={(texto) => setBaseConvite(guardarBase(texto))}
              fase={conexaoMestre.fase}
              servidor={urlServidor}
              aoMudarServidor={(url) => setUrlServidor(guardarServidor(url))}
              link={
                modo === 'nostr'
                  ? montarConvite(baseConvite, { salaId: atual.id, mestre: chavePublicaDoNavegador(), relays })
                  : `${location.origin}${location.pathname}#/entrar/${atual.id}`
              }
              jogadores={jogadores}
            />
          </GavetaPecas>
          <GavetaPecas aberta={gaveta === 'modelos'} aoFechar={() => setGaveta(null)} titulo="Modelos de mapa">
            {gaveta === 'modelos' && (
              <>
                <p className="mb-3 text-sm text-tinta-suave">Troca o cenário e o tamanho por um mapa pronto. As peças ficam onde estão (e nunca dentro de uma parede). Ctrl+Z desfaz.</p>
                <ModelosDeMapa umaColuna aoEscolher={aoAplicarModelo} />
              </>
            )}
          </GavetaPecas>
          <GavetaPecas aberta={gaveta === 'vida'} aoFechar={() => setGaveta(null)} titulo="Vida base das peças">
            {gaveta === 'vida' && <VidaBase sala={atual} aoSalvar={aoSalvarVidaBase} aoCancelar={() => setGaveta(null)} />}
          </GavetaPecas>
          <GavetaPecas aberta={gaveta === 'sala'} aoFechar={() => setGaveta(null)} titulo="Editar sala">
            {gaveta === 'sala' && <EditarSala sala={atual} aoSalvar={aoEditarSala} aoCancelar={() => setGaveta(null)} />}
          </GavetaPecas>
          <GavetaPecas aberta={gaveta === 'notas'} aoFechar={() => setGaveta(null)} titulo="Notas do mestre">
            <label htmlFor="notas-mestre" className="block text-sm text-tinta-suave">
              Só você lê estas notas. Ficam neste navegador, com a sala.
            </label>
            <textarea
              id="notas-mestre"
              value={notas}
              maxLength={20000}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Segredos da cena, falas dos NPCs, o que está atrás da porta…"
              className="min-h-96 w-full rounded-cordel border-2 border-borda bg-fundo p-3 text-tinta placeholder:text-tinta-suave"
            />
          </GavetaPecas>
        </>
      )}
    </main>
  )
}
