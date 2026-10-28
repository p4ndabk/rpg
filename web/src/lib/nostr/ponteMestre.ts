import type { Event } from 'nostr-tools'
import { Servidor, type Mesas } from '../rede/mesas'
import { visaoPublica, type MensagemCliente, type MensagemServidor } from '../rede/protocolo'
import type { Barramento } from './barramento'
import { KIND_PEDIDO, lerPedido, montarFoto, tagDaSala } from './eventos'

// O "servidor" da sala nos relays roda DENTRO do navegador do mestre: é o mesmo `Servidor` do Node, em memória.
// Quem joga manda pedidos (eventos efêmeros); a ponte os confere com as mesmas regras e publica a foto pública
// da sala (evento substituível). O estado completo, com monstros escondidos e notas, nunca sai do navegador.

const LOCAL = 'local'
const ATRASO_FOTO_MS = 200
// Os relays podem apagar a foto antiga; o mestre a publica de novo de tempos em tempos.
const REPUBLICAR_MS = 4 * 60_000
const MAXIMO_VISTOS = 500

export class PonteMestre {
  private readonly mesas: Mesas = {}
  private readonly servidor = new Servidor(this.mesas)
  private readonly conectados = new Set<string>()
  /** Quem (pubkey) cada chave de relay disse ser, para registrar uma vez só. */
  private readonly entrou = new Map<string, string>()
  private readonly vistos = new Set<string>()
  private sala: string | null = null
  private pararPedidos: (() => void) | null = null
  private publicada = 0
  private ultimoCriado = 0
  private espera: ReturnType<typeof setTimeout> | undefined
  private readonly repeticao: ReturnType<typeof setInterval>

  constructor(
    private readonly barramento: Barramento,
    private readonly aoMensagem: (msg: MensagemServidor) => void,
    private readonly agora: () => number = () => Math.floor(Date.now() / 1000),
    private readonly atrasoMs: number = ATRASO_FOTO_MS,
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
    this.pararPedidos = this.barramento.assinar({ kinds: [KIND_PEDIDO], '#d': [tagDaSala(sala)], since: this.agora() - 5 }, (e) => this.aoPedido(e))
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
    if (mensagem.t === 'acao') this.despachar(this.servidor.tratar(id, mensagem))
    this.agendarFoto()
  }

  /** Só o que é para o mestre vira mensagem; o resto é de quem joga e vai na foto pública. */
  private despachar(saidas: ReturnType<Servidor['tratar']>): void {
    for (const s of saidas) if (s.para === LOCAL) this.aoMensagem(s.msg)
  }

  private agendarFoto(): void {
    const mesa = this.sala ? this.mesas[this.sala] : undefined
    if (!mesa || mesa.versao === this.publicada) return
    clearTimeout(this.espera)
    this.espera = setTimeout(() => this.publicarFoto(), this.atrasoMs)
  }

  private publicarFoto(): void {
    const mesa = this.sala ? this.mesas[this.sala] : undefined
    if (!this.sala || !mesa) return
    this.publicada = mesa.versao
    // created_at sempre cresce: o relay fica com a mais nova de duas fotos no mesmo segundo.
    this.ultimoCriado = Math.max(this.agora(), this.ultimoCriado + 1)
    this.barramento.publicar(montarFoto(this.sala, mesa.versao, visaoPublica(mesa.estado), this.ultimoCriado))
  }
}
