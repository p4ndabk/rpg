import { useId, useState, type FormEvent } from 'react'
import { abrir, chaveDoCofre, TAMANHO_MINIMO_SENHA_COFRE, trancar } from '../../lib/cofre'
import { buscarNosRelays, montarBackup, salvarNosRelays, TAMANHO_MAXIMO_BACKUP, type TipoBackup } from '../../lib/nostr/backup'
import { chaveDoNavegador } from '../../lib/nostr/chave'
import { relaysDoMestre } from '../../lib/nostr/relays'
import { tempoRelativo } from '../../lib/tempo'
import { Botao } from '../ui/Botao'

const campo = 'rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave'

interface SalvarProps {
  tipo: TipoBackup
  /** Id da cópia: a sala, ou a pubkey para o progresso. */
  id: string
  pubkey: string
  /** O texto a guardar, na hora de salvar. */
  montar: () => string
}

/** Tranca com uma senha e guarda nos relays. A senha não é guardada em lugar nenhum. */
export function SalvarNoRelay({ tipo, id, pubkey, montar }: SalvarProps) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [estado, setEstado] = useState<{ fase: 'parado' | 'salvando' } | { fase: 'ok' | 'erro'; texto: string }>({ fase: 'parado' })
  const base = useId()

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < TAMANHO_MINIMO_SENHA_COFRE) return setEstado({ fase: 'erro', texto: `A senha precisa de pelo menos ${TAMANHO_MINIMO_SENHA_COFRE} caracteres.` })
    if (senha !== confirmacao) return setEstado({ fase: 'erro', texto: 'As duas senhas não são iguais.' })
    setEstado({ fase: 'salvando' })
    try {
      const trancado = await trancar(montar(), await chaveDoCofre(senha, pubkey))
      if (trancado.length > TAMANHO_MAXIMO_BACKUP) return setEstado({ fase: 'erro', texto: 'Essa cópia é grande demais para os relays. Salve em arquivo.' })
      const relays = relaysDoMestre()
      const r = await salvarNosRelays(relays, montarBackup(tipo, id, pubkey, trancado, Math.floor(Date.now() / 1000)), chaveDoNavegador())
      setEstado(
        r.ok > 0
          ? { fase: 'ok', texto: `Salvo em ${r.ok} de ${r.total} relays. Para recuperar, use a mesma senha.` }
          : { fase: 'erro', texto: 'Nenhum relay aceitou a cópia. Veja a conexão e tente de novo.' },
      )
      if (r.ok > 0) {
        setSenha('')
        setConfirmacao('')
      }
    } catch {
      setEstado({ fase: 'erro', texto: 'Não consegui trancar a cópia neste navegador.' })
    }
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${base}-senha`} className="font-bold">
          Senha da cópia
        </label>
        <input id={`${base}-senha`} type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${base}-confirma`} className="font-bold">
          Repita a senha
        </label>
        <input id={`${base}-confirma`} type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={campo} />
      </div>
      <p className="text-sm text-tinta-suave">A cópia vai trancada: os relays são públicos, mas só quem sabe a senha abre. Se esquecer a senha, ninguém recupera (nem eu).</p>
      <Botao type="submit" variante="principal" disabled={estado.fase === 'salvando'}>
        {estado.fase === 'salvando' ? 'Salvando…' : 'Salvar nos relays'}
      </Botao>
      {(estado.fase === 'ok' || estado.fase === 'erro') && (
        <p role={estado.fase === 'erro' ? 'alert' : 'status'} className={`font-bold ${estado.fase === 'erro' ? 'text-vermelho' : 'text-verde'}`}>
          {estado.texto}
        </p>
      )}
    </form>
  )
}

interface Achada {
  id: string
  em: number
  texto: string
  nome: string
}

interface BuscarProps {
  tipo: TipoBackup
  pubkey: string
  /** Chamado ao escolher uma cópia, já aberta. */
  aoEscolher: (texto: string) => void
  /** Como a cópia aparece na lista (null: não é uma cópia que valha). */
  nomeDe: (texto: string) => string | null
  rotuloDoBotao: string
}

/** Pede a senha, busca as cópias nos relays e lista as que abrem. */
export function BuscarNoRelay({ tipo, pubkey, aoEscolher, nomeDe, rotuloDoBotao }: BuscarProps) {
  const [senha, setSenha] = useState('')
  const [fase, setFase] = useState<'parado' | 'buscando' | 'pronto'>('parado')
  const [achadas, setAchadas] = useState<Achada[]>([])
  const [aviso, setAviso] = useState('')
  const id = useId()

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!senha) return setAviso('Digite a senha da cópia.')
    setFase('buscando')
    setAviso('')
    try {
      const copias = await buscarNosRelays(relaysDoMestre(), pubkey, tipo)
      const chave = await chaveDoCofre(senha, pubkey)
      const abertas: Achada[] = []
      for (const c of copias) {
        const texto = await abrir(c.conteudo, chave)
        const nome = texto === null ? null : nomeDe(texto)
        if (texto !== null && nome !== null) abertas.push({ id: c.id, em: c.em, texto, nome })
      }
      setAchadas(abertas)
      setAviso(
        copias.length === 0
          ? 'Não achei nenhuma cópia nos relays para a sua chave.'
          : abertas.length === 0
            ? 'Achei cópias, mas nenhuma abriu com essa senha.'
            : '',
      )
    } catch {
      setAviso('Não consegui falar com os relays.')
      setAchadas([])
    }
    setFase('pronto')
  }

  return (
    <div className="space-y-3">
      <form onSubmit={aoEnviar} className="space-y-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-senha`} className="font-bold">
            Senha da cópia
          </label>
          <input id={`${id}-senha`} type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
        </div>
        <Botao type="submit" disabled={fase === 'buscando'}>
          {fase === 'buscando' ? 'Procurando…' : 'Procurar nos relays'}
        </Botao>
      </form>
      {aviso && (
        <p role="status" className="font-bold text-vermelho">
          {aviso}
        </p>
      )}
      {achadas.length > 0 && (
        <ul className="space-y-2" aria-label="Cópias achadas">
          {achadas.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-cordel border-2 border-borda bg-superficie px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{a.nome}</span>
                <span className="text-sm text-tinta-suave">salva {tempoRelativo(a.em * 1000)}</span>
              </span>
              <Botao variante="principal" tamanho="pequeno" onClick={() => aoEscolher(a.texto)}>
                {rotuloDoBotao}
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
