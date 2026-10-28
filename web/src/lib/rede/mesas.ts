import { aplicarAcao, lerEstado, visaoPublica, type Estado, type Mesa, type MensagemCliente, type MensagemServidor, type ResumoSala } from './protocolo'

// O cérebro do servidor, sem rede nem arquivo: recebe a mensagem de uma conexão e diz o que enviar a quem.
// Fica aqui (e não em `server/`) para rodar nos testes do app e usar as mesmas regras do navegador.

export interface Conexao {
  id: string
  sala?: string
  pubkey?: string
  papel?: 'mestre' | 'jogador'
}

export interface Saida {
  /** Id da conexão que recebe. */
  para: string
  msg: MensagemServidor
}

export type Mesas = Record<string, Mesa>

/** Lê o arquivo de salas do servidor, descartando o que estiver corrompido. */
export function lerMesas(v: unknown): Mesas {
  const mesas: Mesas = {}
  if (typeof v !== 'object' || v === null) return mesas
  for (const [id, m] of Object.entries(v)) {
    const estado = lerEstado((m as Mesa | undefined)?.estado)
    const mestre = (m as Mesa | undefined)?.mestre
    const versao = (m as Mesa | undefined)?.versao
    if (estado && typeof mestre === 'string' && /^[0-9a-f]{64}$/.test(mestre) && Number.isInteger(versao) && estado.sala.id === id) {
      const quando = (m as Mesa).atualizadaEm
      mesas[id] = { mestre, versao: versao as number, estado, ...(typeof quando === 'number' ? { atualizadaEm: quando } : {}) }
    }
  }
  return mesas
}

export class Servidor {
  private readonly conexoes = new Map<string, Conexao>()

  constructor(
    private readonly mesas: Mesas = {},
    /** Chamado a cada mudança de sala, para o servidor gravar. */
    private readonly aoMudar: (mesas: Mesas) => void = () => {},
    private readonly agora: () => number = Date.now,
  ) {}

  conectar(id: string): void {
    this.conexoes.set(id, { id })
  }

  desconectar(id: string): void {
    this.conexoes.delete(id)
  }

  /** Quem está conectado à sala, por papel. */
  private de(sala: string, papel: 'mestre' | 'jogador'): Conexao[] {
    return [...this.conexoes.values()].filter((c) => c.sala === sala && c.papel === papel)
  }

  private mudou(sala: string): void {
    this.mesas[sala]!.atualizadaEm = this.agora()
    this.aoMudar(this.mesas)
  }

  /** As salas em que a pessoa é mestre ou já entrou como jogadora, da mais recente para a mais antiga. */
  listar(pubkey: string): ResumoSala[] {
    const lista: ResumoSala[] = []
    for (const [id, mesa] of Object.entries(this.mesas)) {
      const mestre = mesa.mestre === pubkey
      if (!mestre && !mesa.estado.jogadores.some((j) => j.pubkey === pubkey)) continue
      lista.push({
        id,
        nome: mesa.estado.sala.nome,
        papel: mestre ? 'mestre' : 'jogador',
        jogadores: mesa.estado.jogadores.length,
        pecas: mesa.estado.sala.pecas.filter((p) => mestre || !p.oculta).length,
        rodada: mesa.estado.sala.combate?.rodada ?? null,
        atualizadaEm: mesa.atualizadaEm ?? 0,
      })
    }
    return lista.sort((a, b) => b.atualizadaEm - a.atualizadaEm || a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  /** Manda a todos da sala o que mudou: o estado completo ao mestre e a foto pública a quem joga. */
  private espalhar(sala: string, exceto?: string): Saida[] {
    const mesa = this.mesas[sala]!
    const foto = visaoPublica(mesa.estado)
    return [
      ...this.de(sala, 'mestre')
        .filter((c) => c.id !== exceto)
        .map((c): Saida => ({ para: c.id, msg: { t: 'estado', versao: mesa.versao, estado: mesa.estado } })),
      ...this.de(sala, 'jogador')
        .filter((c) => c.id !== exceto)
        .map((c): Saida => ({ para: c.id, msg: { t: 'foto', versao: mesa.versao, foto } })),
    ]
  }

  tratar(id: string, msg: MensagemCliente): Saida[] {
    const conn = this.conexoes.get(id)
    if (!conn) return []
    const recusar = (motivo: Extract<MensagemServidor, { t: 'recusado' }>['motivo']): Saida[] => [{ para: id, msg: { t: 'recusado', motivo } }]

    switch (msg.t) {
      case 'presenca':
        return []

      case 'listar':
        return [{ para: id, msg: { t: 'salas', salas: this.listar(msg.pubkey) } }]

      case 'abrir': {
        const existente = this.mesas[msg.sala]
        if (existente && existente.mestre !== msg.pubkey) return recusar('sala-de-outro-mestre')
        if (msg.estado.sala.id !== msg.sala) return recusar('invalido')
        // O servidor só aceita o estado do mestre se ele não ficou para trás: se jogadores agiram enquanto o
        // mestre estava fora (versão maior no servidor), o servidor vence.
        const aceita = !existente || msg.versao >= existente.versao
        if (aceita) {
          const estado: Estado = { ...msg.estado, sala: { ...msg.estado.sala, mestre: msg.pubkey } }
          this.mesas[msg.sala] = { mestre: msg.pubkey, versao: (existente?.versao ?? 0) + 1, estado }
          this.mudou(msg.sala)
        }
        conn.sala = msg.sala
        conn.pubkey = msg.pubkey
        conn.papel = 'mestre'
        const mesa = this.mesas[msg.sala]!
        return [{ para: id, msg: { t: 'ola', papel: 'mestre', versao: mesa.versao, estado: mesa.estado } }, ...(aceita ? this.espalhar(msg.sala, id) : [])]
      }

      case 'entrar': {
        const mesa = this.mesas[msg.sala]
        if (!mesa) return recusar('sala-nao-existe')
        conn.sala = msg.sala
        conn.pubkey = msg.pubkey
        if (msg.pubkey === mesa.mestre) {
          conn.papel = 'mestre'
          return [{ para: id, msg: { t: 'ola', papel: 'mestre', versao: mesa.versao, estado: mesa.estado } }]
        }
        conn.papel = 'jogador'
        const novo = aplicarAcao(mesa.estado, { tipo: 'entrar', nome: msg.nome }, msg.pubkey)
        if (novo) {
          mesa.estado = novo
          mesa.versao += 1
          this.mudou(msg.sala)
        }
        return [{ para: id, msg: { t: 'ola', papel: 'jogador', versao: mesa.versao, foto: visaoPublica(mesa.estado) } }, ...(novo ? this.espalhar(msg.sala, id) : [])]
      }

      case 'estado': {
        if (conn.papel !== 'mestre' || !conn.sala) return recusar('sem-permissao')
        const mesa = this.mesas[conn.sala]!
        // O mestre trocou o estado em cima de uma versão velha (alguém jogou nesse meio tempo): o servidor vence.
        if (msg.base !== mesa.versao) return [{ para: id, msg: { t: 'conflito', versao: mesa.versao, estado: mesa.estado } }]
        if (msg.estado.sala.id !== conn.sala) return recusar('invalido')
        mesa.estado = { ...msg.estado, sala: { ...msg.estado.sala, mestre: mesa.mestre } }
        mesa.versao += 1
        this.mudou(conn.sala)
        return [{ para: id, msg: { t: 'ok', versao: mesa.versao } }, ...this.espalhar(conn.sala, id)]
      }

      case 'acao': {
        if (conn.papel !== 'jogador' || !conn.sala || !conn.pubkey) return recusar('sem-permissao')
        const mesa = this.mesas[conn.sala]!
        const novo = aplicarAcao(mesa.estado, msg.acao, conn.pubkey)
        // Ação que não vale (peça alheia, fora da vez…) é ignorada; o jogador volta a ver o estado real.
        if (!novo) return [{ para: id, msg: { t: 'foto', versao: mesa.versao, foto: visaoPublica(mesa.estado) } }]
        mesa.estado = novo
        mesa.versao += 1
        this.mudou(conn.sala)
        return this.espalhar(conn.sala)
      }
    }
  }
}
