import type { Event } from 'nostr-tools'
import { SINAL_MS, ONLINE_S, type Vistos } from '../presenca'
import { Servidor, type Mesas } from '../rede/mesas'
import { visaoPublica, type MensagemCliente, type MensagemServidor } from '../rede/protocolo'
import type { Barramento } from './barramento'
import { KIND_PEDIDO, lerPedido, montarFoto, tagDaSala, type Recusa } from './eventos'
import { desproteger, ehProtegida, proteger } from './protegida'

// O "servidor" da sala nos relays roda DENTRO do navegador do mestre: é o mesmo `Servidor` do Node, em memória.
// Quem joga manda pedidos (eventos efêmeros); a ponte os confere com as mesmas regras e publica a foto pública
// da sala (evento substituível). O estado completo, com monstros escondidos e notas, nunca sai do navegador.

const LOCAL = 'local'
const ATRASO_FOTO_MS = 200
// A foto é republicada a cada minuto: serve de sinal do mestre ("estou aqui") para quem joga e leva a hora do último
// sinal de cada pessoa. Os relays podem apagar a foto antiga, e assim ela também é renovada.
const REPUBLICAR_MS = SINAL_MS
const MAXIMO_VISTOS = 500

/** Evento sem a marca de protegido (o caso da sala sem senha). */
const desprotegidoAgora = (e: Event): boolean => !ehProtegida(e)

export class PonteMestre {
  private readonly mesas: Mesas = {}
  private readonly servidor = new Servidor(this.mesas)
  private readonly conectados = new Set<string>()
  /** Quem (pubkey) cada chave de relay disse ser, para registrar uma vez só. */
  private readonly entrou = new Map<string, string>()
  private readonly vistos = new Set<string>()
  /** Hora (segundos) do último pedido de cada pessoa, que vira a presença na Mesa. */
  private readonly sinais = new Map<string, number>()
  private sala: string | null = null
  private pararPedidos: (() => void) | null = null
  private publicada = 0
  /** A última jogada recusada desde a foto anterior: a próxima foto avisa quem jogou. */
  private recusada: Recusa | null = null
  private ultimoCriado = 0
  private espera: ReturnType<typeof setTimeout> | undefined
  private readonly repeticao: ReturnType<typeof setInterval>

  constructor(
    private readonly barramento: Barramento,
    private readonly aoMensagem: (msg: MensagemServidor) => void,
    private readonly agora: () => number = () => Math.floor(Date.now() / 1000),
    private readonly atrasoMs: number = ATRASO_FOTO_MS,
    /** Sala com senha: a chave que tranca a foto e abre os pedidos. Nula: sala aberta. */
    private readonly chave: CryptoKey | null = null,
  ) {
    this.servidor.conectar(LOCAL)
    this.repeticao = setInterval(() => this.publicarFoto(), REPUBLICAR_MS)
  }

  /** Uma mensagem do próprio mestre (abrir a sala, mandar o estado). Responde por `aoMensagem`. */
  enviar(msg: MensagemCliente): void {
    if (msg.t === 'abrir') this.escutar(msg.sala)
    this.despachar(this.servidor.tratar(LOCAL, msg))
    this.agendarFoto()
  }

  /** Publica a foto agora (por exemplo, quando o primeiro relay conectou). */
  reenviarFoto(): void {
    this.publicarFoto()
  }

  fechar(): void {
    clearTimeout(this.espera)
    clearInterval(this.repeticao)
    this.pararPedidos?.()
    this.pararPedidos = null
  }

  private escutar(sala: string): void {
    if (this.sala === sala) return
    this.pararPedidos?.()
    this.sala = sala
    this.pararPedidos = this.barramento.assinar({ kinds: [KIND_PEDIDO], '#d': [tagDaSala(sala)], since: this.agora() - 5 }, (e) => this.aoPedidoDoRelay(e))
  }

  /** Com senha, só vale pedido trancado com a chave da sala; sem senha, só o aberto. */
  private aoPedidoDoRelay(e: Event): void {
    if (!this.chave) {
      if (desprotegidoAgora(e)) this.aoPedido(e)
      return
    }
    void desproteger(e, this.chave).then((aberto) => aberto && this.aoPedido(aberto))
  }

  private aoPedido(e: Event): void {
    const sala = this.sala
    const mesa = sala ? this.mesas[sala] : undefined
    if (!sala || !mesa || this.vistos.has(e.id)) return
    this.vistos.add(e.id)
    if (this.vistos.size > MAXIMO_VISTOS) this.vistos.delete(this.vistos.values().next().value!)
    if (!e.tags.some((t) => t[0] === 'd' && t[1] === tagDaSala(sala))) return
    const pedido = lerPedido(e)
    if (!pedido) return
    const { quem, mensagem } = pedido
    // Ninguém entra como o mestre, e o "entrar" tem de falar da mesma pessoa que o pedido diz ser.
    if (quem.pubkey === mesa.mestre) return
    if (mensagem.t === 'entrar' && (mensagem.sala !== sala || mensagem.pubkey !== quem.pubkey)) return

    // Qualquer pedido é sinal de vida. Quem estava sumido (ou é novo) faz a foto sair já, para a Mesa se atualizar.
    const antes = this.sinais.get(quem.pubkey)
    const agora = this.agora()
    this.sinais.set(quem.pubkey, agora)
    const voltou = antes === undefined || agora - antes > ONLINE_S

    const id = e.pubkey
    if (!this.conectados.has(id)) {
      this.conectados.add(id)
      this.servidor.conectar(id)
    }
    // Qualquer pedido traz "quem sou": assim a ponte registra a pessoa mesmo que o mestre tenha recarregado a aba.
    if (mensagem.t === 'entrar' || this.entrou.get(id) !== quem.pubkey) {
      this.entrou.set(id, quem.pubkey)
      this.despachar(this.servidor.tratar(id, { t: 'entrar', sala, pubkey: quem.pubkey, nome: quem.nome }))
    }
    let recusou = false
    if (mensagem.t === 'acao') {
      const versaoAntes = mesa.versao
      const saidas = this.servidor.tratar(id, mensagem)
      this.despachar(saidas)
      // Ação que não vale faz o servidor devolver a foto real a quem jogou sem mudar a sala; aqui isso vira uma foto com a
      // etiqueta de recusa. (Ação que vale também manda a foto a quem jogou, mas aí a versão sobe.)
      recusou = mesa.versao === versaoAntes && saidas.some((s) => s.para === id && s.msg.t === 'foto')
      if (recusou) this.recusada = { pubkey: quem.pubkey, acao: mensagem.acao.tipo }
    }
    // Quem pede para entrar (de novo) ainda pode estar sem foto: publica já.
    this.agendarFoto(voltou || recusou || mensagem.t === 'entrar')
  }

  /** Só o que é para o mestre vira mensagem; o resto é de quem joga e vai na foto pública. */
  private despachar(saidas: ReturnType<Servidor['tratar']>): void {
    for (const s of saidas) if (s.para === LOCAL) this.aoMensagem(s.msg)
  }

  /** Os sinais de quem a ponte conhece (menos o mestre), do jeito que vão na foto. */
  private vistosDaMesa(): Vistos {
    return Object.fromEntries(this.sinais)
  }

  private agendarFoto(forcar = false): void {
    const mesa = this.sala ? this.mesas[this.sala] : undefined
    if (!mesa || (mesa.versao === this.publicada && !forcar)) return
    clearTimeout(this.espera)
    this.espera = setTimeout(() => this.publicarFoto(), this.atrasoMs)
  }

  private publicarFoto(): void {
    const mesa = this.sala ? this.mesas[this.sala] : undefined
    if (!this.sala || !mesa) return
    this.publicada = mesa.versao
    // created_at sempre cresce: o relay fica com a mais nova de duas fotos no mesmo segundo.
    this.ultimoCriado = Math.max(this.agora(), this.ultimoCriado + 1)
    const vistos = this.vistosDaMesa()
    const foto = visaoPublica(mesa.estado)
    const modelo = montarFoto(this.sala, mesa.versao, Object.keys(vistos).length ? { ...foto, vistos } : foto, this.ultimoCriado, this.recusada ?? undefined)
    if (this.chave) void proteger(modelo, this.chave).then((p) => this.barramento.publicar(p))
    else this.barramento.publicar(modelo)
    this.recusada = null
    this.aoMensagem({ t: 'presenca', vistos })
  }
}
