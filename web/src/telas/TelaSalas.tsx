import { useCallback, useEffect, useMemo, useState } from 'react'
import { usarJornada } from '../components/jornada/Jornada'
import { CriarSala } from '../components/sala/CriarSala'
import { Botao } from '../components/ui/Botao'
import { usarUsuario } from '../components/usuario/Usuario'
import { gravar, ler } from '../lib/armazenamento'
import { apagarSalaRemota, CHAVE_CONEXAO } from '../lib/rede/chaves'
import { pedir } from '../lib/rede/consulta'
import type { MensagemServidor, ResumoSala } from '../lib/rede/protocolo'
import { urlDoServidor } from '../lib/rede/servidor'
import { linkPara } from '../lib/rota'
import { criarSala } from '../lib/sala'
import { abrirSala, abrirSalaNova, apagarGuardada, lerSalaLocal, salasLocais } from '../lib/salas'
import { tempoRelativo } from '../lib/tempo'

type Estado = { fase: 'carregando' } | { fase: 'erro'; motivo: string } | { fase: 'ok'; salas: ResumoSala[] }

/** Uma linha da lista: junta o que o servidor sabe com o que está neste navegador. */
interface Linha {
  id: string
  nome: string
  papel: 'mestre' | 'jogador'
  jogadores: number
  pecas: number
  rodada: number | null
  /** Quando mudou pela última vez no servidor; null se a sala só existe neste navegador. */
  atualizadaEm: number | null
  noServidor: boolean
  /** Onde está neste navegador: aberta agora, guardada ou em lugar nenhum. */
  aqui: 'aberta' | 'guardada' | null
}

const MOTIVOS: Record<string, string> = {
  'sem-conexao': 'Não consegui falar com o servidor. Ele está rodando? (cd server && npm start)',
  tempo: 'O servidor demorou demais para responder.',
}

const ehSalas = (m: MensagemServidor): m is Extract<MensagemServidor, { t: 'salas' }> => m.t === 'salas'
const ehOlaMestre = (m: MensagemServidor): m is Extract<MensagemServidor, { t: 'ola'; papel: 'mestre' }> => m.t === 'ola' && m.papel === 'mestre'

/** "Minhas salas": as do servidor em que você é mestre ou joga e as deste navegador. Dá para criar mais de uma. */
export function TelaSalas() {
  const { usuario } = usarUsuario()
  const { registrar } = usarJornada()
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const [busca, setBusca] = useState('')
  const [entrando, setEntrando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [criando, setCriando] = useState(false)
  // As salas daqui mudam quando a pessoa apaga uma; o número força a lista a reler.
  const [versaoLocal, setVersaoLocal] = useState(0)
  const url = urlDoServidor()

  const carregar = useCallback(async () => {
    if (!usuario) return
    setEstado({ fase: 'carregando' })
    const r = await pedir(url, { t: 'listar', pubkey: usuario.pubkey }, ehSalas)
    setEstado(r.ok ? { fase: 'ok', salas: r.msg.salas } : { fase: 'erro', motivo: MOTIVOS[r.motivo] ?? 'O servidor recusou o pedido.' })
  }, [usuario, url])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const linhas = useMemo<Linha[]>(() => {
    const locais = new Map(salasLocais(localStorage).map((l) => [l.id, l]))
    const doServidor = estado.fase === 'ok' ? estado.salas : []
    const lista: Linha[] = doServidor.map((s) => ({
      ...s,
      atualizadaEm: s.atualizadaEm,
      noServidor: true,
      aqui: locais.has(s.id) ? (locais.get(s.id)!.aberta ? 'aberta' : 'guardada') : null,
    }))
    // Salas que só existem neste navegador (nunca foram para o servidor).
    for (const l of locais.values()) {
      if (doServidor.some((s) => s.id === l.id)) continue
      lista.push({ id: l.id, nome: l.nome, papel: 'mestre', jogadores: l.jogadores, pecas: l.pecas, rodada: l.rodada, atualizadaEm: null, noServidor: false, aqui: l.aberta ? 'aberta' : 'guardada' })
    }
    // A aberta primeiro, depois as mais recentes no servidor, depois as só daqui.
    return lista.sort((a, b) => Number(b.aqui === 'aberta') - Number(a.aqui === 'aberta') || (b.atualizadaEm ?? -1) - (a.atualizadaEm ?? -1) || a.nome.localeCompare(b.nome, 'pt-BR'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, versaoLocal])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return linhas.filter((l) => l.nome.toLocaleLowerCase('pt-BR').includes(termo))
  }, [linhas, busca])

  function criar(nome: string, colunas: number, linhasGrid: number) {
    if (!usuario) return
    abrirSalaNova(localStorage, criarSala(nome, colunas, linhasGrid, undefined, usuario.pubkey))
    registrar({ tipo: 'sala-criada' })
    location.hash = linkPara('sala')
  }

  async function entrar(sala: Linha) {
    if (!usuario) return
    setErro('')
    if (sala.papel === 'jogador') {
      // Quem joga volta para a mesma conexão; sala diferente começa limpa.
      const atual = ler(CHAVE_CONEXAO, null as { salaId: string } | null, (v) => ((v as { salaId?: string } | null)?.salaId ? (v as { salaId: string }) : null))
      if (atual?.salaId !== sala.id) apagarSalaRemota()
      gravar(CHAVE_CONEXAO, { salaId: sala.id })
      location.hash = linkPara('sala')
      return
    }
    // Mestre. A sala pode estar aberta aqui, guardada aqui ou só no servidor (outro navegador).
    const daqui = lerSalaLocal(localStorage, sala.id)
    if (daqui) {
      abrirSala(localStorage, daqui, sala.noServidor)
    } else {
      setEntrando(sala.id)
      const r = await pedir(url, { t: 'entrar', sala: sala.id, pubkey: usuario.pubkey, nome: usuario.nome }, ehOlaMestre)
      setEntrando(null)
      if (!r.ok) return setErro(MOTIVOS[r.motivo] ?? 'Não consegui abrir essa sala.')
      abrirSala(localStorage, { sala: r.msg.estado.sala, log: r.msg.estado.log, jogadores: r.msg.estado.jogadores, notas: '' }, true)
    }
    location.hash = linkPara('sala')
  }

  function apagar(sala: Linha) {
    const aviso = sala.noServidor
      ? `Tirar "${sala.nome}" deste navegador? A sala continua no servidor e dá para abrir de novo pela lista.`
      : `Apagar "${sala.nome}"? Ela só existe neste navegador e não dá para recuperar.`
    if (!window.confirm(aviso)) return
    apagarGuardada(localStorage, sala.id)
    setVersaoLocal((v) => v + 1)
  }

  if (criando && usuario) return <CriarSala aoCriar={criar} aoCancelar={() => setCriando(false)} />

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-32 sm:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 tabIndex={-1} className="font-display text-4xl">
          Salas
        </h1>
        {usuario && (
          <Botao variante="principal" onClick={() => setCriando(true)}>
            Nova sala
          </Botao>
        )}
      </div>

      {!usuario ? (
        <section className="mt-6 space-y-3 rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
          <h2 className="font-display text-2xl">Entre para ver as suas salas</h2>
          <p className="text-tinta-suave">As salas são ligadas à sua chave Nostr: as que você conduz e as em que você joga.</p>
          <a
            href={linkPara('perfil')}
            className="inline-flex min-h-11 items-center justify-center rounded-cordel border-2 border-borda bg-vermelho px-5 py-2.5 font-bold text-sobre-vermelho shadow-carimbo"
          >
            Entrar
          </a>
        </section>
      ) : (
        <>
          <p className="mt-1 text-tinta-suave">
            As suas salas, neste navegador e no servidor <code className="text-sm">{url}</code>.
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor="busca-salas" className="font-bold">
                Buscar pelo nome
              </label>
              <input
                id="busca-salas"
                type="search"
                value={busca}
                placeholder="Ex.: Taverna"
                onChange={(e) => setBusca(e.target.value)}
                className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
              />
            </div>
            <Botao onClick={() => void carregar()} disabled={estado.fase === 'carregando'}>
              Atualizar
            </Botao>
          </div>

          {erro && (
            <p role="alert" className="mt-3 font-bold text-vermelho">
              {erro}
            </p>
          )}
          {estado.fase === 'erro' && (
            <p role="alert" className="mt-3 rounded-cordel border-2 border-vermelho p-3 text-sm font-bold">
              {estado.motivo} As salas deste navegador aparecem abaixo mesmo assim.
            </p>
          )}

          <div className="mt-5" aria-live="polite">
            {estado.fase === 'carregando' && linhas.length === 0 ? (
              <p className="text-tinta-suave">Procurando as suas salas…</p>
            ) : linhas.length === 0 ? (
              <div className="space-y-3 rounded-cordel border-2 border-dashed border-tinta-suave p-5">
                <p className="font-bold">Você ainda não tem nenhuma sala.</p>
                <p className="text-tinta-suave">
                  Crie uma para conduzir, ou abra o convite que o mestre mandou para jogar. Para jogar online, a sala precisa estar aberta no servidor (Compartilhar, dentro da sala).
                </p>
              </div>
            ) : visiveis.length === 0 ? (
              <p className="text-tinta-suave">Nenhuma sala com esse nome. Limpe a busca para ver as {linhas.length}.</p>
            ) : (
              <ul className="space-y-3">
                {visiveis.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-cordel border-2 border-borda bg-superficie px-4 py-3 shadow-carimbo-pequeno">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-display text-xl">{s.nome}</span>
                        <span className={`rounded-cordel border-2 border-borda px-2 text-xs font-bold tracking-wide uppercase ${s.papel === 'mestre' ? 'bg-tinta text-fundo' : 'bg-superficie text-tinta'}`}>
                          {s.papel === 'mestre' ? 'Mestre' : 'Jogador'}
                        </span>
                        {s.aqui === 'aberta' && <span className="text-xs font-bold tracking-wide uppercase">Aberta agora</span>}
                        {!s.noServidor && <span className="rounded-cordel border-2 border-dashed border-tinta-suave px-2 text-xs font-bold tracking-wide text-tinta-suave uppercase">Só neste navegador</span>}
                        {s.rodada !== null && <span className="text-xs font-bold text-vermelho uppercase">Em combate · rodada {s.rodada}</span>}
                      </p>
                      <p className="text-sm text-tinta-suave">
                        {s.jogadores} {s.jogadores === 1 ? 'jogador' : 'jogadores'} · {s.pecas} {s.pecas === 1 ? 'peça' : 'peças'}
                        {s.atualizadaEm !== null && <> · {tempoRelativo(s.atualizadaEm)}</>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {s.aqui === 'guardada' && (
                        <Botao tamanho="pequeno" aria-label={`Tirar ${s.nome} deste navegador`} onClick={() => apagar(s)}>
                          {s.noServidor ? 'Tirar daqui' : 'Apagar'}
                        </Botao>
                      )}
                      <Botao variante="principal" tamanho="pequeno" disabled={entrando !== null} aria-label={`${s.aqui === 'aberta' ? 'Abrir' : 'Entrar na'} sala ${s.nome}`} onClick={() => void entrar(s)}>
                        {entrando === s.id ? 'Abrindo…' : s.aqui === 'aberta' ? 'Abrir' : 'Entrar'}
                      </Botao>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  )
}
