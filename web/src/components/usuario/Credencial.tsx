import { useRef, useState, type FormEvent } from 'react'
import { abrirCredencial, criarCredencial, lerCredencial, nomeDoArquivo, pedeSenha, TAMANHO_MINIMO_SENHA, validarSenha } from '../../lib/credencial'
import { Botao } from '../ui/Botao'

const campo = 'rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave'

/** Dá um respiro ao navegador para mostrar "Protegendo…" antes da conta pesada (o scrypt leva cerca de 1 s). */
const respirar = () => new Promise<void>((r) => window.setTimeout(r, 30))

function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeDoArquivo(nome)
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Baixa a credencial (a nsec protegida por senha). Só existe enquanto a nsec está em memória: ao criar ou ao colar. */
export function BaixarCredencial({ nsec, nome }: { nsec: string; nome: string }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [trabalhando, setTrabalhando] = useState(false)
  const [baixou, setBaixou] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const problema = validarSenha(senha, confirmacao)
    if (problema) return setErro(problema === 'curta' ? `A senha precisa de pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.` : 'As duas senhas não são iguais.')
    setErro('')
    setTrabalhando(true)
    await respirar()
    try {
      baixar(nome, criarCredencial(nsec, nome, senha))
      setBaixou(true)
    } catch {
      setErro('Não consegui montar o arquivo com essa chave.')
    }
    setTrabalhando(false)
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-3 border-t-2 border-dashed border-tinta-suave pt-3">
      <h3 className="font-bold">Baixar uma credencial</h3>
      <p className="text-sm text-tinta-suave">
        Um arquivo com a sua chave, para entrar em outro navegador: é só subir o arquivo. A senha é <strong>opcional</strong>: com ela, ninguém abre o arquivo sem digitá-la (e se você esquecer, nem eu); sem ela, quem pegar o arquivo entra como você.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="senha-credencial" className="font-bold">
          Senha do arquivo (opcional)
        </label>
        <input id="senha-credencial" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="senha-credencial-2" className="font-bold">
          Repita a senha
        </label>
        <input
          id="senha-credencial-2"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          aria-invalid={erro !== ''}
          aria-describedby={erro ? 'erro-credencial' : undefined}
          onChange={(e) => setConfirmacao(e.target.value)}
          className={campo}
        />
        {erro && (
          <p id="erro-credencial" role="alert" className="text-sm font-bold text-vermelho">
            {erro}
          </p>
        )}
      </div>
      {senha === '' && (
        <p className="text-sm font-bold text-vermelho">Sem senha, o arquivo guarda a sua nsec aberta. Guarde-o num lugar seguro.</p>
      )}
      <Botao type="submit" tamanho="pequeno" disabled={trabalhando}>
        {trabalhando ? (senha === '' ? 'Montando…' : 'Protegendo…') : baixou ? 'Baixar de novo' : 'Baixar credencial'}
      </Botao>
      {baixou && (
        <p role="status" className="text-sm font-bold text-verde">
          Arquivo baixado: {nomeDoArquivo(nome)}. Guarde num lugar seguro.
        </p>
      )}
    </form>
  )
}

/** Entra com um arquivo de credencial: escolhe o arquivo, digita a senha. Só a chave pública fica no app. */
export function SubirCredencial({ aoEntrar }: { aoEntrar: (u: { pubkey: string; nome: string }) => void }) {
  const [texto, setTexto] = useState<string | null>(null)
  const [comSenha, setComSenha] = useState(true)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [trabalhando, setTrabalhando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  async function escolher(arquivo: File | undefined) {
    setErro('')
    setTexto(null)
    if (!arquivo) return
    // O arquivo é pequeno; um maior que isso não é uma credencial.
    const conteudo = arquivo.size <= 8 * 1024 ? await arquivo.text() : ''
    const lida = lerCredencial(conteudo)
    if (!lida) return setErro('Esse arquivo não é uma credencial do RPG. Use o .json que você baixou ao criar a chave.')
    setTexto(conteudo)
    setComSenha(pedeSenha(lida))
    setNomeArquivo(arquivo.name)
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (texto === null) return
    setTrabalhando(true)
    setErro('')
    await respirar()
    const r = abrirCredencial(texto, comSenha ? senha : '')
    setTrabalhando(false)
    if (!r.ok) return setErro(r.motivo === 'senha' ? 'Senha errada. Confira e tente de novo.' : 'Esse arquivo foi alterado e não dá para confiar nele.')
    aoEntrar({ pubkey: r.pubkey, nome: r.nome })
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="arquivo-credencial" className="font-bold">
          Arquivo de credencial
        </label>
        <input
          id="arquivo-credencial"
          ref={entrada}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void escolher(e.target.files?.[0])}
          className={`${campo} text-sm file:mr-3 file:font-bold`}
        />
        <p className="text-sm text-tinta-suave">O arquivo <code>rpg-credencial-….json</code> que você baixou ao criar a chave. Ele não sai do seu navegador.</p>
      </div>
      {texto !== null && comSenha && (
        <div className="flex flex-col gap-1">
          <label htmlFor="senha-subir" className="font-bold">
            Senha de {nomeArquivo}
          </label>
          <input id="senha-subir" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
        </div>
      )}
      {erro && (
        <p role="alert" className="text-sm font-bold text-vermelho">
          {erro}
        </p>
      )}
      <Botao type="submit" variante="principal" disabled={texto === null || (comSenha && senha === '') || trabalhando}>
        {trabalhando ? 'Abrindo…' : 'Entrar'}
      </Botao>
    </form>
  )
}
