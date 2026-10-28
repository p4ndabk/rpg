import { useState, type FormEvent } from 'react'
import { Botao } from '../components/ui/Botao'
import { usarUsuario } from '../components/usuario/Usuario'
import { usarArmazenado } from '../lib/armazenamento'
import { adicionarAmigo, CHAVE_AMIGOS, ehAmigo, lerAmigos, lerChaveDoAmigo, lerLinkDeAmigo, MAXIMO_AMIGOS, montarLinkDeAmigo, ordenarAmigos, removerAmigo } from '../lib/amigos'
import { baseDoConvite } from '../lib/nostr/convite'
import { linkPara } from '../lib/rota'
import { npubCurta, npubDe, TAMANHO_MAXIMO_NOME } from '../lib/usuario'

const campo = 'rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave'

const ERROS = {
  vazia: 'Cole a chave do amigo. Ela começa com npub1.',
  segredo: 'Essa começa com nsec1: é uma chave SECRETA. Não cole nem compartilhe. Peça a npub (começa com npub1) ou o link de amigo.',
  invalida: 'Essa chave não parece certa. Confira se copiou inteira (começa com npub1).',
  propria: 'Essa é a sua própria chave. Peça a da outra pessoa.',
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/** Amigos: seu código para mandar, um passo a passo para adicionar e a lista de quem você já adicionou. */
export function TelaAmigos() {
  const { usuario } = usarUsuario()
  const [amigos, setAmigos] = usarArmazenado(CHAVE_AMIGOS, [], lerAmigos)
  // Quem abriu o link de um amigo (#/amigos/<npub>?nome=…) já chega com a pessoa preenchida.
  const doLink = lerLinkDeAmigo(location.hash)
  const [chave, setChave] = useState(doLink ? npubDe(doLink.pubkey) : '')
  const [nome, setNome] = useState(doLink?.nome ?? '')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [copiou, setCopiou] = useState<'npub' | 'link' | null>(null)
  const lista = ordenarAmigos(amigos)
  const link = usuario ? montarLinkDeAmigo(baseDoConvite(), usuario.pubkey, usuario.nome) : ''

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const r = lerChaveDoAmigo(chave, usuario?.pubkey ?? null)
    if (!r.ok) return setErro(ERROS[r.motivo])
    if (!ehAmigo(amigos, r.pubkey) && amigos.length >= MAXIMO_AMIGOS) return setErro(`A lista aceita até ${MAXIMO_AMIGOS} amigos.`)
    const jaEra = ehAmigo(amigos, r.pubkey)
    setAmigos(adicionarAmigo(amigos, r.pubkey, nome, Date.now()))
    setAviso(jaEra ? 'Essa pessoa já estava na lista; o nome foi atualizado.' : `${nome.trim() || 'Amigo'} entrou na sua lista.`)
    setChave('')
    setNome('')
    setErro('')
    if (doLink) location.hash = linkPara('amigos')
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:pb-12">
      <h1 tabIndex={-1} className="font-display text-4xl">
        Amigos
      </h1>
      <p className="mt-2 text-tinta-suave">Quem joga com você. A lista fica só neste navegador e serve para reconhecer a pessoa na sala e para o mestre dar uma peça a ela.</p>

      {doLink && (
        <p role="status" className="mt-4 rounded-cordel border-2 border-borda bg-superficie p-3 font-bold shadow-carimbo-pequeno">
          {doLink.nome ? `${doLink.nome} mandou o link de amigo.` : 'Você abriu um link de amigo.'} Confira o nome e toque em Adicionar.
        </p>
      )}

      <section aria-labelledby="titulo-codigo" className="mt-6 space-y-3 rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
        <h2 id="titulo-codigo" className="font-display text-2xl">
          Seu código
        </h2>
        {usuario ? (
          <>
            <p className="text-sm text-tinta-suave">Mande o link para quem quer te adicionar: ele abre esta tela já com a sua chave e o seu nome.</p>
            <code className="block rounded-cordel border-2 border-borda bg-fundo p-3 text-sm break-all">{link}</code>
            <div className="flex flex-wrap gap-2">
              <Botao tamanho="pequeno" onClick={async () => setCopiou((await copiar(link)) ? 'link' : null)}>
                {copiou === 'link' ? 'Link copiado!' : 'Copiar link'}
              </Botao>
              <Botao tamanho="pequeno" onClick={async () => setCopiou((await copiar(npubDe(usuario.pubkey))) ? 'npub' : null)}>
                {copiou === 'npub' ? 'npub copiada!' : 'Copiar só a npub'}
              </Botao>
            </div>
          </>
        ) : (
          <>
            <p className="text-tinta-suave">Para ter um código, entre com a sua chave primeiro.</p>
            <a
              href={linkPara('perfil')}
              className="inline-flex min-h-11 items-center justify-center rounded-cordel border-2 border-borda bg-vermelho px-5 py-2.5 font-bold text-sobre-vermelho shadow-carimbo"
            >
              Entrar
            </a>
          </>
        )}
      </section>

      <section aria-labelledby="titulo-adicionar" className="mt-6 space-y-3 rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
        <h2 id="titulo-adicionar" className="font-display text-2xl">
          Adicionar um amigo
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-tinta-suave">
          <li>
            Peça à pessoa o <strong>link de amigo</strong> dela (da tela Amigos) ou a <strong>npub</strong> (do Perfil).
          </li>
          <li>Cole aqui. Se foi o link, é só abrir: já vem preenchido.</li>
          <li>Dê um nome que você reconheça e toque em Adicionar.</li>
        </ol>
        <form onSubmit={adicionar} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="chave-amigo" className="font-bold">
              Chave do amigo
            </label>
            <input
              id="chave-amigo"
              value={chave}
              autoComplete="off"
              spellCheck={false}
              placeholder="npub1…"
              aria-invalid={erro !== ''}
              aria-describedby={erro ? 'erro-amigo' : undefined}
              onChange={(e) => {
                setChave(e.target.value)
                setErro('')
                setAviso('')
              }}
              className={campo}
            />
            {erro && (
              <p id="erro-amigo" role="alert" className="text-sm font-bold text-vermelho">
                {erro}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="nome-amigo" className="font-bold">
              Nome
            </label>
            <input id="nome-amigo" value={nome} maxLength={TAMANHO_MAXIMO_NOME} placeholder="Ex.: Ana do Dragão" onChange={(e) => setNome(e.target.value)} className={campo} />
          </div>
          <Botao type="submit" variante="principal">
            Adicionar
          </Botao>
          {aviso && (
            <p role="status" className="text-sm font-bold text-verde">
              {aviso}
            </p>
          )}
        </form>
      </section>

      <section aria-labelledby="titulo-lista" className="mt-6 space-y-3">
        <h2 id="titulo-lista" className="font-display text-2xl">
          Sua lista ({lista.length})
        </h2>
        {lista.length === 0 ? (
          <p className="rounded-cordel border-2 border-dashed border-tinta-suave p-4 text-tinta-suave">
            Ninguém ainda. Adicione o primeiro acima, ou abra uma sala: quem estiver nela aparece em <strong>Mesa</strong> com o botão de adicionar.
          </p>
        ) : (
          <ul className="space-y-2">
            {lista.map((a) => (
              <li key={a.pubkey} className="flex flex-wrap items-center gap-2 rounded-cordel border-2 border-borda bg-superficie p-3 shadow-carimbo-pequeno">
                <label htmlFor={`amigo-${a.pubkey}`} className="sr-only">
                  Nome de {a.nome}
                </label>
                <input
                  id={`amigo-${a.pubkey}`}
                  value={a.nome}
                  maxLength={TAMANHO_MAXIMO_NOME}
                  onChange={(e) => setAmigos(amigos.map((x) => (x.pubkey === a.pubkey ? { ...x, nome: e.target.value } : x)))}
                  onBlur={(e) => !e.target.value.trim() && setAmigos(amigos.map((x) => (x.pubkey === a.pubkey ? { ...x, nome: 'Sem nome' } : x)))}
                  className="min-w-0 flex-1 rounded-cordel border-2 border-transparent bg-transparent px-2 py-1.5 font-bold text-tinta hover:border-borda"
                />
                <span className="text-xs text-tinta-suave">{npubCurta(a.pubkey)}</span>
                <Botao tamanho="pequeno" onClick={() => void copiar(npubDe(a.pubkey))}>
                  Copiar npub
                </Botao>
                <Botao
                  tamanho="pequeno"
                  aria-label={`Tirar ${a.nome} da lista`}
                  onClick={() => window.confirm(`Tirar ${a.nome} da lista de amigos?`) && setAmigos(removerAmigo(amigos, a.pubkey))}
                >
                  Tirar
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
