import { randomUUID } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'
import { lerMensagemCliente } from '../../web/src/lib/rede/protocolo'
import { Servidor } from '../../web/src/lib/rede/mesas'
import { carregar, salvar } from './armazenamento'

// Servidor da sala: um WebSocket por navegador. Guarda as salas num arquivo JSON e deixa as regras para
// `Servidor` (o mesmo código testado no app). Quem joga só recebe o que pode ver.
//
// Por enquanto a identidade é a chave pública que o navegador informa, sem conferir assinatura: serve para amigos
// em rede local. Conferir a assinatura Nostr no login fica para depois.

const PORTA = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '0.0.0.0'
const ARQUIVO = process.env.DADOS ?? new URL('../dados/salas.json', import.meta.url).pathname
const ESPERA_GRAVAR_MS = 300
const TAMANHO_MAXIMO = 2 * 1024 * 1024

const mesas = carregar(ARQUIVO)
let gravacao: ReturnType<typeof setTimeout> | undefined
const servidor = new Servidor(mesas, () => {
  // Agrupa mudanças seguidas numa gravação só.
  clearTimeout(gravacao)
  gravacao = setTimeout(() => salvar(ARQUIVO, mesas), ESPERA_GRAVAR_MS)
})

const sockets = new Map<string, WebSocket>()
const wss = new WebSocketServer({ port: PORTA, host: HOST, maxPayload: TAMANHO_MAXIMO })

wss.on('connection', (ws) => {
  const id = randomUUID()
  sockets.set(id, ws)
  servidor.conectar(id)
  const viva = { valor: true }
  ws.on('pong', () => (viva.valor = true))

  ws.on('message', (dados) => {
    const msg = lerMensagemCliente(dados.toString())
    if (!msg) return
    for (const saida of servidor.tratar(id, msg)) {
      const alvo = sockets.get(saida.para)
      if (alvo?.readyState === alvo?.OPEN) alvo?.send(JSON.stringify(saida.msg))
    }
  })

  ws.on('close', () => {
    sockets.delete(id)
    servidor.desconectar(id)
    clearInterval(batida)
  })

  // Conexão que não responde ao ping é derrubada (aba fechada sem avisar).
  const batida = setInterval(() => {
    if (!viva.valor) return ws.terminate()
    viva.valor = false
    ws.ping()
  }, 30_000)
})

wss.on('listening', () => {
  console.log(`Servidor da sala em ws://${HOST}:${PORTA}  (${Object.keys(mesas).length} sala(s) em ${ARQUIVO})`)
})

function encerrar() {
  clearTimeout(gravacao)
  salvar(ARQUIVO, mesas)
  wss.close(() => process.exit(0))
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
