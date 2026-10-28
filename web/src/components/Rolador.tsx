import { useEffect, useRef, useState } from 'react'
import { usarArmazenado } from '../lib/armazenamento'
import {
  CD_MAX,
  CD_MIN,
  comSinal,
  descrever,
  ehDanoMaximo,
  FACES,
  faixa,
  lerPedido,
  limitar,
  margem,
  MOD_MAX,
  MOD_MIN,
  MODOS,
  nomeDado,
  nomeDificuldade,
  notacao,
  PEDIDO_PADRAO,
  pedidoDe,
  QTD_MAX,
  QTD_MIN,
  rolar,
  type Pedido,
  type Rolagem,
} from '../lib/dados'
import { Contador } from './Contador'
import { Dado, type EstadoDado } from './Dado'
import { Explosao } from './Explosao'
import { Historico } from './Historico'
import { Botao } from './ui/Botao'
import { Opcao } from './ui/Opcao'
import { DESFECHOS } from './ui/Selo'

const DURACAO_ROLAGEM = 800
const TROCA_DE_FACE = 70

const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const formatarBonus = (n: number) => comSinal(n).replace(' ', '')

export function estadoDoDado(r: Rolagem, indice: number): EstadoDado {
  const valor = r.dados[indice]!
  if (r.tipo === 'soma') return valor === r.faces ? 'destaque' : 'normal'
  // Com vantagem ou desvantagem, o dado que não vale fica apagado.
  if (r.dados.length > 1 && indice !== r.dados.indexOf(r.natural)) return 'descartado'
  if (r.desfecho === 'sucesso-critico') return 'sucesso'
  if (r.desfecho === 'falha-critica') return 'alerta'
  return 'normal'
}

/** Menos dados, dado maior. Números de 3 e 4 dígitos pedem dado maior para o texto não passar de 12 px. */
function tamanhoDoDado(quantidade: number, faces: number, compacto: boolean): string {
  if (compacto) {
    if (quantidade === 1) return 'size-16'
    if (quantidade === 2) return 'size-14'
    return faces >= 100 ? 'size-14' : 'size-12'
  }
  if (quantidade === 1) return 'size-44'
  if (quantidade === 2) return 'size-32 @md:size-40'
  if (quantidade <= 6 || faces >= 100) return 'size-24'
  return 'size-20'
}

function Carimbo({ r }: { r: Rolagem }) {
  const base = 'inline-block -rotate-2 rounded-cordel border-2 border-borda px-4 py-1 font-display text-2xl uppercase shadow-carimbo-pequeno animate-carimbar @md:text-3xl'
  if (r.tipo === 'teste') {
    return <p className={`${base} ${DESFECHOS[r.desfecho].classe}`}>{DESFECHOS[r.desfecho].rotulo}</p>
  }
  return (
    <p className={`${base} ${ehDanoMaximo(r) ? 'bg-tinta text-fundo' : 'bg-superficie text-tinta'}`}>
      {ehDanoMaximo(r) ? `Máximo! ${r.total}` : `Total ${r.total}`}
    </p>
  )
}

interface RoladorProps {
  /** Chave do localStorage para os ajustes: cada tela guarda os seus. */
  chavePedido: string
  historico: Rolagem[]
  aoRolar: (r: Rolagem) => void
  aoLimparHistorico: () => void
  tituloHistorico?: string
  historicoVazio?: string
  /** Rótulo usado quando o campo fica vazio. Na sala, é o nome de quem está na vez. */
  rotuloPadrao?: string
  /** Bandeja estreita ao lado do tabuleiro: dado menor, ajustes recolhidos e log discreto. */
  compacto?: boolean
  /** Só quem conduz a sessão apaga o log. */
  podeLimpar?: boolean
}

export function Rolador({
  chavePedido,
  historico,
  aoRolar,
  aoLimparHistorico,
  tituloHistorico,
  historicoVazio,
  rotuloPadrao,
  compacto = false,
  podeLimpar = true,
}: RoladorProps) {
  const [pedido, setPedido] = usarArmazenado<Pedido>(chavePedido, PEDIDO_PADRAO, lerPedido)
  const [resultado, setResultado] = useState<Rolagem | null>(null)
  // Faces sorteadas só para a animação; null quando o dado está parado.
  const [faces, setFaces] = useState<number[] | null>(null)
  const timers = useRef<number[]>([])
  const cartao = useRef<HTMLElement>(null)
  const botaoRolar = useRef<HTMLButtonElement>(null)

  useEffect(() => () => timers.current.forEach((t) => clearInterval(t)), [])

  const rolando = faces !== null
  const ehTeste = pedido.dado === 20
  const qtdDados = ehTeste ? (pedido.modo === 'normal' ? 1 : 2) : pedido.quantidade
  const nomeRolagem = ehTeste ? nomeDado(20) : notacao(pedido.quantidade, pedido.dado)

  function mudar(parte: Partial<Pedido>) {
    setPedido((p) => ({ ...p, ...parte }))
    setResultado(null)
  }

  function concluir(r: Rolagem) {
    setFaces(null)
    setResultado(r)
    aoRolar(r)
  }

  function rolarAgora() {
    if (rolando) return
    const r = rolar({ ...pedido, rotulo: pedido.rotulo.trim() || rotuloPadrao || '' })
    if (semMovimento()) {
      concluir(r)
      return
    }
    const sortearFaces = () => r.dados.map(() => 1 + Math.floor(Math.random() * r.faces))
    setResultado(null)
    setFaces(sortearFaces())
    const troca = window.setInterval(() => setFaces(sortearFaces()), TROCA_DE_FACE)
    const fim = window.setTimeout(() => {
      clearInterval(troca)
      concluir(r)
    }, DURACAO_ROLAGEM)
    timers.current = [troca, fim]
  }

  /** Volta os ajustes da rolagem escolhida e deixa o botão pronto: um Enter e rola de novo. */
  function repetir(r: Rolagem) {
    mudar(pedidoDe(r, pedido))
    cartao.current?.scrollIntoView({ block: 'start', behavior: semMovimento() ? 'auto' : 'smooth' })
    botaoRolar.current?.focus({ preventScroll: true })
  }

  function limpar() {
    if (window.confirm('Apagar todas as rolagens salvas?')) {
      aoLimparHistorico()
      setResultado(null)
    }
  }

  const tamanho = tamanhoDoDado(qtdDados, pedido.dado, compacto)
  const dados: { valor: number; estado: EstadoDado }[] = rolando
    ? faces.map((valor) => ({ valor, estado: 'rolando' }))
    : resultado
      ? resultado.dados.map((valor, i) => ({ valor, estado: estadoDoDado(resultado, i) }))
      : Array.from({ length: qtdDados }, () => ({ valor: pedido.dado, estado: 'parado' }))
  const [minimo, maximo] = faixa(pedido)
  const vinte = resultado?.tipo === 'teste' && resultado.desfecho === 'sucesso-critico'
  const um = resultado?.tipo === 'teste' && resultado.desfecho === 'falha-critica'

  const campoNome = (
    <div className="flex flex-col gap-1">
      <label htmlFor={`rotulo-${chavePedido}`} className={`font-bold ${compacto ? 'text-sm' : ''}`}>
        O que você está rolando?
      </label>
      <input
        id={`rotulo-${chavePedido}`}
        value={pedido.rotulo}
        maxLength={40}
        placeholder={rotuloPadrao ?? (ehTeste ? 'Ex.: Furtividade' : 'Ex.: Espada longa')}
        onChange={(e) => mudar({ rotulo: e.target.value })}
        className="min-h-11 rounded-cordel border-2 border-borda bg-fundo px-3 py-2 text-tinta placeholder:text-tinta-suave"
      />
    </div>
  )

  const sorte = (
    <fieldset>
      <legend className={compacto ? 'sr-only' : 'font-bold'}>Sorte</legend>
      <div className={`${compacto ? '' : 'mt-1'} grid grid-cols-3 gap-2`}>
        {MODOS.map((m) => (
          <Opcao key={m.valor} nome={`modo-${chavePedido}`} valor={m.valor} marcada={pedido.modo === m.valor} aoMarcar={() => mudar({ modo: m.valor })}>
            {m.rotulo}
          </Opcao>
        ))}
      </div>
      {!compacto && <p className="mt-1 text-sm text-tinta-suave">Vantagem rola dois e fica com o maior; desvantagem, com o menor.</p>}
    </fieldset>
  )

  // Na bandeja, os ajustes ficam sempre à vista e bem juntos: nome, dois contadores lado a lado e a sorte.
  const contadores = ehTeste ? (
    <>
      <Contador
        compacto={compacto}
        emLinha={!compacto}
        id={`cd-${chavePedido}`}
        rotulo="CD"
        valor={pedido.cd}
        min={CD_MIN}
        max={CD_MAX}
        aoMudar={(cd) => mudar({ cd: limitar(cd, CD_MIN, CD_MAX) })}
        ajuda={compacto ? undefined : nomeDificuldade(pedido.cd)}
      />
      <Contador
        compacto={compacto}
        emLinha={!compacto}
        id={`modificador-${chavePedido}`}
        rotulo="Bônus"
        valor={pedido.modificador}
        min={MOD_MIN}
        max={MOD_MAX}
        aoMudar={(modificador) => mudar({ modificador: limitar(modificador, MOD_MIN, MOD_MAX) })}
        formatar={formatarBonus}
        ajuda={compacto ? undefined : 'Atributo + proficiência'}
      />
    </>
  ) : (
    <>
      <Contador
        compacto={compacto}
        emLinha={!compacto}
        id={`quantidade-${chavePedido}`}
        rotulo="Quantidade"
        valor={pedido.quantidade}
        min={QTD_MIN}
        max={QTD_MAX}
        aoMudar={(quantidade) => mudar({ quantidade: limitar(quantidade, QTD_MIN, QTD_MAX) })}
        ajuda={compacto ? undefined : `Quantos ${nomeDado(pedido.dado)}`}
      />
      <Contador
        compacto={compacto}
        emLinha={!compacto}
        id={`bonus-${chavePedido}`}
        rotulo="Bônus"
        valor={pedido.bonus}
        min={MOD_MIN}
        max={MOD_MAX}
        aoMudar={(bonus) => mudar({ bonus: limitar(bonus, MOD_MIN, MOD_MAX) })}
        formatar={formatarBonus}
        ajuda={compacto ? undefined : 'Somado uma vez'}
      />
    </>
  )

  const ajustes = (
    <div className={compacto ? 'space-y-3' : 'space-y-4'}>
      {campoNome}
      {compacto ? <div className="grid grid-cols-2 gap-2">{contadores}</div> : contadores}
      {ehTeste && sorte}
    </div>
  )

  return (
    // Container queries (@md, @lg): o layout segue a largura do painel, que na sala é uma coluna estreita.
    <div className={`@container ${compacto ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-8'}`}>
      <fieldset>
        <legend className={compacto ? 'sr-only' : 'font-bold'}>Escolha o dado</legend>
        <div className={`${compacto ? '' : 'mt-1'} grid grid-cols-5 @lg:grid-cols-9 ${compacto ? 'gap-1.5' : 'gap-2'}`}>
          {FACES.map((f) => (
            <Opcao key={f} nome={`dado-${chavePedido}`} valor={String(f)} marcada={pedido.dado === f} aoMarcar={() => mudar({ dado: f })} className={`flex-col gap-0.5 ${compacto ? 'py-1 text-sm' : 'py-1.5'}`}>
              {!compacto && <Dado faces={f} className="size-6" />}
              {nomeDado(f)}
            </Opcao>
          ))}
        </div>
      </fieldset>

      <section ref={cartao} aria-label="Rolagem" className="scroll-mt-24 rounded-cordel border-2 border-borda bg-superficie p-4 shadow-carimbo @md:p-5">
        <p className={compacto ? 'flex items-baseline justify-center gap-2' : 'text-center'}>
          <span className={`font-display ${compacto ? 'text-2xl' : 'text-3xl'}`}>
            {ehTeste ? `CD ${pedido.cd}` : notacao(pedido.quantidade, pedido.dado, pedido.bonus)}
          </span>
          <span className={`text-sm font-bold tracking-wide text-tinta-suave uppercase ${compacto ? '' : 'block'}`}>
            {ehTeste ? (
              <>
                {nomeDificuldade(pedido.cd)}
                {pedido.modificador !== 0 && ` · bônus ${comSinal(pedido.modificador)}`}
                {pedido.modo !== 'normal' && ` · ${pedido.modo}`}
              </>
            ) : (
              `De ${minimo} a ${maximo}`
            )}
          </span>
        </p>

        <div className={compacto ? 'my-2 flex items-center gap-3' : ''}>
        {/* Tocar no dado também rola. É atalho de toque; o botão abaixo é o caminho acessível. */}
        <div
          aria-hidden="true"
          onClick={rolarAgora}
          title={`Toque para rolar ${nomeRolagem}`}
          className={`relative ${compacto ? 'shrink-0' : 'my-5'} flex cursor-pointer flex-wrap items-center justify-center gap-4 ${rolando ? 'cursor-wait' : ''}`}
        >
          <div key={resultado?.id ?? 'parado'} className={`flex flex-wrap items-center justify-center gap-4 ${um ? 'animate-tremer' : ''}`}>
            {dados.map((d, i) => (
              <Dado key={i} faces={pedido.dado} valor={d.valor} estado={d.estado} className={tamanho} />
            ))}
          </div>
          {vinte && <Explosao key={resultado.id} />}
        </div>

        <div role="status" aria-live="polite" className={compacto ? 'min-w-0 flex-1 text-left' : 'min-h-28 text-center'}>
          {resultado && !rolando ? (
            compacto ? (
              // Na bandeja o resultado grande aparece no tabuleiro; aqui fica só uma linha.
              <div key={resultado.id} className="animate-carimbar">
                <p className="font-display text-xl uppercase">
                  {resultado.tipo === 'teste' ? DESFECHOS[resultado.desfecho].rotulo : ehDanoMaximo(resultado) ? `Máximo! ${resultado.total}` : `Total ${resultado.total}`}
                </p>
                {resultado.tipo === 'teste' && <p className="text-sm font-bold">{margem(resultado)}</p>}
                <p className="sr-only">
                  {descrever(resultado)}
                  {resultado.tipo === 'teste' && ` contra CD ${resultado.cd}`}
                </p>
              </div>
            ) : (
            <div key={resultado.id}>
              <Carimbo r={resultado} />
              {resultado.tipo === 'teste' && <p className={`font-bold ${compacto ? 'mt-1.5' : 'mt-3'}`}>{margem(resultado)}</p>}
              <p className={`mt-1 break-words text-tinta-suave ${compacto ? 'text-sm' : ''}`}>
                {resultado.rotulo && <span className="font-bold text-tinta">{resultado.rotulo}: </span>}
                {descrever(resultado)}
                {resultado.tipo === 'teste' && ` contra CD ${resultado.cd}`}
              </p>
            </div>
            )
          ) : (
            <p className={`text-tinta-suave ${compacto ? 'text-sm' : 'pt-6'}`}>
              {rolando ? 'Rolando…' : `Toque no dado ou no botão para rolar ${nomeRolagem}.`}
            </p>
          )}
        </div>
        </div>

        <Botao ref={botaoRolar} variante="principal" className="mt-2 w-full text-lg" disabled={rolando} onClick={rolarAgora}>
          Rolar {nomeRolagem}
        </Botao>

        {/* Ajustes logo abaixo do botão: mudar e rolar sem sair do cartão. Sempre à vista. */}
        <div className={`border-t-2 border-dashed border-tinta-suave ${compacto ? 'mt-3 pt-3' : 'mt-5 pt-4'}`}>{ajustes}</div>
      </section>

      <Historico compacto={compacto} podeLimpar={podeLimpar} titulo={tituloHistorico} vazio={historicoVazio} rolagens={historico} aoLimpar={limpar} aoRepetir={repetir} />
    </div>
  )
}
